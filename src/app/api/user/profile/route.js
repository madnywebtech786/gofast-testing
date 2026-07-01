import { NextResponse } from 'next/server'
import { verifySession, handleApiError } from '@/lib/dal'
import { findUserById, updateUserProfile, emailExists } from '@/lib/db/users'

export async function GET() {
  try {
    const { userId } = await verifySession()
    const user = await findUserById(userId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(JSON.parse(JSON.stringify(user)))
  } catch (err) {
    return handleApiError(err, '[GET /api/user/profile]')
  }
}

export async function PATCH(request) {
  try {
    const { userId, role } = await verifySession()
    const body = await request.json()

    // Fields allowed per role
    const customerFields = ['name', 'phone', 'contactName', 'companyName', 'buzzCode']
    const adminFields    = ['name', 'phone', 'address']
    const allowed = role === 'admin' ? adminFields : customerFields

    const update = {}
    for (const key of allowed) {
      if (key in body) {
        update[key] = typeof body[key] === 'string' ? body[key].trim().slice(0, 300) : body[key]
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Mark customer profile as updated so BookingForm can prefill
    if (role === 'customer') {
      update.profileUpdated = true
    }

    const updated = await updateUserProfile(userId, update)
    return NextResponse.json(JSON.parse(JSON.stringify(updated)))
  } catch (err) {
    return handleApiError(err, '[PATCH /api/user/profile]')
  }
}
