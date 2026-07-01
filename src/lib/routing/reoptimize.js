import { findActiveRoute, updateRoute } from '@/lib/db/drivers'
import { pushRouteUpdate } from '@/lib/pusher'
import redis from '@/lib/redis'
import { hydrateRouteItems } from './hydrate'

// ORS_OPTIMIZATION_API orders stops (orsOptimizeOrder). ORS_DIRECTIONS_API builds
// the full-route polyline (getDirectionsPolyline) — see ORS_GOOGLE_HYBRID_ROUTING.md.
// Active-leg turn-by-turn (DriverMap) stays on Google via /api/google/directions —
// unrelated to either of these and not touched by this file.
const ORS_OPTIMIZATION_API = 'https://api.openrouteservice.org/optimization'
const ORS_DIRECTIONS_API   = 'https://api.openrouteservice.org/v2/directions/driving-car/json'

function getOrsKey() {
  const key = process.env.ORS_API_KEY
  if (!key) throw new Error('ORS_API_KEY not set')
  return key
}

// Wrap a longitude into [-180, 180]. getCenter().lng() (and any value persisted
// before the client-side fix) can be un-normalized (e.g. 246 = -114 + 360) after
// a panTo across the antimeridian. ORS and Google reject out-of-range longitudes,
// so we sanitize EVERY coordinate fed to them here — this is the server-side
// backstop that also repairs already-stored bad data (driver GPS, stops, endpoint).
function normalizeLng(lng) {
  const n = Number(lng)
  if (!Number.isFinite(n)) return n
  return ((n + 180) % 360 + 360) % 360 - 180
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ORS's public-API instance hard-rejects requests over 70 locations/waypoints
// per call (confirmed against the live API, not documented in advance —
// "Too many locations (N) in query, maximum is set to 70" from Optimization,
// "waypoints must not be greater than 70" from Directions V2). This is a
// per-request ceiling, independent of the daily/per-minute quotas in
// google-budget.js-style counters (ORS has no such gate — see ARCHITECTURE.md
// §14.1). Both orsOptimizeOrder and getDirectionsPolyline chunk their requests
// to stay at or under this limit so MAX_STOPS_PER_ROUTE=200 is actually reachable.
const ORS_MAX_LOCATIONS_PER_REQUEST = 70

// Decode a Polyline5-encoded string to [[lat, lng], ...]. Inverse of the
// encoder below — used to stitch multiple chunked Directions responses into
// one continuous polyline (decode each chunk, drop duplicate boundary point
// between chunks, re-encode once at the end).
function decodePolyline5(encoded) {
  const coords = []
  let index = 0, lat = 0, lng = 0
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    coords.push([lat / 1e5, lng / 1e5])
  }
  return coords
}

// Encode [[lat, lng], ...] to a Polyline5 string. Standard Google/ORS
// algorithm at precision 1e5 — exact inverse of decodePolyline5 above.
function encodePolyline5(coords) {
  function encodeValue(v) {
    v = v < 0 ? ~(v << 1) : (v << 1)
    let out = ''
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
      v >>= 5
    }
    out += String.fromCharCode(v + 63)
    return out
  }
  let out = '', prevLat = 0, prevLng = 0
  for (const [lat, lng] of coords) {
    const lat5 = Math.round(lat * 1e5)
    const lng5 = Math.round(lng * 1e5)
    out += encodeValue(lat5 - prevLat) + encodeValue(lng5 - prevLng)
    prevLat = lat5
    prevLng = lng5
  }
  return out
}

/**
 * Optimise ONE chunk of stops using Vroom via the ORS public API.
 * Caller guarantees stops.length + 1 (start) + (endPoint ? 1 : 0) <= 70.
 *
 * pickup_and_dropoff bookings are submitted as Vroom "shipments" so the engine
 * enforces pickup-before-dropoff natively — no post-processing needed.
 * Standalone pickup_only / dropoff_only stops are submitted as "jobs".
 *
 * Returns an array of indices into `stops[]` in visit order.
 */
