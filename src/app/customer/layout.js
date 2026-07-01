'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, PackageOpen, Plus, LogOut,
  Menu, X, ChevronRight, Home, History, Settings, Sparkles,
} from 'lucide-react'
import Image from 'next/image'
import { useState, useEffect } from 'react'

function ProfileNudge({ onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slight delay so it slides in after page paint
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(onDismiss, 350)
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)]"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
      }}
    >
      <div
        className="rounded-2xl p-5 shadow-2xl border"
        style={{
          background: 'white',
          borderColor: 'var(--border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, var(--accent), #15960a)' }} />

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-dim)' }}>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
              Save time on every booking
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--fg-3)' }}>
              Add your contact details once and we&apos;ll pre-fill your pickup information automatically.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Link
                href="/customer/settings"
                onClick={dismiss}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'var(--accent)', boxShadow: '0 2px 10px var(--accent-glow)' }}
              >
                Update profile
              </Link>
              <button
                onClick={dismiss}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-70"
                style={{ color: 'var(--fg-3)' }}
              >
                Maybe later
              </button>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            className="p-1 rounded-lg shrink-0 transition-colors hover:opacity-70"
            style={{ color: 'var(--fg-3)' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

const NAV = [
  { href: '/customer/overview',            label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/customer/my-bookings',         label: 'My Bookings', icon: PackageOpen },
  { href: '/customer/my-bookings/history', label: 'History',     icon: History },
  { href: '/customer/book',                label: 'New Booking', icon: Plus },
  { href: '/customer/settings',            label: 'Settings',    icon: Settings },
]

export default function CustomerLayout({ children }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const [open, setOpen] = useState(false)
  const [showNudge, setShowNudge] = useState(false)

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem('gfd:profile-nudge-seen')) return
    fetch('/api/user/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((user) => {
        if (user && !user.profileUpdated) setShowNudge(true)
      })
      .catch(() => {})
  }, [])

  function dismissNudge() {
    sessionStorage.setItem('gfd:profile-nudge-seen', '1')
    setShowNudge(false)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <Image src="/images/logo.png" alt="GoFastDelivery" width={120} height={36} className="h-9 w-auto object-contain" priority />
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          Portal
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (
            href !== '/customer/overview' &&
            href !== '/customer/my-bookings' &&
            pathname.startsWith(href)
          ) || (
            href === '/customer/my-bookings' &&
            pathname.startsWith(href) &&
            !pathname.startsWith('/customer/my-bookings/history')
          )
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative"
              style={{
                color:      active ? 'var(--accent)' : 'var(--fg-2)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                fontWeight: active ? 600 : 500,
              }}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: 'var(--accent)' }} />
              )}
              <Icon size={16} style={{ flexShrink: 0 }} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto" style={{ opacity: 0.6 }} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5 flex flex-col gap-1">
        {/* Back to landing page — prominent */}
        <Link
          href={process.env.NEXT_PUBLIC_APP_BASE_URL ?? '/'}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full transition-all group"
          style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)'; e.currentTarget.style.opacity = '0.8' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <Home size={15} />
          gfdelivery.ca
          <ChevronRight size={12} className="ml-auto opacity-50 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-white border-r border-border fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay ───────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}
          style={{ background: 'rgba(15,17,23,0.4)', backdropFilter: 'blur(2px)' }} />
      )}

      {/* ── Mobile Sidebar ───────────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-border lg:hidden transition-transform duration-300"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <button
          className="absolute top-4 right-4 p-1.5 rounded-lg"
          style={{ color: 'var(--fg-3)' }}
          onClick={() => setOpen(false)}
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:pl-56 min-w-0">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-border px-4 h-14 flex items-center justify-between shadow-sm">
          <button
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--fg-3)' }}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Image src="/images/logo.png" alt="GoFastDelivery" width={100} height={32} className="h-8 w-auto object-contain" />
          <div className="w-8" /> {/* spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Profile completion nudge */}
      {showNudge && <ProfileNudge onDismiss={dismissNudge} />}
    </div>
  )
}
