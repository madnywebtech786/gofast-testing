import { checkRateLimit } from '@/lib/redis'

const CONTACT_RATE_LIMIT  = 5
const CONTACT_RATE_WINDOW = 3600 // 5 submissions per IP per hour

const MAX_NAME    = 100
const MAX_EMAIL   = 254  // RFC 5321 max
const MAX_PHONE   = 30
const MAX_MESSAGE = 2000

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed } = await checkRateLimit(`rate:contact:${ip}`, CONTACT_RATE_LIMIT, CONTACT_RATE_WINDOW)
    if (!allowed) {
      return Response.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const name    = String(body.name    ?? '').trim().slice(0, MAX_NAME)
    const email   = String(body.email   ?? '').trim().slice(0, MAX_EMAIL)
    const phone   = String(body.phone   ?? '').trim().slice(0, MAX_PHONE)
    const message = String(body.message ?? '').trim().slice(0, MAX_MESSAGE)

    if (!name || !email || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
