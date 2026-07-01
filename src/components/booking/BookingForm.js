'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { placesAutocomplete, placeDetails } from '@/lib/google-geocode'

const BookingMap = dynamic(() => import('@/components/map/BookingMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-xl bg-surface border border-border flex items-center justify-center text-muted text-sm">
      Loading map…
    </div>
  ),
})


const PACKAGE_KINDS = [
  'Small Packages & Boxes',
  'Envelopes / Documents',
  'Packed Food',
  'Medical & Pharmaceutical Supplies',
  'Totes',
  'Gifts & Flowers',
  'Industrial Samples',
  'Other',
]

const WEIGHT_SLABS = [
  { label: 'Up to 10 kg', value: 'up_to_10' },
  { label: '10–25 kg (extra package)', value: '10_to_25' },
  { label: '25–50 kg (heavy)', value: '25_to_50' },
  { label: '50+ kg (freight)', value: '50_plus' },
]

function SectionHeading({ children }) {
  return (
    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mt-2 mb-3 flex items-center gap-2">
      {children}
    </h3>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-border bg-white dark:bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary'

export default function BookingForm({ apiPath = '/api/bookings', onSuccess }) {
  const router = useRouter()
  const toast  = useToast()
  const mapRef = useRef(null)

  // Map stops
  const [stops, setStops] = useState([])

  // Pickup details (for the pickup stop card)
  const [pickup, setPickup] = useState({
    contactName: '',
    companyName: '',
    buzzCode: '',
    pickupTime: '',
    contactPhone: '',
    notes: '',
  })

  // Drop-off details (for the dropoff stop card)
  const [dropoff, setDropoff] = useState({
    contactName: '',
    buzzCode: '',
    contactPhone: '',
  })
  // Tracks whether buzzCode currently holds an address auto-filled from a
  // "Set Pickup"/"Set Drop-off" click (safe to overwrite on the NEXT click)
  // vs. text the user typed themselves (must never be overwritten by a
  // click). Both start true — field begins empty/un-typed.
  const dropoffBuzzCodeIsAutoFilledRef = useRef(true)
  const pickupBuzzCodeIsAutoFilledRef  = useRef(true)
  // The one-time profile-prefill effect below seeds the pickup pin via
  // setPickupCoords, which fires the SAME onStopsChange callback a real
  // "Set Pickup" click does — there's no way to tell them apart from the
  // callback alone. This flag suppresses handleStopsChange's click-driven
  // auto-fill ONLY while that seed is in flight, so it doesn't immediately
  // overwrite the just-prefilled profile address. A real click always wins
  // once the user makes one, before or after the seed finishes.
  const profileSeedInFlightRef = useRef(false)

  // Prefill pickup details from customer profile if profileUpdated is true.
  // Also geocode the saved address and pre-seed the pickup pin on the map.
  useEffect(() => {
    if (apiPath !== '/api/bookings') return // guest form — skip
    fetch('/api/user/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (!user?.profileUpdated) return
        setPickup((prev) => ({
          ...prev,
          contactName:  user.contactName || prev.contactName,
          companyName:  user.companyName || prev.companyName,
          buzzCode:     user.buzzCode    || prev.buzzCode,
          contactPhone: user.phone       || prev.contactPhone,
        }))
        if (user.email) setSenderEmail(user.email)

        // Geocode the saved address and pre-seed the pickup pin
        if (!user.buzzCode?.trim()) return

        // Suppress click-driven buzzCode auto-fill for the duration of this
        // seed — setPickupCoords below fires onStopsChange just like a real
        // click, but pickup.buzzCode was already set to the profile address
        // above and must not be immediately overwritten by that callback.
        profileSeedInFlightRef.current = true

        // Show loading overlay as soon as the map ref is ready, then geocode
        const sessionToken = crypto.randomUUID()
        let attempts = 0
        const tryShowThenGeocode = () => {
          if (mapRef.current?.setPlacing) {
            mapRef.current.setPlacing('pickup')
            placesAutocomplete(user.buzzCode, sessionToken)
              .then((predictions) => {
                if (!predictions.length) { mapRef.current?.setPlacing(null); return }
                return placeDetails(predictions[0].placeId, sessionToken)
              })
              .then((result) => {
                if (!result) return
                mapRef.current?.setPickupCoords(result.lng, result.lat, result.address, '')
              })
              .catch(() => { mapRef.current?.setPlacing(null) })
              .finally(() => { profileSeedInFlightRef.current = false })
          } else if (attempts < 20) {
            attempts++
            setTimeout(tryShowThenGeocode, 300)
          } else {
            profileSeedInFlightRef.current = false
          }
        }
        tryShowThenGeocode()
      })
      .catch(() => {})
  }, [apiPath])

  // Package details
  const [pkg, setPkg] = useState({
    kind: '',
    weightSlab: 'up_to_10',
  })

  // Sender + receiver notification emails
  const [senderEmail,   setSenderEmail]   = useState('')
  const [receiverEmail, setReceiverEmail] = useState('')

  // Pricing rules fetched once on mount — keyed as Map for O(1) lookup
  // rule key: `${fromCity}|${toCity}|${weightSlab}` (all lowercased)
  const pricingRulesRef = useRef(null) // null = not loaded yet, Map after load

  // Pricing preview — computed client-side from pricingRulesRef, no extra API calls
  const [pricingPreview, setPricingPreview] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasPickup  = stops.some((s) => s.type === 'pickup')
  const hasDropoff = stops.some((s) => s.type === 'dropoff')

  // Fetch all pricing rules once on mount
  useEffect(() => {
    fetch('/api/pricing/rules/public')
      .then((r) => r.ok ? r.json() : [])
      .then((rules) => {
        const map = new Map()
        for (const r of rules) {
          const key = `${r.fromCity}|${r.toCity}|${r.weightSlab}`
          map.set(key, r)
        }
        pricingRulesRef.current = map
      })
      .catch(() => { pricingRulesRef.current = new Map() })
  }, [])

  const handleStopsChange = useCallback((newStops) => {
    setStops(newStops)
    const pickupStop  = newStops.find((s) => s.type === 'pickup')
    const dropoffStop = newStops.find((s) => s.type === 'dropoff')
    // Fires only when the user clicks "Set Pickup"/"Set Drop-off" (or re-
    // clicks after moving the pin) — BookingMap's onStopsChange is driven
    // exclusively by those clicks (and the one-time profile seed, suppressed
    // below), never by panning alone. Auto-fill only while the field still
    // holds an auto-filled value; once the user types into it directly, the
    // onChange handlers below flip the ref and this stops touching it.
    if (dropoffStop?.address && dropoffBuzzCodeIsAutoFilledRef.current) {
      setDropoff((prev) => ({ ...prev, buzzCode: dropoffStop.address }))
    }
    if (pickupStop?.address && pickupBuzzCodeIsAutoFilledRef.current && !profileSeedInFlightRef.current) {
      setPickup((prev) => ({ ...prev, buzzCode: pickupStop.address }))
    }
  }, [])

  function handleDeleteStop(index) {
    mapRef.current?.removeStop(index)
  }

  // Client-side price lookup — runs whenever stops or weight changes, zero API calls
  useEffect(() => {
    const pickupStop  = stops.find((s) => s.type === 'pickup')
    const dropoffStop = stops.find((s) => s.type === 'dropoff')

    if (!pickupStop?.city || !dropoffStop?.city || !pricingRulesRef.current) {
      setPricingPreview(null)
      return
    }

    const fromCity = pickupStop.city.toLowerCase()
    const toCity   = dropoffStop.city.toLowerCase()
    const slab     = pkg.weightSlab

    const key  = `${fromCity}|${toCity}|${slab}`
    const rule = pricingRulesRef.current.get(key)

    if (!rule) {
      setPricingPreview(null)
      return
    }

    const WEIGHT_LABELS = {
      up_to_10:  'Up to 10 kg',
      '10_to_25': '10–25 kg',
      '25_to_50': '25–50 kg',
      '50_plus':  '50+ kg',
    }

    setPricingPreview({
      price:       rule.price,
      routeLabel:  `${rule.fromCityDisplay} → ${rule.toCityDisplay}`,
      weightLabel: WEIGHT_LABELS[slab] ?? slab,
    })
  }, [stops, pkg.weightSlab])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!hasPickup || !hasDropoff) {
      setError('Place a pickup point and a drop-off point on the map.')
      return
    }
    if (!pickup.contactPhone.trim()) {
      setError('Pickup phone number is required.')
      return
    }
    if (!dropoff.contactPhone.trim()) {
      setError('Drop-off phone number is required.')
      return
    }

    // Same-location guard: block only when pickup and dropoff coordinates are
    // within ~25 m of each other (essentially the same pin). Address text is
    // unreliable for this — reverse-geocoded labels can be identical in rural
    // areas even for points that are hundreds of metres apart.
    const p = stops.find((s) => s.type === 'pickup')
    const d = stops.find((s) => s.type === 'dropoff')
    if (p && d) {
      const R = 6_371_000 // metres
      const toRad = (x) => (x * Math.PI) / 180
      const dLat = toRad(d.lat - p.lat)
      const dLng = toRad(d.lng - p.lng)
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(p.lat)) * Math.cos(toRad(d.lat)) * Math.sin(dLng / 2) ** 2
      const distanceMeters = 2 * R * Math.asin(Math.sqrt(a))
      if (distanceMeters < 25) {
        toast.warning(
          'Pickup and drop-off are at the same location',
          'Please choose two different points on the map.'
        )
        return
      }
    }

    setSubmitting(true)
    try {
      const pickupStop  = stops.find((s) => s.type === 'pickup')
      const dropoffStop = stops.find((s) => s.type === 'dropoff')

      const payload = {
        stops: [
          {
            type: 'pickup',
            order: 0,
            lat: pickupStop.lat,
            lng: pickupStop.lng,
            address: pickupStop.address,
            contactName: pickup.contactName,
            companyName: pickup.companyName,
            buzzCode: pickup.buzzCode,
            pickupTime: pickup.pickupTime,
            contactPhone: pickup.contactPhone,
            notes: pickup.notes,
          },
          {
            type: 'dropoff',
            order: 1,
            lat: dropoffStop.lat,
            lng: dropoffStop.lng,
            address: dropoffStop.address,
            contactName: dropoff.contactName,
            buzzCode: dropoff.buzzCode,
            contactPhone: dropoff.contactPhone,
          },
        ],
        packageDetails: {
          kind:      pkg.kind,
          weightSlab: pkg.weightSlab,
        },
        senderEmail:   senderEmail   || null,
        receiverEmail: receiverEmail || null,
        estimatedPrice: pricingPreview?.price ?? null,
      }

      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        const msg = data.error || 'Failed to create booking. Please try again.'
        setError(msg)
        toast.error('Could not create booking', msg)
        return
      }

      // Reset all state
      mapRef.current?.clearAll()
      setStops([])
      setPickup({ contactName: '', companyName: '', buzzCode: '', pickupTime: '', contactPhone: '', notes: '' })
      setDropoff({ contactName: '', buzzCode: '', contactPhone: '' })
      dropoffBuzzCodeIsAutoFilledRef.current = true
      pickupBuzzCodeIsAutoFilledRef.current = true
      setPkg({ kind: '', weightSlab: 'up_to_10' })
      setSenderEmail('')
      setReceiverEmail('')
      setPricingPreview(null)

      if (onSuccess) {
        // Guest flow — delegate navigation/toast to the parent page
        onSuccess(data)
      } else {
        // Customer portal flow — store ID for MyBookingsClient refresh then navigate
        if (data._id) sessionStorage.setItem('newBookingId', data._id)
        const trackShort = data.trackingToken ? `Tracking #${data.trackingToken}` : ''
        toast.success(
          'Booking created',
          trackShort ? `${trackShort} — we'll notify you at every status change.` : `We'll notify you at every status change.`
        )
        router.push('/customer/my-bookings')
        router.refresh()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <div>
        <SectionHeading>📍 Set Pickup &amp; Drop-off on Map</SectionHeading>
        <div className="h-[420px]">
          <BookingMap ref={mapRef} onStopsChange={handleStopsChange} />
        </div>
        {/* Address confirmation pills */}
        {stops.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {stops.map((stop, i) => (
              <div key={stop.type} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: i === 0 ? '#16a34a' : '#dc2626' }}
                >
                  {i === 0 ? 'P' : 'D'}
                </span>
                <span className="font-medium text-foreground capitalize">{stop.type}</span>
                <span className="text-muted truncate flex-1">{stop.address}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteStop(i)}
                  className="text-danger hover:text-red-700 font-medium shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pickup Details ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <SectionHeading>📦 Pickup Details</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact Name">
            <input type="text" value={pickup.contactName} onChange={(e) => setPickup((p) => ({ ...p, contactName: e.target.value }))} className={inputCls} placeholder="John Smith" />
          </Field>
          <Field label="Company Name">
            <input type="text" value={pickup.companyName} onChange={(e) => setPickup((p) => ({ ...p, companyName: e.target.value }))} className={inputCls} placeholder="ABC Corp (optional)" />
          </Field>
          <Field label="Buzz / Unit Code">
            <input
              type="text"
              value={pickup.buzzCode}
              onChange={(e) => {
                pickupBuzzCodeIsAutoFilledRef.current = false
                setPickup((p) => ({ ...p, buzzCode: e.target.value }))
              }}
              className={inputCls}
              placeholder="#4B, buzz 1234"
            />
          </Field>
          <Field label="Pickup Time">
            <input type="datetime-local" value={pickup.pickupTime} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} onChange={(e) => setPickup((p) => ({ ...p, pickupTime: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Phone Number" required>
            <input type="tel" value={pickup.contactPhone} onChange={(e) => setPickup((p) => ({ ...p, contactPhone: e.target.value }))} className={inputCls} placeholder="+1 403-000-0000" required />
          </Field>
        </div>
        <Field label="Description / Notes">
          <input type="text" value={pickup.notes} onChange={(e) => setPickup((p) => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder="Gate code, leave at front desk, etc." />
        </Field>
        <Field label="Your Email (for booking confirmation &amp; updates)">
          <input type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
        </Field>
      </div>

      {/* ── Drop-off Details ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <SectionHeading>🏁 Drop-off Details</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Receiver Name">
            <input type="text" value={dropoff.contactName} onChange={(e) => setDropoff((p) => ({ ...p, contactName: e.target.value }))} className={inputCls} placeholder="Jane Doe" />
          </Field>
          <Field label="Buzz / Unit Code">
            <input
              type="text"
              value={dropoff.buzzCode}
              onChange={(e) => {
                dropoffBuzzCodeIsAutoFilledRef.current = false
                setDropoff((p) => ({ ...p, buzzCode: e.target.value }))
              }}
              className={inputCls}
              placeholder="#2A, buzz 5678"
            />
          </Field>
          <Field label="Phone Number (for status notifications)" required>
            <input type="tel" value={dropoff.contactPhone} onChange={(e) => setDropoff((p) => ({ ...p, contactPhone: e.target.value }))} className={inputCls} placeholder="+1 403-000-0000" required />
          </Field>
        </div>
        <Field label="Receiver Email">
          <input type="email" value={receiverEmail} onChange={(e) => setReceiverEmail(e.target.value)} className={inputCls} placeholder="receiver@example.com" />
        </Field>
      </div>

      {/* ── Package Details ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
        <SectionHeading>📋 Package Details</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Kind of Package"
            placeholder="Select type…"
            value={pkg.kind}
            onChange={(v) => setPkg((p) => ({ ...p, kind: v }))}
            options={PACKAGE_KINDS.map((k) => ({ value: k, label: k }))}
          />
          <Select
            label="Weight"
            value={pkg.weightSlab}
            onChange={(v) => setPkg((p) => ({ ...p, weightSlab: v }))}
            options={WEIGHT_SLABS}
          />
        </div>
      </div>

      {/* ── Pricing Preview — shown once both cities are known ───────────── */}
      {hasPickup && hasDropoff && stops.find((s) => s.type === 'pickup')?.city && stops.find((s) => s.type === 'dropoff')?.city && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <SectionHeading>💰 Estimated Price</SectionHeading>
          {pricingPreview ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">{pricingPreview.routeLabel}</p>
                <p className="text-xs text-muted capitalize">{pricingPreview.weightLabel}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">
                ${pricingPreview.price.toFixed(2)}
                <span className="text-xs text-muted font-normal ml-1">CAD</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">No rate configured for this route yet.</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        loading={submitting}
        disabled={!hasPickup || !hasDropoff}
        className="w-full"
      >
        Create Booking
      </Button>
    </form>
  )
}
