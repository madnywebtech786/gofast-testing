import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { verifySession, handleApiError } from '@/lib/dal'
import { findUserById, updateUserPassword } from '@/lib/db/users'
import { getDb } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

export async function POST(request) {
  try {
    const { userId } = await verifySession()
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required.' }, { status: 400 })
    }

    // Strength: min 8 chars, 1 uppercase, 1 number, 1 special
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.' },
        { status: 400 }
      )
    }

    // Fetch with passwordHash to verify current
    const db = await getDb()
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must differ from the current password.' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await updateUserPassword(userId, hash)

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, '[POST /api/user/password]')
  }
}