async function orsOptimizeChunk(driverLat, driverLng, stops, endPoint = null) {
  const key = getOrsKey()

  const shipments = []
  const jobs      = []

  // Track which stops have already been paired to avoid double-adding dropoffs
  const pairedDropoffIndices = new Set()

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]

    if (s.assignmentKind === 'pickup_and_dropoff' && s.stopType === 'pickup') {
      const dropoffIdx = stops.findIndex(
        (t, j) =>
          j !== i &&
          t.stopType === 'dropoff' &&
          t.bookingId === s.bookingId &&
          t.assignmentKind === 'pickup_and_dropoff'
      )
      if (dropoffIdx !== -1) {
        pairedDropoffIndices.add(dropoffIdx)
        // Vroom shipment IDs must be unique positive integers.
        // We encode the stop index directly so we can decode the order later.
        // pickup id = i, delivery id = dropoffIdx (both globally unique per stop).
        shipments.push({
          pickup:   { id: i,          location: [stops[i].coordinates.lng,          stops[i].coordinates.lat]          },
          delivery: { id: dropoffIdx, location: [stops[dropoffIdx].coordinates.lng, stops[dropoffIdx].coordinates.lat] },
        })
        continue
      }
    }

    // Skip dropoffs already paired above
    if (pairedDropoffIndices.has(i)) continue

    // All other stops (pickup_only, dropoff_only, or unpaired) go in as jobs
    jobs.push({ id: i, location: [s.coordinates.lng, s.coordinates.lat] })
  }

  const vehicle = {
    id:      1,
    profile: 'driving-car',
    start:   [driverLng, driverLat],
  }
  if (endPoint) {
    vehicle.end = [endPoint.lng, endPoint.lat]
  }

  const payload = { vehicles: [vehicle], shipments, jobs }

  const res = await fetch(ORS_OPTIMIZATION_API, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': key,
    },
    body:  JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ORS Optimization error ${res.status}: ${text}`)
  }

  const data = await res.json()

  const route = data.routes?.[0]
  if (!route) throw new Error('ORS returned no routes')

  // Extract stop indices from steps in visit order.
  // step.type is 'start' | 'job' | 'pickup' | 'delivery' | 'end'
  // step.id corresponds to the original stop index we encoded above.
  const stopOrder = []
  for (const step of route.steps) {
    if (step.type === 'job' || step.type === 'pickup' || step.type === 'delivery') {
      stopOrder.push(step.id)
    }
  }

  return stopOrder
}

/**
 * Group stops into "units": a pickup_and_dropoff pair is one unit of 2
 * locations (must travel together through chunking so the pair never splits
 * across two separate ORS calls, which would break the pickup-before-dropoff
 * guarantee); every other stop is a unit of 1. Returns units in original
 * stop-array order, each unit = array of stop indices.
 */
// ORS Optimization (Vroom) has a SECOND, separate ceiling beyond the
// 70-location cap: "Request parameters exceed the server configuration
// limits. Only a total of 3500 routes are allowed." This is an internal
// solver limit on candidate route-construction combinations, NOT a simple
// location count — confirmed by direct binary-search testing against the
// live API with real data:
//   - pure jobs (pickup_only/delivery_only):        57 OK, 58 FAILS
//   - pure shipments (pickup_and_dropoff pairs):     28 OK, 29 FAILS
//   - realistic 70%-job/30%-shipment mix (40 bookings worth of ratio): 44 OK, 45 FAILS
// A shipment costs roughly 2x what a job costs against this ceiling
// (57/28 ≈ 2.04). UNIT_WEIGHT models this so chunk sizing accounts for BOTH
// known ORS ceilings, not just the location count. SAFE_ROUTES_BUDGET is set
// with real margin below the measured 57-job boundary (not pinned to the
// exact edge — ORS's internal limit could vary slightly by request shape).
const UNIT_WEIGHT = { job: 1, shipment: 2.1 }
const SAFE_ROUTES_BUDGET = 50

/**
 * Group stops into "units": a pickup_and_dropoff pair is one shipment-unit
 * (must travel together through chunking so the pair never splits across two
 * separate ORS calls, which would break the pickup-before-dropoff guarantee);
 * every other stop is one job-unit. Each unit carries its ORS_MAX_LOCATIONS
 * cost (stop count) AND its SAFE_ROUTES_BUDGET cost (UNIT_WEIGHT) so chunking
 * can respect both ceilings at once. Units are returned in original stop-array
 * order.
 */
function groupStopsIntoUnits(stops) {
  const units = []
  const consumed = new Set()
  for (let i = 0; i < stops.length; i++) {
    if (consumed.has(i)) continue
    const s = stops[i]
    if (s.assignmentKind === 'pickup_and_dropoff' && s.stopType === 'pickup') {
      const dropoffIdx = stops.findIndex(
        (t, j) => j !== i && t.stopType === 'dropoff' && t.bookingId === s.bookingId && t.assignmentKind === 'pickup_and_dropoff'
      )
      if (dropoffIdx !== -1) {
        consumed.add(i); consumed.add(dropoffIdx)
        units.push({ indices: [i, dropoffIdx], locationCost: 2, routesCost: UNIT_WEIGHT.shipment })
        continue
      }
    }
    consumed.add(i)
    units.push({ indices: [i], locationCost: 1, routesCost: UNIT_WEIGHT.job })
  }
  return units
}

/**
 * Optimise stop order using Vroom via the ORS public API, chunked to respect
 * BOTH confirmed ORS Optimization ceilings (see UNIT_WEIGHT/SAFE_ROUTES_BUDGET
 * comment above):
 *   1. ORS_MAX_LOCATIONS_PER_REQUEST (70 locations/waypoints, hard per-request cap)
 *   2. The "3500 routes" solver-complexity ceiling, modelled via UNIT_WEIGHT
 *      so shipment-heavy chunks split earlier than job-heavy ones.
 *
 * Stops are grouped into units (pickup_and_dropoff pairs stay together) and
 * packed into chunks that fit BOTH budgets simultaneously. Every chunk is
 * optimised independently from the SAME driver start position; only the LAST
 * chunk gets the real endPoint as its vehicle end (so the route still
 * finishes there) — intermediate chunks have no artificial pull toward the
 * final destination. Chunks are then concatenated in order.
 *
 * This is an approximation, not a single global TSP solve, when stops exceed
 * either budget — Vroom only ever sees one chunk's stops at a time, so it
 * can't reorder across chunk boundaries. This is the same class of tradeoff
 * as the existing identity-order fallback on ORS failure: a degraded-but-
 * correct route beats a hard failure. For routes that fit one chunk (the
 * common case) behaviour is byte-identical to the pre-chunking implementation.
 *
 * Returns an array of indices into `stops[]` in visit order.
 */
async function orsOptimizeOrder(driverLat, driverLng, stops, endPoint = null) {
  const reservedLocationSlots = 1 + (endPoint ? 1 : 0) // vehicle start (+ end)
  const maxLocationsPerChunk = ORS_MAX_LOCATIONS_PER_REQUEST - reservedLocationSlots

  const units = groupStopsIntoUnits(stops)

  // Pack units into chunks, never exceeding EITHER the location budget or the
  // routes-complexity budget per chunk.
  const chunks = []
  let current = []
  let currentLocations = 0
  let currentRoutesCost = 0
  for (const unit of units) {
    const wouldExceedLocations = currentLocations > 0 && currentLocations + unit.locationCost > maxLocationsPerChunk
    const wouldExceedRoutes    = currentRoutesCost > 0 && currentRoutesCost + unit.routesCost > SAFE_ROUTES_BUDGET
    if (wouldExceedLocations || wouldExceedRoutes) {
      chunks.push(current)
      current = []
      currentLocations = 0
      currentRoutesCost = 0
    }
    current.push(...unit.indices)
    currentLocations += unit.locationCost
    currentRoutesCost += unit.routesCost
  }
  if (current.length > 0) chunks.push(current)

  if (chunks.length <= 1) {
    // Common case — fits in one request, no chunking overhead.
    return orsOptimizeChunk(driverLat, driverLng, stops, endPoint)
  }

  console.warn(`[reoptimize] ${stops.length} pending stops exceed ORS's per-request limits (70 locations and/or solver-complexity ceiling) — splitting into ${chunks.length} Optimization calls (approximate, not a single global TSP solve).`)

  const fullOrder = []
  for (let c = 0; c < chunks.length; c++) {
    const indices = chunks[c]
    const chunkStops = indices.map((idx) => stops[idx])
    const isLastChunk = c === chunks.length - 1
    const chunkOrder = await orsOptimizeChunk(driverLat, driverLng, chunkStops, isLastChunk ? endPoint : null)
    // chunkOrder is indices into chunkStops (0..indices.length-1) — map back
    // to original stop[] indices before appending.
    for (const localIdx of chunkOrder) fullOrder.push(indices[localIdx])
  }
  return fullOrder
}

