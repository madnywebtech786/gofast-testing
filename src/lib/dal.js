import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db/client'
import { ObjectId } from 'mongodb'

/**
 * Thrown by require* guards when called from an API Route Handler.
 * Route handlers should catch this and return a 401/403 response.
 */
export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

/**
 * Verifies the current session and returns { userId, role }.
 * - In Server Components / Actions: redirects to /login on failure.
 * - In API Route Handlers: throws AuthError(401) — catch it and return NextResponse.
 */
export const verifySession = cache(async () => {
  const session = await getSession()

  if (!session?.userId || !session?.role) {
    // Check if we're in a route handler context (no React renderer)
    try {
      redirect('/login')
    } catch (e) {
      // redirect() throws a special Next.js error — rethrow it so Server Components work
      if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
      throw new AuthError('Not authenticated', 401)
    }
    throw new AuthError('Not authenticated', 401)
  }

  return { userId: session.userId, role: session.role }
})

/**
 * Returns the full user document for the current session.
 * Memoized per request via React cache() — safe to call multiple times.
 */
export const getUser = cache(async () => {
  const { userId } = await verifySession()
  const db = await getDb()
  const user = await db
    .collection('users')
    .findOne({ _id: new ObjectId(userId) }, { projection: { passwordHash: 0 } })

  if (!user) redirect('/login')
  return user
})

/**
 * Map a non-matching role to its canonical landing page so we can redirect
 * rather than throwing a dev-overlay 403 when a page guard fails.
 */
function landingFor(role) {
  if (role === 'driver')   return '/driver/home'
  if (role === 'customer') return '/customer/overview'
  return '/login'
}

/**
 * Verifies session and asserts the role is 'admin'.
 * Safe to call from both Server Components and API Route Handlers — in a
 * Server Component we redirect the user to their own landing page; in a
 * Route Handler we throw AuthError(403) which the handler catches and
 * returns as a JSON error.
 */
export async function requireAdmin() {
  const { userId, role } = await verifySession()
  if (role !== 'admin') {
    try {
      redirect(landingFor(role))
    } catch (e) {
      if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
      throw new AuthError('Forbidden: admin only', 403)
    }
  }
  return { userId, role }
}

/**
 * Verifies session and asserts the role is 'driver'.
 */
export async function requireDriver() {
  const { userId, role } = await verifySession()
  if (role !== 'driver') {
    try {
      redirect(landingFor(role))
    } catch (e) {
      if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
      throw new AuthError('Forbidden: driver only', 403)
    }
  }
  return { userId, role }
}

/**
 * Verifies session and asserts the role is 'customer'.
 */
export async function requireCustomer() {
  const { userId, role } = await verifySession()
  if (role !== 'customer') {
    try {
      redirect(landingFor(role))
    } catch (e) {
      if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e
      throw new AuthError('Forbidden: customer only', 403)
    }
  }
  return { userId, role }
}

/**
 * Verifies session and accepts any authenticated role.
 */
export async function requireAny() {
  return verifySession()
}

/**
 * Use in API route handler catch blocks instead of always returning 500.
 *
 * - AuthError  → 401 / 403 JSON response
 * - NEXT_REDIRECT → rethrows (Server Component redirect, must not be swallowed)
 * - Everything else → 500
 *
 * Usage:
 *   } catch (err) {
 *     return handleApiError(err, '[GET /api/example]')
 *   }
 */
export function handleApiError(err, label = '') {
  // Never swallow Next.js redirect — it must propagate
  if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err

  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }

  if (label) console.error(label, err)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
