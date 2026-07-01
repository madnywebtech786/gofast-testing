import { NextResponse } from 'next/server'
import { findBookingByToken } from '@/lib/db/bookings'
import { checkRateLimit } from '@/lib/redis'

// Tracking tokens are 10-character uppercase alphanumeric strings
const TOKEN_RE = /^[A-Z0-9]{10}$/

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')?.trim()

    // Basic presence + format check — no DB hit for invalid shapes
    if (!token) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 })
    }
    if (!TOKEN_RE.test(token)) {
      return NextResponse.json({ error: 'Invalid tracking number format.' }, { status: 400 })
    }

    // Rate limit: 20 lookups per IP per minute
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed, remaining } = await checkRateLimit(`rate:track:${ip}`, 20, 60)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      )
    }

    const booking = await findBookingByToken(token)

    if (!booking) {
      return NextResponse.json({ error: 'No delivery found for that tracking number.' }, { status: 404 })
    }

    // Return only the fields the public search page needs — same projection as findBookingByToken
    // but serialised safely (ObjectId → string)
    const safe = JSON.parse(JSON.stringify(booking))

    return NextResponse.json(
      { booking: safe },
      {
        headers: {
          // Short public cache — stale data for 10s is acceptable, revalidates in background
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          'X-RateLimit-Remaining': String(remaining),
        },
      }
    )
  } catch (err) {
    console.error('[GET /api/track/lookup]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
