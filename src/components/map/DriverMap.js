'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { computeTurnGuidance } from '@/lib/turnGuidance'

// How far off-corridor (metres) before we consider the driver off-route.
// 50m: tight enough to catch a wrong turn (a block over), loose enough to absorb
// GPS jitter and wide roads. (Was 300m — so loose a real wrong turn often never
// exceeded it, since the nearest point on a long corridor stayed within range.)
const OFF_ROUTE_THRESHOLD_M  = 50
// How long (ms) the driver must stay off-route before we trigger a reroute
const OFF_ROUTE_DURATION_MS  = 5000
// After a reroute fires, pause detection this long so the driver can rejoin the
// new path before we re-evaluate — prevents a reroute→still-off→reroute loop.
const REROUTE_COOLDOWN_MS    = 20000
// Trigger arrival when driver is within this radius of the stop (metres)
const ARRIVAL_RADIUS_M       = 30

// Turn-by-turn step-advance + voice-stage thresholds now live in
// src/lib/turnGuidance.js (computeTurnGuidance) so they're unit-testable with
// synthetic GPS ticks (see scripts/test-turn-guidance.mjs). That file's header
// comment documents the two real bugs it fixes: (1) the old single
// STEP_ADVANCE_M (45m) overlapped VOICE_FINAL_M (30m) and ran its pass-check
// BEFORE the voice check in the same tick, which could skip the "turn now"
// cue entirely on a sparse GPS update, and could leapfrog two short,
// opposite-direction turns in a row; (2) the banner/voice used to show the
// ALREADY-MADE turn's instruction while counting down to the NEXT turn's
// distance — two different maneuvers announced as one, which is a direct
// explanation for "it speaks the previous turn."

// ── Google-Maps-app-style follow camera + gliding marker ───────────────────
// Camera tilt (degrees) applied in heading-up follow mode. Needs a vector Map
// ID; ignored on raster maps. 0 = flat top-down, ~45 = the app's 3D nav view.
const FOLLOW_TILT_DEG        = 45
// Zoom used when locked into follow/navigation mode.
const FOLLOW_ZOOM            = 17
// How long (ms) to glide the car marker between GPS fixes. GPS arrives ~1/sec;
// tweening across ~900ms makes the dot move continuously like the Maps blue dot
// instead of teleporting each tick.
const GLIDE_MS               = 900
// Heading-up camera mode is only enabled when a real vector Map ID is set.
// On DEMO_MAP_ID / raster maps, heading + tilt are no-ops, so we stay north-up.
const MAP_ID                 = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? 'DEMO_MAP_ID'
const HEADING_UP_SUPPORTED   = MAP_ID !== 'DEMO_MAP_ID'

// Turn type → arrow emoji
const MANEUVER_ICON = {
  'turn right':          '↱',
  'turn left':           '↰',
  'turn sharp right':    '↱',
  'turn sharp left':     '↰',
  'turn slight right':   '↗',
  'turn slight left':    '↖',
  'straight':            '↑',
  'roundabout':          '↻',
  'rotary':              '↻',
  'fork right':          '↱',
  'fork left':           '↰',
  'merge':               '↑',
  'ramp right':          '↱',
  'ramp left':           '↰',
  'arrive':              '📍',
  'depart':              '🚦',
  'ferry':               '⛴',
  'u-turn':              '↩',
}

function getManeuverIcon(step) {
  if (!step?.maneuver) return '↑'
  const mod  = step.maneuver.modifier ?? ''
  const type = step.maneuver.type ?? ''
  const key  = mod ? `${type} ${mod}`.trim() : type
  return MANEUVER_ICON[key] ?? MANEUVER_ICON[type] ?? '↑'
}

function formatDist(m) {
  if (m == null) return ''
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  // Below 50m show exact metres so the driver sees the turn coming precisely.
  // 50–200m round to nearest 10m. Above 200m round to nearest 50m.
  if (m < 50)  return `${Math.round(m)} m`
  if (m < 200) return `${Math.round(m / 10) * 10} m`
  return `${Math.round(m / 50) * 50} m`
}

function haversineM(a, b) {
  const R    = 6371000
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s    = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/**
 * Bearing (degrees, 0=North, clockwise) from point a → point b.
 * Used to rotate the car icon when GPS heading is unavailable.
 */
function bearingDeg(a, b) {
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

/**
 * Minimum distance (metres) from point p to the nearest segment in a polyline.
 * coords = [[lng, lat], ...]  (GeoJSON order)
 */
function distToPolylineM(p, coords) {
  let minDist = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    const a = { lng: coords[i][0],     lat: coords[i][1] }
    const b = { lng: coords[i + 1][0], lat: coords[i + 1][1] }
    const d = pointToSegmentM(p, a, b)
    if (d < minDist) minDist = d
  }
  return minDist
}

/**
 * Distance from point p to segment ab (all in lng/lat, result in metres).
 * Projects p onto the segment and clamps to [a,b].
 */
function pointToSegmentM(p, a, b) {
  const dx  = b.lng - a.lng
  const dy  = b.lat - a.lat
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return haversineM(p, a)
  const t = Math.max(0, Math.min(1, ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / len2))
  return haversineM(p, { lng: a.lng + t * dx, lat: a.lat + t * dy })
}

/**
 * Decode a Polyline5-encoded string to [[lng, lat], ...] (GeoJSON order).
 * Google Maps JS API uses precision 5 (1e5). This replaces the @mapbox/polyline
 * import which used precision 6 (1e6).
 */
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
    coords.push([lng / 1e5, lat / 1e5]) // GeoJSON order [lng, lat]
  }
  return coords
}