/**
 * Call ORS Directions V2 for ONE chunk of coordinates.
 * Caller guarantees coords.length <= ORS_MAX_LOCATIONS_PER_REQUEST.
 */
async function getDirectionsChunk(coords) {
  const key = getOrsKey()

  const body = {
    coordinates: coords.map((c) => [c.lng, c.lat]),
    // instructions MUST be true — with instructions:false, ORS omits segments[]
    // entirely from the response (only summary/geometry/bbox/way_points come
    // back), which breaks legDurations extraction below. Instruction text
    // itself is unused here; this call only needs segments[].duration.
    instructions: true,
    units: 'm',
  }

  const res = await fetch(ORS_DIRECTIONS_API, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': key,
    },
    body:  JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[reoptimize] ORS Directions API error', res.status, text)
    throw new Error(`ORS Directions API error ${res.status}`)
  }

  const data = await res.json()
  const route = data.routes?.[0]
  if (!route) throw new Error('ORS directions returned no route')

  const legDurations = (route.segments ?? []).map((seg) => Math.round(seg.duration))

  return {
    encodedPolyline: route.geometry, // Polyline5 string, same format/precision as Google's
    distanceMeters:  Math.round(route.summary.distance),
    durationSeconds: Math.round(route.summary.duration),
    legDurations,
  }
}

