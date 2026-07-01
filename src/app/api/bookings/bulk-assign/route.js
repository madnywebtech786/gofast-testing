import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { findBookingsByIds, assignDriverToBooking } from '@/lib/db/bookings'
import { findDriverById, upsertDriverRoute, findActiveRoute, mergeIntoActiveRoute } from '@/lib/db/drivers'
import { pushBookingStatusChange, pushRouteUpdate } from '@/lib/pusher'
import { revalidateTag } from 'next/cache'
import redis from '@/lib/redis'
import { ObjectId } from 'mongodb'

// Full-route polyline now goes through ORS Directions V2 (no documented
// waypoint cap), not Google Routes (which capped intermediates at 25) — see
// ORS_GOOGLE_HYBRID_ROUTING.md. This is a bounded sanity ceiling against
// accidental fat-finger admin input, not an API constraint.
const MAX_STOPS_PER_ROUTE = 200

// Wrap a longitude into [-180, 180]. Booking docs created before the antimeridian
// fix can carry a wrapped value (e.g. 246 = -114 + 360); copying it straight into
// the route would re-seed bad data that ORS/Google reject. Sanitize on copy.
function normalizeLng(lng) {
  const n = Number(lng)
  if (!Number.isFinite(n)) return n
  return ((n + 180) % 360 + 360) % 360 - 180
}

// Return a coordinates object with the longitude normalized, preserving lat and
// guarding against a missing coordinates field (don't fabricate one).
function safeCoords(coordinates) {
  if (!coordinates) return coordinates
  return { ...coordinates, lng: normalizeLng(coordinates.lng) }
}

// kind → { allowedFromStatuses[], newBookingStatus, stopTypes[] }
// `failed_pickup` is re-assignable the same as `pending`; `failed_dropoff`
// the same as `picked_up` — the admin just picks the kind again.
const KIND_CONFIG = {
  pickup_only:        { allowedFromStatuses: ['pending',   'failed_pickup'],  newBookingStatus: 'assigned_pickup',   stopTypes: ['pickup'] },
  delivery_only:      { allowedFromStatuses: ['picked_up', 'failed_dropoff'], newBookingStatus: 'assigned_delivery', stopTypes: ['dropoff'] },
  // Both stops added to route at once. Booking goes: assigned_pickup → picked_up → delivered
  // (skips assigned_delivery — dropoff stop already in route when pickup is confirmed)
  pickup_and_dropoff: { allowedFromStatuses: ['pending',   'failed_pickup'],  newBookingStatus: 'assigned_pickup',   stopTypes: ['pickup', 'dropoff'] },
}

// Legacy aliases so existing single-booking /assign calls still work
const LEGACY_ASSIGNMENT_TYPE_ALIASES = {
  pickup:   'pickup_only',
  delivery: 'delivery_only',
}

/**
 * POST /api/bookings/bulk-assign
 *
 * Preferred payload (atomic, per-booking kinds):
 *   { driverId, assignments: [{ bookingId, kind }] }
 *   kind ∈ 'pickup_only' | 'delivery_only'
 *
 * Backward-compatible payload (one kind for all):
 *   { driverId, bookingIds: [id], assignmentType: 'pickup'|'delivery' }
 *
 * Behaviour:
 *   - A single bulk-assign call may mix pickup_only and delivery_only kinds,
 *     letting the driver pick up new packages AND drop off previously picked-up
 *     packages in the same route.
 *   - Each stop carries an `assignmentKind` field — this is the authoritative
 *     signal for booking-status transitions (stop-complete derives from it,
 *     NOT from route.routePhase).
 *   - If the driver has an active route, stops are merged and the route is
 *     re-optimized using the driver's last known GPS (from driverProfile).
 *     Completed stops stay frozen at the front of optimizedStops.
 */
