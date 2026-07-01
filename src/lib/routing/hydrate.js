import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/db/client'

/**
 * Attach packageDetails.kind to each stop as packageKind so the driver UI
 * can show the package type without a separate round-trip.
 */
export async function hydrateRouteItems(route) {
  const stops = route?.optimizedStops ?? []
  const ids = [...new Set(
    stops.map((s) => (s.bookingId ? String(s.bookingId) : null)).filter(Boolean)
  )]
  if (ids.length === 0) return route

  const db = await getDb()
  const bookings = await db
    .collection('bookings')
    .find(
      { _id: { $in: ids.map((id) => new ObjectId(id)) } },
      { projection: { 'packageDetails.kind': 1 } },
    )
    .toArray()
  const byId = new Map(bookings.map((b) => [String(b._id), b]))

  return {
    ...route,
    optimizedStops: stops.map((s) => {
      const b = s.bookingId && byId.get(String(s.bookingId))
      if (!b) return s
      return {
        ...s,
        packageKind: b.packageDetails?.kind ?? null,
      }
    }),
  }
}
