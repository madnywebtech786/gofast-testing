import { NextResponse } from 'next/server'
import { findUserByEmail } from '@/lib/db/users'
import { checkRateLimit, generateOtp } from '@/lib/redis'
import { storeOtpDb, canResendOtpDb } from '@/lib/db/otps'
import { sendPasswordResetOtp } from '@/lib/mailer'

// Rate limit: 5 requests per IP per 15 minutes
const IP_LIMIT  = 5
const IP_WINDOW = 900

export async function POST(request) {
  try {
    const body = await request.json()

    // Validate types before touching values
    const email  = typeof body.email  === 'string' ? body.email.toLowerCase().trim() : ''
    const resend = body.resend === true

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // Per-IP rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`rate:forgot:${ip}`, IP_LIMIT, IP_WINDOW)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in 15 minutes.' },
        { status: 429 }
      )
    }

    // Always check resend cooldown — regardless of the resend flag.
    // An existing OTP doc means one was recently sent.
    if (resend) {
      const ok = await canResendOtpDb(email)
      if (!ok) {
        return NextResponse.json(
          { error: 'Please wait 60 seconds before requesting a new code.' },
          { status: 429 }
        )
      }
    }

    // Always respond with success to prevent email enumeration.
    // Only send the email if the account exists, is active, and is a customer.
    // Admins and drivers have separate account recovery processes.
    const user = await findUserByEmail(email)
    if (user && user.isActive && user.role === 'customer') {
      const otp = generateOtp()
      await storeOtpDb(email, otp)
      await sendPasswordResetOtp({ to: email, otp, userName: user.name })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/auth/forgot-password]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
