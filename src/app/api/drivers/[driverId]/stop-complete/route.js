import { NextResponse } from 'next/server'
import { requireDriver, handleApiError } from '@/lib/dal'
import { findActiveRoute, updateRoute } from '@/lib/db/drivers'
import { updateBookingStatus } from '@/lib/db/bookings'
import { pushBookingStatusChange, pushRouteUpdate } from '@/lib/pusher'
// import { sendStatusUpdate } from '@/lib/mailer'
import { hydrateRouteItems } from '@/lib/routing/hydrate'
import redis from '@/lib/redis'

/**
 * Decide the next booking status when a stop is completed.
 * Pickup stops → picked_up; dropoff stops → delivered; endpoint → no change.
 */
function nextBookingStatus(stop) {
  if (stop.stopType === 'pickup')  return 'picked_up'
  if (stop.stopType === 'dropoff') return 'delivered'
  return null
}

/**
 * POST /api/drivers/[driverId]/stop-complete
 * Body: { stopIndex: number }
 */
export async function POST(request, { params }) {
  try {
    const { driverId } = await params
    const { userId } = await requireDriver()

    if (driverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { stopIndex } = await request.json()
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
    const now  = new Date()

    // Idempotency guard — if this stop was already marked complete on a prior
    // attempt (e.g. offline-queue retry, double-tap, Pusher echo), return the
    // current route state without touching MongoDB or pushing events again.
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
        newBookingStatus: null,
      })
    }

    const updatedStops = stops.map((s, i) =>
      i === stopIndex ? { ...s, completedAt: now } : s
    )
    const allDone = updatedStops.every((s) => s.completedAt)

    const routeUpdateData = {
      optimizedStops: updatedStops,
      ...(allDone ? { isActive: false } : {}),
    }
    await updateRoute(String(route._id), routeUpdateData)

    const newBookingStatus = nextBookingStatus(stop)

    if (stop.bookingId && newBookingStatus) {
      // Clear assignedDriverId when pickup_only completes so admin can re-assign
      // for delivery. For pickup_and_dropoff, the dropoff stop is already in the
      // route — leave assignedDriverId set so admin cannot create a duplicate.
      const clearDriver = stop.stopType === 'pickup' && stop.assignmentKind === 'pickup_only'
      await updateBookingStatus(String(stop.bookingId), newBookingStatus, {
        note: `Stop ${stopIndex + 1} (${stop.stopType}) completed by driver`,
        driverId,
        clearDriver,
      })
      try {
        await pushBookingStatusChange(String(stop.bookingId), {
          status: newBookingStatus,
          updatedAt: now.toISOString(),
          etaSeconds: null,
        })
      } catch { /* non-fatal */ }

      // Status-change emails disabled — only booking creation sends email.
      // if (newBookingStatus === 'picked_up' || newBookingStatus === 'delivered') {
      //   try {
      //     const booking = await findBookingById(String(stop.bookingId))
      //     if (booking && (booking.senderEmail || booking.receiverEmail)) {
      //       const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
      //       const trackingUrl = `${base}/track/${booking.trackingToken}`
      //       sendStatusUpdate({ booking: JSON.parse(JSON.stringify(booking)), trackingUrl, newStatus: newBookingStatus })
      //         .catch((e) => console.error('[mailer] status update:', e))
      //     }
      //   } catch { /* non-fatal */ }
      // }
    }

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
      // On cache write failure, invalidate the key so the next reader falls
      // through to MongoDB instead of serving a stale pre-completion payload.
      try { await redis.del(`driver:${driverId}:route`) } catch { /* swallow */ }
    }

    if (!allDone) {
      try { await pushRouteUpdate(driverId, hydrated) } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true, route: hydrated, newBookingStatus })
  } catch (err) {
    return handleApiError(err, '[POST /api/drivers/[driverId]/stop-complete]')
  }
}
