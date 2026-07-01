import { NextResponse } from 'next/server'
import { requireDriver, handleApiError } from '@/lib/dal'
import { getDriverStats } from '@/lib/db/bookings'
import { findDriverById } from '@/lib/db/drivers'

export async function GET(request, { params }) {
  try {
    const { driverId } = await params
    const { userId } = await requireDriver()

    if (driverId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [stats, driver] = await Promise.all([
      getDriverStats(driverId),
      findDriverById(driverId),
    ])

    return NextResponse.json({ ...stats, name: driver?.name ?? '' })
  } catch (err) {
    return handleApiError(err, '[GET /api/drivers/[driverId]/stats]')
  }
}
