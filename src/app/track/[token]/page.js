import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { findBookingByToken } from '@/lib/db/bookings'
import { checkRateLimit } from '@/lib/redis'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MapPin, Clock, Package } from 'lucide-react'
import TrackingClient from './TrackingClient'

export const metadata = { title: 'Track Your Delivery — GoFastDelivery' }

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton',
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function TrackingPage({ params }) {
  const { token } = await params

  // Rate limit: 30 token lookups per IP per minute — blocks enumeration attempts
  // while being invisible to any legitimate user (a real person tracks once).
  const headerStore = await headers()
  const ip = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = await checkRateLimit(`rate:track:${ip}`, 12, 60)
  if (!allowed) notFound()

  const booking = await findBookingByToken(token)
  if (!booking) notFound()

  const b = JSON.parse(JSON.stringify(booking))

  return (
    <div className="min-h-screen dot-grid-bg bg-background">

      {/* Info bar */}
      <div className="bg-accent border-b border-black/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-7 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/85">Calgary&apos;s Same-Day Courier</span>
          <span className="text-[11px] font-semibold flex items-center gap-1.5 text-white/85">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />
            Live Tracking
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-surface border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <Image src="/images/logo.png" alt="GoFastDelivery" width={120} height={40} className="h-8 w-auto object-contain" priority />
          </Link>
          <Link href="/track"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold rounded-lg px-3 py-1.5 border border-border text-foreground hover:border-border-2 transition-colors">
            New Search
            <ArrowRight size={12} strokeWidth={2.5} />
          </Link>
        </div>
      </header>

      {/* Page content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Tracking number card */}
        <div className="rounded-2xl overflow-hidden bg-surface border border-border shadow-sm">
          <div className="h-[3px] bg-[linear-gradient(90deg,var(--secondary),var(--secondary-hover))]" />
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] font-black tracking-[0.18em] uppercase mb-1.5 text-muted">Tracking Number</p>
                <p className="font-mono font-bold text-xl sm:text-2xl break-all text-foreground tracking-[0.06em]">
                  {b.trackingToken}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full bg-accent/8 border border-accent/15">
                <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_var(--accent-glow)]" />
                <span className="text-[11px] font-bold text-accent">Auto-updating</span>
              </div>
            </div>
            {b.updatedAt && (
              <p className="text-xs mt-3 flex items-center gap-1.5 text-muted">
                <Clock size={11} strokeWidth={2.5} />
                Last updated {formatDate(b.updatedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Live status + stepper (client) */}
        <TrackingClient initialBooking={b} />

        {/* Route / Stops */}
        <div className="rounded-2xl overflow-hidden bg-surface border border-border shadow-sm">
          <div className="h-[3px] bg-[linear-gradient(90deg,var(--accent),var(--accent-hover))]" />
          <div className="p-5 sm:p-6">
            <p className="text-[10px] font-black tracking-[0.18em] uppercase mb-5 text-muted">Route</p>
            <ol className="space-y-0">
              {b.stops?.map((stop, i) => {
                const isPickup = stop.type === 'pickup'
                const isLast   = i === (b.stops?.length ?? 0) - 1
                return (
                  <li key={i} className="flex gap-4 relative">
                    {!isLast && (
                      <div className="absolute w-0.5 z-0"
                        style={{
                          left: '15px', top: '32px', bottom: '-8px',
                          background: isPickup
                            ? 'linear-gradient(180deg, var(--accent), rgba(229,28,28,0.3))'
                            : 'var(--border)',
                        }} />
                    )}
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black mt-0.5 z-10 ${isPickup ? 'bg-accent shadow-[0_2px_10px_var(--accent-glow)]' : 'bg-danger shadow-[0_2px_10px_var(--danger-bg)]'}`}>
                      {isPickup ? 'P' : 'D'}
                    </div>
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">
                          {isPickup ? 'Pickup' : 'Drop-off'}
                        </p>
                        {stop.completedAt && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/15">
                            ✓ {formatDate(stop.completedAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-0.5 flex items-start gap-1.5 text-muted">
                        <MapPin size={12} strokeWidth={2} className={`mt-0.5 shrink-0 ${isPickup ? 'text-accent' : 'text-danger'}`} />
                        {stop.address}
                      </p>
                      {stop.contactName && (
                        <p className="text-xs mt-0.5 text-muted">{stop.contactName}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 pb-6">
          <p className="text-[11px] font-semibold text-muted">
            GoFastDelivery · Calgary, AB · This page auto-updates in real time.
          </p>
          <Link href="/track"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted hover:text-accent transition-colors">
            <Package size={12} strokeWidth={2.5} />
            Track a different delivery
          </Link>
        </div>
      </div>
    </div>
  )
}
