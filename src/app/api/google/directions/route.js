import { NextResponse } from 'next/server'
import { requireAny, handleApiError } from '@/lib/dal'
import { checkBudget, GoogleBudgetError } from '@/lib/google-budget'
import redis from '@/lib/redis'

const ROUTES_API = 'https://routes.googleapis.com/directions/v2:computeRoutes'
const CACHE_TTL  = 600 // 10 min — a driver→stop corridor is stable for minutes

function getServerKey() {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!key) throw new Error('GOOGLE_MAPS_SERVER_KEY not configured')
  return key
}

// Snap to 4 decimal places (~11m grid). Nearby driver positions share cache cells.
function snap(n) {
  return Number(n).toFixed(4)
}

// Strip HTML tags from Google's html_instructions field.
// Google routes steps contain <b>, <div class="..."> etc.
function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Map Google Routes API step to the shape DriverMap.js expects.
 *
 * DriverMap reads:
 *   step.maneuver.instruction  — plain-text turn instruction
 *   step.maneuver.location     — [lng, lat] array (GeoJSON order)
 *   step.maneuver.modifier     — used by getManeuverIcon() for arrow emoji
 *   step.maneuver.type         — used by getManeuverIcon()
 *   step.distance              — metres (for formatDist() in turn banner)
 *
 * Google Routes API step fields:
 *   step.navigationInstruction.instructions  — plain text (used by new Routes API)
 *   step.startLocation.latLng.latitude/longitude
 *   step.navigationInstruction.maneuver      — e.g. "TURN_LEFT", "STRAIGHT"
 *   step.distanceMeters
 */
function normalizeStep(googleStep) {
  const navInstruction = googleStep.navigationInstruction ?? {}
  const startLoc       = googleStep.startLocation?.latLng ?? {}
  const lat            = startLoc.latitude  ?? 0
  const lng            = startLoc.longitude ?? 0

  // Map Google maneuver enum to Mapbox-compatible type+modifier strings
  // so DriverMap's getManeuverIcon() lookup table keeps working unchanged.
  const { type, modifier } = mapManeuver(navInstruction.maneuver)

  return {
    distance: googleStep.distanceMeters ?? 0,
    maneuver: {
      instruction: stripHtml(navInstruction.instructions) || '',
      location:    [lng, lat],  // GeoJSON order [lng, lat]
      type,
      modifier,
    },
  }
}

/**
 * Map Google maneuver enum values to Mapbox-style type + modifier strings.
 * DriverMap's MANEUVER_ICON table keys on "{type} {modifier}" or just "{type}".
 * Source: https://developers.google.com/maps/documentation/routes/reference/rest/v2/Maneuver
 */
function mapManeuver(googleManeuver) {
  switch (googleManeuver) {
    case 'TURN_SLIGHT_LEFT':   return { type: 'turn', modifier: 'slight left'  }
    case 'TURN_SHARP_LEFT':    return { type: 'turn', modifier: 'sharp left'   }
    case 'UTURN_LEFT':         return { type: 'u-turn', modifier: 'left'       }
    case 'TURN_LEFT':          return { type: 'turn', modifier: 'left'         }
    case 'TURN_SLIGHT_RIGHT':  return { type: 'turn', modifier: 'slight right' }
    case 'TURN_SHARP_RIGHT':   return { type: 'turn', modifier: 'sharp right'  }
    case 'UTURN_RIGHT':        return { type: 'u-turn', modifier: 'right'      }
    case 'TURN_RIGHT':         return { type: 'turn', modifier: 'right'        }
    case 'STRAIGHT':           return { type: 'straight', modifier: ''         }
    case 'RAMP_LEFT':          return { type: 'ramp', modifier: 'left'         }
    case 'RAMP_RIGHT':         return { type: 'ramp', modifier: 'right'        }
    case 'MERGE':              return { type: 'merge', modifier: ''            }
    case 'FORK_LEFT':          return { type: 'fork', modifier: 'left'         }
    case 'FORK_RIGHT':         return { type: 'fork', modifier: 'right'        }
    case 'FERRY':              return { type: 'ferry', modifier: ''            }
    case 'FERRY_TRAIN':        return { type: 'ferry', modifier: ''            }
    case 'ROUNDABOUT_LEFT':    return { type: 'roundabout', modifier: 'left'   }
    case 'ROUNDABOUT_RIGHT':   return { type: 'roundabout', modifier: 'right'  }
    case 'DEPART':             return { type: 'depart', modifier: ''           }
    case 'ARRIVE':             return { type: 'arrive', modifier: ''           }
    default:                   return { type: 'straight', modifier: ''         }
  }
}

