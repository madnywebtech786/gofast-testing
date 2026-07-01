'use client'
import { useState, useEffect } from 'react'
import { X, Megaphone, ArrowRight } from 'lucide-react'

// ─── Edit announcement content here ───────────────────────────────────────────
const ANNOUNCEMENT = {
  tag: 'Pricing Update',
  title: 'New rates effective June 1, 2026',
  body: 'We have updated our same-day delivery pricing to reflect improved service coverage across Calgary and surrounding areas. Express Pickup starts at $12.99 and Business Delivery packages are now available with monthly billing.',
  cta: { label: 'View Services', href: '#services' },
}
// ──────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'gfd_announcement_dismissed_v1'

export default function AnnouncementPopup() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    // Only show if not dismissed this session
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 900)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    setClosing(true)
    sessionStorage.setItem(STORAGE_KEY, '1')
    setTimeout(() => setVisible(false), 300)
  }

  function handleCta(e) {
    e.preventDefault()
    dismiss()
    const target = document.querySelector(ANNOUNCEMENT.cta.href)
    if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 350)
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
        style={{
          opacity: closing ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
        onClick={dismiss}
      />

      {/* Popup */}
      <div
        className="fixed z-[201] left-1/2 top-1/2 w-full max-w-md px-4"
        style={{
          transform: closing ? 'translate(-50%, -48%) scale(0.94)' : 'translate(-50%, -50%)',
          opacity: closing ? 0 : 1,
          transition: closing ? 'opacity 0.25s ease, transform 0.25s ease' : 'none',
          animation: closing ? 'none' : 'popup-zoom-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
      >
        <style>{`
          @keyframes popup-zoom-in {
            0%   { opacity: 0; transform: translate(-50%, -46%) scale(0.82); }
            60%  { opacity: 1; transform: translate(-50%, -51%) scale(1.03); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: '#ffffff',
            boxShadow: '0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
          }}
        >
          {/* Top accent bar */}
          <div
            className="h-1.5 w-full"
            style={{ background: 'linear-gradient(90deg, #1bb908, #ff580d)' }}
          />

          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = '#0d0d0d' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = 'rgba(0,0,0,0.45)' }}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2.5} />
          </button>

          <div className="px-7 pt-6 pb-7 flex flex-col gap-4">

            {/* Icon + tag */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(27,185,8,0.1)', border: '1px solid rgba(27,185,8,0.2)' }}
              >
                <Megaphone size={18} style={{ color: '#1bb908' }} strokeWidth={1.8} />
              </div>
              <span
                className="px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase"
                style={{ background: 'rgba(27,185,8,0.1)', color: '#1bb908' }}
              >
                {ANNOUNCEMENT.tag}
              </span>
            </div>

            {/* Title */}
            <h3
              className="font-black leading-snug"
              style={{ fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', color: '#0d0d0d' }}
            >
              {ANNOUNCEMENT.title}
            </h3>

            {/* Body */}
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(0,0,0,0.52)' }}>
              {ANNOUNCEMENT.body}
            </p>

            {/* Divider */}
            <div className="h-px w-full" style={{ background: 'rgba(0,0,0,0.07)' }} />

            {/* Actions */}
            <div className="flex items-center gap-3">
              <a
                href={ANNOUNCEMENT.cta.href}
                onClick={handleCta}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-opacity hover:opacity-90"
                style={{ background: '#1bb908' }}
              >
                {ANNOUNCEMENT.cta.label}
                <ArrowRight size={13} strokeWidth={2.5} />
              </a>
              <button
                onClick={dismiss}
                className="text-xs font-semibold transition-colors"
                style={{ color: 'rgba(0,0,0,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0d0d0d'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.35)'}
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
