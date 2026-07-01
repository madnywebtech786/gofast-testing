'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

function FacebookIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function InstagramIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.12 1.531 5.845L.057 23.487a.5.5 0 0 0 .609.61l5.805-1.525A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.53-5.204-1.447l-.372-.223-3.853 1.013 1.03-3.76-.243-.386A9.937 9.937 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  )
}

const SOCIAL_LINKS = [
  { Icon: FacebookIcon,  label: 'Facebook',  href: '#' },
  { Icon: InstagramIcon, label: 'Instagram', href: '#' },
  { Icon: WhatsAppIcon,  label: 'WhatsApp',  href: '#' },
]

const QUICK_LINKS = [
  { label: 'Home',     href: '/' },
  { label: 'About Us', href: '/about' },
  { label: 'Services', href: '/#services' },
  { label: 'Reviews',  href: '/#reviews' },
  { label: 'Contact',  href: '/contact' },
]

const SERVICES = [
  { label: 'Same-Day Delivery', href: '/services/same-day-delivery' },
  { label: 'Express Pickup',    href: '/services/express-pickup' },
  { label: 'Business Delivery', href: '/services/business-delivery' },
  { label: 'Scheduled Runs',    href: '/services/scheduled-runs' },
  { label: 'Hotshot Delivery',  href: '/services/hotshot-delivery' },
]

export default function Footer() {
  return (
    <footer style={{ background: '#0d0d0d', borderTop: '1px solid rgba(255,88,13,0.3)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Col 1: Logo + tagline */}
          <div className="flex flex-col gap-4">
            <div className="inline-flex  overflow-hidden" >
              <Image
                src="/images/logo.png"
                alt="GoFastDelivery"
                width={150}
                height={80}
                className="h-20 w-auto object-contain rounded-xl"
              />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(156,163,175)' }}>
              Calgary&apos;s fastest same-day courier service. Reliable, trackable, and always on time.
            </p>
            <div className="flex gap-3 pt-2">
              {SOCIAL_LINKS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgb(107,114,128)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-orange)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgb(107,114,128)'}
                  aria-label={label}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-sm font-black text-white tracking-widest uppercase mb-5">
              Quick Links
            </h4>
            <ul className="flex flex-col gap-3">
              {QUICK_LINKS.map(link => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="flex items-center gap-2 text-sm transition-colors group"
                    style={{ color: 'rgb(156,163,175)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-orange)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgb(156,163,175)'}
                  >
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Services */}
          <div>
            <h4 className="text-sm font-black text-white tracking-widest uppercase mb-5">
              Services
            </h4>
            <ul className="flex flex-col gap-3">
              {SERVICES.map(s => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    className="flex items-center gap-2 text-sm transition-colors group"
                    style={{ color: 'rgb(156,163,175)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-green)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgb(156,163,175)'}
                  >
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h4 className="text-sm font-black text-white tracking-widest uppercase mb-5">
              Contact
            </h4>
            <ul className="flex flex-col gap-3 text-sm" style={{ color: 'rgb(156,163,175)' }}>
              <li>+1 825-488-2316</li>
              <li>info@gfdelivery.ca</li>
              <li>Calgary, AB &amp; Surrounding Areas</li>
            </ul>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--brand-orange)' }}
            >
              Get Started <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'rgb(107,114,128)' }}>
            © 2026 GoFastDelivery. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: 'rgb(75,85,99)' }}>
            Serving Calgary, Airdrie, Cochrane, Okotoks &amp; more
          </p>
        </div>
      </div>
    </footer>
  )
}
