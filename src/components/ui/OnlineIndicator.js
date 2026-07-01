'use client'

import { useEffect, useState } from 'react'

/**
 * OnlineIndicator — tiny pill that shows connectivity + pending-sync state.
 *
 * Amber dot "Syncing {n}" → offline-queue has pending items (passed via `pending` prop)
 * Grey  dot "Offline"     → browser reports offline
 *
 * Renders nothing when online with nothing pending — there's nothing the
 * driver needs to know in that state, so no pill (and no wrapper) is shown.
 *
 * Purely presentational — callers pass `pending` (the offline-queue depth).
 * `wrapperClassName`, if given, wraps the pill in a `<div>` with that class —
 * only when the pill actually renders — so callers can add their own outer
 * chrome (e.g. a white circular badge) without ever showing an empty shell.
 */
export default function OnlineIndicator({ pending = 0, className = '', wrapperClassName }) {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    if (typeof navigator !== 'undefined') setOnline(navigator.onLine)
    function up()   { setOnline(true) }
    function down() { setOnline(false) }
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (online && pending === 0) return null

  let label, dotColor, textColor, bg
  if (!online) {
    label = 'Offline'
    dotColor = '#9ca3af'; textColor = '#374151'; bg = '#f3f4f6'
  } else {
    label = `Syncing ${pending}`
    dotColor = '#f59e0b'; textColor = '#78350f'; bg = '#fef3c7'
  }

  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ background: bg, color: textColor }}
      aria-live="polite"
    >
      <span style={{ width: 7, height: 7, borderRadius: 9999, background: dotColor }} />
      {label}
    </span>
  )

  return wrapperClassName ? <div className={wrapperClassName}>{pill}</div> : pill
}