// Car arrow SVG — points UP. We rotate the outer div by heading degrees.
const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
  <defs>
    <filter id="dropshadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
  </defs>
  <polygon points="18,2 34,38 18,30 2,38" fill="#2563eb" filter="url(#dropshadow)"/>
  <polygon points="18,8 28,34 18,27 8,34" fill="white" opacity="0.92"/>
</svg>
`

export default function DriverMap({
  route,
  activeStopIndex = 0,
  driverPos = null,
  driverId = null,
  onStepUpdate,
  onReroute,
  onArrival,
  newStopIds = null,
}) {
  const containerRef       = useRef(null)
  const mapRef             = useRef(null)
  const mapsLibRef         = useRef(null) // google.maps namespace
  const markerLibRef       = useRef(null) // google.maps.marker namespace
  const markersRef         = useRef([])   // AdvancedMarkerElement[]
  const driverMarkerRef    = useRef(null) // AdvancedMarkerElement for car
  const infoWindowRef      = useRef(null) // shared InfoWindow for stop popups

  // Full-route gray polyline and active-leg blue polyline (google.maps.Polyline)
  const fullPolylineRef    = useRef(null)
  const activePolylineRef  = useRef(null)

  // Current heading in degrees (0=North). Updated from GPS heading OR computed bearing.
  const headingRef         = useRef(0)
  // Previous position — used to compute bearing when GPS heading is null
  const prevPosRef         = useRef(null)
  // Inner div we rotate for the car marker (Google sets transform on the outer element)
  const carInnerRef        = useRef(null)

  const activeStopIndexRef = useRef(activeStopIndex)
  const driverPosRef       = useRef(driverPos)
  const routeRef           = useRef(route)
  const onStepUpdateRef    = useRef(onStepUpdate)
  const onRerouteRef       = useRef(onReroute)
  const onArrivalRef       = useRef(onArrival)
  const driverIdRef        = useRef(driverId)
  const newStopIdsRef      = useRef(newStopIds)

  // Refs so effects declared ABOVE the useCallback definitions can call them
  // without referencing the bindings directly (avoids temporal-dead-zone error).
  const renderStopMarkersRef       = useRef(null)
  const renderActiveLegRef         = useRef(null)
  const renderFullRouteGrayRef     = useRef(null)
  const updateTurnBannerInternalRef = useRef(null)

  // Turn-by-turn state
  const stepsRef           = useRef([])
  const nextStepIdxRef     = useRef(0)
  // Tracks the highest voice stage already spoken for the current step index,
  // so each stage fires at most once per step.
  // 0 = nothing spoken, 1 = early spoken, 2 = main spoken, 3 = final spoken
  const lastSpokenStepRef  = useRef(-1)  // last step index that got any voice
  const voiceStageRef      = useRef(0)   // stage reached for lastSpokenStepRef's step
  // Distance-to-turn measured on the PREVIOUS tick for lastSpokenStepRef's
  // step — lets computeTurnGuidance detect a threshold CROSSING between two
  // ticks instead of only checking the current sample in isolation, so a
  // sparse GPS gap can't jump clean over a voice cue's distance band (see
  // BUG 3 in turnGuidance.js). null = no valid previous sample yet.
  const prevDistToTurnRef  = useRef(null)

  // Active leg corridor coords [[lng,lat],...] for off-route detection
  const corridorCoordsRef  = useRef([])
  const legAbortRef        = useRef(null)

  // Off-route tracking
  const offRouteSinceRef   = useRef(null)
  const reroutingRef       = useRef(false)
  // Timestamp until which off-route detection is paused after a reroute fires,
  // giving the driver time to rejoin the new path before we re-evaluate. Without
  // this, a reroute that can't get the driver within the threshold (e.g. parked
  // off-road, or optimizer returns a near-identical path) re-triggers every 5s.
  const rerouteCooldownUntilRef = useRef(0)

  // Arrival tracking
  const arrivedStopRef     = useRef(-1)

  // watchPosition watch ID — cleaned up on unmount
  const watchIdRef         = useRef(null)

  // ── Sync refs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    activeStopIndexRef.current = activeStopIndex
    if (arrivedStopRef.current !== -1 && arrivedStopRef.current !== activeStopIndex) {
      arrivedStopRef.current = -1
    }
  }, [activeStopIndex])
  useEffect(() => {
    routeRef.current = route
    // A new route means the reroute/merge resolved — clear the off-route warning
    // immediately rather than waiting for the next active-leg render.
    if (routeSyncedOnceRef.current) {
      offRouteSinceRef.current = null
      reroutingRef.current = false
      setOffRoute(false)

      // CRITICAL: refresh the active-leg corridor against the NEW route geometry.
      // A reroute almost never changes activeStopIndex (the driver hasn't completed
      // a stop, just deviated), so the [activeStopIndex] effect won't fire and
      // corridorCoordsRef would keep the STALE polyline — leaving the driver still
      // "off" the old corridor and re-triggering reroute forever (the 5s loop).
      // Re-rendering the active leg here updates corridorCoordsRef to the new path.
      // Call through refs — these callbacks are defined BELOW this effect, so
      // referencing them directly (or in the dep array) would throw a TDZ error.
      const map = mapRef.current
      if (map && markerLibRef.current && renderStopMarkersRef.current) {
        const stops = route?.optimizedStops ?? []
        const idx   = activeStopIndexRef.current
        const nextStop = stops[idx]
        renderStopMarkersRef.current(map, stops, idx, newStopIdsRef.current)
        renderFullRouteGrayRef.current?.(map, route?.encodedPolyline)
        if (nextStop) {
          const pos = driverPosRef.current
          renderActiveLegRef.current?.(
            map,
            pos?.lng ?? nextStop.coordinates.lng,
            pos?.lat ?? nextStop.coordinates.lat,
            nextStop,
            true,
          )
        }
      }
    } else {
      routeSyncedOnceRef.current = true
    }
  }, [route])
  useEffect(() => { if (driverPos) driverPosRef.current = driverPos }, [driverPos])
  useEffect(() => { onStepUpdateRef.current = onStepUpdate }, [onStepUpdate])
  useEffect(() => { onRerouteRef.current = onReroute }, [onReroute])
  useEffect(() => { onArrivalRef.current = onArrival }, [onArrival])
  useEffect(() => { driverIdRef.current = driverId }, [driverId])
  useEffect(() => { newStopIdsRef.current = newStopIds }, [newStopIds])

  // Re-render markers when new stop pulse set changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !markerLibRef.current) return
    if (!renderStopMarkersRef.current) return
    const stops = routeRef.current?.optimizedStops ?? []
    renderStopMarkersRef.current(map, stops, activeStopIndexRef.current, newStopIds)
  }, [newStopIds])

  // ── Camera follow state ───────────────────────────────────────────────────
  // followDriver: camera tracks the driver (auto-pan). Broken by manual drag.
  // Starts OFF — when the route first loads the driver sees the full optimised
  // route overview (north-up). Follow/navigation engages only when they tap the
  // recenter button.
  const [followDriver, setFollowDriver] = useState(false)
  const followDriverRef = useRef(false)
  // headingUp: when following on a vector map, rotate + tilt the camera so the
  // direction of travel points up (the Google Maps navigation view). Engaged by
  // the recenter button. Starts off (we open in overview, not nav mode).
  const [headingUp, setHeadingUp] = useState(false)
  const headingUpRef = useRef(false)

  // ── Gliding marker animation refs ─────────────────────────────────────────
  // We tween the car between consecutive GPS fixes (position + heading) with
  // requestAnimationFrame so it moves continuously like the Maps blue dot.
  const glideRafRef        = useRef(null)   // active rAF id
  const glideFromRef       = useRef(null)   // { lng, lat, heading } at tween start
  const glideToRef         = useRef(null)   // { lng, lat, heading } target
  const glideStartRef      = useRef(0)      // performance.now() at tween start
  const renderedPosRef     = useRef(null)   // last on-screen { lng, lat } of the car
  // True until the active-stop effect has run once. Lets us keep the initial
  // route-overview fitBounds instead of immediately snapping to the active stop.
  const activeStopInitRef  = useRef(true)
  // False until the first route prop sync, so we don't clear the off-route
  // banner on mount (there's nothing to clear and no banner shown yet).
  const routeSyncedOnceRef = useRef(false)

  // ── Banner state ──────────────────────────────────────────────────────────
  const [banner, setBanner] = useState(null) // { icon, instruction, distance }
  const [offRoute, setOffRoute] = useState(false)
  // Seconds left before the off-route reroute fires. Counts 15→0 for clear UX
  // (GPS ticks alone are too sparse / pause when stationary, so we tick locally).
  const [offRouteCountdown, setOffRouteCountdown] = useState(OFF_ROUTE_DURATION_MS / 1000)
  const [locating, setLocating] = useState(false)

  // ── Full route gray polyline ──────────────────────────────────────────────
  const renderFullRouteGray = useCallback((map, enc) => {
    if (!map || !enc || !mapsLibRef.current) return
    const path = decodePolyline5(enc).map(([lng, lat]) => ({ lat, lng }))

    if (fullPolylineRef.current) fullPolylineRef.current.setMap(null)
    fullPolylineRef.current = new mapsLibRef.current.Polyline({
      path,
      map,
      strokeColor:   '#d1d5db',
      strokeWeight:  4,
      strokeOpacity: 0.8,
    })
  }, [])
  renderFullRouteGrayRef.current = renderFullRouteGray

  // ── Active leg in blue + extract steps ───────────────────────────────────
  // Fires only when driver switches destination, reroutes, or map first mounts.
  // No periodic GPS-tick refetch — turn steps are advanced locally via Haversine.
  const renderActiveLeg = useCallback(async (map, fromLng, fromLat, toStop, resetStepTracking = false) => {
    if (!toStop || !map || !mapsLibRef.current) return

    legAbortRef.current?.abort()
    const ctrl = new AbortController()
    legAbortRef.current = ctrl

    try {
      const res = await fetch('/api/google/directions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          from: { lng: fromLng, lat: fromLat },
          to:   { lng: toStop.coordinates.lng, lat: toStop.coordinates.lat },
          withSteps: true,
        }),
        signal: ctrl.signal,
      })
      if (!res.ok) return
      const data = await res.json()
      if (!data?.geometry) return

      // Polyline5 decode → [{ lat, lng }] for Google Maps Polyline
      const decoded = decodePolyline5(data.geometry)
      corridorCoordsRef.current = decoded // [[lng, lat]] for off-route Haversine
      const path = decoded.map(([lng, lat]) => ({ lat, lng }))

      if (activePolylineRef.current) activePolylineRef.current.setMap(null)
      activePolylineRef.current = new mapsLibRef.current.Polyline({
        path,
        map,
        strokeColor:   '#2563eb',
        strokeWeight:  6,
        strokeOpacity: 0.95,
      })

      const steps = data.steps ?? []
      stepsRef.current = steps

      if (resetStepTracking) {
        nextStepIdxRef.current    = 0
        lastSpokenStepRef.current = -1
        voiceStageRef.current     = 0
        prevDistToTurnRef.current = null
      }

      offRouteSinceRef.current = null
      setOffRoute(false)

      if (steps.length > 0) {
        // Seed the banner immediately with live distance so it's accurate the
        // moment the leg loads — don't wait for the next GPS tick to correct it.
        // We call updateTurnBanner with the current driver position if known;
        // fall back to the destination coords so something is always shown.
        const pos = driverPosRef.current
        if (pos) {
          updateTurnBannerInternalRef.current?.(steps, 0, pos.lng, pos.lat)
        } else {
          // Mirrors computeTurnGuidance's BUG 2 fix: the step whose
          // instruction/icon we show is the UPCOMING maneuver (steps[1]),
          // not steps[0] (the depart instruction for the road we're already
          // on) — steps[0]'s instruction/location describe the same point,
          // not the turn steps[1]'s distance is measured to.
          const first = steps[0]
          const nextS = steps[1]
          const announceStep = nextS ?? first
          let dist = first.distance
          if (nextS) {
            const [nLng, nLat] = nextS.maneuver.location
            const [fLng, fLat] = first.maneuver.location
            dist = haversineM({ lng: fLng, lat: fLat }, { lng: nLng, lat: nLat })
          }
          setBanner({
            icon:        getManeuverIcon(announceStep),
            instruction: announceStep.maneuver?.instruction ?? '',
            distance:    formatDist(dist),
            then:        nextS && steps[2] ? getManeuverIcon(steps[2]) : null,
          })
        }
        if (resetStepTracking) onStepUpdateRef.current?.(steps[nextStepIdxRef.current] ?? steps[0])
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.warn('[DriverMap] active leg fetch failed:', err)
    }
  }, [])
  renderActiveLegRef.current = renderActiveLeg

  // ── Core banner logic ────────────────────────────────────────────────────
  // Delegates the actual decision-making to computeTurnGuidance() (pure,
  // unit-tested — see src/lib/turnGuidance.js). This wrapper just feeds it
  // the ref-backed state and applies the result (setBanner + voice callback).
  //
  // `startIdx` non-null = called from leg-load seed (don't write back refs,
  // don't fire voice). null = live GPS tick.
  const updateTurnBannerInternal = useCallback((steps, startIdx, lng, lat) => {
    if (!steps.length) return

    const isLiveGps = startIdx == null
    const currentIdx = startIdx ?? nextStepIdxRef.current

    const result = computeTurnGuidance({
      steps,
      currentIdx,
      lng,
      lat,
      lastSpokenStepIdx: lastSpokenStepRef.current,
      voiceStage:        voiceStageRef.current,
      prevDistToTurn:    prevDistToTurnRef.current,
      liveGps:           isLiveGps,
    })

    if (isLiveGps) {
      nextStepIdxRef.current    = result.newIdx
      lastSpokenStepRef.current = result.newLastSpokenStepIdx
      voiceStageRef.current     = result.newVoiceStage
      prevDistToTurnRef.current = result.newPrevDistToTurn
    }

    if (!result.banner) {
      if (isLiveGps) setBanner(null)
      return
    }

    setBanner({
      icon:        getManeuverIcon(result.banner.announceStep),
      instruction: result.banner.instruction,
      distance:    formatDist(result.banner.distanceM),
      then:        result.banner.thenStep ? getManeuverIcon(result.banner.thenStep) : null,
    })

    if (result.voiceEvent) {
      onStepUpdateRef.current?.(result.voiceEvent.step, result.voiceEvent.distToTurn, result.voiceEvent.stage)
    }
  }, [])
  updateTurnBannerInternalRef.current = updateTurnBannerInternal

  // ── GPS-tick entry point ──────────────────────────────────────────────────
  const updateTurnBanner = useCallback((lng, lat) => {
    const steps = stepsRef.current
    if (!steps.length) return
    updateTurnBannerInternalRef.current?.(steps, null, lng, lat)
  }, [])

  // Lock follow on a known position with the chosen orientation, like the
  // Maps app snapping back to your location.
  const lockFollow = useCallback((lng, lat, useHeadingUp) => {
    const map = mapRef.current
    if (!map) return
    followDriverRef.current = true
    setFollowDriver(true)
    headingUpRef.current = useHeadingUp
    setHeadingUp(useHeadingUp)
    const deg = headingRef.current ?? 0
    if (map.moveCamera) {
      map.moveCamera({
        center: { lat, lng },
        zoom:   FOLLOW_ZOOM,
        ...(useHeadingUp && HEADING_UP_SUPPORTED
          ? { heading: deg, tilt: FOLLOW_TILT_DEG }
          : { heading: 0, tilt: 0 }),
      })
    } else {
      map.panTo({ lat, lng })
      map.setZoom(FOLLOW_ZOOM)
    }
  }, [])

  // ── Re-centre button: cycles like Google Maps ─────────────────────────────
  // not following → follow (heading-up nav view)
  // following north-up → heading-up
  // following heading-up → north-up
  const handleUseCurrentLocation = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    const decideMode = () => {
      if (!followDriverRef.current) return true // re-lock into nav view
      if (!HEADING_UP_SUPPORTED) return false   // raster map: stay north-up
      return !headingUpRef.current              // toggle orientation
    }

    const pos = driverPosRef.current
    if (pos) {
      lockFollow(pos.lng, pos.lat, decideMode())
      return
    }
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { longitude: lng, latitude: lat } = p.coords
        driverPosRef.current = { lng, lat }
        lockFollow(lng, lat, decideMode())
        setLocating(false)
      },
      () => {
        console.warn('Geolocation permission denied')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [lockFollow])

  // ── Off-route detection + server-side reroute trigger ─────────────────────
  const checkOffRoute = useCallback(async (lng, lat) => {
    const corridor = corridorCoordsRef.current
    if (!corridor.length || reroutingRef.current) return
    // Respect the post-reroute cooldown — gives the driver time to rejoin the
    // new path before we evaluate again (prevents the reroute loop).
    if (Date.now() < rerouteCooldownUntilRef.current) {
      if (offRouteSinceRef.current !== null) { offRouteSinceRef.current = null; setOffRoute(false) }
      return
    }

    const dist = distToPolylineM({ lng, lat }, corridor)

    if (dist > OFF_ROUTE_THRESHOLD_M) {
      if (offRouteSinceRef.current === null) {
        offRouteSinceRef.current = Date.now()
        setOffRoute(true)
      } else if (Date.now() - offRouteSinceRef.current >= OFF_ROUTE_DURATION_MS) {
        const id = driverIdRef.current
        // Guard the EARLY-OUT before taking the lock — previously `if (!id) return`
        // sat after the lock was set, and an awaited fetch with no timeout could
        // hang on a flaky mobile connection, leaving reroutingRef stuck `true`
        // forever — which permanently kills off-route detection for the session.
        if (!id) return
        reroutingRef.current = true
        offRouteSinceRef.current = null
        setOffRoute(false)
        // Hard timeout so a hung request can never deadlock detection.
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 12000)
        try {
          const res = await fetch(`/api/drivers/${id}/reroute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentLng: lng, currentLat: lat }),
            signal: ctrl.signal,
          })
          if (res.ok) {
            const { route: newRoute } = await res.json()
            if (newRoute) onRerouteRef.current?.(newRoute)
          }
        } catch (err) {
          console.warn('[DriverMap] reroute request failed:', err?.name === 'AbortError' ? 'timeout' : err)
        } finally {
          clearTimeout(timer)
          reroutingRef.current = false  // ALWAYS released — never stuck
          // Start the cooldown so we don't immediately re-detect against the new
          // path before the driver has had a chance to rejoin it.
          rerouteCooldownUntilRef.current = Date.now() + REROUTE_COOLDOWN_MS
        }
      }
    } else {
      if (offRouteSinceRef.current !== null) {
        offRouteSinceRef.current = null
        setOffRoute(false)
      }
    }
  }, [])

  // ── Off-route countdown ticker ─────────────────────────────────────────────
  // While off-route, tick the displayed seconds-remaining down to 0 once a
  // second, derived from when the deviation started. Independent of GPS cadence
  // so the number always moves smoothly even if the driver is stationary.
  useEffect(() => {
    if (!offRoute) {
      setOffRouteCountdown(OFF_ROUTE_DURATION_MS / 1000)
      return
    }
    const tick = () => {
      const since = offRouteSinceRef.current
      if (since == null) return
      const remainingMs = OFF_ROUTE_DURATION_MS - (Date.now() - since)
      setOffRouteCountdown(Math.max(0, Math.ceil(remainingMs / 1000)))
    }
    tick() // immediate, so it doesn't show the stale full value for the first second
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [offRoute])

  // ── Ensure the car marker DOM exists (created once) ────────────────────────
  const ensureDriverMarker = useCallback((map, lng, lat, deg) => {
    if (driverMarkerRef.current) return
    const el = document.createElement('div')
    // AdvancedMarkerElement anchors content by its BOTTOM-centre, which would put
    // the GPS point at the bottom of the car and draw the car ~44px north of the
    // real location (the "marker far up the road" bug). translateY(50%) shifts the
    // element down by half its height so its CENTRE sits on the coordinate.
    el.style.cssText = 'width:36px;height:44px;cursor:pointer;transform:translateY(50%);'
    const inner = document.createElement('div')
    // No CSS transition on rotation — we drive heading frame-by-frame in the
    // glide loop so it stays in sync with the gliding position.
    inner.style.cssText = 'width:36px;height:44px;transform-origin:center center;'
    inner.style.transform = `rotate(${deg}deg)`
    inner.innerHTML = CAR_SVG
    el.appendChild(inner)
    carInnerRef.current = inner

    const { AdvancedMarkerElement } = markerLibRef.current
    driverMarkerRef.current = new AdvancedMarkerElement({
      map,
      position: { lat, lng },
      content:  el,
    })
    renderedPosRef.current = { lng, lat }
  }, [])

  // Shortest angular interpolation between two bearings (handles 350°→10° wrap).
  const lerpAngle = (a, b, t) => {
    let d = ((b - a + 540) % 360) - 180
    return (a + d * t + 360) % 360
  }

  // ── Apply a rendered frame: move marker, rotate car, drive follow camera ───
  const applyFrame = useCallback((map, lng, lat, deg) => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.position = { lat, lng }
    }
    if (carInnerRef.current) {
      // In heading-up mode the MAP rotates to the heading, so the car must point
      // straight up (its rotation is cancelled by the map's). In north-up mode
      // the car itself rotates to show heading.
      const carDeg = (followDriverRef.current && headingUpRef.current && HEADING_UP_SUPPORTED) ? 0 : deg
      carInnerRef.current.style.transform = `rotate(${carDeg}deg)`
    }
    renderedPosRef.current = { lng, lat }

    if (followDriverRef.current) {
      map.moveCamera
        ? map.moveCamera({
            center: { lat, lng },
            ...(headingUpRef.current && HEADING_UP_SUPPORTED
              ? { heading: deg, tilt: FOLLOW_TILT_DEG }
              : {}),
          })
        : map.panTo({ lat, lng })
    }
  }, [])

  // ── GPS tick → set a glide target; rAF interpolates toward it ──────────────
  const updateDriverMarker = useCallback((map, lng, lat, gpsHeading) => {
    // Resolve heading: prefer GPS heading, else bearing from last fix.
    let deg = headingRef.current
    if (gpsHeading != null && !isNaN(gpsHeading)) {
      deg = gpsHeading
    } else if (prevPosRef.current) {
      const moved = haversineM(prevPosRef.current, { lng, lat })
      if (moved > 3) deg = bearingDeg(prevPosRef.current, { lng, lat })
    }
    headingRef.current = deg
    prevPosRef.current = { lng, lat }

    ensureDriverMarker(map, lng, lat, deg)

    // Glide from where the car is currently drawn to the new fix.
    const from = renderedPosRef.current ?? { lng, lat }
    const fromHeading = glideToRef.current?.heading ?? deg
    glideFromRef.current  = { lng: from.lng, lat: from.lat, heading: fromHeading }
    glideToRef.current    = { lng, lat, heading: deg }
    glideStartRef.current = performance.now()

    if (glideRafRef.current) cancelAnimationFrame(glideRafRef.current)
    const step = (now) => {
      const t = Math.min(1, (now - glideStartRef.current) / GLIDE_MS)
      // ease-out for a natural decel into each fix
      const e = 1 - (1 - t) * (1 - t)
      const f = glideFromRef.current
      const g = glideToRef.current
      if (!f || !g) return
      const curLng = f.lng + (g.lng - f.lng) * e
      const curLat = f.lat + (g.lat - f.lat) * e
      const curDeg = lerpAngle(f.heading, g.heading, e)
      applyFrame(map, curLng, curLat, curDeg)
      if (t < 1) {
        glideRafRef.current = requestAnimationFrame(step)
      } else {
        glideRafRef.current = null
      }
    }
    glideRafRef.current = requestAnimationFrame(step)
  }, [ensureDriverMarker, applyFrame])

  // ── Stop markers ─────────────────────────────────────────────────────────
  const renderStopMarkers = useCallback((map, stops, currentIndex, pulseIds) => {
    const { AdvancedMarkerElement } = markerLibRef.current ?? {}
    if (!AdvancedMarkerElement) return

    // Remove previous markers
    markersRef.current.forEach((m) => { m.map = null })
    markersRef.current = []

    if (!infoWindowRef.current && mapsLibRef.current) {
      infoWindowRef.current = new mapsLibRef.current.InfoWindow()
    }

    stops.forEach((stop, i) => {
      const done       = i < currentIndex
      const active     = i === currentIndex
      const isEndpoint = stop.stopType === 'endpoint'
      const isNew      = !done && !!pulseIds && stop.bookingId && pulseIds.has(String(stop.bookingId))

      const label = done ? '✓' : isEndpoint ? 'E' : String(i + 1)

      let bgColor
      if (done) bgColor = '#9ca3af'
      else if (active) bgColor = '#2563eb'
      else if (isEndpoint) bgColor = '#7c3aed'
      else bgColor = stop.stopType === 'pickup' ? '#16a34a' : '#dc2626'

      const el = document.createElement('div')
      const baseShadow = active ? '0 0 0 4px rgba(37,99,235,0.35)' : '0 2px 6px rgba(0,0,0,.3)'
      // translateY(50%) centres the round pin on its coordinate (AdvancedMarker
      // anchors content bottom-centre, which would draw it north of the point).
      el.style.cssText = `
        width:34px;height:34px;border-radius:50%;
        background:${bgColor};
        color:#fff;font-size:${done ? '16px' : '13px'};font-weight:700;
        display:flex;align-items:center;justify-content:center;
        box-shadow:${baseShadow};
        border:2px solid #fff;opacity:${done ? 0.5 : 1};
        cursor:pointer;transform:translateY(50%);
        ${isNew ? 'animation:driverMapPulse 1s ease-out infinite;' : ''}
      `
      el.textContent = label

      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: stop.coordinates.lat, lng: stop.coordinates.lng },
        content:  el,
      })

      // Show popup on click via shared InfoWindow
      const stopTypeLabel = stop.stopType === 'endpoint' ? '🟣 End Point'
        : stop.stopType === 'pickup' ? '🟢 Pickup' : '🔴 Drop-off'
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(
          `<div style="font-size:12px;font-weight:600">${stopTypeLabel}${isNew ? ' <span style="color:#d97706">• NEW</span>' : ''}</div>
           <div style="font-size:11px;color:#555;margin-top:2px">${stop.address}</div>`
        )
        infoWindowRef.current.open({ anchor: marker, map })
      })

      markersRef.current.push(marker)
    })
  }, [])
  renderStopMarkersRef.current = renderStopMarkers

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!route) return
    let destroyed = false

    ;(async () => {
      try {
        const { Loader } = await import('@googlemaps/js-api-loader')
        const loader = new Loader({
          apiKey:    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
          version:   'weekly',
          libraries: ['maps', 'marker'],
        })

        const mapsLib   = await loader.importLibrary('maps')
        const markerLib = await loader.importLibrary('marker')
        if (destroyed || !containerRef.current) return

        mapsLibRef.current  = mapsLib
        markerLibRef.current = markerLib

        const { Map } = mapsLib

        const idx        = activeStopIndexRef.current
        const stops      = route.optimizedStops ?? []
        const activeStop = stops[idx] ?? stops[0]
        const initPos    = driverPosRef.current
        const initCenter = initPos
          ? { lat: initPos.lat, lng: initPos.lng }
          : activeStop
            ? { lat: activeStop.coordinates.lat, lng: activeStop.coordinates.lng }
            : { lat: 32.6420, lng: 74.2010 }

        // Open in OVERVIEW: north-up, no tilt. Follow/nav engages only when the
        // driver taps the recenter button.
        const map = new Map(containerRef.current, {
          center:           initCenter,
          zoom:             13,
          mapId:            MAP_ID,
          disableDefaultUI: true,
          zoomControl:      false, // driver doesn't need zoom controls
          gestureHandling:  'greedy', // single-finger pan on mobile
          ...(HEADING_UP_SUPPORTED ? { headingInteractionEnabled: true } : {}),
        })
        mapRef.current = map

        // Show live traffic, like the Maps app. (Layer is harmless on raster.)
        try { new mapsLib.TrafficLayer().setMap(map) } catch { /* non-fatal */ }

        // Fit the whole optimised route in view so the driver sees all stops
        // (+ their own position) on first load, instead of being zoomed onto one.
        try {
          const pts = (stops ?? [])
            .filter((s) => s?.coordinates)
            .map((s) => ({ lat: s.coordinates.lat, lng: s.coordinates.lng }))
          if (initPos) pts.push({ lat: initPos.lat, lng: initPos.lng })
          if (pts.length >= 2) {
            const bounds = new mapsLib.LatLngBounds()
            pts.forEach((p) => bounds.extend(p))
            map.fitBounds(bounds, 64)
          }
        } catch { /* non-fatal — keep the default center/zoom */ }

        // Unlock follow mode when driver manually drags the map. Drop the
        // heading-up tilt so the free-pan view is the easy-to-read north-up map
        // (the Maps app does the same when you pan away from navigation).
        map.addListener('dragstart', () => {
          if (followDriverRef.current) {
            followDriverRef.current = false
            setFollowDriver(false)
            if (HEADING_UP_SUPPORTED && map.moveCamera) {
              map.moveCamera({ heading: 0, tilt: 0 })
            }
          }
        })

        // Render initial state
        renderStopMarkers(map, stops, idx, newStopIdsRef.current)
        renderFullRouteGray(map, route.encodedPolyline)

        const nextStop = stops[idx]
        if (nextStop) {
          const pos     = initPos
          const fromLng = pos?.lng ?? nextStop.coordinates.lng
          const fromLat = pos?.lat ?? nextStop.coordinates.lat
          if (pos) updateDriverMarker(map, fromLng, fromLat, null)
          renderActiveLeg(map, fromLng, fromLat, nextStop, true)
        }

        // Direct watchPosition — fires at the raw browser GPS tick rate with no wrapper.
        // This fixes the three GeolocateControl issues: delayed turns, drifting marker,
        // failed auto-centering.
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (destroyed) return
            const { longitude: lng, latitude: lat, heading } = pos.coords
            driverPosRef.current = { lng, lat }

            updateDriverMarker(map, lng, lat, heading)
            updateTurnBanner(lng, lat)
            checkOffRoute(lng, lat)

            // Arrival detection
            const aidx       = activeStopIndexRef.current
            const activeStop = routeRef.current?.optimizedStops?.[aidx]
            if (
              activeStop &&
              activeStop.stopType !== 'endpoint' &&
              !activeStop.completedAt &&
              arrivedStopRef.current !== aidx
            ) {
              const dist = haversineM({ lat, lng }, {
                lat: activeStop.coordinates.lat,
                lng: activeStop.coordinates.lng,
              })
              if (dist <= ARRIVAL_RADIUS_M) {
                arrivedStopRef.current = aidx
                onArrivalRef.current?.(aidx)
              }
            }

            // Camera follow is driven by the glide loop (applyFrame), so no
            // panTo here — that would fight the smooth interpolation.
          },
          (err) => {
            console.warn('[DriverMap] watchPosition error:', err)
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        )
      } catch (err) {
        console.error('[DriverMap] Google Maps init failed:', err)
      }
    })()

    return () => {
      destroyed = true
      legAbortRef.current?.abort()
      if (glideRafRef.current) { cancelAnimationFrame(glideRafRef.current); glideRafRef.current = null }
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (fullPolylineRef.current)  { fullPolylineRef.current.setMap(null);  fullPolylineRef.current = null }
      if (activePolylineRef.current){ activePolylineRef.current.setMap(null); activePolylineRef.current = null }
      markersRef.current.forEach((m) => { m.map = null })
      markersRef.current = []
      driverMarkerRef.current = null
      mapRef.current = null
    }
  }, []) // mount once

  // ── Re-check off-route when the app returns to the foreground ──────────────
  // Drivers commonly turn follow on and switch away. Browsers throttle/suspend
  // watchPosition while the tab is backgrounded (wake-lock keeps the SCREEN on
  // but does NOT keep geolocation running), so checkOffRoute stops firing. On
  // return we grab a fresh fix and evaluate immediately, so a driver who drove
  // off-route while the app was backgrounded is caught at once instead of
  // waiting for the watch to spin back up.
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden || !navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const { longitude: lng, latitude: lat } = p.coords
          driverPosRef.current = { lng, lat }
          checkOffRoute(lng, lat)
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      )
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [checkOffRoute])

  // ── Active stop changed ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !markerLibRef.current) return

    const stops = routeRef.current?.optimizedStops ?? []
    renderStopMarkers(map, stops, activeStopIndex, newStopIdsRef.current)

    const nextStop = stops[activeStopIndex]
    if (nextStop) {
      // Skip the camera move on the very first run so the initial route-overview
      // fitBounds (set in map init) survives. After that: only jump the camera to
      // the new stop when NOT following — in follow/nav mode the camera stays
      // glued to the driver, like advancing legs in the Google Maps app.
      const firstRun = activeStopInitRef.current
      activeStopInitRef.current = false
      if (!firstRun && !followDriverRef.current) {
        map.panTo({ lat: nextStop.coordinates.lat, lng: nextStop.coordinates.lng })
        map.setZoom(15)
      }
      const pos     = driverPosRef.current
      const fromLng = pos?.lng ?? nextStop.coordinates.lng
      const fromLat = pos?.lat ?? nextStop.coordinates.lat
      renderActiveLeg(map, fromLng, fromLat, nextStop, true)
    } else {
      setBanner(null)
      if (activePolylineRef.current) {
        activePolylineRef.current.setMap(null)
        activePolylineRef.current = null
      }
    }
  }, [activeStopIndex])

  return (
    <div className="w-full h-full relative">
      <style jsx global>{`
        @keyframes driverMapPulse {
          0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.75), 0 2px 6px rgba(0,0,0,.3); }
          70%  { box-shadow: 0 0 0 14px rgba(245,158,11,0), 0 2px 6px rgba(0,0,0,.3); }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0), 0 2px 6px rgba(0,0,0,.3); }
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Turn-by-turn banner ─────────────────────────────────────────────
           Sized with Tailwind breakpoints (not fixed px) so it scales down on
           narrow phone screens and back up on tablets/desktop. Sits below the
           back/status/sign-out row (which is ~52px tall) so the two never
           overlap. ── */}
      {banner && (
        <div className="absolute top-14 sm:top-16 left-0 right-0 z-30 flex justify-center pointer-events-none px-2 sm:px-3">
          <div
            className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl px-2.5 py-2 sm:px-4 sm:py-3 w-full"
            style={{
              background: 'rgba(10,15,30,0.93)',
              backdropFilter: 'blur(10px)',
              maxWidth: '420px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
            }}
          >
            {/* Maneuver arrow — large, like Google Maps */}
            <div
              className="shrink-0 flex items-center justify-center rounded-lg sm:rounded-xl w-9 h-9 sm:w-[52px] sm:h-[52px] text-xl sm:text-[28px]"
              style={{ background: '#1d4ed8' }}
            >
              {banner.icon}
            </div>

            {/* Distance + instruction */}
            <div className="flex-1 min-w-0">
              <p
                className="text-white font-black leading-none tracking-tight text-lg sm:text-[26px]"
                style={{ letterSpacing: '-0.5px' }}
              >
                {banner.distance}
              </p>
              <p className="text-gray-200 font-semibold leading-snug mt-0.5 text-xs sm:text-[13px] line-clamp-2 sm:line-clamp-1">
                {banner.instruction}
              </p>
            </div>

            {/* "Then" cue — next maneuver icon, small, right side */}
            {banner.then && (
              <div className="flex shrink-0 flex-col items-center gap-0.5">
                <span className="text-gray-400 text-[9px] sm:text-[10px] font-semibold">then</span>
                <div
                  className="flex items-center justify-center rounded-md sm:rounded-lg w-6 h-6 sm:w-8 sm:h-8 text-sm sm:text-lg"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  {banner.then}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Off-route warning banner ────────────────────────────────────── */}
      {offRoute && (
        <div
          className="absolute top-32 left-3 right-3 z-30 flex items-center gap-2 rounded-2xl px-4 py-2.5 pointer-events-none"
          style={{ background: 'rgba(220,38,38,0.9)', backdropFilter: 'blur(8px)' }}
        >
          <span className="text-white text-lg">⚠️</span>
          <p className="text-white text-xs font-semibold">Off route — recalculating in {offRouteCountdown}s…</p>
        </div>
      )}

      {/* ── Re-centre / follow control — mirrors the Google Maps app ────────
           free (not following)      → hollow location crosshair, white bg
           following, north-up       → filled crosshair, blue bg
           following, heading-up nav → filled navigation arrow, blue bg
           Tap cycles: free → nav, north-up ↔ heading-up                    */}
      {(() => {
        const navMode = followDriver && headingUp && HEADING_UP_SUPPORTED
        const active  = followDriver
        const title = !followDriver
          ? 'Re-centre on my location'
          : navMode
            ? 'Navigation view — tap for north-up'
            : 'Following — tap for navigation view'
        return (
          <button
            onClick={handleUseCurrentLocation}
            disabled={locating}
            title={title}
            aria-label={title}
            className="absolute right-3 z-30 w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              // Sit above the bottom sheet's collapsed peek (~64px) + safe area,
              // on the right like the Google Maps app's recenter button.
              bottom:      'calc(84px + env(safe-area-inset-bottom))',
              background:  active ? '#2563eb' : '#ffffff',
              borderColor: active ? '#1d4ed8' : '#d1d5db',
              color:       active ? '#ffffff' : '#5f6368',
            }}
          >
            {locating ? (
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" />
              </svg>
            ) : navMode ? (
              // Filled navigation arrow (the Google Maps "navigation mode" glyph)
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2 L19 21 L12 17 L5 21 Z" />
              </svg>
            ) : (
              // Location crosshair (Google Maps "my location" glyph); filled dot
              // when following north-up, hollow ring when free.
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3.5" fill={active ? 'currentColor' : 'none'} />
                <line x1="12" y1="2"  x2="12" y2="5"  />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2"  y1="12" x2="5"  y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
              </svg>
            )}
          </button>
        )
      })()}
    </div>
  )
}
