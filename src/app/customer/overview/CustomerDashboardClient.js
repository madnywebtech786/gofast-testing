'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import {
  Package, Truck, CheckCircle2, XCircle, Clock, TrendingUp,
  ArrowRight, Plus, MapPin, DollarSign, Activity, BarChart3,
} from 'lucide-react'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
}

/* ── Tiny sparkline bar chart ─────────────────────────────────────── */
function SparkBar({ data = [], color = '#1bb908' }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div
            style={{
              width: '100%',
              height: `${Math.max((d.count / max) * 40, d.count > 0 ? 4 : 2)}px`,
              background: d.count > 0 ? color : 'var(--border)',
              borderRadius: 3,
              transition: 'height 0.5s ease',
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--fg-3)', fontWeight: 500 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Donut chart ──────────────────────────────────────────────────── */
function DonutChart({ segments, size = 80 }) {
  const total = segments.reduce((s, g) => s + g.value, 0)
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="28" fill="none" stroke="var(--border)" strokeWidth="12" />
      </svg>
    )
  }

  const r = 28
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
      {segments.filter((s) => s.value > 0).map((seg, i) => {
        const dash = (seg.value / total) * circumference
        const gap  = circumference - dash
        const el = (
          <circle
            key={i}
            cx="40" cy="40" r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="12"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

/* ── Stat card ────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color, bg, delta, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
          {icon}
        </div>
        {delta !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: delta >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', color: delta >= 0 ? '#16a34a' : '#dc2626' }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-16 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
        ) : (
          <p className="text-3xl font-bold mono" style={{ color: 'var(--fg)' }}>{value}</p>
        )}
        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--fg-3)' }}>{label}</p>
      </div>
    </div>
  )
}

export default function CustomerDashboardClient({ recentBookings }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customers/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const donutSegments = stats ? [
    { label: 'Delivered', value: stats.delivered, color: '#1bb908' },
    { label: 'Active',    value: stats.active,    color: '#1bb908' },
    { label: 'Pending',   value: stats.pending,   color: '#ff580d' },
    { label: 'Cancelled', value: stats.cancelled, color: '#dc2626' },
  ] : []

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>Welcome back! Here's your delivery overview.</p>
        </div>
        <Link href="/customer/book">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-95"
            style={{ background: 'var(--accent)', boxShadow: '0 2px 12px var(--accent-glow)' }}>
            <Plus size={15} />
            New Booking
          </button>
        </Link>
      </div>

      {/* ── Stats Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 anim-fade-up s1">
        <StatCard
          icon={<Package size={18} />}
          label="Total Bookings"
          value={stats?.total ?? '—'}
          color="#1bb908" bg="rgba(27,185,8,0.08)"
          loading={loading}
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Active"
          value={stats?.active ?? '—'}
          color="#1bb908" bg="rgba(27,185,8,0.08)"
          loading={loading}
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Delivered"
          value={stats?.delivered ?? '—'}
          color="#1bb908" bg="rgba(27,185,8,0.08)"
          loading={loading}
        />
        <StatCard
          icon={<DollarSign size={18} />}
          label="Total Spend"
          value={stats ? `$${stats.totalSpend.toFixed(0)}` : '—'}
          color="#ff580d" bg="rgba(255,88,13,0.08)"
          loading={loading}
        />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 anim-fade-up s2">

        {/* Activity chart — 7 days */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Booking Activity</p>
              <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Last 7 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <BarChart3 size={11} />
              7d
            </div>
          </div>
          {loading ? (
            <div className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-2)' }} />
          ) : (
            <SparkBar data={stats?.chartData ?? []} color="#1bb908" />
          )}
          {/* Summary line */}
          {!loading && stats && (
            <p className="text-xs mt-3" style={{ color: 'var(--fg-3)' }}>
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                {stats.chartData.reduce((s, d) => s + d.count, 0)}
              </span> bookings this week
            </p>
          )}
        </div>

        {/* Status donut */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--fg)' }}>Status Breakdown</p>
          <p className="text-xs mb-4" style={{ color: 'var(--fg-3)' }}>All time</p>

          {loading ? (
            <div className="w-20 h-20 rounded-full animate-pulse mx-auto" style={{ background: 'var(--surface-2)' }} />
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <DonutChart segments={donutSegments} size={80} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold mono" style={{ color: 'var(--fg)' }}>{stats?.total ?? 0}</span>
                </div>
              </div>
              <div className="space-y-1.5 flex-1">
                {donutSegments.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-xs" style={{ color: 'var(--fg-2)' }}>{s.label}</span>
                    </div>
                    <span className="text-xs font-semibold mono" style={{ color: 'var(--fg)' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Bookings ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s3">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between"
          style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: 'var(--fg-3)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Recent Bookings</span>
          </div>
          <Link href="/customer/my-bookings"
            className="flex items-center gap-1 text-xs font-semibold transition-colors hover:underline"
            style={{ color: 'var(--accent)' }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Package size={28} className="mx-auto mb-3" style={{ color: 'var(--fg-3)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>No bookings yet</p>
            <Link href="/customer/book" className="text-xs font-semibold mt-1 inline-block" style={{ color: 'var(--accent)' }}>
              Create your first booking →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentBookings.map((b, i) => {
              const pickup  = b.stops?.find((s) => s.type === 'pickup')
              const dropoff = b.stops?.filter((s) => s.type === 'dropoff').at(-1)
              return (
                <Link key={b._id} href={`/customer/my-bookings/${b._id}`}
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-(--surface-2) transition-colors group anim-fade-up s${Math.min(i + 1, 6)}`}>
                  {/* Status indicator */}
                  <div className="shrink-0">
                    <Badge status={b.status} />
                  </div>

                  {/* Route */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={10} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)' }}>
                        {pickup?.address ?? 'Pickup'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={10} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                      <p className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>
                        {dropoff?.address ?? 'Drop-off'}
                      </p>
                    </div>
                  </div>

                  {/* Date + arrow */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{formatDate(b.createdAt)}</p>
                    {b.estimatedPrice && (
                      <p className="text-xs font-semibold mono" style={{ color: 'var(--accent)' }}>
                        ${b.estimatedPrice}
                      </p>
                    )}
                  </div>
                  <ArrowRight size={13} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity group-hover:translate-x-0.5 transition-transform"
                    style={{ color: 'var(--fg-3)' }} />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 anim-fade-up s4">
        <Link href="/customer/book" className="group bg-white rounded-2xl border border-border p-5 hover:shadow-md hover:border-(--border-2) transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <Plus size={18} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Book a Delivery</p>
              <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Schedule a new pickup</p>
            </div>
            <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" style={{ color: 'var(--accent)' }} />
          </div>
        </Link>

        <Link href="/customer/my-bookings" className="group bg-white rounded-2xl border border-border p-5 hover:shadow-md hover:border-(--border-2) transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
              <Truck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Track Shipments</p>
              <p className="text-xs" style={{ color: 'var(--fg-3)' }}>View all your bookings</p>
            </div>
            <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" style={{ color: '#16a34a' }} />
          </div>
        </Link>
      </div>

    </div>
  )
}
