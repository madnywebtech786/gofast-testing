import { NextResponse } from 'next/server'
import { requireDriver, handleApiError } from '@/lib/dal'
import { findActiveRoute, updateRoute } from '@/lib/db/drivers'
import { hydrateRouteItems } from '@/lib/routing/hydrate'
import redis from '@/lib/redis'

/**
 * POST /api/drivers/[driverId]/set-endpoint
 * Body: { endPoint: { lng, lat, address } }
 *
 * Persists the driver's end-point (final destination) to the active route document in DB.
 * This allows the route to be resumed exactly if the app closes or connectivity is lost.
 * Called before reroute optimization so that reroute can use the stored end-point.
 */
export async function POST(request, { params }) {
  try {
    const { driverId } = await params
    const { userId } = await requireDriver()

    // Drivers can only set their own end-point
    if (driverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { endPoint } = await request.json()
    if (!endPoint || typeof endPoint.lng !== 'number' || typeof endPoint.lat !== 'number') {
      return NextResponse.json({ error: 'endPoint must be { lng, lat, address }' }, { status: 400 })
    }

    // Normalize + bounds-check coordinates. Google Maps getCenter().lng() can
    // return an un-normalized longitude (e.g. 246) after a large panTo across
    // the antimeridian; wrap it into [-180, 180] so the stored endpoint never
    // poisons ORS / Google Routes (both reject out-of-range longitudes). A NaN
    // or out-of-range latitude is a hard error.
    const normLng = ((Number(endPoint.lng) + 180) % 360 + 360) % 360 - 180
    const lat = Number(endPoint.lat)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(normLng)) {
      return NextResponse.json({ error: 'endPoint coordinates out of range' }, { status: 400 })
    }
    const safeEndPoint = { ...endPoint, lng: normLng, lat }

    // Get the driver's active route
    const route = await findActiveRoute(driverId)
    if (!route) {
      return NextResponse.json({ error: 'No active route found' }, { status: 404 })
    }

    // Persist end-point to route document
    await updateRoute(String(route._id), { endPoint: safeEndPoint })

    // Update Redis cache with hydrated route so the next route-data hit needs no DB query.
    try {
      const updated = await hydrateRouteItems({ ...route, endPoint: safeEndPoint })
      await redis.set(`driver:${driverId}:route`, updated, { ex: 300 })
    } catch {
      try { await redis.del(`driver:${driverId}:route`) } catch { /* swallow */ }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, '[POST /api/drivers/[driverId]/set-endpoint]')
  }
}
