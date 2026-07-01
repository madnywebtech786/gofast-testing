import { NextResponse } from 'next/server'
import { requireDriver, handleApiError } from '@/lib/dal'
import { findActiveRoute, updateRoute } from '@/lib/db/drivers'
import { markBookingFailed } from '@/lib/db/bookings'
import { pushBookingStatusChange, pushRouteUpdate } from '@/lib/pusher'
import { hydrateRouteItems } from '@/lib/routing/hydrate'
import redis from '@/lib/redis'

/**
 * POST /api/drivers/[driverId]/stop-failed
 * Body: { stopIndex: number, reason?: string }
 *
 * Marks a stop as failed:
 *   - booking → 'failed_pickup' or 'failed_dropoff' (cleared of driver so admin can re-assign)
 *   - route stop → { completedAt, failedAt, failureReason }  (so it's skipped in the queue)
 *
 * Note: we DO NOT unset the route if remaining stops exist. The driver continues
 * through the rest of their queue; the failed booking re-appears in the admin's
 * pending/picked-up tab with a "retry" badge.
 */
export async function POST(request, { params }) {
  try {
    const { driverId } = await params
    const { userId } = await requireDriver()

    if (driverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { stopIndex, reason } = await request.json()
    if (typeof stopIndex !== 'number') {
      return NextResponse.json({ error: 'stopIndex is required' }, { status: 400 })
    }

    const route = await findActiveRoute(driverId)
    if (!route) {
      return NextResponse.json({ error: 'No active route' }, { status: 404 })
    }

    const stops = route.optimizedStops ?? []
    if (stopIndex < 0 || stopIndex >= stops.length) {
      return NextResponse.json({ error: 'Invalid stopIndex' }, { status: 400 })
    }

    const stop = stops[stopIndex]
    if (stop.stopType === 'endpoint') {
      return NextResponse.json({ error: 'Cannot fail endpoint stop' }, { status: 400 })
    }

    const now = new Date()

    // Idempotency — already marked complete/failed? return current state.
    // Serve from Redis cache (already hydrated) to avoid a DB round-trip.
    if (stop.completedAt) {
      const cacheKey = `driver:${driverId}:route`
      let cached = null
      try { cached = await redis.get(cacheKey) } catch { /* swallow */ }
      const finalRoute = cached ?? await hydrateRouteItems(JSON.parse(JSON.stringify(route)))
      return NextResponse.json({
        success: true,
        idempotent: true,
        route: finalRoute,
      })
    }

    const trimmedReason = String(reason ?? '').trim().slice(0, 500)

    // Update booking → failed_pickup / failed_dropoff (clears driver assignment)
    if (stop.bookingId) {
      await markBookingFailed(String(stop.bookingId), {
        stage: stop.stopType === 'dropoff' ? 'dropoff' : 'pickup',
        reason: trimmedReason,
        driverId,
      })
      const failedStatus = stop.stopType === 'dropoff' ? 'failed_dropoff' : 'failed_pickup'
      try {
        await pushBookingStatusChange(String(stop.bookingId), {
          status: failedStatus,
          updatedAt: now.toISOString(),
          etaSeconds: null,
        })
      } catch { /* non-fatal */ }
    }

    // Mark route stop as failed (completedAt + failedAt so it's skipped in the queue).
    // For pickup_and_dropoff bookings: also cancel the paired dropoff stop — the pickup
    // never happened, so the dropoff is unreachable until admin re-assigns.
    const pairedDropoffCancelled = stop.stopType === 'pickup' && stop.assignmentKind === 'pickup_and_dropoff'
    const updatedStops = stops.map((s, i) => {
      if (i === stopIndex) {
        return { ...s, completedAt: now, failedAt: now, failureReason: trimmedReason }
      }
      if (
        pairedDropoffCancelled &&
        !s.completedAt &&
        s.stopType === 'dropoff' &&
        s.assignmentKind === 'pickup_and_dropoff' &&
        s.bookingId === stop.bookingId
      ) {
        return { ...s, completedAt: now, failedAt: now, failureReason: 'Pickup failed — dropoff skipped' }
      }
      return s
    })
    const allDone = updatedStops.every((s) => s.completedAt)

    const routeUpdateData = {
      optimizedStops: updatedStops,
      ...(allDone ? { isActive: false } : {}),
    }
    await updateRoute(String(route._id), routeUpdateData)

    // A pickup_and_dropoff pickup failure cancels two stops at once (the pickup
    // and its paired dropoff). Both are marked completed/failed so the driver's
    // queue skips them — no gap is left. We do NOT reoptimize server-side (no
    // server-side GPS; driverProfile.currentLocation is always null). Instead we
    // flag pairedDropoffCancelled so the client can reroute from its live GPS:
    // the cancelled dropoff was a waypoint the optimizer ordered the whole route
    // around, so its removal can make a *different* order optimal — not something
    // off-route detection would ever catch. The client only reroutes when 2+
    // pending stops remain (nothing to reorder otherwise).
    const pendingCount = updatedStops.filter(
      (s) => !s.completedAt && s.stopType !== 'endpoint',
    ).length

    const finalRoute = { ...JSON.parse(JSON.stringify(route)), ...routeUpdateData }
    const hydrated = await hydrateRouteItems(finalRoute)

    try {
      if (allDone) {
        await redis.del(`driver:${driverId}:route`)
      } else {
        // Store hydrated so the next route-data cache hit needs no DB query.
        await redis.set(`driver:${driverId}:route`, hydrated, { ex: 300 })
      }
    } catch {
      try { await redis.del(`driver:${driverId}:route`) } catch { /* swallow */ }
    }

    if (!allDone) {
      try { await pushRouteUpdate(driverId, hydrated) } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      success: true,
      route: hydrated,
      pairedDropoffCancelled,
      pendingCount,
    })
  } catch (err) {
    return handleApiError(err, '[POST /api/drivers/[driverId]/stop-failed]')
  }
}
