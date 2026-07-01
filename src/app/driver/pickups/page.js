'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
import { CheckCircle2, Navigation, RefreshCw, PackageCheck, User, Phone, FileText } from 'lucide-react'

function formatTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const STOP_META = {
  pickup:  { color: '#3b82f6', label: 'Pickup',   bg: 'rgba(59,130,246,0.08)',  text: '#3b82f6' },
  dropoff: { color: '#ef4444', label: 'Drop-off', bg: 'rgba(239,68,68,0.08)',   text: '#ef4444' },
}

export default function DriverStopsPage() {
  const router = useRouter()
  const [stops, setStops]     = useState([])
  const [route, setRoute]     = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!meRes.ok) { router.replace('/login'); return }
      const me = await meRes.json()

      const routeRes = await fetch(`/api/drivers/${me.userId}/route-data?t=${Date.now()}`, { cache: 'no-store' })
      if (routeRes.ok) {
        const r = await routeRes.json()
        setRoute(r)
        setStops(r.optimizedStops ?? [])
      } else {
        setRoute(null)
        setStops([])
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
      <div className="flex-1 flex items-center justify-center min-h-[60vh]" style={{ background: 'var(--bg)' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  const completed    = stops.filter((s) => s.completedAt).length
  const total        = stops.length
  const pending      = total - completed
  const phase        = route?.routePhase ?? 'pickup'
  const allDone      = total > 0 && completed === total
  const showNavigate = total > 0 && !allDone

  return (
    <div className="flex-1 pb-6" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
              {phase === 'pickup' ? 'Pickup Stops' : 'Delivery Stops'}
            </h1>
            {total > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
                {completed} of {total} completed
              </p>
            )}
          </div>
          {/* Progress dots */}
          {total > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-30">
              {stops.map((s, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: s.completedAt ? '#22c55e' : 'var(--border)', border: '1px solid var(--border-2)' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completed / total) * 100}%`,
                background: phase === 'pickup' ? '#3b82f6' : '#22c55e',
              }}
            />
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="mx-4 mt-6 rounded-2xl px-5 py-12 text-center bg-white border border-border shadow-sm">
          <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}>
            <PackageCheck size={24} style={{ color: 'var(--fg-3)' }} />
          </div>
          <p className="text-base font-bold" style={{ color: 'var(--fg)' }}>No stops assigned</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--fg-3)' }}>Waiting for dispatcher to assign packages.</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      ) : (
        <div className="px-4 pt-5 relative">
          {/* Vertical timeline connector */}
          <div
            className="absolute w-0.5 pointer-events-none"
            style={{
              left: '30px',
              top: '52px',
              bottom: '20px',
              background: 'linear-gradient(to bottom, var(--border), transparent)',
            }}
          />

          <div className="space-y-3">
            {stops.map((stop, i) => {
              const meta    = STOP_META[stop.stopType] ?? STOP_META.dropoff
              const done    = Boolean(stop.completedAt)
              const isCurrent = !done && stops.slice(0, i).every((s) => s.completedAt)

              return (
                <div key={i} className="flex gap-3 relative">
                  {/* Timeline marker */}
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-all"
                    style={{
                      background: done
                        ? 'rgba(34,197,94,0.12)'
                        : isCurrent
                          ? meta.bg
                          : 'var(--surface-2)',
                      color: done ? '#22c55e' : isCurrent ? meta.color : 'var(--fg-3)',
                      border: done
                        ? '1px solid rgba(34,197,94,0.25)'
                        : isCurrent
                          ? `1px solid ${meta.color}40`
                          : '1px solid var(--border)',
                    }}
                  >
                    {done ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
                  </div>

                  {/* Card */}
                  <div
                    className="flex-1 rounded-2xl px-4 py-3.5 transition-all"
                    style={{
                      background: done ? 'var(--surface-2)' : 'white',
                      border: isCurrent
                        ? `1px solid ${meta.color}40`
                        : 'var(--border)',
                      borderStyle: 'solid',
                      borderWidth: '1px',
                      borderColor: isCurrent ? `${meta.color}40` : 'var(--border)',
                      opacity: done ? 0.65 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: done ? 'var(--fg-3)' : meta.text }}
                      >
                        {meta.label}
                        {isCurrent && (
                          <span className="ml-2 normal-case font-semibold" style={{ color: '#d97706' }}>← Next</span>
                        )}
                      </span>
                      {done ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                          {formatTime(stop.completedAt) ?? 'Done'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--surface-2)', color: 'var(--fg-3)', border: '1px solid var(--border)' }}>
                          Pending
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold leading-snug"
                      style={{ color: done ? 'var(--fg-3)' : 'var(--fg)' }}>
                      {stop.address}
                    </p>

                    {!done && (stop.contactName || stop.contactPhone || stop.notes) && (
                      <div className="mt-2 space-y-1">
                        {stop.contactName && (
                          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--fg-2)' }}>
                            <User size={10} style={{ color: 'var(--fg-3)' }} />{stop.contactName}
                          </p>
                        )}
                        {stop.contactPhone && (
                          <a
                            href={`tel:${stop.contactPhone}`}
                            className="flex items-center gap-1.5 text-xs font-medium"
                            style={{ color: 'var(--accent)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={10} />{stop.contactPhone}
                          </a>
                        )}
                        {stop.notes && (
                          <p className="flex items-center gap-1.5 text-xs italic"
                            style={{ color: 'var(--fg-2)' }}>
                            <FileText size={10} style={{ color: 'var(--fg-3)' }} />{stop.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Navigate CTA — only shown when stops are pending ─────────────── */}
      {showNavigate && (
        <div className="mx-4 mt-5">
          <button
            onClick={() => router.push('/driver/route')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] text-white"
            style={{
              background: completed > 0 ? '#d97706' : 'var(--accent)',
              boxShadow: completed > 0
                ? '0 4px 20px rgba(217,119,6,0.25)'
                : '0 4px 20px rgba(79,70,229,0.25)',
            }}
          >
            <Navigation size={16} />
            {completed > 0 ? `Continue Route (${pending} left)` : 'Start Navigation'}
          </button>
        </div>
      )}

      {/* All done state */}
      {allDone && (
        <div className="mx-4 mt-5 rounded-2xl px-5 py-5 text-center"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
          <p className="text-sm font-bold" style={{ color: '#22c55e' }}>All stops completed!</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>Great work today.</p>
        </div>
      )}
    </div>
  )
}
