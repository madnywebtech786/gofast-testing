import redis from '@/lib/redis'

/**
 * Central Google Maps API budget gate.
 *
 * Every server-side Google Maps call path (reoptimize directions, geocode proxy,
 * directions proxy, places proxy) must await checkBudget(service) before firing.
 *
 * Counters live in Redis:
 *   google:min:{service}:{YYYY-MM-DDTHH:MM}   (TTL 120s)
 *   google:day:{service}:{YYYY-MM-DD}          (TTL 48h)
 *   google:mon:{service}:{YYYY-MM}             (TTL 40 days)
 *
 * geocoding and places-* are split into -customer / -driver buckets (see
 * geocode/route.js and places/route.js, which pass session.role === 'driver'
 * ? 'driver' : 'customer' as the service suffix) so a burst of customer
 * booking traffic can't starve driver navigation's budget, or vice versa.
 * `directions` has no customer caller today (only DriverMap.js), so it stays
 * a single bucket.
 *
 * Billing is enabled on the Google Cloud project (client has accepted
 * charges beyond the free tier — operational uptime takes priority over
 * staying under the free 10,000/month/SKU ceiling). These limits are sized
 * as a SAFETY NET against a runaway bug (e.g. an infinite retry loop), not
 * as a cost-avoidance ceiling — set at roughly 3x realistic daily volume for
 * 10 drivers / 25 stops each and 50 customer bookings/day, so normal
 * operation and reasonable growth never gets throttled.
 */

export const GOOGLE_SERVICES = {
  maps:                          { monthly: 10_000, daily: 320,  perMinute: 80  },
  directions:                    { monthly: 21_840, daily: 840,  perMinute: 90  },
  'geocoding-customer':          { monthly: 7_800,  daily: 300,  perMinute: 60  },
  'geocoding-driver':            { monthly: 19_500, daily: 750,  perMinute: 90  },
  'places-autocomplete-customer':{ monthly: 62_400, daily: 2_400,perMinute: 180 },
  'places-details-customer':     { monthly: 7_800,  daily: 300,  perMinute: 60  },
}

const SOFT_CAP_FRACTION = 0.85

export class GoogleBudgetError extends Error {
  constructor(service, scope, count, limit) {
    super(`Google Maps budget exceeded for ${service} (${scope}): ${count}/${limit}`)
    this.name    = 'GoogleBudgetError'
    this.service = service
    this.scope   = scope
    this.count   = count
    this.limit   = limit
  }
}

function todayKeys(service) {
  const now  = new Date()
  const yyyy = now.getUTCFullYear()
  const mm   = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd   = String(now.getUTCDate()).padStart(2, '0')
  const hh   = String(now.getUTCHours()).padStart(2, '0')
  const mi   = String(now.getUTCMinutes()).padStart(2, '0')
  return {
    minKey: `google:min:${service}:${yyyy}-${mm}-${dd}T${hh}:${mi}`,
    dayKey: `google:day:${service}:${yyyy}-${mm}-${dd}`,
    monKey: `google:mon:${service}:${yyyy}-${mm}`,
  }
}

/**
 * Check budget BEFORE calling Google. Returns the new counts.
 * Throws GoogleBudgetError when soft cap is reached on any scope.
 *
 * Fail-open on Redis outage: if Redis is unavailable we log once and let the
 * call through (Google hard-429s as last resort). Preserves UX during flakes.
 *
 * Performance: 6 commands (3 INCR + 3 EXPIRE) pipelined into one Upstash
 * HTTP round-trip (~200ms vs ~1.2s sequential).
 */
export async function checkBudget(service) {
  const cfg = GOOGLE_SERVICES[service]
  if (!cfg) throw new Error(`Unknown Google service: ${service}`)

  const { minKey, dayKey, monKey } = todayKeys(service)

  let minCount, dayCount, monCount
  try {
    const p = redis.pipeline()
    p.incr(minKey); p.expire(minKey, 120)
    p.incr(dayKey); p.expire(dayKey, 172800)
    p.incr(monKey); p.expire(monKey, 3456000)
    const results = await p.exec()
    // Pipeline results: [minIncr, minExpire, dayIncr, dayExpire, monIncr, monExpire]
    minCount = Number(results[0])
    dayCount = Number(results[2])
    monCount = Number(results[4])
  } catch (err) {
    console.warn('[google-budget] Redis failed, allowing call:', err?.message)
    return { minCount: -1, dayCount: -1, monCount: -1, degraded: true }
  }

  const minLimit = cfg.perMinute
  const dayLimit = Math.floor(cfg.daily   * SOFT_CAP_FRACTION)
  const monLimit = Math.floor(cfg.monthly * SOFT_CAP_FRACTION)

  if (minCount > minLimit) throw new GoogleBudgetError(service, 'minute',  minCount, minLimit)
  if (dayCount > dayLimit) throw new GoogleBudgetError(service, 'daily',   dayCount, dayLimit)
  if (monCount > monLimit) throw new GoogleBudgetError(service, 'monthly', monCount, monLimit)

  return { minCount, dayCount, monCount, degraded: false }
}

/**
 * Read-only snapshot for admin dashboard / health endpoint.
 */
export async function getBudgetSnapshot() {
  const out = {}
  for (const service of Object.keys(GOOGLE_SERVICES)) {
    const { dayKey, monKey } = todayKeys(service)
    try {
      const [day, mon] = await Promise.all([redis.get(dayKey), redis.get(monKey)])
      out[service] = {
        daily:   Number(day ?? 0),
        monthly: Number(mon ?? 0),
        limits:  GOOGLE_SERVICES[service],
      }
    } catch {
      out[service] = { error: 'redis-unavailable', limits: GOOGLE_SERVICES[service] }
    }
  }
  return out
}
