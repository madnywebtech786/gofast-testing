import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findUserByEmail } from '@/lib/db/users'
import { createSession } from '@/lib/session'
import { checkRateLimit } from '@/lib/redis'

// Which portal each role must use, and where to redirect if they use the wrong one
const ROLE_PORTAL = {
  admin:    { portal: 'admin',    loginPath: '/admin_login' },
  driver:   { portal: 'driver',   loginPath: '/driver_login' },
  customer: { portal: 'customer', loginPath: '/login' },
}

const ROLE_DASHBOARDS = {
  admin:    '/admin/dashboard',
  driver:   '/driver/home',
  customer: '/customer/overview',
}

export async function POST(request) {
  try {
    const { email, password, portal } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Rate limit: login attempts per IP.
    // TEMPORARY (client request): raised for pre-production testing/onboarding.
    // REVERT to the secure value before/after going live:
    //   const { allowed } = await checkRateLimit(`rate:login:${ip}`, 10, 900)  // 10 / 15 min
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`rate:login:${ip}`, 100, 900)  // 100 / 15 min
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      )
    }

    const user = await findUserByEmail(email)

    // Use constant-time comparison to prevent timing attacks
    // If user not found, compare against a dummy hash to avoid early exit timing leak
    const dummyHash = '$2b$12$invalidhashfortimingattackprevention000000000000000000'
    const hashToCompare = user?.passwordHash ?? dummyHash
    const passwordMatch = await bcrypt.compare(password, hashToCompare)

    if (!user || !passwordMatch || !user.isActive) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const roleConfig = ROLE_PORTAL[user.role]

    // If the user authenticated successfully but from the wrong portal,
    // do NOT create a session — just tell the client which login page to go to.
    if (portal && roleConfig && roleConfig.portal !== portal) {
      return NextResponse.json({ redirect: roleConfig.loginPath }, { status: 200 })
    }

    await createSession(user._id, user.role)

    return NextResponse.json({ role: user.role, redirect: ROLE_DASHBOARDS[user.role] }, { status: 200 })
  } catch (err) {
    console.error('[POST /api/auth/login]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
