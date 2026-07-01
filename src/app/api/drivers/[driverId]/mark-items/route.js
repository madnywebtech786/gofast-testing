import { NextResponse } from 'next/server'
import { requireDriver, handleApiError } from '@/lib/dal'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/db/client'
import { markBookingItems } from '@/lib/db/bookings'
import redis from '@/lib/redis'

/**
 * POST /api/drivers/[driverId]/mark-items
 * Body: { bookingId, stage: 'pickup' | 'dropoff', itemIds: string[] }
 *
 * Stamps packageDetails.items[].pickedUpAt or .deliveredAt with now() for
 * every itemId that currently has a null timestamp for that stage.
 * Idempotent — a repeat call with the same ids is a no-op.
 *
 * The driver's active-route Redis cache is invalidated so the next
 * route-data fetch re-hydrates item state from Mongo.
 */
export async function POST(request, { params }) {
  try {
    const { driverId } = await params
    const { userId } = await requireDriver()
    if (driverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { bookingId, stage, itemIds } = await request.json()
    if (!bookingId || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'bookingId and itemIds are required' }, { status: 400 })
    }
    if (stage !== 'pickup' && stage !== 'dropoff') {
      return NextResponse.json({ error: 'stage must be pickup or dropoff' }, { status: 400 })
    }

    await markBookingItems(bookingId, { stage, itemIds, driverId })

    // Fetch only the items array — no need for the full booking document.
    const db = await getDb()
    const booking = await db.collection('bookings').findOne(
      { _id: new ObjectId(bookingId) },
      { projection: { 'packageDetails.items': 1 } },
    )

    // Invalidate the route cache — items aren't stored on the route doc but
    // ARE hydrated onto the route-data response, so the next fetch needs to
    // re-query Mongo for the latest item timestamps.
    try { await redis.del(`driver:${driverId}:route`) } catch { /* swallow */ }

    return NextResponse.json({
      success: true,
      items: booking?.packageDetails?.items ?? [],
    })
  } catch (err) {
    return handleApiError(err, '[POST /api/drivers/[driverId]/mark-items]')
  }
}
