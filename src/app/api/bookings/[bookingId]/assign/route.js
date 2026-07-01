import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { findBookingById } from '@/lib/db/bookings'

const STATUS_TO_DEFAULT_KIND = {
  pending:   'pickup_only',
  picked_up: 'delivery_only',
}

const LEGACY_KIND_ALIASES = {
  pickup:   'pickup_only',
  delivery: 'delivery_only',
}

/**
 * POST /api/bookings/[bookingId]/assign
 * Body: { driverId: string, kind?: string, assignmentType?: string (legacy) }
 *
 * Thin wrapper — forwards to bulk-assign with a single assignment entry.
 */
export async function POST(request, { params }) {
  try {
    const { bookingId } = await params
    await requireAdmin()

    const body = await request.json()
    const { driverId } = body
    if (!driverId) {
      return NextResponse.json({ error: 'driverId is required' }, { status: 400 })
    }

    const booking = await findBookingById(bookingId)
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const explicitKind = LEGACY_KIND_ALIASES[body.kind ?? body.assignmentType] ?? (body.kind ?? body.assignmentType)
    const kind = explicitKind ?? STATUS_TO_DEFAULT_KIND[booking.status]

    if (!kind) {
      return NextResponse.json(
        { error: `Cannot assign a booking with status '${booking.status}'` },
        { status: 409 }
      )
    }

    const origin = request.headers.get('origin') ?? request.nextUrl.origin
    const res = await fetch(`${origin}/api/bookings/bulk-assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({
        driverId,
        assignments: [{ bookingId, kind }],
      }),
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json(data, { status: res.status })

    return NextResponse.json({ success: true, merged: data.merged ?? false })
  } catch (err) {
    return handleApiError(err, '[POST /api/bookings/[bookingId]/assign]')
  }
}
