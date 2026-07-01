import { ObjectId } from 'mongodb'
import { getDb } from './client.js'

function normalizePackageDetails(pkg) {
  if (!pkg) return null
  return {
    kind:      String(pkg.kind      ?? '').trim().slice(0, 120),
    weightSlab: String(pkg.weightSlab ?? '').trim().slice(0, 60),
  }
}

export const BOOKING_STATUSES = [
  'pending',           // created by customer, waiting for pickup assignment
  'assigned_pickup',   // admin assigned a driver to pick it up
  'picked_up',         // driver confirmed pickup — ready for delivery assignment
  'assigned_delivery', // admin assigned a driver to deliver it
  'delivered',         // driver confirmed delivery
  'cancelled',
  'failed_pickup',     // driver marked pickup as failed — re-assignable
  'failed_dropoff',    // driver marked drop-off as failed — re-assignable
]

/**
 * Create a new booking.
 */
export async function createBooking({ customerId, stops, trackingToken, senderEmail = null, receiverEmail = null, packageDetails = null, estimatedPrice = null }) {
  const db = await getDb()
  const now = new Date()
  const doc = {
    trackingToken,
    customerId: customerId ? new ObjectId(customerId) : null,
    status: 'pending',
    stops,
    packageDetails:  normalizePackageDetails(packageDetails),
    estimatedPrice:  estimatedPrice  ?? null,
    senderEmail:     senderEmail     || null,
    receiverEmail:   receiverEmail   || null,
    assignedDriverId: null,
    assignedAt: null,
    estimatedDistanceMeters: null,
    estimatedDurationSeconds: null,
    statusHistory: [{ status: 'pending', timestamp: now, note: 'Booking created' }],
    createdAt: now,
    updatedAt: now,
  }
  const result = await db.collection('bookings').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}

/**
 * Find a booking by ID.
 * Pass customerId to enforce ownership (customer role).
 */
export async function findBookingById(id, { customerId, driverId } = {}) {
  const db = await getDb()
  const filter = { _id: new ObjectId(id) }
  if (customerId) filter.customerId = new ObjectId(customerId)
  if (driverId) filter.assignedDriverId = new ObjectId(driverId)
  return db.collection('bookings').findOne(filter)
}

/**
 * Find a booking by its public tracking token (no auth required).
 * Joins driver name+phone for pickup and dropoff so the tracking page can
 * show the correct driver at each stage without exposing internal IDs.
 */
export async function findBookingByToken(trackingToken) {
  const db = await getDb()
  const booking = await db.collection('bookings').findOne(
    { trackingToken },
    {
      projection: {
        customerId: 0,
        assignedDriverId: 0,
        senderEmail: 0,
        receiverEmail: 0,
        estimatedPrice: 0,
      },
    }
  )
  if (!booking) return null

  // Collect unique driver IDs that need to be resolved
  const driverIdSet = new Set()
  if (booking.pickupDriverId)  driverIdSet.add(String(booking.pickupDriverId))
  if (booking.dropoffDriverId) driverIdSet.add(String(booking.dropoffDriverId))

  if (driverIdSet.size > 0) {
    const drivers = await db.collection('users')
      .find(
        { _id: { $in: [...driverIdSet].map((id) => new ObjectId(id)) } },
        { projection: { name: 1, phone: 1 } }
      )
      .toArray()

    const driverMap = new Map(drivers.map((d) => [String(d._id), { name: d.name ?? null, phone: d.phone ?? null }]))

    if (booking.pickupDriverId) {
      booking.pickupDriver = driverMap.get(String(booking.pickupDriverId)) ?? null
    }
    if (booking.dropoffDriverId) {
      booking.dropoffDriver = driverMap.get(String(booking.dropoffDriverId)) ?? null
    }
  }

  // Remove raw ObjectId fields — only expose the resolved name/phone objects
  delete booking.pickupDriverId
  delete booking.dropoffDriverId

  return booking
}

/**
 * List bookings for a specific customer (newest first).
 */
export async function findBookingsByCustomer(customerId, { limit = 20, skip = 0, statusIn = null } = {}) {
  const db = await getDb()
  const query = { customerId: new ObjectId(customerId) }
  if (statusIn?.length) query.status = { $in: statusIn }
  return db
    .collection('bookings')
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()
}

/**
 * List all bookings (admin), optionally filtered by status.
 * `status` may be a single status string or an array of statuses.
 */
function buildAdminFilter({ status, hasDriver, sinceDate, untilDate, search }) {
  const filter = Array.isArray(status)
    ? (status.length > 0 ? { status: { $in: status } } : {})
    : (status ? { status } : {})
  if (hasDriver === true)  filter.assignedDriverId = { $ne: null }
  if (hasDriver === false) filter.assignedDriverId = null
  if (sinceDate || untilDate) {
    filter.createdAt = {}
    if (sinceDate) filter.createdAt.$gte = sinceDate
    if (untilDate) filter.createdAt.$lte = untilDate
  }
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [
      { senderEmail:          re },
      { 'stops.contactName':  re },
      { 'stops.address':      re },
    ]
  }
  return filter
}

