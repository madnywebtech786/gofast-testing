'use client'

import { useState } from 'react'
import BookingStatusListener from '@/components/realtime/BookingStatusListener'
import OnlineIndicator from '@/components/ui/OnlineIndicator'
import { User, Phone } from 'lucide-react'

/* ── Brand-aligned status palette ───────────────────────────────────── */
const STATUS_STYLES = {
  pending:           { bg: 'rgba(0,0,0,0.03)',          border: 'rgba(0,0,0,0.07)',          dot: '#8492a6', dotGlow: 'rgba(132,146,166,0.4)', text: '#4a5568',  stepFill: '#8492a6' },
  assigned_pickup:   { bg: 'rgba(255,88,13,0.06)',       border: 'rgba(255,88,13,0.15)',       dot: '#ff580d', dotGlow: 'rgba(255,88,13,0.5)',   text: '#c43d00',  stepFill: '#ff580d' },
  picked_up:         { bg: 'rgba(27,185,8,0.06)',        border: 'rgba(27,185,8,0.15)',        dot: '#1bb908', dotGlow: 'rgba(27,185,8,0.5)',    text: '#15960a',  stepFill: '#1bb908' },
  assigned_delivery: { bg: 'rgba(255,88,13,0.06)',       border: 'rgba(255,88,13,0.15)',       dot: '#ff580d', dotGlow: 'rgba(255,88,13,0.5)',   text: '#c43d00',  stepFill: '#ff580d' },
  delivered:         { bg: 'rgba(27,185,8,0.08)',        border: 'rgba(27,185,8,0.2)',         dot: '#1bb908', dotGlow: 'rgba(27,185,8,0.6)',    text: '#15960a',  stepFill: '#1bb908' },
  cancelled:         { bg: 'rgba(229,28,28,0.06)',       border: 'rgba(229,28,28,0.15)',       dot: '#e51c1c', dotGlow: 'rgba(229,28,28,0.5)',   text: '#b91c1c',  stepFill: '#e51c1c' },
}

const STATUS_LABELS = {
  pending:           'Order Placed',
  assigned_pickup:   'Pickup Scheduled',
  picked_up:         'Picked Up',
  assigned_delivery: 'On the Way',
  delivered:         'Delivered',
  cancelled:         'Cancelled',
}

const ORDERED_STATUSES = [
  'pending',
  'assigned_pickup',
  'picked_up',
  'assigned_delivery',
  'delivered',
]

const STATUS_ICONS = {
  delivered: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  cancelled: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  default: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
    </svg>
  ),
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-CA', {
    timeZone: 'America/Edmonton',
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/* Compact step label */
const STEP_LABELS = ['Placed', 'Pickup', 'Picked Up', 'En Route', 'Delivered']