/**
 * Build the full-route polyline + per-leg durations via ORS Directions V2,
 * chunked to respect ORS_MAX_LOCATIONS_PER_REQUEST (see constant comment).
 *
 * Chunking strategy: split `coords` into consecutive windows of at most 70
 * points, where each window after the first REPEATS the previous window's
 * last point as its first point (so consecutive chunks share a boundary and
 * the route is continuous, with no gap leg). Each chunk's polyline is decoded,
 * the duplicate boundary point is dropped, and the remaining points are
 * concatenated, then re-encoded once into a single Polyline5 string.
 * legDurations is concatenated directly — each chunk after the first naturally
 * contributes exactly (chunkCoords.length - 1) legs (the boundary point isn't
 * a NEW leg, it's the END of the previous chunk's last leg), so the final
 * array always has exactly coords.length - 1 entries, matching what a single
 * unchunked call would return — reoptimizeRoute()'s leg-index math downstream
 * depends on this invariant.
 *
 * For coords.length <= 70 (the common case) this makes exactly one request,
 * identical to the pre-chunking implementation.
 */
async function getDirectionsPolyline(coords) {
  if (coords.length <= ORS_MAX_LOCATIONS_PER_REQUEST) {
    return getDirectionsChunk(coords)
  }

  const windows = []
  let start = 0
  while (start < coords.length - 1) {
    const end = Math.min(start + ORS_MAX_LOCATIONS_PER_REQUEST, coords.length)
    windows.push(coords.slice(start, end))
    if (end === coords.length) break
    start = end - 1 // next window starts at this window's last point (shared boundary)
  }

  console.warn(`[reoptimize] ${coords.length} coordinates exceed ORS's ${ORS_MAX_LOCATIONS_PER_REQUEST}-location cap — splitting into ${windows.length} Directions calls.`)

  let allPoints = []      // [[lat, lng], ...] across the whole stitched route
  let legDurations = []
  let distanceMeters = 0
  let durationSeconds = 0

  for (let w = 0; w < windows.length; w++) {
    const chunk = await getDirectionsChunk(windows[w])
    legDurations = legDurations.concat(chunk.legDurations)
    distanceMeters += chunk.distanceMeters
    durationSeconds += chunk.durationSeconds

    const points = decodePolyline5(chunk.encodedPolyline)
    if (w === 0) {
      allPoints = points
    } else {
      // Drop this chunk's first point — it's the same physical point as the
      // previous chunk's last point (the shared boundary), already in allPoints.
      allPoints = allPoints.concat(points.slice(1))
    }
  }

  return {
    encodedPolyline: encodePolyline5(allPoints),
    distanceMeters:  Math.round(distanceMeters),
    durationSeconds: Math.round(durationSeconds),
    legDurations,
  }
}

