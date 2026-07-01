import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'

const trackingId = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10)
import { verifySession, handleApiError } from '@/lib/dal'
import {
  createBooking,
  findBookingsByCustomer,
  findAllBookings,
} from '@/lib/db/bookings'
import { sendBookingConfirmed } from '@/lib/mailer'
import { checkRateLimit } from '@/lib/redis'

// Service area bounding box — Greater Alberta / Western Canada
const LAT_MIN =  48.0
const LAT_MAX =  60.0
const LNG_MIN = -120.0
const LNG_MAX = -110.0
const MAX_STRING = 300

function sanitizeStr(val, max = MAX_STRING) {
  if (val == null) return ''
  return String(val).trim().slice(0, max)
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Wrap a longitude into [-180, 180]. A stale/cached client can send an
// un-normalized value (e.g. 246 = -114 + 360) after a map pan across the
// antimeridian; without this it would fail the service-area check below for an
// address that is actually in range. We repair it in place before validating.
function normalizeLng(lng) {
  const n = Number(lng)
  if (!Number.isFinite(n)) return n
  return ((n + 180) % 360 + 360) % 360 - 180
}

function validateStop(stop, label) {
  if (typeof stop.lat !== 'number' || typeof stop.lng !== 'number' || !isFinite(stop.lat) || !isFinite(stop.lng)) {
    return `${label}: coordinates must be numbers`
  }
  if (stop.lat < LAT_MIN || stop.lat > LAT_MAX || stop.lng < LNG_MIN || stop.lng > LNG_MAX) {
    return `${label}: coordinates are outside the service area`
  }
  return null
}

export async function GET(request) {
  try {
    const { userId, role } = await verifySession()
    const { searchParams } = new URL(request.url)

    let bookings
    if (role === 'customer') {
      bookings = await findBookingsByCustomer(userId)
    } else if (role === 'admin') {
      const status = searchParams.get('status') ?? undefined
      const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
      const skip = parseInt(searchParams.get('skip') ?? '0')
      bookings = await findAllBookings({ status, limit, skip })
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(JSON.parse(JSON.stringify(bookings)))
  } catch (err) {
    return handleApiError(err, '[GET /api/bookings]')
  }
}

export async function POST(request) {
  try {
    const { userId, role } = await verifySession()
    if (role !== 'customer') {
      return NextResponse.json({ error: 'Only customers can create bookings' }, { status: 403 })
    }

    // Per-user rate limit: 60 bookings per hour
    const { allowed } = await checkRateLimit(`rate:booking-create:${userId}`, 60, 3600)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many bookings created. Please try again later.' },
        { status: 429 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { stops, packageDetails, senderEmail, receiverEmail, estimatedPrice } = body

    if (!Array.isArray(stops) || stops.length !== 2) {
      return NextResponse.json(
        { error: 'Exactly 2 stops are required: one pickup and one drop-off' },
        { status: 400 }
      )
    }

    const pickup  = stops.find((s) => s?.type === 'pickup')
    const dropoff = stops.find((s) => s?.type === 'dropoff')
    if (!pickup || !dropoff) {
      return NextResponse.json(
        { error: 'Booking must have exactly 1 pickup and 1 drop-off stop' },
        { status: 400 }
      )
    }

    // Repair any antimeridian-wrapped longitude before validating/storing, so a
    // valid in-range address sent by a stale client isn't wrongly rejected.
    pickup.lng  = normalizeLng(pickup.lng)
    dropoff.lng = normalizeLng(dropoff.lng)

    const pickupErr = validateStop(pickup, 'Pickup')
    if (pickupErr) return NextResponse.json({ error: pickupErr }, { status: 400 })
    const dropoffErr = validateStop(dropoff, 'Drop-off')
    if (dropoffErr) return NextResponse.json({ error: dropoffErr }, { status: 400 })

    // Same-location guard (25m minimum separation)
    const R = 6_371_000
    const toRad = (x) => (x * Math.PI) / 180
    const dLat = toRad(dropoff.lat - pickup.lat)
    const dLng = toRad(dropoff.lng - pickup.lng)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(pickup.lat)) * Math.cos(toRad(dropoff.lat)) * Math.sin(dLng / 2) ** 2
    if (2 * R * Math.asin(Math.sqrt(a)) < 25) {
      return NextResponse.json(
        { error: 'Pickup and drop-off cannot be at the same location' },
        { status: 400 }
      )
    }

    // Email validation
    const cleanSenderEmail   = sanitizeStr(senderEmail)
    const cleanReceiverEmail = sanitizeStr(receiverEmail)
    if (cleanSenderEmail   && !isValidEmail(cleanSenderEmail))   return NextResponse.json({ error: 'Invalid sender email'   }, { status: 400 })
    if (cleanReceiverEmail && !isValidEmail(cleanReceiverEmail)) return NextResponse.json({ error: 'Invalid receiver email' }, { status: 400 })

    // estimatedPrice sanity check
    const price = estimatedPrice != null ? Number(estimatedPrice) : null
    if (price !== null && (!isFinite(price) || price < 0 || price > 100_000)) {
      return NextResponse.json({ error: 'Invalid estimated price' }, { status: 400 })
    }

    const trackingToken = trackingId()
    const booking = await createBooking({
      customerId: userId,
      stops: [pickup, dropoff].map((s, i) => ({
        type:         i === 0 ? 'pickup' : 'dropoff',
        order:        i,
        address:      sanitizeStr(s.address) || `${s.lat}, ${s.lng}`,
        coordinates:  { lat: s.lat, lng: s.lng },
        contactName:  sanitizeStr(s.contactName),
        companyName:  sanitizeStr(s.companyName),
        postalCode:   sanitizeStr(s.postalCode),
        buzzCode:     sanitizeStr(s.buzzCode),
        pickupTime:   sanitizeStr(s.pickupTime) || null,
        contactPhone: sanitizeStr(s.contactPhone),
        notes:        sanitizeStr(s.notes),
        completedAt:  null,
      })),
      packageDetails:  packageDetails  ?? null,
      trackingToken,
      senderEmail:    cleanSenderEmail   || null,
      receiverEmail:  cleanReceiverEmail || null,
      estimatedPrice: price,
    })

    // Send confirmation emails — fire-and-forget, never block response
    try {
      const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
      const trackingUrl = `${base}/track/${trackingToken}`
      sendBookingConfirmed({ booking: JSON.parse(JSON.stringify(booking)), trackingUrl })
        .catch((e) => console.error('[mailer] booking confirmed:', e))
    } catch { /* non-fatal */ }

    return NextResponse.json(JSON.parse(JSON.stringify(booking)), { status: 201 })
  } catch (err) {
    return handleApiError(err, '[POST /api/bookings]')
  }
}