export default function TrackingClient({ initialBooking }) {
  const [booking, setBooking] = useState(initialBooking)

  function handleStatusChange({ status, updatedAt }) {
    setBooking(prev => ({
      ...prev,
      status,
      updatedAt,
      statusHistory: [
        ...(prev.statusHistory ?? []),
        { status, timestamp: updatedAt, note: 'Live update' },
      ],
    }))
  }

  const status      = booking.status
  const style       = STATUS_STYLES[status] ?? STATUS_STYLES.pending
  const currentIdx  = ORDERED_STATUSES.indexOf(status)
  const isCancelled = status === 'cancelled'
  const isDelivered = status === 'delivered'

  return (
    <>
      <BookingStatusListener bookingId={booking._id} onStatusChange={handleStatusChange} />

      {/* ── Current status hero card ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: '#ffffff',
          border: `1px solid ${style.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        {/* Colored top strip */}
        <div style={{ height: '3px', background: style.dot, boxShadow: `0 0 8px ${style.dotGlow}` }} />

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              {/* Status icon circle */}
              <div
                className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: style.bg,
                  border: `1.5px solid ${style.border}`,
                  color: style.dot,
                  boxShadow: `0 2px 12px ${style.dotGlow}`,
                }}
              >
                {isDelivered ? STATUS_ICONS.delivered : isCancelled ? STATUS_ICONS.cancelled : STATUS_ICONS.default}
              </div>

              <div className="min-w-0">
                <p
                  className="font-black text-xl sm:text-2xl leading-tight truncate"
                  style={{ color: '#0d0d0d', fontFamily: 'var(--font-montserrat, system-ui)' }}
                >
                  {STATUS_LABELS[status] ?? status}
                </p>
                <p
                  className="text-[11px] font-semibold mt-0.5"
                  style={{ color: style.text }}
                >
                  Current status
                </p>
              </div>
            </div>

            <OnlineIndicator className="shrink-0" />
          </div>
        </div>
      </div>

      {/* ── Progress stepper ── */}
      {!isCancelled && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div className="p-5 sm:p-6">
            <p
              className="text-[10px] font-black tracking-[0.18em] uppercase mb-5"
              style={{ color: 'rgba(0,0,0,0.35)' }}
            >
              Progress
            </p>

            <ol className="flex items-start">
              {ORDERED_STATUSES.map((s, i) => {
                const done    = currentIdx >= i
                const current = currentIdx === i
                const last    = i === ORDERED_STATUSES.length - 1
                const ss      = STATUS_STYLES[s]

                return (
                  <li key={s} className="flex-1 flex flex-col items-center relative">
                    {/* Connector */}
                    {!last && (
                      <div
                        className="absolute"
                        style={{
                          top: '16px',
                          left: '50%',
                          width: '100%',
                          height: '2px',
                          background: done && currentIdx > i
                            ? `linear-gradient(90deg, ${ss.stepFill}, ${STATUS_STYLES[ORDERED_STATUSES[i + 1]]?.stepFill ?? ss.stepFill})`
                            : 'rgba(0,0,0,0.07)',
                        }}
                      />
                    )}

                    {/* Step dot */}
                    <div
                      className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all"
                      style={{
                        background: done ? ss.stepFill : '#ffffff',
                        border: done ? `2px solid ${ss.stepFill}` : '2px solid rgba(0,0,0,0.1)',
                        color: done ? '#ffffff' : 'rgba(0,0,0,0.25)',
                        boxShadow: current ? `0 0 0 4px ${ss.dotGlow}` : 'none',
                      }}
                    >
                      {done && !current ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>

                    <p
                      className="text-center mt-2 leading-tight px-0.5 text-[10px]"
                      style={{
                        color: current ? '#0d0d0d' : done ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)',
                        fontWeight: current ? 800 : done ? 600 : 400,
                      }}
                    >
                      {STEP_LABELS[i]}
                    </p>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      )}

      {/* ── Status history ── */}
      {(booking.statusHistory?.length ?? 0) > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.07)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div className="p-5 sm:p-6">
            <p
              className="text-[10px] font-black tracking-[0.18em] uppercase mb-5"
              style={{ color: 'rgba(0,0,0,0.35)' }}
            >
              History
            </p>

            <ol
              className="relative ml-2 space-y-5"
              style={{ borderLeft: '2px solid rgba(0,0,0,0.06)' }}
            >
              {[...booking.statusHistory].reverse().map((h, i) => {
                const ss = STATUS_STYLES[h.status] ?? STATUS_STYLES.pending
                const driver =
                  h.status === 'assigned_pickup'   ? booking.pickupDriver  :
                  h.status === 'assigned_delivery'  ? booking.dropoffDriver :
                  null
                return (
                  <li key={i} className="pl-5 relative">
                    {/* Timeline dot */}
                    <span
                      className="absolute rounded-full border-2"
                      style={{
                        left: '-7px', top: '3px',
                        width: '12px', height: '12px',
                        background: ss.dot,
                        borderColor: '#faf8f4',
                        boxShadow: i === 0 ? `0 0 0 3px ${ss.dotGlow}` : 'none',
                      }}
                    />
                    <p
                      className="text-sm font-bold leading-tight"
                      style={{ color: i === 0 ? '#0d0d0d' : 'rgba(0,0,0,0.55)' }}
                    >
                      {STATUS_LABELS[h.status] ?? h.status}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 font-medium"
                      style={{ color: 'rgba(0,0,0,0.35)' }}
                    >
                      {formatDate(h.timestamp)}
                    </p>
                    {h.note && h.note !== 'Live update' && (
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>
                        {h.note}
                      </p>
                    )}
                    {driver && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'rgba(0,0,0,0.55)' }}>
                          <User size={11} strokeWidth={2.5} style={{ color: '#ff580d', flexShrink: 0 }} />
                          {driver.name}
                        </span>
                        {driver.phone && (
                          <a
                            href={`tel:${driver.phone}`}
                            className="flex items-center gap-1 text-xs font-semibold"
                            style={{ color: 'rgba(0,0,0,0.55)' }}
                          >
                            <Phone size={11} strokeWidth={2.5} style={{ color: '#ff580d', flexShrink: 0 }} />
                            {driver.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}
