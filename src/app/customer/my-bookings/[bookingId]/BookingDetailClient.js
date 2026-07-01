'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Badge from '@/components/ui/Badge'
import StatusTimeline from '@/components/ui/StatusTimeline'
import { useToast } from '@/components/ui/Toast'
import {
  ArrowLeft, Clock, MapPin, User, Phone, Link2, CheckCircle2,
  Copy, Trash2, Package, Ruler, ExternalLink, Loader2,
} from 'lucide-react'

function formatDuration(s) {
  if (!s) return null
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const WEIGHT_LABELS = {
  up_to_10:  'Up to 10 kg',
  '10_to_25':'10–25 kg',
  '25_to_50':'25–50 kg',
  '50_plus': '50+ kg',
}

export default function BookingDetailClient({ booking: initial, origin }) {
  const router = useRouter()
  const toast  = useToast()
  const [booking, setBooking]       = useState(initial)
  const [cancelling, setCancelling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  const trackingUrl = `${origin}/track/${booking.trackingToken}`
  const canCancel   = booking.status === 'pending'

  async function handleCancel() {
    setShowConfirm(false)
    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${booking._id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error('Cannot cancel', d.error || 'Only pending bookings can be cancelled.')
        return
      }
      setBooking((prev) => ({
        ...prev,
        status: 'cancelled',
        statusHistory: [
          ...(prev.statusHistory ?? []),
          { status: 'cancelled', timestamp: new Date().toISOString(), note: 'Cancelled by customer' },
        ],
      }))
      toast.success('Booking cancelled', 'Your booking has been cancelled.')
    } catch {
      toast.error('Network error', 'Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(booking.trackingToken)
      setCopiedToken(true)
      toast.success('Copied!', 'Tracking number copied to clipboard.')
      setTimeout(() => setCopiedToken(false), 2000)
    } catch {
      toast.error('Copy failed', 'Please copy the number manually.')
    }
  }

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopied(true)
      toast.success('Copied!', 'Tracking link copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed', 'Please copy the link manually.')
    }
  }

  const b = booking

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Back + Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 anim-fade-up">
        <Link href="/customer/my-bookings"
          className="p-2 rounded-xl border border-border bg-white transition-all hover:bg-(--surface-2) shrink-0"
          style={{ color: 'var(--fg-3)' }}>
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Booking Detail</h1>
            <Badge status={b.status} />
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>
            {formatDate(b.createdAt)}
          </p>
        </div>
        {canCancel && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={cancelling}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all"
            style={{ color: 'var(--danger)', background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            {cancelling ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Cancel
          </button>
        )}
      </div>

      {/* ── ETA + Price ───────────────────────────────────────────── */}
      {(b.estimatedDurationSeconds || b.estimatedPrice) && (
        <div className="grid grid-cols-2 gap-3 anim-fade-up s1">
          {b.estimatedDurationSeconds && (
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Est. Duration</p>
                <p className="text-lg font-bold mono" style={{ color: 'var(--fg)' }}>
                  {formatDuration(b.estimatedDurationSeconds)}
                </p>
              </div>
            </div>
          )}
          {b.estimatedPrice && (
            <div className="bg-white rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
                <Package size={18} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Estimated Price</p>
                <p className="text-lg font-bold mono" style={{ color: 'var(--fg)' }}>
                  ${b.estimatedPrice} <span className="text-xs font-normal" style={{ color: 'var(--fg-3)' }}>CAD</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tracking Number ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s1">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2"
          style={{ background: 'var(--surface-2)' }}>
          <Link2 size={13} style={{ color: 'var(--fg-3)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Tracking Number</h2>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <p
            className="font-mono font-black text-lg tracking-widest break-all select-all"
            style={{ color: 'var(--fg)', letterSpacing: '0.08em' }}
          >
            {b.trackingToken}
          </p>
          <button
            onClick={copyToken}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: copiedToken ? 'var(--success-bg)' : 'var(--surface-2)',
              color: copiedToken ? 'var(--success)' : 'var(--fg-2)',
              border: '1px solid var(--border)',
            }}
          >
            {copiedToken ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {copiedToken ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Package Details ───────────────────────────────────────── */}
      {b.packageDetails && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s1">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2"
            style={{ background: 'var(--surface-2)' }}>
            <Package size={13} style={{ color: 'var(--fg-3)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Package</h2>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            {b.packageDetails.kind && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--fg-3)' }}>Type</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{b.packageDetails.kind}</p>
              </div>
            )}
            {b.packageDetails.weightSlab && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--fg-3)' }}>Weight</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                  {WEIGHT_LABELS[b.packageDetails.weightSlab] ?? b.packageDetails.weightSlab}
                </p>
              </div>
            )}
            {b.packageDetails.description && (
              <div className="col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--fg-3)' }}>Contents</p>
                <p className="text-sm" style={{ color: 'var(--fg-2)' }}>{b.packageDetails.description}</p>
              </div>
            )}
            {b.packageDetails.specialInstructions && (
              <div className="col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--fg-3)' }}>Instructions</p>
                <p className="text-sm" style={{ color: 'var(--fg-2)' }}>{b.packageDetails.specialInstructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stops ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s2">
        <div className="px-5 py-3.5 border-b border-border" style={{ background: 'var(--surface-2)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Route</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{b.stops?.length ?? 0} stops</p>
        </div>
        <ol className="divide-y divide-border">
          {b.stops?.map((stop, i) => (
            <li key={i} className="flex items-start gap-4 px-5 py-4">
              {/* Step number / check */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{
                  background: stop.completedAt
                    ? 'rgba(22,163,74,0.10)'
                    : stop.type === 'pickup' ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                  color: stop.completedAt ? 'var(--success)'
                    : stop.type === 'pickup' ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {stop.completedAt ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: stop.type === 'pickup' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                      color: stop.type === 'pickup' ? 'var(--success)' : 'var(--danger)',
                    }}>
                    {stop.type === 'pickup' ? 'Pickup' : 'Drop-off'}
                  </span>
                  {stop.completedAt && (
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--success)' }}>
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold wrap-break-word"
                  style={{ color: stop.completedAt ? 'var(--fg-3)' : 'var(--fg)' }}>
                  {stop.address}
                </p>
                {(stop.contactName || stop.contactPhone) && (
                  <div className="flex items-center flex-wrap gap-3 mt-1.5">
                    {stop.contactName && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-3)' }}>
                        <User size={10} />{stop.contactName}
                      </span>
                    )}
                    {stop.contactPhone && (
                      <a href={`tel:${stop.contactPhone}`}
                        className="flex items-center gap-1 text-xs font-medium transition-colors hover:underline"
                        style={{ color: 'var(--accent)' }}>
                        <Phone size={10} />{stop.contactPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <MapPin size={12} className="shrink-0 mt-1"
                style={{ color: stop.type === 'pickup' ? 'var(--success)' : 'var(--danger)', opacity: 0.5 }} />
            </li>
          ))}
        </ol>
      </div>

      {/* ── Tracking Link ──────────────────────────────────────────── */}
      {b.trackingToken && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s3">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2"
            style={{ background: 'var(--surface-2)' }}>
            <Link2 size={13} style={{ color: 'var(--fg-3)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Receiver Tracking Link</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <p className="mono text-xs flex-1 truncate" style={{ color: 'var(--fg-2)' }}>{trackingUrl}</p>
              <button
                onClick={copyTracking}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all"
                style={{
                  background: copied ? 'rgba(22,163,74,0.08)' : 'white',
                  color: copied ? 'var(--success)' : 'var(--fg-2)',
                  border: '1px solid var(--border)',
                }}
              >
                {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all"
                style={{ background: 'white', color: 'var(--fg-2)', border: '1px solid var(--border)' }}>
                <ExternalLink size={11} />
              </a>
            </div>
            <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Share with the receiver to let them track this delivery in real time.</p>
          </div>
        </div>
      )}

      {/* ── Status Timeline ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s4">
        <div className="px-5 py-3.5 border-b border-border" style={{ background: 'var(--surface-2)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Status History</h2>
        </div>
        <div className="px-5 py-4">
          <StatusTimeline statusHistory={b.statusHistory} currentStatus={b.status} />
        </div>
      </div>

      {/* ── Cancel Confirm Modal ──────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(15,17,23,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl border border-border shadow-2xl p-6 w-full max-w-sm anim-fade-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'var(--danger-bg)' }}>
              <Trash2 size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <h3 className="text-base font-bold text-center mb-1" style={{ color: 'var(--fg)' }}>Cancel this booking?</h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--fg-3)' }}>
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-(--surface-2) transition-all"
                style={{ color: 'var(--fg-2)' }}>
                Keep
              </button>
              <button onClick={handleCancel}
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
