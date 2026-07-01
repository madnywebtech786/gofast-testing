import { NextResponse } from 'next/server'
import { requireDriver, handleApiError } from '@/lib/dal'
import { findBookingsByDriver } from '@/lib/db/bookings'

export async function GET(request, { params }) {
  try {
    const { driverId } = await params
    const { userId } = await requireDriver()

    if (driverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusGroup = searchParams.get('statusGroup') ?? 'all'

    const bookings = await findBookingsByDriver(driverId, { statusGroup })
    return NextResponse.json(JSON.parse(JSON.stringify(bookings)))
  } catch (err) {
    return handleApiError(err, '[GET /api/drivers/[driverId]/bookings]')
  }
}