/**
 * POST /api/google/directions
 * Body: { from: { lng, lat }, to: { lng, lat }, withSteps?: boolean }
 *
 * Proxies Google Routes API (v2:computeRoutes) server-side.
 * Returns { geometry, distance, duration, steps? } — same shape as the
 * Mapbox directions proxy so DriverMap.js needs zero changes.
 *
 * geometry: Polyline5-encoded string (Google format, precision 5)
 * steps: normalized to Mapbox step shape (see normalizeStep above)
 */
export async function POST(request) {
  try {
    await requireAny()

    const { from, to, withSteps = true } = await request.json()
    if (
      !from || !to ||
      !Number.isFinite(from.lng) || !Number.isFinite(from.lat) ||
      !Number.isFinite(to.lng)   || !Number.isFinite(to.lat)
    ) {
      return NextResponse.json({ error: 'from/to { lng, lat } required' }, { status: 400 })
    }

    const cacheKey = `gmaps:dir:${snap(from.lng)},${snap(from.lat)}->${snap(to.lng)},${snap(to.lat)}:${withSteps ? 's' : 'g'}`

    // Cache hit — same shape stored, return directly
    try {
      const cached = await redis.get(cacheKey)
      if (cached && typeof cached === 'object') return NextResponse.json({ ...cached, cached: true })
    } catch { /* fall through */ }

    // Budget check before firing the API
    try {
      await checkBudget('directions')
    } catch (err) {
      if (err instanceof GoogleBudgetError) {
        return NextResponse.json(
          { error: 'Google Maps budget exceeded, try later', degraded: true },
          { status: 503 },
        )
      }
      throw err
    }

    const key = getServerKey()

    const body = {
      origin:      { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat,   longitude: to.lng   } } },
      travelMode:  'DRIVE',
      computeAlternativeRoutes: false,
      ...(withSteps ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
    }

    // X-Goog-FieldMask controls which fields are billed and returned.
    // Only request what DriverMap actually uses to minimise cost.
    // Distance/duration are always read from legs[] below, so request leg-level
    // fields in both branches — steps are the only extra when withSteps is true.
    const fieldMask = withSteps
      ? 'routes.polyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.steps'
      : 'routes.polyline,routes.legs.distanceMeters,routes.legs.duration'

    const res = await fetch(ROUTES_API, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   key,
        'X-Goog-FieldMask': fieldMask,
      },
      body:  JSON.stringify(body),
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      // Routes API (New) returns errors as { error: { code, status, message } }.
      // Surface the structured message so denials (PERMISSION_DENIED, API not
      // enabled, billing) are obvious in the logs instead of a bare 502.
      let detail = text
      try { detail = JSON.parse(text)?.error?.message ?? text } catch { /* keep raw */ }
      console.error('[google/directions] API error', res.status, detail)
      return NextResponse.json({ error: 'Google Routes API error' }, { status: 502 })
    }

    const data  = await res.json()
    const route = data.routes?.[0]
    if (!route) {
      console.error('[google/directions] No route in response', JSON.stringify(data).slice(0, 300))
      return NextResponse.json({ error: 'No route found' }, { status: 404 })
    }

    // Google Routes v2 returns polyline on the route itself (not per-leg)
    // The polyline is Polyline5 format (precision 5, not 6).
    const geometry = route.polyline?.encodedPolyline ?? ''

    // Aggregate distance and duration across all legs
    const legs     = route.legs ?? []
    const distance = legs.reduce((sum, l) => sum + (l.distanceMeters ?? 0), 0)
    const duration = legs.reduce((sum, l) => {
      // duration is a string like "123s"
      return sum + (parseInt(l.duration ?? '0s', 10) || 0)
    }, 0)

    // Collect and normalize steps from the first leg (single-leg route)
    const rawSteps    = legs[0]?.steps ?? []
    const steps       = withSteps ? rawSteps.map(normalizeStep) : undefined

    const payload = {
      geometry,
      distance: Math.round(distance),
      duration: Math.round(duration),
      ...(withSteps ? { steps } : {}),
    }

    try { await redis.set(cacheKey, payload, { ex: CACHE_TTL }) } catch { /* non-fatal */ }
    return NextResponse.json(payload)
  } catch (err) {
    return handleApiError(err, '[POST /api/google/directions]')
  }
}
