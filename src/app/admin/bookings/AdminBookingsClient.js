'use client'

import { useState, useEffect, useRef, useMemo, useTransition, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { FILTER_QUERY_MAP } from '@/lib/bookingStatusFilters'
import {
  MapPin, Clock, ChevronRight, UserCheck, AlertCircle,
  PackageCheck, CheckCircle2, Search, X,
  Users, Zap, Circle, ChevronLeft, History,
} from 'lucide-react'

const STATUS_FILTER_OPTIONS = [
  { value: 'pending',         label: 'Pending' },
  { value: 'on_the_way',      label: 'On the Way' },
  { value: 'picked_up',       label: 'Ready to Deliver' },
  { value: 'failed_pickup',   label: 'Pickup Failed' },
  { value: 'failed_dropoff',  label: 'Delivery Failed' },
  { value: 'delivered_today', label: 'Delivered Today' },
]

const ASSIGN_KIND_BY_STATUS = {
  pending:        'pickup_only',
  failed_pickup:  'pickup_only',
  picked_up:      'delivery_only',
  failed_dropoff: 'delivery_only',
}

// Filters whose bookings can never be assignable (on_the_way already has a
// driver mid-route; delivered_today is a completed-order history view) —
// disables the "select all" header checkbox there instead of letting it
// spin and silently select nothing.
const NON_ASSIGNABLE_FILTERS = new Set(['on_the_way', 'delivered_today'])

function isAssignable(booking) {
  if (!Object.hasOwn(ASSIGN_KIND_BY_STATUS, booking.status)) return false
  // picked_up with an active driver assignment means already assigned for delivery — block it
  if (booking.status === 'picked_up' && booking.assignedDriverId) return false
  return true
}

function Pagination({ page, total, pageSize, onNavigate }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  function pages() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const arr = [1]
    if (page > 3) arr.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i)
    if (page < totalPages - 2) arr.push('…')
    arr.push(totalPages)
    return arr
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border"
      style={{ background: 'var(--surface-2)' }}>
      <span className="text-xs" style={{ color: 'var(--fg-3)' }}>
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-(--surface-3)"
          style={{ color: 'var(--fg-2)' }}
        >
          <ChevronLeft size={13} />
        </button>
        {pages().map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-xs" style={{ color: 'var(--fg-3)' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onNavigate(p)}
              className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: page === p ? 'var(--accent)' : 'transparent',
                color:      page === p ? '#fff' : 'var(--fg-2)',
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onNavigate(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-(--surface-3)"
          style={{ color: 'var(--fg-2)' }}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

function formatTimeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AdminBookingsClient({ initialStatusFilter, initialPage, bookings, total, pageSize }) {
  const router     = useRouter()
  const pathname   = usePathname()
  const searchParams = useSearchParams()
  const toast      = useToast()
  const [isPending, startTransition] = useTransition()

  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? 'pending')
  // Local search filters the current page only — no network round-trip needed
  const [search, setSearch]             = useState('')
  // Map<bookingId, bookingObject> — persists across page navigation AND
  // filter switches, so selections from multiple pages/filters are all kept
  // and assignable together.
  const [selectedMap, setSelectedMap]   = useState(new Map())
  // True while the "select all matching this filter" fetch is in flight
  const [selectingAll, setSelectingAll] = useState(false)
  const [drivers, setDrivers]           = useState([])
  const [driverId, setDriverId]         = useState('')
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [assigning, setAssigning]       = useState(false)
  const [error, setError]               = useState('')
  const [detailBooking, setDetailBooking] = useState(null)
  const [confirmPayload, setConfirmPayload] = useState(null)
  // Per-row assignment kind overrides — only stored when admin explicitly changes the select
  const [rowKinds, setRowKinds] = useState({})
  const assignInFlightRef = useRef(false)
  const assignAbortRef    = useRef(null)

  useEffect(() => () => { try { assignAbortRef.current?.abort() } catch {} }, [])

  useEffect(() => {
    fetch('/api/drivers')
      .then((r) => r.json())
      .then((data) => setDrivers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingDrivers(false))
  }, [])

  // Builds a URL with updated params, preserving others
  const buildUrl = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === '1') params.delete(k)
      else params.set(k, String(v))
    }
    // Always delete page when it would be 1
    if (updates.page === 1 || updates.page === '1') params.delete('page')
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ''}`
  }, [pathname, searchParams])

  function navigateTo(updates) {
    startTransition(() => router.push(buildUrl(updates), { scroll: false }))
  }

  function onStatusChange(next) {
    setStatusFilter(next)
    // selectedMap is intentionally NOT cleared here — selections persist
    // across filter switches so an admin can pick some from "Pending" and
    // some from "Ready to Deliver" and assign them together in one call.
    setSearch('')
    navigateTo({ status: next, page: 1 })
  }

  function onPageChange(p) {
    navigateTo({ page: p })
  }

  // Filter current page locally by address search
  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bookings
    return bookings.filter((b) =>
      b.stops?.some((s) => s.address?.toLowerCase().includes(q) || s.contactName?.toLowerCase().includes(q)) ||
      b.senderEmail?.toLowerCase().includes(q) ||
      b.receiverEmail?.toLowerCase().includes(q)
    )
  }, [bookings, search])

  // All selected bookings that can actually be assigned — drawn from the Map
  // so selections survive page navigation AND filter switches.
  const assignableSelected = useMemo(() =>
    Array.from(selectedMap.values()).filter((b) => isAssignable(b)),
  [selectedMap])

  // Does a selected booking belong to the CURRENT status filter? Mirrors
  // FILTER_QUERY_MAP's { status, hasDriver } shape client-side, using the
  // same source of truth the server uses to build the filtered list —
  // needed to tell "selected from this filter" apart from "selected from a
  // different filter" without a second round-trip.
  const currentFilterQuery = FILTER_QUERY_MAP[statusFilter]
  function matchesCurrentFilter(b) {
    if (!currentFilterQuery.status.includes(b.status)) return false
    if (currentFilterQuery.hasDriver === true  && !b.assignedDriverId) return false
    if (currentFilterQuery.hasDriver === false &&  b.assignedDriverId) return false
    return true
  }

  // Selected bookings whose status/driver combo belongs to the filter
  // currently in view vs. selected from some other filter entirely.
  const selectedInCurrentFilter = useMemo(
    () => assignableSelected.filter(matchesCurrentFilter),
    [assignableSelected, statusFilter]
  )
  const selectedFromOtherFilters = assignableSelected.length - selectedInCurrentFilter.length

  function toggleSelect(b) {
    if (!isAssignable(b)) return
    setSelectedMap((prev) => {
      const n = new Map(prev)
      n.has(b._id) ? n.delete(b._id) : n.set(b._id, b)
      return n
    })
  }

  // True once every booking matching the CURRENT FILTER (not just the
  // current page) is in selectedMap — drives the header checkbox's checked
  // state and what clicking it does next.
  const allInFilterSelected = total > 0 && selectedInCurrentFilter.length === total

  async function handleSelectAllInFilter() {
    if (selectingAll) return
    setSelectingAll(true)
    setError('')
    try {
      const res = await fetch(`/api/bookings/admin-select-all?status=${encodeURIComponent(statusFilter)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not select all — please try again.'); return }

      setSelectedMap((prev) => {
        const n = new Map(prev)
        for (const b of data) if (isAssignable(b)) n.set(b._id, b)
        return n
      })
      const label = STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter
      toast.success('Selected all', `${data.length} "${label}" booking${data.length === 1 ? '' : 's'} added to your selection.`)
    } catch {
      setError('Network error while selecting all. Please try again.')
    } finally {
      setSelectingAll(false)
    }
  }

  function clearCurrentFilterSelection() {
    setSelectedMap((prev) => {
      const n = new Map(prev)
      for (const b of selectedInCurrentFilter) n.delete(b._id)
      return n
    })
  }

  function toggleAllVisible() {
    // If everything matching the whole filter (beyond just this page) is
    // already selected, the header checkbox's job is to clear THIS filter's
    // selections (leaving other filters' selections untouched). Otherwise it
    // triggers a real "select every matching booking in this filter" fetch.
    if (allInFilterSelected) {
      clearCurrentFilterSelection()
      return
    }
    handleSelectAllInFilter()
  }

  function buildAssignments() {
    return assignableSelected.map((b) => ({
      bookingId: b._id,
      kind: rowKinds[b._id] ?? ASSIGN_KIND_BY_STATUS[b.status],
    }))
  }

  function handleAssign() {
    if (assignInFlightRef.current || assigning) return
    if (assignableSelected.length === 0) { setError('Select at least one assignable booking.'); return }
    if (!driverId) { setError('Choose a driver first.'); return }
    setError('')

    const driver = drivers.find((d) => d._id === driverId)
    const assignments = buildAssignments()
    const selectedBookings = assignableSelected

    if (driver?.pendingStopCount > 0) {
      setConfirmPayload({ driver, assignments, bookings: selectedBookings })
      return
    }
    executeAssign({ driver, assignments })
  }

  async function executeAssign({ driver, assignments }) {
    if (assignInFlightRef.current) return
    assignInFlightRef.current = true

    const ctrl = new AbortController()
    assignAbortRef.current = ctrl

    setAssigning(true)
    try {
      const res = await fetch('/api/bookings/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver._id, assignments }),
        signal: ctrl.signal,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Assignment failed.'); setConfirmPayload(null); return }

      const n = data.assigned
      toast.success('Assignment complete',
        data.merged
          ? `${n} booking${n > 1 ? 's' : ''} merged into ${driver.name}'s active route.`
          : `${n} booking${n > 1 ? 's' : ''} assigned to ${driver.name}.`
      )

      setSelectedMap(new Map())
      setDriverId('')
      setConfirmPayload(null)
      startTransition(() => router.refresh())
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError('Network error. Please try again.')
      setConfirmPayload(null)
    } finally {
      assignInFlightRef.current = false
      if (assignAbortRef.current === ctrl) assignAbortRef.current = null
      setAssigning(false)
    }
  }

  const selectedDriver = drivers.find((d) => d._id === driverId)
  const driverOptions  = drivers.map((d) => ({
    value: d._id,
    label: d.name,
    meta: d.pendingStopCount > 0 ? `${d.pendingStopCount} active stops` : '',
  }))
  function driverName(id) { return drivers.find((x) => x._id === id)?.name ?? '—' }

  const pickupKindCount        = assignableSelected.filter((b) => (rowKinds[b._id] ?? ASSIGN_KIND_BY_STATUS[b.status]) === 'pickup_only').length
  const deliveryKindCount      = assignableSelected.filter((b) => (rowKinds[b._id] ?? ASSIGN_KIND_BY_STATUS[b.status]) === 'delivery_only').length
  const fullTripKindCount      = assignableSelected.filter((b) => (rowKinds[b._id] ?? ASSIGN_KIND_BY_STATUS[b.status]) === 'pickup_and_dropoff').length

  return (
    <div className="space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Bookings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
            Active packages — assign pickups and deliveries together on a single route
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-white"
            style={{ color: 'var(--fg-2)' }}>
            {total} active
          </span>
          <Link
            href="/admin/bookings/history"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border border-border bg-white"
            style={{ color: 'var(--fg-2)' }}
          >
            <History size={13} />
            History
          </Link>
        </div>
      </div>

      {/* ── Filters row — isolated stacking context so dropdown floats above cards ── */}
      <div className="grid md:grid-cols-[260px_1fr] gap-3 anim-fade-up s1" style={{ position: 'relative', zIndex: 10 }}>
        <Select
          value={statusFilter}
          onChange={onStatusChange}
          options={STATUS_FILTER_OPTIONS}
          placeholder="Filter by status"
        />
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-3)' }} />
          <input
            type="text"
            placeholder="Search by address, name or email on this page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
            style={{ '--tw-ring-color': 'var(--accent-glow)', color: 'var(--fg)' }}
          />
          {search && (
            <button className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--fg-3)' }} onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main grid: list + assign panel ─────────────────────────── */}
      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start anim-fade-up s2">

        <div className="bg-white rounded-2xl border border-border overflow-hidden" style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          {/* List header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-3"
            style={{ background: 'var(--surface-2)' }}>
            <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
              <input
                type="checkbox"
                checked={allInFilterSelected}
                disabled={selectingAll || (NON_ASSIGNABLE_FILTERS.has(statusFilter) && total > 0)}
                ref={(el) => {
                  if (!el) return
                  el.indeterminate = selectedInCurrentFilter.length > 0 && !allInFilterSelected
                }}
                onChange={toggleAllVisible}
                className="h-4 w-4 rounded cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  NON_ASSIGNABLE_FILTERS.has(statusFilter)
                    ? 'Bookings in this view are not assignable'
                    : allInFilterSelected ? 'Clear all selected in this filter' : `Select all ${total} matching this filter`
                }
              />
              <span className="text-sm font-semibold flex items-center gap-1.5 min-w-0" style={{ color: 'var(--fg)' }}>
                {selectedMap.size > 0
                  ? <span style={{ color: 'var(--accent)' }}>{selectedMap.size} selected</span>
                  : <span>{total} booking{total !== 1 ? 's' : ''}</span>}
                {selectedFromOtherFilters > 0 && (
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: 'var(--surface-3, #eef2ff)', color: 'var(--fg-3)' }}
                    title="These are selected from a different status filter and stay selected when you switch back"
                  >
                    {selectedFromOtherFilters} from other filters
                  </span>
                )}
              </span>
            </label>
            {selectedMap.size > 0 && (
              <button onClick={() => setSelectedMap(new Map())}
                className="text-xs font-medium transition-colors hover:underline shrink-0"
                style={{ color: 'var(--fg-3)' }}>
                Clear all
              </button>
            )}
            {(isPending || selectingAll) && (
              <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--fg-3)' }}>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" />
              </svg>
            )}
          </div>

          {/* Empty state */}
          {displayed.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--surface-2)' }}>
                <PackageCheck size={28} style={{ color: 'var(--fg-3)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>
                {search ? 'No bookings match your search on this page' : 'No bookings found'}
              </p>
              {(search || statusFilter) && (
                <button
                  onClick={() => { setSearch(''); onStatusChange('') }}
                  className="text-xs mt-2 font-medium" style={{ color: 'var(--accent)' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border max-h-125 overflow-y-auto">
              {displayed.map((b) => {
                const pickup    = b.stops?.find((s) => s.type === 'pickup')
                const dropoff   = b.stops?.find((s) => s.type === 'dropoff')
                const assignable = isAssignable(b)
                const kind = ASSIGN_KIND_BY_STATUS[b.status]
                const isChecked = selectedMap.has(b._id)
                const driver = b.assignedDriverId && !loadingDrivers ? driverName(b.assignedDriverId) : null

                return (
                  <div key={b._id}
                    className="flex items-start gap-4 px-5 py-4 transition-all"
                    style={{
                      background: isChecked ? 'rgba(79,70,229,0.04)' : undefined,
                      borderLeft: isChecked ? '3px solid var(--accent)' : '3px solid transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!assignable}
                      onChange={() => toggleSelect(b)}
                      className="mt-1 h-4 w-4 rounded shrink-0 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-30"
                      title={assignable ? '' : 'Not assignable in this status'}
                    />

                    {/* On small screens the select stacks below the content; on sm+ it sits inline */}
                    <div className="flex-1 min-w-0 sm:flex sm:items-start sm:gap-4">

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailBooking(b)}>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <Badge status={b.status} />
                          {driver && (
                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                              <UserCheck size={10} />{driver}
                            </span>
                          )}
                          {assignable && kind && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                              style={{
                                background: kind === 'pickup_only' ? 'rgba(217,119,6,0.12)' : 'rgba(37,99,235,0.12)',
                                color:      kind === 'pickup_only' ? '#92400e' : '#1e40af',
                              }}>
                              {kind === 'pickup_only' ? 'Pickup' : 'Delivery'}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs ml-auto" style={{ color: 'var(--fg-3)' }}>
                            <Clock size={10} />{formatTimeAgo(b.updatedAt)}
                          </span>
                          {b.estimatedPrice && (
                            <span className="text-xs font-bold mono" style={{ color: 'var(--accent)' }}>
                              ${b.estimatedPrice}
                            </span>
                          )}
                        </div>

                        {pickup?.contactName && (
                          <p className="text-xs font-medium mb-1 truncate" style={{ color: 'var(--fg-2)' }}>
                            {pickup.contactName}
                          </p>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(22,163,74,0.12)' }}>
                              <Circle size={5} style={{ color: 'var(--success)' }} fill="var(--success)" />
                            </div>
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>
                              {pickup?.address ?? '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: 'rgba(220,38,38,0.12)' }}>
                              <Circle size={5} style={{ color: 'var(--danger)' }} fill="var(--danger)" />
                            </div>
                            <p className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>
                              {dropoff?.address ?? '—'}
                            </p>
                          </div>
                        </div>

                        {b.packageDetails?.kind && (
                          <p className="text-xs mt-1.5" style={{ color: 'var(--fg-3)' }}>
                            {b.packageDetails.kind}
                            {b.packageDetails.weightSlab && ` · ${b.packageDetails.weightSlab.replace(/_/g, ' ')}`}
                          </p>
                        )}

                        {(b.status === 'failed_pickup' || b.status === 'failed_dropoff') && b.lastFailure?.reason && (
                          <div className="mt-2 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug border"
                            style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)', color: '#991b1b' }}>
                            <span className="font-semibold">Retry · last failure:</span> {b.lastFailure.reason}
                          </div>
                        )}
                      </div>

                      {/* Select: inline on sm+, stacked below on mobile */}
                      {assignable && (b.status === 'pending' || b.status === 'failed_pickup') && (
                        <div onClick={(e) => e.stopPropagation()} className="shrink-0 mt-2 sm:mt-0.5 w-36">
                          <Select
                            value={rowKinds[b._id] ?? kind}
                            onChange={(v) => setRowKinds((prev) => ({ ...prev, [b._id]: v }))}
                            options={[
                              { value: 'pickup_only',        label: 'Pickup only' },
                              { value: 'pickup_and_dropoff', label: 'Pickup + Dropoff' },
                            ]}
                            className="[&_button]:py-1.5 [&_button]:px-2.5 [&_button]:rounded-lg [&_button]:text-xs"
                          />
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/admin/bookings/${b._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 mt-1 p-1.5 rounded-lg transition-colors hover:bg-(--surface-2)"
                      style={{ color: 'var(--fg-3)' }}
                    >
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}

          <Pagination page={initialPage} total={total} pageSize={pageSize} onNavigate={onPageChange} />
        </div>

        {/* ── Assign panel ──────────────────────────────────────── */}
        <div className="xl:sticky xl:top-6 space-y-4">

          <div
            className="rounded-2xl border p-4 transition-all"
            style={{
              background: assignableSelected.length > 0 ? 'rgba(79,70,229,0.04)' : 'white',
              borderColor: assignableSelected.length > 0 ? 'var(--accent)' : 'var(--border)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: assignableSelected.length > 0 ? 'var(--accent)' : 'var(--surface-2)',
                  color: assignableSelected.length > 0 ? 'white' : 'var(--fg-3)',
                }}>
                <Zap size={18} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Assign to driver</p>
                <p className="text-xs" style={{ color: assignableSelected.length > 0 ? 'var(--accent)' : 'var(--fg-3)' }}>
                  {assignableSelected.length > 0
                    ? `${assignableSelected.length} booking${assignableSelected.length > 1 ? 's' : ''} selected`
                    : 'Select pending or ready-to-deliver bookings'}
                </p>
              </div>
            </div>

            {assignableSelected.length > 0 && (
              <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
                {pickupKindCount > 0 && (
                  <span className="px-2 py-1 rounded-lg font-semibold"
                    style={{ background: 'rgba(217,119,6,0.12)', color: '#92400e' }}>
                    {pickupKindCount} pickup{pickupKindCount > 1 ? 's' : ''}
                  </span>
                )}
                {deliveryKindCount > 0 && (
                  <span className="px-2 py-1 rounded-lg font-semibold"
                    style={{ background: 'rgba(37,99,235,0.12)', color: '#1e40af' }}>
                    {deliveryKindCount} deliver{deliveryKindCount > 1 ? 'ies' : 'y'}
                  </span>
                )}
                {fullTripKindCount > 0 && (
                  <span className="px-2 py-1 rounded-lg font-semibold"
                    style={{ background: 'rgba(124,58,237,0.12)', color: '#5b21b6' }}>
                    {fullTripKindCount} full trip{fullTripKindCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} style={{ color: 'var(--fg-3)' }} />
              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Select Driver</p>
            </div>

            {loadingDrivers ? (
              <div className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />
            ) : drivers.length === 0 ? (
              <p className="text-sm py-3 text-center" style={{ color: 'var(--fg-3)' }}>No active drivers found.</p>
            ) : (
              <Select
                placeholder="— Choose a driver —"
                value={driverId}
                onChange={setDriverId}
                options={driverOptions}
              />
            )}

            {selectedDriver && (
              <div className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {selectedDriver.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{selectedDriver.name}</p>
                  {selectedDriver.pendingStopCount > 0 && (
                    <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
                      {selectedDriver.pendingStopCount} active stops
                    </p>
                  )}
                </div>
                <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
              </div>
            )}

            {selectedDriver?.pendingStopCount > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs"
                style={{ background: 'var(--warning-bg)', border: '1px solid rgba(217,119,6,0.3)', color: 'var(--warning)' }}>
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>This driver already has {selectedDriver.pendingStopCount} active stop{selectedDriver.pendingStopCount > 1 ? 's' : ''}. New stops will be merged into their route.</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs"
                style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.3)', color: 'var(--danger)' }}>
                <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            <Button
              onClick={handleAssign}
              loading={assigning || isPending}
              disabled={assignableSelected.length === 0 || !driverId}
              variant="primary"
              className="w-full justify-center"
            >
              {assigning ? 'Assigning…' : (
                <>
                  Assign to driver
                  {assignableSelected.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-md text-xs font-bold" style={{ background: 'rgba(255,255,255,0.25)' }}>
                      {assignableSelected.length}
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────────────── */}
      {detailBooking && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailBooking(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 px-6 py-4 border-b border-border flex items-center justify-between rounded-t-2xl"
              style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
                  {detailBooking.trackingToken ?? detailBooking._id}
                </span>
                <Badge status={detailBooking.status} />
              </div>
              <button
                onClick={() => setDetailBooking(null)}
                className="p-1 rounded-lg transition-colors hover:bg-white"
                style={{ color: 'var(--fg-3)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {(detailBooking.status === 'failed_pickup' || detailBooking.status === 'failed_dropoff') && detailBooking.lastFailure && (
                <div className="rounded-xl px-4 py-3 border"
                  style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#991b1b' }}>
                    {detailBooking.status === 'failed_pickup' ? 'Pickup failed — awaiting re-assignment' : 'Delivery failed — awaiting re-assignment'}
                  </p>
                  {detailBooking.lastFailure.reason && (
                    <p className="text-sm" style={{ color: '#7f1d1d' }}>
                      <span className="font-semibold">Reason:</span> {detailBooking.lastFailure.reason}
                    </p>
                  )}
                  {detailBooking.lastFailure.at && (
                    <p className="text-[11px] mt-1" style={{ color: '#991b1b' }}>{formatTimeAgo(detailBooking.lastFailure.at)}</p>
                  )}
                </div>
              )}

              {detailBooking.packageDetails && (
                <div className="pb-4 border-b border-border">
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Package
                  </p>
                  <div className="space-y-1">
                    {detailBooking.packageDetails.kind && (
                      <p className="text-sm" style={{ color: 'var(--fg)' }}>{detailBooking.packageDetails.kind}</p>
                    )}
                    {detailBooking.packageDetails.weightSlab && (
                      <p className="text-sm" style={{ color: 'var(--fg-2)' }}>{detailBooking.packageDetails.weightSlab.replace(/_/g, ' ')}</p>
                    )}
                    {detailBooking.packageDetails.description && (
                      <p className="text-sm mt-2" style={{ color: 'var(--fg-3)' }}>{detailBooking.packageDetails.description}</p>
                    )}
                  </div>
                  {Array.isArray(detailBooking.packageDetails.items) && detailBooking.packageDetails.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Items ({detailBooking.packageDetails.items.length})
                      </p>
                      <ul className="space-y-1">
                        {detailBooking.packageDetails.items.map((it) => (
                          <li key={it.itemId} className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-2)' }}>
                            <span className="shrink-0 inline-flex min-w-5.5 justify-center rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold px-1.5 py-0.5">×{it.quantity}</span>
                            <span className="truncate">{it.name}</span>
                            {it.type && <span className="text-xs" style={{ color: 'var(--fg-3)' }}>· {it.type}</span>}
                            {it.pickedUpAt && <span className="ml-auto text-[10px] font-semibold uppercase" style={{ color: '#047857' }}>Picked up</span>}
                            {it.deliveredAt && <span className="ml-auto text-[10px] font-semibold uppercase" style={{ color: '#047857' }}>Delivered</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {detailBooking.stops?.find((s) => s.type === 'pickup') && (
                  <div className="pb-4 border-b border-border col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(22,163,74,0.12)' }}>
                        <Circle size={4} style={{ color: 'var(--success)' }} fill="var(--success)" />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pickup</p>
                    </div>
                    {(() => {
                      const stop = detailBooking.stops.find((s) => s.type === 'pickup')
                      return (
                        <div className="space-y-2">
                          {stop.address      && <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{stop.address}</p>}
                          {stop.contactName  && <p className="text-xs" style={{ color: 'var(--fg-2)' }}>{stop.contactName}</p>}
                          {stop.contactPhone && <p className="text-xs mono" style={{ color: 'var(--fg-3)' }}>{stop.contactPhone}</p>}
                          {stop.notes        && <p className="text-xs mt-2 italic" style={{ color: 'var(--fg-3)' }}>{stop.notes}</p>}
                        </div>
                      )
                    })()}
                  </div>
                )}
                {detailBooking.stops?.find((s) => s.type === 'dropoff') && (
                  <div className="pb-4 border-b border-border col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(220,38,38,0.12)' }}>
                        <Circle size={4} style={{ color: 'var(--danger)' }} fill="var(--danger)" />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dropoff</p>
                    </div>
                    {(() => {
                      const stop = detailBooking.stops.find((s) => s.type === 'dropoff')
                      return (
                        <div className="space-y-2">
                          {stop.address      && <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{stop.address}</p>}
                          {stop.contactName  && <p className="text-xs" style={{ color: 'var(--fg-2)' }}>{stop.contactName}</p>}
                          {stop.contactPhone && <p className="text-xs mono" style={{ color: 'var(--fg-3)' }}>{stop.contactPhone}</p>}
                          {stop.notes        && <p className="text-xs mt-2 italic" style={{ color: 'var(--fg-3)' }}>{stop.notes}</p>}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 px-6 py-3 border-t border-border bg-white rounded-b-2xl">
              <button
                onClick={() => setDetailBooking(null)}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Merge Confirmation Modal ───────────────────────────────────── */}
      {confirmPayload && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !assigning && setConfirmPayload(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center gap-2"
              style={{ background: 'var(--warning-bg, #fff7ed)' }}>
              <AlertCircle size={18} style={{ color: '#d97706' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Merge into active route?</span>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
                <strong>{confirmPayload.driver.name}</strong> has{' '}
                <strong>{confirmPayload.driver.pendingStopCount} active stop{confirmPayload.driver.pendingStopCount > 1 ? 's' : ''}</strong>{' '}
                on their route. These new stops will be added and the route will be re-optimized from the driver&apos;s current location.
              </p>

              <div className="rounded-xl border border-border p-3 space-y-2" style={{ background: 'var(--surface-2)' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>
                  Adding ({confirmPayload.assignments.length})
                </p>
                {confirmPayload.bookings.map((b) => {
                  const a = confirmPayload.assignments.find((x) => x.bookingId === b._id)
                  const kindLabel = a.kind === 'pickup_only' ? 'Pickup' : a.kind === 'pickup_and_dropoff' ? 'Pickup + Dropoff' : 'Delivery'
                  const primary = b.stops?.find((s) => s.type === (a.kind === 'delivery_only' ? 'dropoff' : 'pickup'))
                  return (
                    <div key={b._id} className="flex items-start gap-2">
                      <MapPin size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>
                          {primary?.address ?? b.trackingToken ?? b._id}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--fg-3)' }}>{kindLabel}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
                The driver will receive a live update on their map with the new stops highlighted. Already-completed stops are preserved.
              </p>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs"
                  style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.3)', color: 'var(--danger)' }}>
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />{error}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 px-6 py-3 border-t border-border bg-white rounded-b-2xl flex items-center gap-2">
              <button
                onClick={() => setConfirmPayload(null)}
                disabled={assigning}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ background: 'var(--surface-2)', color: 'var(--fg-2)' }}
              >
                Cancel
              </button>
              <Button
                onClick={() => executeAssign({ driver: confirmPayload.driver, assignments: confirmPayload.assignments })}
                loading={assigning}
                variant="primary"
                className="flex-1 justify-center"
              >
                {assigning ? 'Merging…' : 'Add to Active Route'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
