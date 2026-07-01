import { ObjectId } from 'mongodb'
import { getDb } from './client.js'

/**
 * List all drivers with their on-duty status.
 * Excludes passwordHash.
 */
export async function findAllDrivers() {
  const db = await getDb()
  return db
    .collection('users')
    .find({ role: 'driver', isActive: true }, { projection: { passwordHash: 0 } })
    .sort({ name: 1 })
    .toArray()
}

/**
 * Find a single driver by ID.
 */
export async function findDriverById(driverId) {
  const db = await getDb()
  return db
    .collection('users')
    .findOne(
      { _id: new ObjectId(driverId), role: 'driver' },
      { projection: { passwordHash: 0 } }
    )
}

/**
 * Save or update the active route for a driver.
 * Deactivates any existing active routes for this driver first.
 */
export async function upsertDriverRoute(driverId, routeData) {
  const db = await getDb()

  // Deactivate old active route
  await db
    .collection('routes')
    .updateMany(
      { driverId: new ObjectId(driverId), isActive: true },
      { $set: { isActive: false } }
    )

  const now = new Date()
  const doc = {
    driverId: new ObjectId(driverId),
    ...routeData,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection('routes').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}

/**
 * Get the current active route for a driver.
 */
export async function findActiveRoute(driverId) {
  const db = await getDb()
  return db
    .collection('routes')
    .findOne({ driverId: new ObjectId(driverId), isActive: true })
}

/**
 * Bulk variant: one query for many drivers. Returns Map<driverIdString, routeDoc>.
 * Used by the admin drivers list to avoid N+1.
 */
export async function findActiveRoutesByDriverIds(driverIds) {
  if (!driverIds?.length) return new Map()
  const db = await getDb()
  const objIds = driverIds.map((id) => new ObjectId(id))
  const routes = await db
    .collection('routes')
    .find({ driverId: { $in: objIds }, isActive: true })
    .toArray()
  return new Map(routes.map((r) => [String(r.driverId), r]))
}

/**
 * Update an existing route document (called by worker notify endpoint).
 */
export async function updateRoute(routeId, updateData) {
  const db = await getDb()
  return db.collection('routes').updateOne(
    { _id: new ObjectId(routeId) },
    { $set: { ...updateData, updatedAt: new Date() } }
  )
}

/**
 * Merge new bookings' stops into the driver's existing active route.
 * Does NOT deactivate the existing route — updates it in-place.
 *
 * @param {string}     routeId           - The _id of the route doc to update
 * @param {ObjectId[]} bookingObjectIds  - Array of new booking _ids to add to assignmentIds
 * @param {Array}      newOptimizedStops - Full re-optimized optimizedStops array
 * @param {object}     routeResult       - { encodedPolyline, distanceMeters, durationSeconds }
 * @param {string}     routePhase        - 'pickup' | 'dropoff'
 */
export async function mergeIntoActiveRoute(
  routeId,
  bookingObjectIds,
  newOptimizedStops,
  routeResult,
  routePhase,
) {
  const db = await getDb()
  return db.collection('routes').updateOne(
    { _id: new ObjectId(routeId) },
    {
      $addToSet: { assignmentIds: { $each: bookingObjectIds } },
      $set: {
        routePhase,
        optimizedStops:       newOptimizedStops,
        encodedPolyline:      routeResult?.encodedPolyline    ?? null,
        totalDistanceMeters:  routeResult?.distanceMeters     ?? null,
        totalDurationSeconds: routeResult?.durationSeconds    ?? null,
        updatedAt: new Date(),
      },
    }
  )
}
