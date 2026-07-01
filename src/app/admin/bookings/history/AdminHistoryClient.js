'use client'

import { useState, useRef, useTransition, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import {
  MapPin, Clock, ChevronRight, ChevronLeft,
  PackageCheck, Search, X, Circle,
} from 'lucide-react'

const STATUS_FILTER_OPTIONS = [
  { value: '',           label: 'All completed' },
  { value: 'delivered',  label: 'Delivered' },
  { value: 'cancelled',  label: 'Cancelled' },
]

function formatTimeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
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
  const end   = Math.min(page * pageSize, total)

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
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
          disabled={page === Math.ceil(total / pageSize)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: 'var(--fg-2)' }}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

export default function AdminHistoryClient({
  initialStatusFilter, initialDateFrom, initialDateTo, initialSearch,
  initialPage, bookings, total, pageSize,
}) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? '')
  const [dateFrom,     setDateFrom]     = useState(initialDateFrom ?? '')
  const [dateTo,       setDateTo]       = useState(initialDateTo ?? '')
  const [search,       setSearch]       = useState(initialSearch ?? '')
  const debounceRef = useRef(null)

  const buildUrl = useCallback((updates) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === '' || v === 1 || v === '1') params.delete(k)
      else params.set(k, String(v))
    }
    if (updates.page === 1 || updates.page === '1') params.delete('page')
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ''}`
  }, [pathname, searchParams])

  function navigateTo(updates) {
    startTransition(() => router.push(buildUrl(updates), { scroll: false }))
  }

  function onStatusChange(next) {
    setStatusFilter(next)
    navigateTo({ status: next, page: 1 })
  }

  function onDateFrom(val) {
    setDateFrom(val)
    navigateTo({ from: val, page: 1 })
  }

  function onDateTo(val) {
    setDateTo(val)
    navigateTo({ to: val, page: 1 })
  }

  function onSearchChange(val) {
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navigateTo({ search: val.trim(), page: 1 })
    }, 400)
  }

  function onPageChange(p) {
    navigateTo({ page: p })
  }

  function clearAll() {
    clearTimeout(debounceRef.current)
    setStatusFilter(''); setDateFrom(''); setDateTo(''); setSearch('')
    navigateTo({ status: '', from: '', to: '', search: '', page: 1 })
  }

  const hasActiveFilters = statusFilter || dateFrom || dateTo || search.trim()

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 anim-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/bookings"
              className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: 'var(--fg-3)' }}
            >
              <ChevronLeft size={13} /> Bookings
            </Link>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Booking History</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
            Delivered and cancelled bookings
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-white shrink-0"
          style={{ color: 'var(--fg-2)' }}>
          {total} total
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 space-y-3 anim-fade-up s1" style={{ position: 'relative', zIndex: 10 }}>

        {/* Row 1: search + status */}
        <div className="grid md:grid-cols-[1fr_220px] gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-3)' }} />
            <input
              type="text"
              placeholder="Search by name, email or address…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              style={{ '--tw-ring-color': 'var(--accent-glow)', color: 'var(--fg)' }}
            />
            {search && (
              <button className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                style={{ color: 'var(--fg-3)' }} onClick={() => onSearchChange('')}>
                <X size={14} />
              </button>
            )}
          </div>
          <Select
            value={statusFilter}
            onChange={onStatusChange}
            options={STATUS_FILTER_OPTIONS}
            placeholder="Filter by status"
          />
        </div>

        {/* Row 2: date range + clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--fg-3)' }}>Date:</span>
          <DatePicker
            value={dateFrom}
            onChange={onDateFrom}
            placeholder="From"
            clearable
            className="flex-1 min-w-32"
          />
          <span className="text-xs shrink-0" style={{ color: 'var(--fg-3)' }}>—</span>
          <DatePicker
            value={dateTo}
            onChange={onDateTo}
            placeholder="To"
            clearable
            className="flex-1 min-w-32"
          />
          {hasActiveFilters && (
            <button onClick={clearAll}
              className="ml-auto flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0"
              style={{ color: 'var(--danger)', background: 'var(--danger-bg)' }}>
              <X size={11} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s2">

        {/* List header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3"
          style={{ background: 'var(--surface-2)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
            {total} booking{total !== 1 ? 's' : ''}
          </span>
          {isPending && (
            <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--fg-3)' }}>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" />
            </svg>
          )}
        </div>

        {/* Empty state */}
        {bookings.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--surface-2)' }}>
              <PackageCheck size={28} style={{ color: 'var(--fg-3)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>
              {hasActiveFilters ? 'No bookings match your filters' : 'No completed bookings yet'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearAll} className="text-xs mt-2 font-medium" style={{ color: 'var(--accent)' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {bookings.map((b) => {
              const pickup  = b.stops?.find((s) => s.type === 'pickup')
              const dropoff = b.stops?.find((s) => s.type === 'dropoff')
              return (
                <div key={b._id} className="flex items-start gap-4 px-5 py-4 transition-all">

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge status={b.status} />
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
                  </div>

                  <Link
                    href={`/admin/bookings/${b._id}`}
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
    </div>
  )
}
