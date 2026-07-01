import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createUser, emailExists } from '@/lib/db/users'
import { createSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/redis'

export async function POST(request) {
  try {
    const { name, email, password, phone } = await request.json()

    // Basic required field validation
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required.' },
        { status: 400 }
      )
    }

    // Email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // Password strength: min 8 chars, 1 uppercase, 1 number
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include an uppercase letter and a number.' },
        { status: 400 }
      )
    }

    // Rate limit: 5 registrations per IP per hour
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`rate:register:${ip}`, 5, 3600)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Duplicate email check
    const taken = await emailExists(email)
    if (taken) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await createUser({
      email,
      passwordHash,
      name: name.trim(),
      role: 'customer',
      phone: phone?.trim() || null,
    })

    // Auto sign-in after registration
    await createSession(user._id, 'customer')

    return NextResponse.json({ role: 'customer' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
