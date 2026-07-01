import { NextResponse } from 'next/server'
import { verifySession, handleApiError } from '@/lib/dal'
import {
  findBookingById,
  updateBookingStatus,
  cancelBooking,
  BOOKING_STATUSES,
} from '@/lib/db/bookings'
import { pushBookingStatusChange } from '@/lib/pusher'
import { revalidateTag } from 'next/cache'

export async function GET(request, { params }) {
  try {
    const { bookingId } = await params // async params — Next.js 16
    const { userId, role } = await verifySession()

    const filters = {}
    if (role === 'customer') filters.customerId = userId
    if (role === 'driver') filters.driverId = userId

    const booking = await findBookingById(bookingId, filters)
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    return NextResponse.json(JSON.parse(JSON.stringify(booking)))
  } catch (err) {
    return handleApiError(err, '[GET /api/bookings/[bookingId]]')
  }
}

export async function PATCH(request, { params }) {
  try {
    const { bookingId } = await params // async params — Next.js 16
    const { userId, role } = await verifySession()

    if (role !== 'admin' && role !== 'driver') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { status, note } = await request.json()

    if (!BOOKING_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Drivers may only move bookings to statuses their role legitimately produces.
    // All other driver-side transitions go through stop-complete / stop-failed.
    const DRIVER_ALLOWED_STATUSES = ['picked_up', 'delivered', 'failed_pickup', 'failed_dropoff']
    if (role === 'driver' && !DRIVER_ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Forbidden: drivers cannot set that status' }, { status: 403 })
    }

    // Drivers can only update bookings assigned to them
    const driverFilter = role === 'driver' ? userId : undefined
    const result = await updateBookingStatus(bookingId, status, {
      note: note ?? '',
      driverId: driverFilter,
    })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Booking not found or not authorized' }, { status: 404 })
    }

    // Push real-time status update to booking channel
    await pushBookingStatusChange(bookingId, {
      status,
      updatedAt: new Date().toISOString(),
      etaSeconds: null,
    })

    revalidateTag('booking-counters')

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, '[PATCH /api/bookings/[bookingId]]')
  }
}

export async function DELETE(request, { params }) {
  try {
    const { bookingId } = await params // async params — Next.js 16
    const { userId, role } = await verifySession()

    let result
    if (role === 'admin') {
      result = await cancelBooking(bookingId)
    } else if (role === 'customer') {
      result = await cancelBooking(bookingId, { customerId: userId })
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Booking not found, not authorized, or already past pending status' },
        { status: 404 }
      )
    }

    revalidateTag('booking-counters')
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, '[DELETE /api/bookings/[bookingId]]')
  }
}