export async function findAllBookings({ status, hasDriver, sinceDate, untilDate, search, limit = 50, skip = 0 } = {}) {
  const db = await getDb()
  return db
    .collection('bookings')
    .find(buildAdminFilter({ status, hasDriver, sinceDate, untilDate, search }))
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()
}

export async function countAllBookings({ status, hasDriver, sinceDate, untilDate, search } = {}) {
  const db = await getDb()
  return db.collection('bookings').countDocuments(
    buildAdminFilter({ status, hasDriver, sinceDate, untilDate, search })
  )
}

// Sanity ceiling for "select all matching this filter" — a bounded guard
// against an unbounded query, not a real business limit. Mirrors the
// reasoning behind MAX_STOPS_PER_ROUTE in bulk-assign/route.js: this is a
// safety cap on accidental scale, not an expected real-world count.
const SELECT_ALL_MAX_RESULTS = 500

/**
 * Same admin filter as findAllBookings, but returns only the fields the
 * "select all matching this filter" UI action needs (not full documents) and
 * has no pagination — up to SELECT_ALL_MAX_RESULTS matches, sorted the same
 * way findAllBookings/the paginated list is, so "select all" always lines up
 * with what the paginated view would show across all its pages.
 */
export async function findAllBookingsLean({ status, hasDriver, sinceDate, untilDate, search } = {}) {
  const db = await getDb()
  return db
    .collection('bookings')
    .find(
      buildAdminFilter({ status, hasDriver, sinceDate, untilDate, search }),
      { projection: { _id: 1, status: 1, assignedDriverId: 1, stops: 1, trackingToken: 1 } }
    )
    .sort({ createdAt: -1 })
    .limit(SELECT_ALL_MAX_RESULTS)
    .toArray()
}

/**
 * Find multiple bookings by their IDs. Returns only the ones that exist.
 */
export async function findBookingsByIds(ids) {
  const db = await getDb()
  return db
    .collection('bookings')
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .toArray()
}

/**
 * Update booking status and append to status history.
 * Pass clearDriver:true when transitioning to 'picked_up' from a pickup_only
 * assignment — clears assignedDriverId so admin can re-assign for delivery.
 * Do NOT pass clearDriver for pickup_and_dropoff bookings: the dropoff stop
 * is already in the driver's route and must not be re-assigned.
 */
export async function updateBookingStatus(id, status, { note = '', driverId, clearDriver = false } = {}) {
  const db = await getDb()
  const filter = { _id: new ObjectId(id) }
  if (driverId) filter.assignedDriverId = new ObjectId(driverId)

  const setFields = { status, updatedAt: new Date() }
  if (clearDriver) setFields.assignedDriverId = null

  return db.collection('bookings').updateOne(filter, {
    $set: setFields,
    $push: { statusHistory: { status, timestamp: new Date(), note } },
  })
}

/**
 * Assign a driver to a booking for either pickup or delivery.
 * newStatus must be 'assigned_pickup' or 'assigned_delivery'.
 * allowedFromStatus is the status the booking must currently be in.
 */
export async function assignDriverToBooking(
  bookingId,
  driverId,
  { estimatedDistanceMeters, estimatedDurationSeconds, newStatus, allowedFromStatus, kind } = {}
) {
  const db = await getDb()
  const now = new Date()
  const status = newStatus ?? 'assigned_pickup'
  const fromStatus = allowedFromStatus ?? 'pending'

  const setFields = {
    assignedDriverId: new ObjectId(driverId),
    assignedAt: now,
    status,
    estimatedDistanceMeters: estimatedDistanceMeters || null,
    estimatedDurationSeconds: estimatedDurationSeconds || null,
    updatedAt: now,
  }

  // Track which driver handles each stage so the tracking page shows the right
  // person at pickup vs drop-off, including split-driver orders.
  // pickup_only    → only pickupDriverId (dropoffDriverId set later when delivery assigned)
  // pickup_and_dropoff → both fields, same driver
  // delivery_only  → only dropoffDriverId
  if (kind === 'pickup_only') {
    setFields.pickupDriverId = new ObjectId(driverId)
  } else if (kind === 'pickup_and_dropoff') {
    setFields.pickupDriverId  = new ObjectId(driverId)
    setFields.dropoffDriverId = new ObjectId(driverId)
  } else if (kind === 'delivery_only') {
    setFields.dropoffDriverId = new ObjectId(driverId)
  }

  return db.collection('bookings').updateOne(
    { _id: new ObjectId(bookingId), status: fromStatus },
    {
      $set: setFields,
      $push: { statusHistory: { status, timestamp: now, note: 'Driver assigned' } },
    }
  )
}

/**
 * Find all bookings with status 'picked_up' (ready for delivery assignment).
 */
export async function findPickedUpBookings({ limit = 50 } = {}) {
  const db = await getDb()
  return db
    .collection('bookings')
    .find({ status: 'picked_up' })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()
}

/**
 * Admin dashboard counters (used with Next.js cache).
 */