export async function POST(request) {
  try {
    await requireAdmin()
    const body = await request.json()

    // ── Normalize payload to { driverId, assignments: [{ bookingId, kind }] } ──
    const driverId = body.driverId
    if (!driverId) {
      return NextResponse.json({ error: 'driverId is required' }, { status: 400 })
    }

    let assignments
    if (Array.isArray(body.assignments) && body.assignments.length > 0) {
      assignments = body.assignments.map((a) => ({
        bookingId: a.bookingId,
        kind: LEGACY_ASSIGNMENT_TYPE_ALIASES[a.kind] ?? a.kind,
      }))
    } else if (Array.isArray(body.bookingIds) && body.bookingIds.length > 0) {
      const kind = LEGACY_ASSIGNMENT_TYPE_ALIASES[body.assignmentType] ?? body.assignmentType
      assignments = body.bookingIds.map((bookingId) => ({ bookingId, kind }))
    } else {
      return NextResponse.json({ error: 'assignments (or bookingIds + assignmentType) is required' }, { status: 400 })
    }

    for (const a of assignments) {
      if (!a.bookingId) {
        return NextResponse.json({ error: 'Each assignment must have a bookingId' }, { status: 400 })
      }
      if (!KIND_CONFIG[a.kind]) {
        return NextResponse.json({ error: `Invalid kind '${a.kind}'` }, { status: 400 })
      }
    }

    // ── Load driver + bookings ──
    const driver = await findDriverById(driverId)
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

    const bookingIds = assignments.map((a) => a.bookingId)
    const bookings = await findBookingsByIds(bookingIds)
    if (bookings.length !== assignments.length) {
      return NextResponse.json({ error: 'One or more bookings not found' }, { status: 404 })
    }

    const bookingById = new Map(bookings.map((b) => [String(b._id), b]))

    // ── Validate each booking's status matches the requested kind ──
    const invalid = []
    for (const a of assignments) {
      const b = bookingById.get(String(a.bookingId))
      const cfg = KIND_CONFIG[a.kind]
      if (!cfg.allowedFromStatuses.includes(b.status)) {
        invalid.push({ bookingId: a.bookingId, status: b.status, expected: cfg.allowedFromStatuses.join(' | ') })
      }
    }
    if (invalid.length > 0) {
      return NextResponse.json({
        error: `${invalid.length} booking(s) have an incompatible status for the requested assignment kind`,
        details: invalid,
      }, { status: 409 })
    }

    // ── Build new stops with per-stop assignmentKind ──
    const newStops = []
    for (const a of assignments) {
      const booking = bookingById.get(String(a.bookingId))
      const cfg = KIND_CONFIG[a.kind]
      for (const stopType of cfg.stopTypes) {
        const stop = booking.stops.find((s) => s.type === stopType)
        if (!stop) continue
        newStops.push({
          bookingId:       String(booking._id),
          stopType,
          assignmentKind:  a.kind, // ← authoritative for status transitions
          coordinates:     safeCoords(stop.coordinates),
          address:         stop.address,
          contactName:     stop.contactName  ?? null,
          contactPhone:    stop.contactPhone ?? null,
          notes:           stop.notes        ?? null,
          status:          'pending',
          completedAt:     null,
          estimatedArrivalAt: null,
        })
      }
    }
    if (newStops.length === 0) {
      return NextResponse.json({ error: 'No valid stops found in selected bookings' }, { status: 400 })
    }

    // ── Branch: new route vs merge into existing ──
    const existingRoute = await findActiveRoute(driverId)

    let merged = false
    let finalRouteId

    if (existingRoute) {
      merged = true
      const existingStops    = existingRoute.optimizedStops ?? []
      const completedStops   = existingStops.filter((s) => s.completedAt)
      const existingPending  = existingStops.filter((s) => !s.completedAt && s.stopType !== 'endpoint')
      const endpointStop     = existingStops.find((s) => s.stopType === 'endpoint' && !s.completedAt) // preserve

      if (existingPending.length + newStops.length > MAX_STOPS_PER_ROUTE) {
        return NextResponse.json({
          error: `Route would exceed ${MAX_STOPS_PER_ROUTE} pending stops. Wait for driver to complete some first.`,
        }, { status: 409 })
      }

      // Append new stops to pending queue (reroute will re-optimize)
      const mergedPending = [...existingPending, ...newStops]
      const mergedStops = mergedPending.map((s, i) => ({
        ...s,
        stopIndex:     completedStops.length + i,
        originalIndex: i,
      }))

      const finalStops = [...completedStops, ...mergedStops]
      if (endpointStop) finalStops.push({ ...endpointStop, stopIndex: finalStops.length })

      // routePhase is a UI hint only — derived from whether any pending stop is a pickup
      const hasAnyPickup = finalStops.some((s) => !s.completedAt && s.stopType === 'pickup')
      const finalPhase = hasAnyPickup ? 'pickup' : 'dropoff'

      await mergeIntoActiveRoute(
        String(existingRoute._id),
        bookings.map((b) => new ObjectId(b._id)),
        finalStops,
        null,
        finalPhase,
      )
      finalRouteId = String(existingRoute._id)
    } else {
      // Fresh route — phase is UI-hint: 'pickup' if any pickup stop, else 'dropoff'
      const hasAnyPickup = newStops.some((s) => s.stopType === 'pickup')
      const routePhase = hasAnyPickup ? 'pickup' : 'dropoff'

      const optimizedStops = newStops.map((s, i) => ({
        ...s,
        stopIndex:     i,
        originalIndex: i,
      }))

      const created = await upsertDriverRoute(driverId, {
        assignmentIds:        bookings.map((b) => b._id),
        routePhase,
        optimizedStops,
        encodedPolyline:      null,
        totalDistanceMeters:  null,
        totalDurationSeconds: null,
        lastMatchedAt:        null,
        endPoint:             null,
      })
      finalRouteId = String(created._id)
    }

    // ── Update booking statuses + notify ──
    await Promise.all(
      assignments.map(async (a) => {
        const booking = bookingById.get(String(a.bookingId))
        const cfg = KIND_CONFIG[a.kind]
        const assignResult = await assignDriverToBooking(String(booking._id), driverId, {
          estimatedDistanceMeters:  null,
          estimatedDurationSeconds: null,
          newStatus:         cfg.newBookingStatus,
          allowedFromStatus: booking.status,
          kind:              a.kind,
        })
        if (assignResult.matchedCount === 0) {
          throw Object.assign(new Error(`Booking ${booking._id} status changed before assignment completed`), { status: 409 })
        }
        try {
          await pushBookingStatusChange(String(booking._id), {
            status: cfg.newBookingStatus,
            updatedAt: new Date().toISOString(),
            etaSeconds: null,
          })
        } catch { /* non-fatal */ }
      })
    )

    // ── Refresh Redis cache + push live update to driver ──
    try {
      const freshRoute = await findActiveRoute(driverId)
      if (freshRoute) {
        const { hydrateRouteItems } = await import('@/lib/routing/hydrate')
        const hydrated = await hydrateRouteItems(JSON.parse(JSON.stringify(freshRoute)))
        // Store hydrated so route-data cache hits need no extra DB queries.
        await redis.set(`driver:${driverId}:route`, hydrated, { ex: 300 })
        try {
          await pushRouteUpdate(driverId, {
            ...hydrated,
            _mergeNotice: merged
              ? { addedBookingIds: bookings.map((b) => String(b._id)), addedAt: new Date().toISOString() }
              : null,
          })
        } catch { /* non-fatal */ }
      } else {
        await redis.del(`driver:${driverId}:route`)
      }
    } catch { /* non-fatal */ }

    revalidateTag('booking-counters')

    return NextResponse.json({
      success: true,
      assigned: bookings.length,
      merged,
      routeId: finalRouteId,
    })
  } catch (err) {
    if (err?.status === 409) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    return handleApiError(err, '[POST /api/bookings/bulk-assign]')
  }
}
