'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import {
  PackageCheck, Truck, CheckCircle2, MapPin, Navigation,
  RefreshCw, Clock, Ruler, Package, ChevronRight,
  History, ListChecks, Circle
} from 'lucide-react'

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

export default function DriverHomePage() {
  const router = useRouter()
  const [driverId, setDriverId] = useState(null)
  const [stats, setStats]       = useState(null)
  const [route, setRoute]       = useState(null)
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!meRes.ok) { router.replace('/login'); return }
      const me = await meRes.json()
      setDriverId(me.userId)

      const [statsRes, routeRes] = await Promise.all([
        fetch(`/api/drivers/${me.userId}/stats?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/drivers/${me.userId}/route-data?t=${Date.now()}`, { cache: 'no-store' }),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      else setStats(null)

      if (routeRes.ok) setRoute(await routeRes.json())
      else setRoute(null)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]" style={{ background: 'var(--bg)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const allStops     = route ? (route.optimizedStops ?? []) : []
  const pendingStops = allStops.filter((s) => !s.completedAt)
  const doneStops    = allStops.filter((s) =>  s.completedAt)
  const totalStops   = allStops.length
  const routePhase   = route?.routePhase ?? 'pickup'
  const hasRoute     = !!route
  const isResume     = hasRoute && doneStops.length > 0
  const nextStop     = pendingStops[0] ?? null

  return (
    <div className="flex-1 flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5 border-b border-border bg-white">
        <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--fg-3)' }}>{greeting}</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
          {stats?.name ?? 'Driver'}
        </h1>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatCard icon={<Package size={18} />}      label="Assigned"    value={stats?.assigned       ?? 0} color="#3b82f6" bg="rgba(59,130,246,0.08)" />
          <StatCard icon={<Truck size={18} />}        label="In Progress" value={stats?.inProgress     ?? 0} color="#f59e0b" bg="rgba(245,158,11,0.08)" />
          <StatCard icon={<CheckCircle2 size={18} />} label="Today"       value={stats?.completedToday ?? 0} color="#22c55e" bg="rgba(34,197,94,0.08)" />
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4 flex-1 pb-6">

        {/* ── Active route card ─────────────────────────────────────────────── */}
        {hasRoute ? (
          <div className="rounded-2xl overflow-hidden bg-white border border-border shadow-sm">
            {/* Phase header with progress */}
            <div
              className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border"
              style={{
                background: routePhase === 'pickup'
                  ? 'rgba(59,130,246,0.04)'
                  : 'rgba(34,197,94,0.04)',
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {routePhase === 'pickup'
                    ? <Package size={16} style={{ color: '#3b82f6' }} />
                    : <Truck    size={16} style={{ color: '#22c55e' }} />
                  }
                  <span className="text-sm font-bold"
                    style={{ color: routePhase === 'pickup' ? '#3b82f6' : '#22c55e' }}>
                    {routePhase === 'pickup' ? 'Pickup Run' : 'Delivery Run'}
                  </span>
                  {isResume && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--fg-3)' }}>
                  {pendingStops.length} remaining · {doneStops.length}/{totalStops} done
                </p>
              </div>

              {/* Progress ring */}
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke={routePhase === 'pickup' ? '#3b82f6' : '#22c55e'}
                    strokeWidth="3"
                    strokeDasharray={`${totalStops > 0 ? (doneStops.length / totalStops) * 94.2 : 0} 94.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mono"
                  style={{ color: 'var(--fg)' }}>
                  {totalStops > 0 ? Math.round((doneStops.length / totalStops) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Completed stops mini-list (shown when resuming) */}
            {isResume && doneStops.length > 0 && (
              <div className="px-4 py-3 border-b border-border" style={{ background: 'var(--surface-2)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-3)' }}>
                  Completed stops
                </p>
                <div className="space-y-1.5">
                  {doneStops.slice(-3).map((stop, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
                      <p className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>{stop.address}</p>
                    </div>
                  ))}
                  {doneStops.length > 3 && (
                    <p className="text-[10px]" style={{ color: 'var(--fg-3)' }}>
                      +{doneStops.length - 3} more completed
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Next stop preview */}
            {nextStop && (
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--fg-3)' }}>
                  {isResume ? 'Resume at' : 'First stop'}
                </p>
                <div className="flex items-center gap-2">
                  <Circle
                    size={8}
                    fill={nextStop.stopType === 'pickup' ? '#3b82f6' : '#ef4444'}
                    style={{ color: nextStop.stopType === 'pickup' ? '#3b82f6' : '#ef4444', flexShrink: 0 }}
                  />
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{nextStop.address}</p>
                </div>
                {nextStop.contactName && (
                  <p className="text-xs mt-0.5 ml-4" style={{ color: 'var(--fg-3)' }}>{nextStop.contactName}</p>
                )}
              </div>
            )}

            {/* Route meta + CTA */}
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {route.totalDistanceMeters && (
                  <MetaChip icon={<Ruler size={10} />} text={formatDist(route.totalDistanceMeters)} />
                )}
                {route.totalDurationSeconds && (
                  <MetaChip icon={<Clock size={10} />} text={formatDur(route.totalDurationSeconds)} />
                )}
                <MetaChip icon={<MapPin size={10} />} text={`${totalStops} stops`} />
              </div>

              <button
                onClick={() => { router.refresh(); router.push('/driver/route') }}
                className="shrink-0 flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-all text-white"
                style={{
                  background: isResume ? '#d97706' : 'var(--accent)',
                  boxShadow: isResume
                    ? '0 0 16px rgba(217,119,6,0.25)'
                    : '0 0 16px rgba(79,70,229,0.25)',
                }}
              >
                <Navigation size={13} />
                {isResume ? 'Continue' : 'Start'}
              </button>
            </div>
          </div>
        ) : (
          /* ── No route ────────────────────────────────────────────────────── */
          <div className="rounded-2xl px-5 py-10 text-center bg-white border border-border shadow-sm">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--surface-2)' }}>
              <PackageCheck size={26} style={{ color: 'var(--fg-3)' }} />
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--fg)' }}>No active route</p>
            <p className="text-xs mt-1 mb-5" style={{ color: 'var(--fg-3)' }}>
              Waiting for dispatcher to assign packages.
            </p>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        )}

        {/* ── Quick links ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <QuickLink
            icon={<ListChecks size={20} />}
            label="View Stops"
            sub={hasRoute ? `${totalStops} stops assigned` : 'No stops yet'}
            href="/driver/pickups"
            color="rgba(59,130,246,0.1)"
            iconColor="#3b82f6"
          />
          <QuickLink
            icon={<History size={20} />}
            label="History"
            sub={`${stats?.completedTotal ?? 0} delivered`}
            href="/driver/history"
            color="rgba(34,197,94,0.1)"
            iconColor="#22c55e"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="rounded-xl px-3 py-3 text-center bg-white border border-border">
      <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style={{ background: bg, color }}>
        {icon}
      </div>
      <p className="text-2xl font-bold mono" style={{ color: 'var(--fg)' }}>{value}</p>
      <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--fg-3)' }}>{label}</p>
    </div>
  )
}

function MetaChip({ icon, text }) {
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full"
      style={{ background: 'var(--surface-2)', color: 'var(--fg-2)', border: '1px solid var(--border)' }}>
      {icon} {text}
    </span>
  )
}

function QuickLink({ icon, label, sub, href, color, iconColor }) {
  const { push } = useRouter()
  return (
    <button
      onClick={() => push(href)}
      className="rounded-2xl px-4 py-4 text-left active:scale-95 transition-all w-full bg-white border border-border shadow-sm hover:shadow-md"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5"
        style={{ background: color, color: iconColor }}>
        {icon}
      </div>
      <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{label}</p>
      <div className="flex items-center gap-1 mt-0.5">
        <p className="text-[11px]" style={{ color: iconColor }}>{sub}</p>
        <ChevronRight size={10} style={{ color: iconColor }} />
      </div>
    </button>
  )
}
