'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const TABS = [
  {
    href: '/driver/home',
    label: 'Home',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: '/driver/pickups',
    label: 'Stops',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" strokeWidth={active ? 2.5 : 2} />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: '/driver/route',
    label: 'Navigate',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="3" fill={active ? 'currentColor' : 'none'} />
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      </svg>
    ),
  },
  {
    href: '/driver/history',
    label: 'History',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" strokeWidth={active ? 2.5 : 2} />
      </svg>
    ),
  },
]

export default function DriverShell({ children }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/driver_login')
  }

  const isMapPage = pathname === '/driver/route'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Top bar — hidden on fullscreen map */}
      {!isMapPage && (
        <header
          className="sticky top-0 z-40 px-4 h-14 flex items-center justify-between border-b"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <Image
            src="/images/logo.png"
            alt="GoFastDelivery"
            width={110}
            height={34}
            className="h-8 w-auto object-contain"
            priority
          />
          <button
            onClick={handleSignOut}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ color: 'var(--fg-3)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'var(--surface-2)' }}
          >
            Sign out
          </button>
        </header>
      )}

      {/* Page content */}
      <main className={['flex-1 flex flex-col', isMapPage ? '' : 'pb-20'].join(' ')}>
        {children}
      </main>

      {/* Bottom tab bar — hidden on fullscreen map */}
      {!isMapPage && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex border-t"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {TABS.map((tab) => {
            const active = pathname === tab.href || (tab.href === '/driver/home' && pathname === '/driver')
            const isNavigate = tab.href === '/driver/route'

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative"
                style={{ color: active ? 'var(--accent)' : 'var(--fg-3)' }}
              >
                {isNavigate ? (
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center -mt-5 shadow-lg transition-all"
                    style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)' }}
                  >
                    <span className="text-white">{tab.icon(true)}</span>
                  </div>
                ) : (
                  tab.icon(active)
                )}
                <span
                  className="text-[10px] font-semibold"
                  style={{
                    color: active ? 'var(--accent)' : 'var(--fg-3)',
                    marginTop: isNavigate ? '2px' : undefined,
                  }}
                >
                  {tab.label}
                </span>

                {/* Active dot indicator */}
                {active && !isNavigate && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
