'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { reverseGeocode, placesAutocomplete, placeDetails } from '@/lib/google-geocode'
import { MapPin } from 'lucide-react'

const PICKUP_COLOR  = '#16a34a' // green
const DROPOFF_COLOR = '#dc2626' // red

// Generate a UUID v4 for Places session token billing grouping
function newSessionToken() {
  return crypto.randomUUID()
}

// Google Maps getCenter().lng() can return an un-normalized longitude (e.g. 246
// instead of -114) after a large panTo that wraps across the antimeridian.
// Downstream consumers (Geocoding, ORS, Routes) reject values outside
// [-180, 180], so wrap it back into range at capture.
function normalizeLng(lng) {
  let n = Number(lng)
  if (!Number.isFinite(n)) return n
  n = ((n + 180) % 360 + 360) % 360 - 180
  return n
}

// The crosshair is a teardrop pin whose POINTED TIP — not its centre — is what
// the user aims at a location. The SVG (height 44) is centred in the map
// container with marginBottom:22, which places the tip 11px BELOW the container's
// geometric centre. map.getCenter() returns the coordinate at that geometric
// centre, so naively using it stores a point ~11px north of where the user
// pointed (the reported "pin lands slightly above the tip" bug).
//
// PIN_TIP_OFFSET_Y_PX is how far (in CSS px, +down) the tip sits below centre.
const PIN_TIP_OFFSET_Y_PX = 11

// Convert the pin-tip screen position to a LatLng using the map's projection.
// Returns { lng, lat } at the tip, or null if the projection isn't ready yet.
// Note: google.maps.Point lives in the CORE namespace (window.google.maps),
// NOT in the 'maps' library import — so we read it from the global.
function tipLatLng(map) {
  const proj = map.getProjection?.()
  const PointCtor = window.google?.maps?.Point
  if (!proj || !PointCtor) return null
  const zoom  = map.getZoom()
  const scale = 2 ** zoom
  // Centre coordinate → world point → shift down by the tip offset (in world
  // units = px / scale) → back to LatLng.
  const centerWorld = proj.fromLatLngToPoint(map.getCenter())
  if (!centerWorld) return null
  const tipPoint = new PointCtor(
    centerWorld.x,
    centerWorld.y + PIN_TIP_OFFSET_Y_PX / scale,
  )
  const tipLatLngObj = proj.fromPointToLatLng(tipPoint)
  if (!tipLatLngObj) return null
  return { lng: normalizeLng(tipLatLngObj.lng()), lat: tipLatLngObj.lat() }
}

function makeMarkerEl(color, label) {
  const el = document.createElement('div')
  el.style.cssText = `
    width:34px;height:34px;border-radius:50%;background:${color};
    color:#fff;font-size:11px;font-weight:700;display:flex;
    align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff;
    cursor:pointer;user-select:none;
  `
  el.textContent = label
  return el
}

/**
 * BookingMap — exactly 1 pickup + 1 drop-off, no more.
 *
 * Ref handle:
 *   removeStop(index) — 0 = pickup, 1 = dropoff
 *   clearAll()        — remove both and reset search
 *   setPickupCoords(lng, lat, address, city) — pre-seed pickup externally
 *   setPlacing(val)   — externally control placing mode
 */
