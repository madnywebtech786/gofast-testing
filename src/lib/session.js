import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set')
  return new TextEncoder().encode(secret)
}

/**
 * Encrypts a payload into a signed JWT string.
 * @param {{ userId: string, role: string, expiresAt: Date }} payload
 */
export async function encrypt(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(getSecretKey())
}

/**
 * Decrypts and verifies a JWT string.
 * Returns the payload on success, null on failure.
 * @param {string | undefined} token
 */
export async function decrypt(token) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
    })
    return payload
  } catch {
    return null
  }
}

/**
 * Creates a session cookie for the given user.
 * Must be called from a Server Action or Route Handler.
 * @param {string} userId
 * @param {string} role
 */
export async function createSession(userId, role) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const token = await encrypt({ userId: userId.toString(), role, expiresAt })

  const cookieStore = await cookies() // async in Next.js 16
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Deletes the session cookie.
 * Must be called from a Server Action or Route Handler.
 */
export async function deleteSession() {
  const cookieStore = await cookies() // async in Next.js 16
  cookieStore.delete(SESSION_COOKIE)
}

/**
 * Reads and decrypts the current session without redirecting.
 * Returns the session payload or null if not authenticated.
 */
export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return decrypt(token)
}
