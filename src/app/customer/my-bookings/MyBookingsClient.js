'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import {
  Plus, Search, Filter, PackageOpen, MapPin,
  ArrowRight, ChevronLeft, ChevronRight, X, Trash2,
  Loader2, History,
} from 'lucide-react'

const PAGE_SIZE = 8

const STATUS_FILTERS = [
  { value: 'all',     label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active',  label: 'Active' },
]

const ACTIVE_STATUSES = ['assigned_pickup', 'picked_up', 'assigned_delivery']

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
}

export default function MyBookingsClient({ bookings: initial }) {
  const toast  = useToast()
  const [bookings, setBookings] = useState(initial)
  const [loading, setLoading] = useState(false)

  // On mount, check if there's a newly created booking and fetch fresh data
  useEffect(() => {
    const newBookingId = typeof window !== 'undefined' ? sessionStorage.getItem('newBookingId') : null
    if (newBookingId) {
      sessionStorage.removeItem('newBookingId')
      setLoading(true)
      fetch('/api/bookings')
        .then((r) => r.ok ? r.json() : [])
        .then((freshBookings) => {
          setBookings(freshBookings)
          toast.success('Booking created', 'Your new booking has been added to the list.')
        })
        .catch(() => console.error('Failed to refresh bookings'))
        .finally(() => setLoading(false))
    }
  }, [])
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [page,     setPage]     = useState(1)
  const [cancelling, setCancelling] = useState(null)
  const [confirmId, setConfirmId]   = useState(null)

  /* ── Filtering ─────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = bookings
    if (filter !== 'all') {
      if (filter === 'active') list = list.filter((b) => ACTIVE_STATUSES.includes(b.status))
      else list = list.filter((b) => b.status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((b) =>
        b.stops?.some((s) => s.address?.toLowerCase().includes(q)) ||
        b._id?.toString().includes(q)
      )
    }
    return list
  }, [bookings, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function onFilterChange(val) { setFilter(val); setPage(1) }
  function onSearch(val)       { setSearch(val); setPage(1) }

  /* ── Cancel ────────────────────────────────────────────────────── */
  async function handleCancel(id) {
    setConfirmId(null)
    setCancelling(id)
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error('Could not cancel', d.error || 'Only pending bookings can be cancelled.')
        return
      }
      setBookings((prev) => prev.map((b) => b._id === id ? { ...b, status: 'cancelled' } : b))
      toast.success('Booking cancelled', 'The booking has been cancelled successfully.')
    } catch {
      toast.error('Network error', 'Please try again.')
    } finally {
      setCancelling(null)
    }
  }

  /* ── Stats summary ─────────────────────────────────────────────── */
  const counts = useMemo(() => ({
    total:   bookings.length,
    active:  bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length,
    pending: bookings.filter((b) => b.status === 'pending').length,
  }), [bookings])

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>My Bookings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {counts.total} active · {counts.pending} pending
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/customer/my-bookings/history"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ color: 'var(--fg-2)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <History size={14} />
            <span className="hidden sm:inline">History</span>
          </Link>
          <Link href="/customer/book">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-95"
              style={{ background: 'var(--accent)', boxShadow: '0 2px 12px var(--accent-glow)' }}>
              <Plus size={14} />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
            </button>
          </Link>
        </div>
      </div>

      {/* ── Filters + Search ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-3 anim-fade-up s1">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--fg-3)' }} />
          <input
            type="text"
            placeholder="Search by address or booking ID…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm border border-border transition-all focus:outline-none focus:ring-2 bg-white"
            style={{ '--tw-ring-color': 'var(--accent-glow)', color: 'var(--fg)' }}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-3)' }}
              onClick={() => onSearch('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-medium shrink-0" style={{ color: 'var(--fg-3)' }}>
            <Filter size={11} /> Filter:
          </span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filter === f.value ? 'var(--accent)' : 'var(--surface-2)',
                color:      filter === f.value ? '#fff' : 'var(--fg-2)',
                border:     filter === f.value ? 'none' : '1px solid var(--border)',
              }}
            >
              {f.label}
              {f.value !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({f.value === 'active' ? counts.active : counts.pending})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s2">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Route</th>
                <th>Date</th>
                <th>Price</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <PackageOpen size={28} className="mx-auto mb-2" style={{ color: 'var(--fg-3)' }} />
                    <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                      {search || filter !== 'all' ? 'No bookings match your filters.' : 'No bookings yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((b) => {
                  const pickup  = b.stops?.find((s) => s.type === 'pickup')
                  const dropoff = b.stops?.filter((s) => s.type === 'dropoff').at(-1)
                  const isCancelling = cancelling === b._id
                  return (
                    <tr key={b._id} className="group">
                      <td><Badge status={b.status} /></td>
                      <td>
                        <div className="space-y-0.5 min-w-0 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={10} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            <span className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>
                              {pickup?.address ?? '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={10} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                            <span className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>
                              {dropoff?.address ?? '—'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-xs font-medium" style={{ color: 'var(--fg)' }}>{formatDate(b.createdAt)}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{formatTime(b.createdAt)}</p>
                      </td>
                      <td>
                        {b.estimatedPrice
                          ? <span className="text-sm font-bold mono" style={{ color: 'var(--accent)' }}>${b.estimatedPrice}</span>
                          : <span className="text-xs" style={{ color: 'var(--fg-3)' }}>—</span>
                        }
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {b.status === 'pending' && (
                            <button
                              onClick={() => setConfirmId(b._id)}
                              disabled={isCancelling}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}
                            >
                              {isCancelling ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              Cancel
                            </button>
                          )}
                          <Link href={`/customer/my-bookings/${b._id}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                            View <ArrowRight size={11} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border">
          {paged.length === 0 ? (
            <div className="py-16 text-center">
              <PackageOpen size={28} className="mx-auto mb-2" style={{ color: 'var(--fg-3)' }} />
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                {search || filter !== 'all' ? 'No bookings match.' : 'No bookings yet.'}
              </p>
            </div>
          ) : (
            paged.map((b) => {
              const pickup  = b.stops?.find((s) => s.type === 'pickup')
              const dropoff = b.stops?.filter((s) => s.type === 'dropoff').at(-1)
              return (
                <div key={b._id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge status={b.status} />
                    <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{formatDate(b.createdAt)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={10} style={{ color: 'var(--success)' }} />
                      <span className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>{pickup?.address ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={10} style={{ color: 'var(--danger)' }} />
                      <span className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>{dropoff?.address ?? '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {b.estimatedPrice && (
                      <span className="text-sm font-bold mono" style={{ color: 'var(--accent)' }}>${b.estimatedPrice}</span>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      {b.status === 'pending' && (
                        <button onClick={() => setConfirmId(b._id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
                          <Trash2 size={11} /> Cancel
                        </button>
                      )}
                      <Link href={`/customer/my-bookings/${b._id}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                        View <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between gap-4"
            style={{ background: 'var(--surface-2)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-2)', background: 'white' }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--fg-3)' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all"
                      style={{
                        background: p === safePage ? 'var(--accent)' : 'white',
                        color:      p === safePage ? '#fff' : 'var(--fg-2)',
                        border:     p === safePage ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-2)', background: 'white' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Cancel Confirm Modal ─────────────────────────────────────── */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,17,23,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmId(null)}>
          <div
            className="bg-white rounded-2xl border border-border shadow-2xl p-6 w-full max-w-sm anim-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--danger-bg)' }}>
              <Trash2 size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: 'var(--fg)' }}>Cancel Booking?</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--fg-3)' }}>
              This action cannot be undone. Only pending bookings can be cancelled.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border transition-all hover:bg-(--surface-2)"
                style={{ color: 'var(--fg-2)' }}>
                Keep
              </button>
              <button
                onClick={() => handleCancel(confirmId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--danger)' }}>
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
