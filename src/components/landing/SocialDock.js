'use client'
import { useState } from 'react'

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.12 1.531 5.845L.057 23.487a.5.5 0 0 0 .609.61l5.805-1.525A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.53-5.204-1.447l-.372-.223-3.853 1.013 1.03-3.76-.243-.386A9.937 9.937 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  )
}

const ITEMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    Icon: FacebookIcon,
    href: '#',
    color: '#1877f2',
    glow: 'rgba(24,119,242,0.35)',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    Icon: InstagramIcon,
    href: '#',
    color: '#e1306c',
    glow: 'rgba(225,48,108,0.35)',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    Icon: WhatsAppIcon,
    href: '#',
    color: '#25d366',
    glow: 'rgba(37,211,102,0.35)',
  },
]

export default function SocialDock() {
  const [hovered, setHovered] = useState(null)

  return (
    <div
      className="fixed z-40 flex flex-col items-end gap-1.5"
      style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}
    >
      {ITEMS.map(({ key, label, Icon, href, color, glow }) => {
        const isHovered = hovered === key
        return (
          <a
            key={key}
            href={href}
            aria-label={label}
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center group"
            style={{ textDecoration: 'none' }}
          >
            {/* Label pill — slides in on hover (desktop only) */}
            <span
              className="hidden md:inline text-xs font-black tracking-wide text-white rounded-l-lg px-3 py-2 whitespace-nowrap"
              style={{
                background: color,
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateX(0)' : 'translateX(8px)',
                transition: 'opacity 0.22s ease, transform 0.22s ease',
                pointerEvents: 'none',
                lineHeight: 1,
              }}
            >
              {label}
            </span>

            {/* Icon button */}
            <div
              className="w-8 h-8 md:w-11 md:h-11 flex items-center justify-center shrink-0"
              style={{
                background: color,
                color: '#fff',
                boxShadow: isHovered ? `0 0 24px ${glow}, inset 0 1px 0 rgba(255,255,255,0.2)` : `0 4px 14px ${glow}`,
                borderRadius: '8px 0 0 8px',
                transition: 'box-shadow 0.22s ease, transform 0.22s ease',
                transform: isHovered ? 'translateX(-2px) scale(1.08)' : 'translateX(0) scale(1)',
              }}
            >
              <span className="scale-75 md:scale-100 inline-flex">
                <Icon />
              </span>
            </div>
          </a>
        )
      })}

      {/* Vertical label — desktop only */}
      <div
        className="hidden md:flex items-center justify-center mt-1"
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          color: 'rgba(255,255,255,0.15)',
          fontSize: '8px',
          fontWeight: 900,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          paddingRight: '14px',
          userSelect: 'none',
        }}
      >
        Follow Us
      </div>
    </div>
  )
}
