'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import DatePicker from '@/components/ui/DatePicker'
import {
  Search, PackageOpen, MapPin, ArrowRight,
  ChevronLeft, ChevronRight, X, Filter,
} from 'lucide-react'

const PAGE_SIZE = 10

const STATUS_FILTERS = [
  { value: 'all',           label: 'All' },
  { value: 'delivered',     label: 'Delivered' },
  { value: 'cancelled',     label: 'Cancelled' },
  { value: 'failed_pickup', label: 'Failed' },
]

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-CA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
}

export default function HistoryClient({ bookings }) {
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(1)

  const counts = useMemo(() => ({
    delivered: bookings.filter((b) => b.status === 'delivered').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    failed:    bookings.filter((b) => b.status === 'failed_pickup' || b.status === 'failed_dropoff').length,
  }), [bookings])

  const filtered = useMemo(() => {
    let list = bookings

    if (filter !== 'all') {
      list = filter === 'failed_pickup'
        ? list.filter((b) => b.status === 'failed_pickup' || b.status === 'failed_dropoff')
        : list.filter((b) => b.status === filter)
    }

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      list = list.filter((b) => new Date(b.createdAt) >= from)
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      list = list.filter((b) => new Date(b.createdAt) <= to)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((b) =>
        b.stops?.some((s) => s.address?.toLowerCase().includes(q)) ||
        b._id?.toString().includes(q)
      )
    }

    return list
  }, [bookings, filter, dateFrom, dateTo, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const hasActiveFilters = filter !== 'all' || dateFrom || dateTo || search.trim()

  function onFilterChange(val) { setFilter(val); setPage(1) }
  function onSearch(val)       { setSearch(val); setPage(1) }
  function onDateFrom(val)     { setDateFrom(val); setPage(1) }
  function onDateTo(val)       { setDateTo(val); setPage(1) }

  function clearAll() {
    setFilter('all'); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 anim-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/customer/my-bookings"
              className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: 'var(--fg-3)' }}>
              <ChevronLeft size={13} /> My Bookings
            </Link>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>History</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {bookings.length} total · {counts.delivered} delivered · {counts.cancelled} cancelled
          </p>
        </div>
      </div>

      {/* Filters */}
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

        {/* Date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-3)' }}>Date:</span>
          <DatePicker
            value={dateFrom}
            onChange={onDateFrom}
            placeholder="From"
            clearable
            className="flex-1 min-w-32.5"
          />
          <span className="text-xs shrink-0" style={{ color: 'var(--fg-3)' }}>—</span>
          <DatePicker
            value={dateTo}
            onChange={onDateTo}
            placeholder="To"
            clearable
            className="flex-1 min-w-32.5"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-medium shrink-0" style={{ color: 'var(--fg-3)' }}>
            <Filter size={11} /> Status:
          </span>
          {STATUS_FILTERS.map((f) => {
            const count = f.value === 'all'       ? bookings.length
              : f.value === 'failed_pickup'       ? counts.failed
              : f.value === 'delivered'           ? counts.delivered
              : counts.cancelled
            return (
              <button key={f.value} onClick={() => onFilterChange(f.value)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: filter === f.value ? 'var(--accent)' : 'var(--surface-2)',
                  color:      filter === f.value ? '#fff' : 'var(--fg-2)',
                  border:     filter === f.value ? 'none' : '1px solid var(--border)',
                }}>
                {f.label}
                {f.value !== 'all' && <span className="ml-1 opacity-70">({count})</span>}
              </button>
            )
          })}
          {hasActiveFilters && (
            <button onClick={clearAll}
              className="ml-auto flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg"
              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
              <X size={11} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s2">
        {/* Desktop */}
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
                      {hasActiveFilters ? 'No bookings match your filters.' : 'No completed bookings yet.'}
                    </p>
                    {hasActiveFilters && (
                      <button onClick={clearAll} className="mt-2 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : paged.map((b) => {
                const pickup  = b.stops?.find((s) => s.type === 'pickup')
                const dropoff = b.stops?.filter((s) => s.type === 'dropoff').at(-1)
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
                      <div className="flex items-center justify-end">
                        <Link href={`/customer/my-bookings/${b._id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                          View <ArrowRight size={11} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border">
          {paged.length === 0 ? (
            <div className="py-16 text-center">
              <PackageOpen size={28} className="mx-auto mb-2" style={{ color: 'var(--fg-3)' }} />
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                {hasActiveFilters ? 'No bookings match.' : 'No completed bookings yet.'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearAll} className="mt-2 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : paged.map((b) => {
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
                  <Link href={`/customer/my-bookings/${b._id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold ml-auto"
                    style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}>
                    View <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination — hidden when all results fit on one page */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between gap-4"
            style={{ background: 'var(--surface-2)' }}>
            <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-2)', background: 'white' }}>
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
                    <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: 'var(--fg-3)' }}>…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all"
                      style={{
                        background: p === safePage ? 'var(--accent)' : 'white',
                        color:      p === safePage ? '#fff' : 'var(--fg-2)',
                        border:     p === safePage ? 'none' : '1px solid var(--border)',
                      }}>
                      {p}
                    </button>
                  )
                )}
              <button disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ border: '1px solid var(--border)', color: 'var(--fg-2)', background: 'white' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
