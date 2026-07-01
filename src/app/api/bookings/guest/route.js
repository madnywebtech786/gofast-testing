import { NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'

const trackingId = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10)
import { checkRateLimit } from '@/lib/redis'
import { createBooking } from '@/lib/db/bookings'
import { sendBookingConfirmed } from '@/lib/mailer'

// 20 guest bookings per IP per hour
const GUEST_RATE_LIMIT   = 20
const GUEST_RATE_WINDOW  = 3600 // seconds

// Coordinate bounding box — Greater Alberta / Western Canada.
// Rejects obviously fake or out-of-region coordinates before touching the DB.
const LAT_MIN =  48.0
const LAT_MAX =  60.0
const LNG_MIN = -120.0
const LNG_MAX = -110.0

const MAX_STRING = 300  // max chars for any free-text field

function sanitizeStr(val, max = MAX_STRING) {
  if (val == null) return ''
  return String(val).trim().slice(0, max)
}

function isValidEmail(email) {
  // RFC-5322 simplified — good enough for a format check before sending
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Wrap a longitude into [-180, 180] — a stale client can send a wrapped value
// (e.g. 246 = -114 + 360) which would otherwise fail the service-area check.
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
  if (!sanitizeStr(stop.contactPhone)) {
    return `${label}: phone number is required`
  }
  return null
}

export async function POST(request) {
  try {
    // ── Rate limit by IP ──────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`rate:guest-booking:${ip}`, GUEST_RATE_LIMIT, GUEST_RATE_WINDOW)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many bookings from this location. Please try again in an hour.' },
        { status: 429 }
      )
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { stops, packageDetails, senderEmail, receiverEmail, estimatedPrice } = body

    // ── Structural validation ─────────────────────────────────────────────────
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

    // ── Per-stop validation ───────────────────────────────────────────────────
    // Repair antimeridian-wrapped longitude before validating/storing.
    pickup.lng  = normalizeLng(pickup.lng)
    dropoff.lng = normalizeLng(dropoff.lng)

    const pickupErr  = validateStop(pickup,  'Pickup')
    if (pickupErr)  return NextResponse.json({ error: pickupErr  }, { status: 400 })
    const dropoffErr = validateStop(dropoff, 'Drop-off')
    if (dropoffErr) return NextResponse.json({ error: dropoffErr }, { status: 400 })

    // ── Same-location guard ───────────────────────────────────────────────────
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

    // ── Email validation (optional fields) ────────────────────────────────────
    const cleanSenderEmail   = sanitizeStr(senderEmail)
    const cleanReceiverEmail = sanitizeStr(receiverEmail)
    if (cleanSenderEmail   && !isValidEmail(cleanSenderEmail))   return NextResponse.json({ error: 'Invalid sender email'   }, { status: 400 })
    if (cleanReceiverEmail && !isValidEmail(cleanReceiverEmail)) return NextResponse.json({ error: 'Invalid receiver email' }, { status: 400 })

    // ── Package details ───────────────────────────────────────────────────────
    const pkg = packageDetails ?? {}

    // ── estimatedPrice sanity check ───────────────────────────────────────────
    const price = estimatedPrice != null ? Number(estimatedPrice) : null
    if (price !== null && (!isFinite(price) || price < 0 || price > 100_000)) {
      return NextResponse.json({ error: 'Invalid estimated price' }, { status: 400 })
    }

    // ── Build booking ─────────────────────────────────────────────────────────
    const trackingToken = trackingId()

    const booking = await createBooking({
      customerId: null, // guest — no account
      trackingToken,
      stops: [
        {
          type:         'pickup',
          order:        0,
          address:      sanitizeStr(pickup.address) || `${pickup.lat}, ${pickup.lng}`,
          coordinates:  { lat: pickup.lat, lng: pickup.lng },
          contactName:  sanitizeStr(pickup.contactName),
          companyName:  sanitizeStr(pickup.companyName),
          buzzCode:     sanitizeStr(pickup.buzzCode),
          pickupTime:   sanitizeStr(pickup.pickupTime) || null,
          contactPhone: sanitizeStr(pickup.contactPhone),
          notes:        sanitizeStr(pickup.notes),
          completedAt:  null,
        },
        {
          type:         'dropoff',
          order:        1,
          address:      sanitizeStr(dropoff.address) || `${dropoff.lat}, ${dropoff.lng}`,
          coordinates:  { lat: dropoff.lat, lng: dropoff.lng },
          contactName:  sanitizeStr(dropoff.contactName),
          companyName:  sanitizeStr(dropoff.companyName),
          buzzCode:     sanitizeStr(dropoff.buzzCode),
          contactPhone: sanitizeStr(dropoff.contactPhone),
          notes:        sanitizeStr(dropoff.notes),
          completedAt:  null,
        },
      ],
      packageDetails: {
        kind:       sanitizeStr(pkg.kind),
        weightSlab: sanitizeStr(pkg.weightSlab),
      },
      senderEmail:    cleanSenderEmail   || null,
      receiverEmail:  cleanReceiverEmail || null,
      estimatedPrice: price,
    })

    // ── Confirmation email — fire-and-forget ──────────────────────────────────
    try {
      const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
      const trackingUrl = `${base}/track/${trackingToken}`
      sendBookingConfirmed({ booking: JSON.parse(JSON.stringify(booking)), trackingUrl })
        .catch((e) => console.error('[mailer] guest booking confirmed:', e))
    } catch { /* non-fatal */ }

    // Return only tracking token — guest has no portal to redirect to
    return NextResponse.json(
      { trackingToken: booking.trackingToken },
      { status: 201 }
    )
  } catch (err) {
    console.error('[POST /api/bookings/guest]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
