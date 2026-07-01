import { NextResponse } from 'next/server'
import { requireDriver, handleApiError } from '@/lib/dal'
import { findActiveRoute } from '@/lib/db/drivers'
import { reoptimizeRoute } from '@/lib/routing/reoptimize'

/**
 * POST /api/drivers/[driverId]/reroute
 * Body: { currentLng: number, currentLat: number, endPoint?: { lng, lat, address } }
 *
 * All the TSP + precedence + Directions logic lives in @/lib/routing/reoptimize
 * so the admin bulk-assign flow can call the same function directly (no HTTP self-call).
 */
export async function POST(request, { params }) {
  try {
    const { driverId } = await params
    const { userId } = await requireDriver()

    if (driverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { currentLng, currentLat, endPoint: bodyEndPoint } = await request.json()
    if (currentLng == null || currentLat == null) {
      return NextResponse.json({ error: 'currentLng and currentLat are required' }, { status: 400 })
    }

    // Quick 404 check so the caller sees a proper error
    const route = await findActiveRoute(driverId)
    if (!route) return NextResponse.json({ error: 'No active route' }, { status: 404 })

    const updated = await reoptimizeRoute({
      driverId,
      currentLng,
      currentLat,
      endPointOverride: bodyEndPoint ?? null,
    })

    if (!updated) {
      return NextResponse.json({ route: JSON.parse(JSON.stringify(route)), rerouted: false })
    }

    return NextResponse.json({ route: updated, rerouted: true })
  } catch (err) {
    return handleApiError(err, '[POST /api/drivers/[driverId]/reroute]')
  }
}
