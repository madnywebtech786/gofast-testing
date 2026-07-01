import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { consumeResetToken, checkRateLimit } from '@/lib/redis'
import { findUserByEmail, updateUserPassword } from '@/lib/db/users'

const PASSWORD_RE  = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
const MAX_PW_BYTES = 72  // bcrypt truncates beyond this

export async function POST(request) {
  try {
    const body = await request.json()

    const resetToken = typeof body.resetToken === 'string' ? body.resetToken.trim() : ''
    const password   = typeof body.password   === 'string' ? body.password          : ''

    if (!resetToken || !password) {
      return NextResponse.json({ error: 'Reset token and new password are required.' }, { status: 400 })
    }

    if (!/^[a-f0-9]{64}$/.test(resetToken)) {
      return NextResponse.json({ error: 'Invalid reset token.' }, { status: 400 })
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_PW_BYTES) {
      return NextResponse.json(
        { error: 'Password is too long (max 72 characters).' },
        { status: 400 }
      )
    }

    if (!PASSWORD_RE.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with an uppercase letter, a number, and a special character.' },
        { status: 400 }
      )
    }

    // Per-IP rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`rate:reset-pw:${ip}`, 5, 900)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in 15 minutes.' },
        { status: 429 }
      )
    }

    // Consume the one-time reset token — deleted immediately so it can't be reused
    const email = await consumeResetToken(resetToken)
    if (!email) {
      return NextResponse.json(
        { error: 'Reset link has expired or already been used. Please request a new one.' },
        { status: 400 }
      )
    }

    const user = await findUserByEmail(email)
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    }

    const newHash = await bcrypt.hash(password, 12)
    await updateUserPassword(user._id, newHash)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/auth/reset-password]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
