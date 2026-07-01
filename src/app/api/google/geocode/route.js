import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { handleApiError } from '@/lib/dal'
import redis from '@/lib/redis'
import { checkBudget, GoogleBudgetError } from '@/lib/google-budget'
import { checkRateLimit } from '@/lib/redis'

const GEOCODE_LIMIT  = 40   // requests per caller per hour
const GEOCODE_WINDOW = 3600

const GOOGLE_GEOCODE_API = 'https://maps.googleapis.com/maps/api/geocode/json'

const REVERSE_CACHE_TTL = 7 * 24 * 3600 // 7 days — addresses rarely change
const FORWARD_CACHE_TTL = 24 * 3600     // 1 day  — search terms evolve

function getServerKey() {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!key) throw new Error('GOOGLE_MAPS_SERVER_KEY not configured')
  return key
}

// Round to ~1m cell so neighbouring pan frames share the same cache entry.
function snapCoord(n) {
  return Number(n).toFixed(5)
}

/**
 * GET /api/google/geocode?type=reverse&lng=..&lat=..
 *
 * Proxies Google Geocoding API server-side to:
 *   - keep GOOGLE_MAPS_SERVER_KEY out of the browser,
 *   - gate calls via checkBudget (soft-cap free tier),
 *   - cache results in Redis (7-day by rounded lng/lat).
 *
 * Returns { address, city } — same shape as /api/mapbox/geocode for drop-in compatibility.
 * On budget trip or API error, falls back to coordinate string gracefully.
 */
export async function GET(request) {
  try {
    const session = await getSession()

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rateLimitKey = session?.userId
      ? `rate:geocode-user:${session.userId}`
      : `rate:geocode-guest:${ip}`

    const { allowed } = await checkRateLimit(rateLimitKey, GEOCODE_LIMIT, GEOCODE_WINDOW)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (type !== 'reverse') {
      return NextResponse.json({ error: 'type must be reverse' }, { status: 400 })
    }

    const lng = Number(searchParams.get('lng'))
    const lat = Number(searchParams.get('lat'))
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return NextResponse.json({ error: 'lng and lat are required' }, { status: 400 })
    }

    const cacheKey = `gmaps:rev:${snapCoord(lng)}:${snapCoord(lat)}`

    // Cache hit — skip budget check entirely
    try {
      const cached = await redis.get(cacheKey)
      if (cached && typeof cached === 'object') return NextResponse.json(cached)
    } catch { /* fall through to live call */ }

    // Budget check before firing the API call
    try {
      await checkBudget('geocoding')
    } catch (err) {
      if (err instanceof GoogleBudgetError) {
        // Degrade gracefully — return coordinate string so the map still functions
        return NextResponse.json(
          { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '', degraded: true },
        )
      }
      throw err
    }

    const key = getServerKey()
    const url = `${GOOGLE_GEOCODE_API}?latlng=${lat},${lng}&key=${key}`

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[google/geocode] HTTP error', res.status, text)
      return NextResponse.json(
        { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '' },
      )
    }

    const data = await res.json()

    // IMPORTANT: the legacy Geocoding API returns HTTP 200 even on auth/billing
    // failures — the real outcome is in data.status. REQUEST_DENIED (bad key /
    // API not enabled), OVER_QUERY_LIMIT (rate/budget), etc. all arrive as 200,
    // so we MUST inspect data.status or failures stay invisible.
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[google/geocode] API status', data.status, data.error_message ?? '')
    }

    // Google returns status 'OK' with results or 'ZERO_RESULTS' etc.
    const result = data.results?.[0]
    if (!result) {
      return NextResponse.json(
        { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '' },
      )
    }

    const address = result.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`

    // Extract city from address_components (locality > administrative_area_level_2)
    const components = result.address_components ?? []
    const localityComp = components.find((c) => c.types.includes('locality'))
    const adminComp    = components.find((c) => c.types.includes('administrative_area_level_2'))
    const city         = localityComp?.long_name ?? adminComp?.long_name ?? ''

    const payload = { address, city }

    try { await redis.set(cacheKey, payload, { ex: REVERSE_CACHE_TTL }) } catch { /* non-fatal */ }
    return NextResponse.json(payload)
  } catch (err) {
    return handleApiError(err, '[GET /api/google/geocode]')
  }
}