/**
 * Re-optimize the driver's active route given their current GPS.
 *
 * Completed stops stay frozen at the front of optimizedStops.
 * Only non-completed, non-endpoint stops are fed into the optimizer.
 * Endpoint (if present) is always placed last.
 *
 * Returns the updated route doc, or null if no route / nothing to reorder.
 */
export async function reoptimizeRoute({ driverId, currentLng, currentLat, endPointOverride = null }) {
  const route = await findActiveRoute(driverId)
  if (!route) return null

  // Sanitize the incoming driver GPS up front — every downstream consumer
  // (ORS start, Google origin, Haversine) depends on it being in range.
  currentLng = normalizeLng(currentLng)

  // Normalize every stored stop coordinate. Routes created before the
  // client-side antimeridian fix can carry a wrapped longitude (e.g. 246),
  // which ORS/Google reject — repair them here so old routes still optimise.
  const allStops = (route.optimizedStops ?? []).map((s) =>
    s?.coordinates
      ? { ...s, coordinates: { lat: s.coordinates.lat, lng: normalizeLng(s.coordinates.lng) } }
      : s,
  )
  const completedStops    = allStops.filter((s) => s.completedAt)
  const pendingStops      = allStops.filter((s) => !s.completedAt && s.stopType !== 'endpoint')
  const existingEndpoint  = allStops.find((s) => s.stopType === 'endpoint' && !s.completedAt)

  if (pendingStops.length < 1) return null

  const rawEndPoint = endPointOverride
    ?? (existingEndpoint
      ? { lng: existingEndpoint.coordinates.lng, lat: existingEndpoint.coordinates.lat, address: existingEndpoint.address }
      : route.endPoint ?? null)
  // Normalize the endpoint longitude too (override may come from a client path,
  // and route.endPoint may be old persisted data).
  const endPoint = rawEndPoint
    ? { ...rawEndPoint, lng: normalizeLng(rawEndPoint.lng) }
    : null

  // 1 stop: nothing to reorder
  let stopOrder
  if (pendingStops.length === 1) {
    stopOrder = [0]
  } else {
    try {
      stopOrder = await orsOptimizeOrder(currentLat, currentLng, pendingStops, endPoint)
    } catch (err) {
      // ORS failed — fall back to identity order (current DB order) with a warning.
      // We do not use nearest-neighbour as a fallback because it ignores
      // pickup-before-dropoff constraints for paired bookings.
      console.warn('[reoptimize] ORS optimization failed — keeping current stop order:', err.message)
      stopOrder = pendingStops.map((_, i) => i)
    }
  }

  const reorderedPending = stopOrder.map((origIdx, visitOrder) => ({
    ...pendingStops[origIdx],
    stopIndex:     completedStops.length + visitOrder,
    originalIndex: pendingStops[origIdx].originalIndex,
  }))

  let newOptimizedStops = [...completedStops, ...reorderedPending]
  if (endPoint) {
    newOptimizedStops.push({
      bookingId:      null,
      stopType:       'endpoint',
      assignmentKind: null,
      coordinates:    { lng: endPoint.lng, lat: endPoint.lat },
      address:        endPoint.address || `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}`,
      stopIndex:      newOptimizedStops.length,
      completedAt:    null,
    })
  }

  let encodedPolyline  = route.encodedPolyline ?? null
  let distanceMeters   = route.totalDistanceMeters ?? null
  let durationSeconds  = route.totalDurationSeconds ?? null

  // Will be populated from Directions leg durations below
  // legDurations[0] = driver→stop[0], legDurations[k] = stop[k-1]→stop[k]
  // Only pending+endpoint stops are in the Directions call, so we annotate
  // only those stops; completed stops keep their existing estimatedArrivalAt.
  let legDurations = []

  const dirCoords = [
    { lng: currentLng, lat: currentLat },
    ...reorderedPending.map((s) => ({ lng: s.coordinates.lng, lat: s.coordinates.lat })),
    ...(endPoint ? [{ lng: endPoint.lng, lat: endPoint.lat }] : []),
  ]

  try {
    const dir = await getDirectionsPolyline(dirCoords)
    encodedPolyline  = dir.encodedPolyline
    distanceMeters   = dir.distanceMeters
    durationSeconds  = dir.durationSeconds
    legDurations     = dir.legDurations ?? []
  } catch (err) {
    // Real API failure (ORS outage, denied key, malformed response). Without this
    // log the route silently keeps a null/stale polyline and falls back to
    // Haversine ETAs — looks "fine" but isn't. getDirectionsPolyline already
    // logged the ORS detail; this records that we degraded.
    console.warn('[reoptimize] directions failed — keeping existing polyline, Haversine ETA fallback:', err.message)
  }

  // If Directions API failed or returned no leg durations, estimate from
  // haversine distances at 40 km/h average urban driving speed.
  if (legDurations.length === 0 && dirCoords.length >= 2) {
    const AVG_SPEED_KMH = 40
    legDurations = []
    for (let k = 0; k < dirCoords.length - 1; k++) {
      const a = dirCoords[k]
      const b = dirCoords[k + 1]
      const km = haversine(a.lat, a.lng, b.lat, b.lng)
      legDurations.push(Math.round((km / AVG_SPEED_KMH) * 3600))
    }
  }

  // Annotate each non-completed stop with an estimated arrival time.
  // dirCoords = [driver, pendingStop[0], pendingStop[1], ..., endPoint?]
  // legDurations[k] = seconds from dirCoords[k] to dirCoords[k+1]
  // newOptimizedStops = [...completedStops, ...reorderedPending, endpointStop?]
  // So for newOptimizedStops[j] (j >= completedStops.length), leg index = j - completedStops.length
  if (legDurations.length > 0) {
    const now = Date.now()
    let cumulativeMs = 0
    const offset = completedStops.length
    for (let j = offset; j < newOptimizedStops.length; j++) {
      const legIdx = j - offset  // 0 = driver→first pending, 1 = first→second, etc.
      cumulativeMs += (legDurations[legIdx] ?? 0) * 1000
      newOptimizedStops[j] = {
        ...newOptimizedStops[j],
        estimatedArrivalAt: new Date(now + cumulativeMs).toISOString(),
      }
    }
  }

  await updateRoute(String(route._id), {
    optimizedStops:       newOptimizedStops,
    encodedPolyline,
    totalDistanceMeters:  distanceMeters,
    totalDurationSeconds: durationSeconds,
    endPoint:             endPoint ?? null,
  })

  const updatedRoute = {
    ...JSON.parse(JSON.stringify(route)),
    optimizedStops:       newOptimizedStops,
    encodedPolyline,
    totalDistanceMeters:  distanceMeters,
    totalDurationSeconds: durationSeconds,
    endPoint:             endPoint ?? null,
  }

  // Hydrate packageItems onto stops before caching / pushing so the driver
  // UI can render the item checklist immediately without a second round-trip,
  // and route-data cache hits need no extra DB queries.
  const hydrated = await hydrateRouteItems(updatedRoute)

  try {
    await redis.set(`driver:${driverId}:route`, hydrated, { ex: 300 })
  } catch {
    // Cache write failed — best-effort delete so the next read falls through to
    // MongoDB instead of serving whatever stale payload was previously cached.
    try { await redis.del(`driver:${driverId}:route`) } catch { /* swallow */ }
  }

  try { await pushRouteUpdate(driverId, hydrated) } catch { /* non-fatal */ }

  return hydrated
}
