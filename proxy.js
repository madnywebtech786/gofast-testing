import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

// Role → default dashboard path
const ROLE_DASHBOARDS = {
  admin: '/dashboard',
  driver: '/home',
  customer: '/my-bookings',
  receiver: '/login', // receivers use trackingToken URL directly, no dashboard
}

// Paths that are always public (no session required)
const PUBLIC_PATHS = ['/login', '/track']

// Check if a pathname starts with any public path
function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

/**
 * proxy.js — Next.js 16 route guard (replaces middleware.ts)
 *
 * Runs on Node.js runtime (edge is NOT supported in proxy).
 * Only reads the session cookie — no database calls here.
 * Real authorization (DB-backed) happens in dal.js inside route handlers.
 */
export async function proxy(request) {
  const { pathname } = request.nextUrl

  const token = request.cookies.get('session')?.value
  const session = token ? await decrypt(token) : null
  const isAuthenticated = !!session

  // Public path — allow through regardless of auth state
  if (isPublicPath(pathname)) {
    // Redirect authenticated users away from /login to their dashboard
    if (isAuthenticated && pathname === '/login') {
      const dashboard = ROLE_DASHBOARDS[session.role] ?? '/login'
      return NextResponse.redirect(new URL(dashboard, request.url))
    }
    return NextResponse.next()
  }

  // Protected path — require valid session
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based path enforcement
  const role = session.role

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/drivers') || pathname.startsWith('/pricing')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url))
    }
  }

  if (
    pathname.startsWith('/home') ||
    pathname.startsWith('/route') ||
    pathname.startsWith('/pickups') ||
    pathname.startsWith('/history')
  ) {
    if (role !== 'driver') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url))
    }
  }

  if (pathname.startsWith('/book')) {
    if (role !== 'customer') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url))
    }
  }

  // /bookings = admin only
  if (pathname.startsWith('/bookings')) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url))
    }
  }

  // /my-bookings = customer only
  if (pathname.startsWith('/my-bookings')) {
    if (role !== 'customer') {
      return NextResponse.redirect(new URL(ROLE_DASHBOARDS[role] ?? '/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!api|_next/static|_next/image|favicon.ico|icons|images).*)',
  ],
}
