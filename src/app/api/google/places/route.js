import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { handleApiError } from '@/lib/dal'
import redis from '@/lib/redis'
import { checkBudget, GoogleBudgetError } from '@/lib/google-budget'
import { checkRateLimit } from '@/lib/redis'

// Autocomplete fires ~6 calls per address search (one per debounced keystroke
// + 1 details). 800/hr ≈ ~85 searches/hour per caller — effectively unlimited
// for a real customer, while still capping a leaked key or bot. The global
// daily soft caps in google-budget.js ('places-autocomplete-customer' /
// 'places-details-customer') are the budget backstop on top of this
// per-caller limit.
const PLACES_LIMIT  = 800  // per caller per hour
const PLACES_WINDOW = 3600

// Per-CUSTOMER daily allowances — distinct from PLACES_LIMIT above (hourly)
// and from the app-wide shared budget in google-budget.js. Keyed per
// individual customer (or guest IP) so one customer's usage never counts
// against another's daily allowance. Rolling 24h window from that
// customer's first call, not calendar-day.
const CUSTOMER_AUTOCOMPLETE_DAILY_LIMIT  = 1200
const CUSTOMER_DETAILS_DAILY_LIMIT       = 400
const CUSTOMER_DAILY_WINDOW              = 86400

const AUTOCOMPLETE_API = 'https://places.googleapis.com/v1/places:autocomplete'
const DETAILS_API      = 'https://places.googleapis.com/v1/places'

// Autocomplete predictions cached 5 min (query is stable enough short-term)
const AUTOCOMPLETE_CACHE_TTL = 300
// Place details cached 7 days (address/coords of a place don't change)
const DETAILS_CACHE_TTL = 7 * 24 * 3600

function getServerKey() {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!key) throw new Error('GOOGLE_MAPS_SERVER_KEY not configured')
  return key
}

