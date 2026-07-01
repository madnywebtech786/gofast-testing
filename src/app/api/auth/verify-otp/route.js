import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { checkRateLimit, storeResetToken } from '@/lib/redis'
import { verifyOtpDb } from '@/lib/db/otps'

export async function POST(request) {
  try {
    const body = await request.json()

    // Type-guard before any string operations
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : ''
    const code  = typeof body.code  === 'string' ? body.code.trim()
                : typeof body.code  === 'number' ? String(body.code).trim()
                : ''

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // Digits only, exactly 6 characters
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Code must be 6 digits.' }, { status: 400 })
    }

    // Per-IP rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`rate:verify-otp:${ip}`, 10, 900)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in 15 minutes.' },
        { status: 429 }
      )
    }

    const result = await verifyOtpDb(email, code)

    if (!result.valid) {
      if (result.reason === 'expired') {
        return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
      }
      if (result.reason === 'locked') {
        return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    // Issue a cryptographically random one-time reset token
    const resetToken = randomBytes(32).toString('hex')
    await storeResetToken(resetToken, email)

    return NextResponse.json({ resetToken }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/auth/verify-otp]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