const BookingMap = forwardRef(function BookingMap({ onStopsChange }, ref) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const mapsLibRef    = useRef(null) // google.maps namespace
  const markerLibRef  = useRef(null) // google.maps.marker namespace
  const pickupMarker  = useRef(null)
  const dropoffMarker = useRef(null)

  const [pickup,  setPickup]  = useState(null) // { lng, lat, address, city }
  const [dropoff, setDropoff] = useState(null)
  const [placing, setPlacing] = useState(null) // 'pickup' | 'dropoff' | null

  const [searchQuery,  setSearchQuery]  = useState('')
  const [suggestions,  setSuggestions]  = useState([]) // [{ placeId, description }]
  const [searching,    setSearching]    = useState(false)
  const [locating,     setLocating]     = useState(false)
  const [mapActive,    setMapActive]    = useState(false) // scroll-zoom guard

  const searchDebounceRef  = useRef(null)
  const searchAbortRef     = useRef(null)
  // Session token groups all autocomplete + one place-details call into 1 billing unit.
  // A new token is generated after each confirmed selection.
  const sessionTokenRef    = useRef(newSessionToken())

  // Notify parent whenever stops change
  useEffect(() => {
    const stops = []
    if (pickup)  stops.push({ type: 'pickup',  order: 0, ...pickup })
    if (dropoff) stops.push({ type: 'dropoff', order: 1, ...dropoff })
    onStopsChange?.(stops)
  }, [pickup, dropoff, onStopsChange])

  // ── Imperative handle ─────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    removeStop(index) {
      if (index === 0) {
        pickupMarker.current?.map && (pickupMarker.current.map = null)
        pickupMarker.current = null
        setPickup(null)
      } else {
        dropoffMarker.current?.map && (dropoffMarker.current.map = null)
        dropoffMarker.current = null
        setDropoff(null)
      }
    },
    clearAll() {
      if (pickupMarker.current)  pickupMarker.current.map  = null
      if (dropoffMarker.current) dropoffMarker.current.map = null
      pickupMarker.current  = null
      dropoffMarker.current = null
      setPickup(null)
      setDropoff(null)
      setSearchQuery('')
      setSuggestions([])
      setPlacing(null)
    },
    // Pre-seed pickup from an external coordinate (e.g. customer's saved address)
    setPickupCoords(lng, lat, address, city) {
      const map = mapRef.current
      const { AdvancedMarkerElement } = markerLibRef.current ?? {}
      if (!map || !AdvancedMarkerElement) return
      if (pickupMarker.current) pickupMarker.current.map = null
      const el = makeMarkerEl(PICKUP_COLOR, 'P')
      pickupMarker.current = new AdvancedMarkerElement({ map, position: { lat, lng }, content: el })
      map.panTo({ lat, lng })
      map.setZoom(14)
      setPickup({ lng, lat, address, city })
      setPlacing(null)
    },
    setPlacing(val) { setPlacing(val) },
  }))

  // ── Map init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let map
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
        if (destroyed) return

        mapsLibRef.current  = mapsLib
        markerLibRef.current = markerLib

        const { Map } = mapsLib

        map = new Map(containerRef.current, {
          center:            { lat: 51.0447, lng: -114.0719 }, // Calgary, AB
          zoom:              12,
          mapId:             process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID ?? 'DEMO_MAP_ID',
          // Disable default UI except zoom — we provide our own controls
          disableDefaultUI:  true,
          zoomControl:       true,
          scrollwheel:       false, // disabled until user explicitly activates
          gestureHandling:   'none', // prevents accidental scroll-zoom
        })
        mapRef.current = map
      } catch (err) {
        console.error('[BookingMap] Google Maps init failed:', err)
      }
    })()

    return () => {
      destroyed = true
      // Google Maps JS API has no map.remove() — set ref to null so stale handlers error cleanly
      mapRef.current = null
    }
  }, [])

  // ── Place a stop at the current map centre ────────────────────────────────

  async function handlePlace(type) {
    const map = mapRef.current
    const { AdvancedMarkerElement } = markerLibRef.current ?? {}
    if (!map || !AdvancedMarkerElement) return

    setPlacing(type)
    try {
      // Use the pin TIP coordinate, not the map centre — the tip is what the
      // user aims. Falls back to centre if the projection isn't ready.
      const tip = tipLatLng(map)
      const lng = tip ? tip.lng : normalizeLng(map.getCenter().lng())
      const lat = tip ? tip.lat : map.getCenter().lat()
      const { address, city } = await reverseGeocode(lng, lat)
      const stop = { lng, lat, address, city }

      if (type === 'pickup') {
        if (pickupMarker.current) pickupMarker.current.map = null
        const el = makeMarkerEl(PICKUP_COLOR, 'P')
        pickupMarker.current = new AdvancedMarkerElement({ map, position: { lat, lng }, content: el })
        setPickup(stop)
      } else {
        if (dropoffMarker.current) dropoffMarker.current.map = null
        const el = makeMarkerEl(DROPOFF_COLOR, 'D')
        dropoffMarker.current = new AdvancedMarkerElement({ map, position: { lat, lng }, content: el })
        setDropoff(stop)
      }
    } finally {
      setPlacing(null)
    }
  }

  // ── Address search (Places Autocomplete) ──────────────────────────────────

  function handleSearchChange(value) {
    setSearchQuery(value)

    clearTimeout(searchDebounceRef.current)
    searchAbortRef.current?.abort()
    searchAbortRef.current = null

    if (!value.trim()) {
      setSuggestions([])
      setSearching(false)
      return
    }

    setSearching(true)
    searchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      searchAbortRef.current = controller
      try {
        const results = await placesAutocomplete(value, sessionTokenRef.current, controller.signal)
        setSuggestions(results)
      } catch (err) {
        if (err?.name !== 'AbortError') setSuggestions([])
      } finally {
        if (searchAbortRef.current === controller) {
          setSearching(false)
          searchAbortRef.current = null
        }
      }
    }, 400)
  }

  async function pickSuggestion(prediction) {
    setSuggestions([])
    setSearchQuery(prediction.description)

    try {
      // Pass the same session token so Google bills ac + details as one session
      const { lng, lat } = await placeDetails(prediction.placeId, sessionTokenRef.current)
      // Rotate session token — next search session is a new billing unit
      sessionTokenRef.current = newSessionToken()
      setSearchQuery('')
      mapRef.current?.panTo({ lat, lng })
      // Zoom in tight (20) on the searched result so individual rooftops are
      // clearly distinguishable. At lower zoom the crosshair tip is hard to aim
      // and the reverse geocode snaps to the nearest neighbour (e.g. 50 → 46).
      mapRef.current?.setZoom(20)
    } catch {
      // Non-fatal — user can still pan manually
      sessionTokenRef.current = newSessionToken()
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) return
    setLocating(true)

    // Keep trying to refine the fix for up to ~15s. On desktop browsers, the
    // first callback is often a low-accuracy IP/Wi-Fi fix (can be off by
    // kilometres); GPS/sensor-fusion arrives a few seconds later with a much
    // tighter accuracy radius. We zoom the map based on accuracy.
    let settled = false
    let bestPos = null
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { longitude: lng, latitude: lat, accuracy } = pos.coords
        if (!bestPos || accuracy < bestPos.accuracy) {
          bestPos = { lng, lat, accuracy }
          const zoom = accuracy < 50 ? 17 : accuracy < 200 ? 15 : accuracy < 2000 ? 13 : 11
          mapRef.current?.panTo({ lat, lng })
          mapRef.current?.setZoom(zoom)
        }
        if (accuracy <= 100 && !settled) {
          settled = true
          navigator.geolocation.clearWatch(watchId)
          setLocating(false)
        }
      },
      (err) => {
        console.warn('[BookingMap] geolocation error:', err)
        navigator.geolocation.clearWatch(watchId)
        setLocating(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )

    // Hard timeout fallback — stop spinning even if no accurate fix arrived
    setTimeout(() => {
      if (!settled) {
        settled = true
        navigator.geolocation.clearWatch(watchId)
        setLocating(false)
      }
    }, 15000)
  }

  // ── Hint text ─────────────────────────────────────────────────────────────

  const hint = !pickup && !dropoff
    ? 'Pan the map, then set your Pickup and Drop-off points'
    : !pickup
    ? 'Pan to your pickup location and click "Set Pickup"'
    : !dropoff
    ? 'Pan to the drop-off location and click "Set Drop-off"'
    : 'Both points set — you can reposition either one'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2 w-full h-full">

      {/* Accuracy tip — zoom in for a precise pin. Lower zoom = each pixel covers
          more ground, so the pin reads as "slightly off" even when correct. */}
      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
        style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', color: '#1d4ed8' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
        <span className="leading-snug">
          <strong className="font-semibold">Tip:</strong> Search an address or zoom in close, then place the pin right on the exact spot before setting pickup &amp; drop-off.
        </span>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && handleSearchChange('')}
            placeholder="Search address to pan map…"
            className="w-full rounded-lg border border-border bg-white dark:bg-surface px-3.5 py-2 pr-8 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {/* Right-side spinner or clear button */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            {searching ? (
              <svg width="14" height="14" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite', color: 'var(--fg-3)' }}>
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" />
              </svg>
            ) : searchQuery ? (
              <button type="button" onClick={() => handleSearchChange('')} style={{ color: 'var(--fg-3)', lineHeight: 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            ) : null}
          </div>
          {(suggestions.length > 0 || (searching && searchQuery)) && (
            <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
              {searching && suggestions.length === 0 ? (
                <li className="px-3.5 py-2.5 text-sm flex items-center gap-2" style={{ color: 'var(--fg-3)' }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" />
                  </svg>
                  Searching…
                </li>
              ) : suggestions.map((p) => (
                <li key={p.placeId}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(p)}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-foreground hover:bg-surface dark:hover:bg-white/5 transition"
                  >
                    {p.description}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0 flex items-center justify-center text-white shadow-sm"
          title="Jump to your current location"
        >
          {locating ? (
            <span className="text-xs">…</span>
          ) : (
            <MapPin size={18} />
          )}
        </button>
      </div>

      {/* Map */}
      <div
        className="relative flex-1 min-h-0"
        style={{ minHeight: 340 }}
        onMouseLeave={() => {
          // Re-disable scroll zoom when mouse leaves the map area
          if (mapRef.current) {
            mapRef.current.setOptions({ scrollwheel: false, gestureHandling: 'none' })
          }
          setMapActive(false)
        }}
      >
        <div ref={containerRef} className="map-container rounded-xl overflow-hidden h-full w-full" />

        {/* Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width="36" height="44" viewBox="0 0 36 44"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.4))', marginBottom: 22 }}>
            <path d="M18 0C10.268 0 4 6.268 4 14c0 9.941 14 30 14 30S32 23.941 32 14C32 6.268 25.732 0 18 0z" fill="#2563eb" />
            <circle cx="18" cy="14" r="6" fill="#fff" />
          </svg>
        </div>

        {/* Scroll-zoom guard overlay — click to activate scroll zoom */}
        {!mapActive && (
          <div
            className="absolute inset-0 rounded-xl z-10 flex items-end justify-center pb-5 cursor-pointer"
            style={{ background: 'transparent' }}
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.setOptions({ scrollwheel: true, gestureHandling: 'greedy' })
              }
              setMapActive(true)
            }}
          >
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold pointer-events-none select-none"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Click map to enable scroll zoom
            </div>
          </div>
        )}

        {/* Placing overlay */}
        {placing && (
          <div
            className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(3px)', zIndex: 30 }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36"
              style={{ animation: 'spin 0.75s linear infinite' }}>
              <circle cx="18" cy="18" r="14" fill="none"
                stroke={placing === 'pickup' ? '#16a34a' : '#dc2626'}
                strokeWidth="3" strokeOpacity="0.2" />
              <path d="M18 4 A14 14 0 0 1 32 18"
                fill="none"
                stroke={placing === 'pickup' ? '#16a34a' : '#dc2626'}
                strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{
                background: placing === 'pickup' ? '#16a34a' : '#dc2626',
                color: '#fff',
              }}>
              Setting {placing === 'pickup' ? 'Pickup' : 'Drop-off'}…
            </span>
          </div>
        )}

        {/* Hint pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-surface/90 backdrop-blur-sm text-xs text-foreground px-3 py-1.5 rounded-full shadow border border-border pointer-events-none whitespace-nowrap" style={{ zIndex: 20 }}>
          {hint}
        </div>

        {/* Two action buttons — bottom centre */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 20 }}>
          <button
            type="button"
            onClick={() => handlePlace('pickup')}
            disabled={placing !== null}
            className={[
              'px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-white text-xs sm:text-sm font-semibold shadow-lg transition',
              pickup
                ? 'bg-green-700 hover:bg-green-800'
                : 'bg-green-600 hover:bg-green-700',
              placing !== null ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {placing === 'pickup' ? 'Setting…' : pickup ? '✓ Pickup' : '+ Set Pickup'}
          </button>
          <button
            type="button"
            onClick={() => handlePlace('dropoff')}
            disabled={placing !== null}
            className={[
              'px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-white text-xs sm:text-sm font-semibold shadow-lg transition',
              dropoff
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-red-600 hover:bg-red-700',
              placing !== null ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {placing === 'dropoff' ? 'Setting…' : dropoff ? '✓ Drop-off' : '+ Set Drop-off'}
          </button>
        </div>
      </div>
    </div>
  )
})

export default BookingMap