function normalizeQuery(q) {
  return String(q ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * GET /api/google/places?q={query}&sessionToken={uuid}
 * GET /api/google/places?placeId={id}&sessionToken={uuid}
 *
 * Two modes selected by which query parameter is present:
 *
 * Autocomplete mode (?q=...):
 *   - Returns { predictions: [{ placeId, description }] }
 *   - Short-circuits to { predictions: [] } for queries < 3 chars
 *   - Budget service: 'places-autocomplete-customer' (app-wide shared pool)
 *   - Per-customer daily cap: CUSTOMER_AUTOCOMPLETE_DAILY_LIMIT (individual, not shared)
 *   - Cache key: gmaps:places:ac:{normalized-query} (5-min TTL)
 *     Note: sessionToken is NOT part of the cache key — different sessions asking
 *     the same query share the cached predictions. The billing session grouping
 *     is done by Google when sessionToken is passed in the request body.
 *
 * Place Details mode (?placeId=...):
 *   - Returns { lng, lat, address }
 *   - Budget service: 'places-details-customer' (app-wide shared pool)
 *   - Per-customer daily cap: CUSTOMER_DETAILS_DAILY_LIMIT (individual, not shared)
 *   - Cache key: gmaps:places:detail:{placeId} (7-day TTL)
 *   - Passes sessionToken to close the session (groups session as one billing unit)
 *
 * Session token lifecycle (managed by the client in google-geocode.js):
 *   1. Client generates a UUID before the first keystroke.
 *   2. Same UUID is sent with every autocomplete call.
 *   3. Same UUID is sent with the final place details call.
 *   4. Client generates a new UUID after confirmed selection.
 */
export async function GET(request) {
  try {
    const session = await getSession()

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rateLimitKey = session?.userId
      ? `rate:places-user:${session.userId}`
      : `rate:places-guest:${ip}`
    const { allowed } = await checkRateLimit(rateLimitKey, PLACES_LIMIT, PLACES_WINDOW)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const callerKey = session?.userId ?? `guest:${ip}`

    const { searchParams } = new URL(request.url)
    const placeId      = searchParams.get('placeId')
    const sessionToken = searchParams.get('sessionToken') ?? ''

    // --- Place Details mode ---
    if (placeId) {
      const cacheKey = `gmaps:places:detail:${placeId}`

      try {
        const cached = await redis.get(cacheKey)
        if (cached && typeof cached === 'object') return NextResponse.json(cached)
      } catch { /* fall through */ }

      // Per-customer daily allowance (see constants above).
      const { allowed: underDailyCap } = await checkRateLimit(
        `rate:places-details-daily:${callerKey}`, CUSTOMER_DETAILS_DAILY_LIMIT, CUSTOMER_DAILY_WINDOW,
      )
      if (!underDailyCap) {
        return NextResponse.json({ error: 'Daily limit exceeded' }, { status: 429 })
      }

      try {
        // Customer-only bucket — no driver page calls Places (see
        // google-budget.js). If a driver flow ever needs Places, add a
        // 'places-details-driver' bucket rather than sharing this one.
        await checkBudget('places-details-customer')
      } catch (err) {
        if (err instanceof GoogleBudgetError) {
          return NextResponse.json({ error: 'Google Maps budget exceeded', degraded: true }, { status: 503 })
        }
        throw err
      }

      const key = getServerKey()
      // Places API (New) details endpoint. Fields param restricts billed fields.
      // sessionToken query param closes the billing session (groups ac + details as one unit).
      const detailParams = new URLSearchParams({
        fields:       'location,displayName,formattedAddress',
        ...(sessionToken ? { sessionToken } : {}),
      })
      const url = `${DETAILS_API}/${encodeURIComponent(placeId)}?${detailParams}`

      const res = await fetch(url, {
        headers: { 'X-Goog-Api-Key': key },
        cache:   'no-store',
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('[google/places] details API error', res.status, text)
        return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 502 })
      }

      const data    = await res.json()
      const location = data.location
      if (!location) {
        return NextResponse.json({ error: 'Place location not found' }, { status: 404 })
      }

      const address = data.formattedAddress ?? data.displayName?.text ?? ''
      const payload = {
        lng:     location.longitude,
        lat:     location.latitude,
        address,
      }

      try { await redis.set(cacheKey, payload, { ex: DETAILS_CACHE_TTL }) } catch { /* non-fatal */ }
      return NextResponse.json(payload)
    }

    // --- Autocomplete mode ---
    const q = normalizeQuery(searchParams.get('q'))
    if (q.length < 3) {
      return NextResponse.json({ predictions: [] })
    }

    const cacheKey = `gmaps:places:ac:${q}`

    try {
      const cached = await redis.get(cacheKey)
      if (cached && typeof cached === 'object') return NextResponse.json(cached)
    } catch { /* fall through */ }

    // Per-customer daily allowance (see constants above).
    const { allowed: underAcDailyCap } = await checkRateLimit(
      `rate:places-autocomplete-daily:${callerKey}`, CUSTOMER_AUTOCOMPLETE_DAILY_LIMIT, CUSTOMER_DAILY_WINDOW,
    )
    if (!underAcDailyCap) {
      return NextResponse.json({ predictions: [], degraded: true })
    }

    try {
      // Customer-only bucket — see the details-mode comment above.
      await checkBudget('places-autocomplete-customer')
    } catch (err) {
      if (err instanceof GoogleBudgetError) {
        return NextResponse.json({ predictions: [], degraded: true })
      }
      throw err
    }

    const key = getServerKey()

    // Places API (New) Autocomplete — POST with JSON body
    const body = {
      input:         q,
      ...(sessionToken ? { sessionToken } : {}),
    }

    const res = await fetch(AUTOCOMPLETE_API, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   key,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body:  JSON.stringify(body),
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[google/places] autocomplete API error', res.status, text)
      return NextResponse.json({ predictions: [] })
    }

    const data        = await res.json()
    const suggestions = data.suggestions ?? []

    // Normalise to { placeId, description } — the shape google-geocode.js expects
    const predictions = suggestions
      .map((s) => {
        const pp = s.placePrediction
        if (!pp) return null
        return {
          placeId:     pp.placeId,
          description: pp.text?.text ?? '',
        }
      })
      .filter(Boolean)

    const payload = { predictions }

    try { await redis.set(cacheKey, payload, { ex: AUTOCOMPLETE_CACHE_TTL }) } catch { /* non-fatal */ }
    return NextResponse.json(payload)
  } catch (err) {
    return handleApiError(err, '[GET /api/google/places]')
  }
}
