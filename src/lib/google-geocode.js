/**
 * Client-side Google Maps geocoding and Places helpers.
 *
 * All calls are routed through server-side proxy routes which:
 *   - keep GOOGLE_MAPS_SERVER_KEY out of the browser,
 *   - cache results in Redis,
 *   - gate calls via google-budget soft caps.
 *
 * reverseGeocode() signature matches mapbox-geocode.js so callers are drop-in
 * compatible. The `_token` param is ignored (kept for back-compat with callers
 * that still pass it during the migration transition).
 */

/**
 * Reverse geocode: convert coordinates to a human-readable address.
 * Returns { address, city }.
 *
 * Pass an AbortSignal as the fourth arg to cancel an in-flight lookup
 * (e.g. when the user keeps panning before settling on a location).
 */
export function reverseGeocode(lng, lat, _token, signal) {
  const url = `/api/google/geocode?type=reverse&lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}`
  return fetch(url, { signal, cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => ({
      address: d.address ?? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
      city:    d.city    ?? '',
    }))
    .catch((err) => {
      if (err?.name === 'AbortError') throw err
      return { address: `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`, city: '' }
    })
}

/**
 * Places Autocomplete: returns prediction list as the user types.
 * Returns array of { placeId, description }.
 *
 * Pass a sessionToken (UUID string) to group all keystrokes in one session
 * so Google bills the entire type-and-select interaction as one event.
 * Generate a new token after each confirmed selection.
 *
 * Queries shorter than 3 chars short-circuit to [] without a network call.
 */
export function placesAutocomplete(query, sessionToken, signal) {
  const q = String(query ?? '').trim()
  if (q.length < 3) return Promise.resolve([])
  const url = `/api/google/places?q=${encodeURIComponent(q)}&sessionToken=${encodeURIComponent(sessionToken ?? '')}`
  return fetch(url, { signal, cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => d.predictions ?? [])
    .catch((err) => {
      if (err?.name === 'AbortError') throw err
      return []
    })
}

/**
 * Place Details: resolve a placeId to { lng, lat, address }.
 * Pass the same sessionToken used for the autocomplete calls that preceded
 * this — Google bills the whole session as one unit.
 */
export function placeDetails(placeId, sessionToken, signal) {
  const url = `/api/google/places?placeId=${encodeURIComponent(placeId)}&sessionToken=${encodeURIComponent(sessionToken ?? '')}`
  return fetch(url, { signal, cache: 'no-store' })
    .then((r) => r.json())
    .then((d) => {
      if (d.error) throw new Error(d.error)
      return { lng: d.lng, lat: d.lat, address: d.address ?? '' }
    })
    .catch((err) => {
      if (err?.name === 'AbortError') throw err
      throw err
    })
}
