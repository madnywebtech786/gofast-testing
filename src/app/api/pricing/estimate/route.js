import { NextResponse } from 'next/server'
import { estimatePrice } from '@/lib/db/pricing'

// Called by the booking form — customer must be authenticated
import { verifySession, handleApiError } from '@/lib/dal'

export async function POST(request) {
  try {
    await verifySession()
    const { pickupAddress, dropoffAddress, weightSlab } = await request.json()

    if (!pickupAddress || !dropoffAddress) {
      return NextResponse.json({ error: 'Missing addresses' }, { status: 400 })
    }

    const result = await estimatePrice({ pickupAddress, dropoffAddress, weightSlab })
    if (!result) {
      return NextResponse.json(null)
    }
    return NextResponse.json(result)
  } catch (err) {
    return handleApiError(err, '[POST /api/pricing/estimate]')
  }
}