export async function getBookingCounters() {
  const db = await getDb()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [pending, active, todayDelivered] = await Promise.all([
    // Pending includes failed_pickup (retry) so admin sees the true to-do count
    db.collection('bookings').countDocuments({ status: { $in: ['pending', 'failed_pickup'] } }),
    db
      .collection('bookings')
      .countDocuments({ status: { $in: ['assigned_pickup', 'picked_up', 'assigned_delivery'] } }),
    db
      .collection('bookings')
      .countDocuments({ status: 'delivered', updatedAt: { $gte: today } }),
  ])

  return { pending, active, todayDelivered }
}

/**
 * Get bookings assigned to a driver, optionally filtered by status group.
 * statusGroup: 'active' | 'completed' | 'all'
 */
export async function findBookingsByDriver(driverId, { statusGroup = 'all', limit = 30 } = {}) {
  const db = await getDb()
  const filter = { assignedDriverId: new ObjectId(driverId) }

  if (statusGroup === 'active') {
    filter.status = { $in: ['assigned_pickup', 'picked_up', 'assigned_delivery'] }
  } else if (statusGroup === 'completed') {
    filter.status = 'delivered'
  }

  return db
    .collection('bookings')
    .find(filter, {
      projection: {
        _id: 1, status: 1, stops: 1, assignedAt: 1,
        estimatedDistanceMeters: 1, estimatedDurationSeconds: 1, updatedAt: 1,
      },
    })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray()
}

/**
 * Stats for a driver dashboard.
 */
export async function getDriverStats(driverId) {
  const db = await getDb()
  const id = new ObjectId(driverId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [assigned, inProgress, completedToday, completedTotal] = await Promise.all([
    db.collection('bookings').countDocuments({ assignedDriverId: id, status: { $in: ['assigned_pickup', 'assigned_delivery'] } }),
    db.collection('bookings').countDocuments({ assignedDriverId: id, status: 'picked_up' }),
    db.collection('bookings').countDocuments({ assignedDriverId: id, status: 'delivered', updatedAt: { $gte: today } }),
    db.collection('bookings').countDocuments({ assignedDriverId: id, status: 'delivered' }),
  ])

  return { assigned, inProgress, completedToday, completedTotal }
}

/**
 * Mark package items as picked up or delivered.
 *   stage: 'pickup' | 'dropoff'
 *   itemIds: array of itemId strings (must belong to booking.packageDetails.items)
 *
 * Uses a positional array filter so we only stamp the requested items.
 * Idempotent: re-stamping the same itemId is a no-op (we only set when null).
 */
export async function markBookingItems(bookingId, { stage, itemIds, driverId } = {}) {
  if (!itemIds?.length) return { matchedCount: 0, modifiedCount: 0 }
  const db = await getDb()
  const field = stage === 'dropoff' ? 'packageDetails.items.$[elem].deliveredAt' : 'packageDetails.items.$[elem].pickedUpAt'
  const now = new Date()
  const filter = { _id: new ObjectId(bookingId) }
  if (driverId) filter.assignedDriverId = new ObjectId(driverId)
  return db.collection('bookings').updateOne(
    filter,
    { $set: { [field]: now, updatedAt: now } },
    {
      arrayFilters: [{
        'elem.itemId': { $in: itemIds },
        ...(stage === 'dropoff' ? { 'elem.deliveredAt': null } : { 'elem.pickedUpAt': null }),
      }],
    }
  )
}

/**
 * Mark a booking as failed at the pickup or dropoff stage.
 *   stage: 'pickup' | 'dropoff'
 *   reason: free-form string entered by the driver
 *
 * Sets status to `failed_pickup` / `failed_dropoff`, stores the reason on
 * the booking, and appends a history entry. The driver assignment is
 * cleared so admin re-assign works the same as a fresh booking.
 */
export async function markBookingFailed(bookingId, { stage, reason, driverId } = {}) {
  const db = await getDb()
  const now = new Date()
  const newStatus = stage === 'dropoff' ? 'failed_dropoff' : 'failed_pickup'
  const note = `Marked ${stage} failed${reason ? `: ${reason}` : ''}`
  const filter = { _id: new ObjectId(bookingId) }
  if (driverId) filter.assignedDriverId = new ObjectId(driverId)
  return db.collection('bookings').updateOne(filter, {
    $set: {
      status: newStatus,
      assignedDriverId: null,
      assignedAt: null,
      lastFailure: { stage, reason: String(reason ?? '').slice(0, 500), at: now, driverId: driverId ? new ObjectId(driverId) : null },
      updatedAt: now,
    },
    $push: { statusHistory: { status: newStatus, timestamp: now, note, driverId } },
  })
}

/**
 * Cancel a booking (customer can only cancel their own pending bookings).
 */
export async function cancelBooking(bookingId, { customerId } = {}) {
  const db = await getDb()
  const filter = { _id: new ObjectId(bookingId), status: 'pending' }
  if (customerId) filter.customerId = new ObjectId(customerId)

  return db.collection('bookings').updateOne(filter, {
    $set: { status: 'cancelled', updatedAt: new Date() },
    $push: { statusHistory: { status: 'cancelled', timestamp: new Date(), note: 'Booking cancelled' } },
  })
}
