'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'

function formatDist(m) {
  if (!m) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

function formatDur(s) {
  if (!s) return null
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Group bookings by date label
function groupByDate(bookings) {
  const groups = []
  const seen = {}
  for (const b of bookings) {
    const label = formatDate(b.updatedAt)
    if (!seen[label]) {
      seen[label] = { label, items: [] }
      groups.push(seen[label])
    }
    seen[label].items.push(b)
  }
  return groups
}

export default function DriverHistoryPage() {
  const router = useRouter()
  const [driverId, setDriverId]   = useState(null)
  const [stats, setStats]         = useState(null)
  const [bookings, setBookings]   = useState([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!meRes.ok) { router.replace('/login'); return }
      const me = await meRes.json()
      setDriverId(me.userId)

      const [statsRes, bookingsRes] = await Promise.all([
        fetch(`/api/drivers/${me.userId}/stats?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/drivers/${me.userId}/bookings?statusGroup=completed&t=${Date.now()}`, { cache: 'no-store' }),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (bookingsRes.ok) {
        const data = await bookingsRes.json()
        setBookings(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onVisible() { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  const groups = groupByDate(bookings)

  return (
    <div className="flex-1 bg-[#f5f5f7] pb-6">

      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Delivery History</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {stats?.completedTotal ?? 0} total delivered · {stats?.completedToday ?? 0} today
        </p>

        {/* Summary chips */}
        {stats && (
          <div className="mt-4 flex gap-2 flex-wrap">
            <SummaryChip icon="✅" label="Total" value={stats.completedTotal} color="#22c55e" bg="#f0fdf4" />
            <SummaryChip icon="📅" label="Today"  value={stats.completedToday} color="#3b82f6" bg="#eff6ff" />
          </div>
        )}
      </div>

      {/* Empty state */}
      {bookings.length === 0 ? (
        <div className="mx-4 mt-6 bg-white rounded-3xl px-5 py-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mx-auto mb-3">
            📭
          </div>
          <p className="text-base font-bold text-gray-800">No deliveries yet</p>
          <p className="text-xs text-gray-400 mt-1">Completed deliveries will appear here.</p>
        </div>
      ) : (
        <div className="px-4 pt-5 space-y-5 pb-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((b) => (
                  <DeliveredCard key={b._id} booking={b} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeliveredCard({ booking: b }) {
  const pickup  = b.stops?.find((s) => s.type === 'pickup')
  const dropoff = b.stops?.find((s) => s.type === 'dropoff')

  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            Delivered
          </span>
        </div>
        <span className="text-[11px] text-gray-400">{formatTime(b.updatedAt)}</span>
      </div>

      {/* Route */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1 gap-0.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <div className="w-px h-4 bg-gray-200" />
          <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-xs font-semibold text-gray-800 truncate">{pickup?.address ?? '—'}</p>
          <p className="text-xs text-gray-400 truncate">{dropoff?.address ?? '—'}</p>
        </div>
      </div>

      {/* Chips */}
      {(b.estimatedDistanceMeters || b.estimatedDurationSeconds) && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {b.estimatedDistanceMeters && (
            <span className="text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              📍 {formatDist(b.estimatedDistanceMeters)}
            </span>
          )}
          {b.estimatedDurationSeconds && (
            <span className="text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              ⏱ {formatDur(b.estimatedDurationSeconds)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryChip({ icon, label, value, color, bg }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: bg }}>
      <span>{icon}</span>
      <span className="text-xs font-semibold" style={{ color }}>{value} {label}</span>
    </div>
  )
}
