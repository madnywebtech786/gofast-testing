'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, PackageOpen, Users, Tag,
  LogOut, Truck, Menu, X, ChevronRight, History, Settings, UserCircle, Receipt,
} from 'lucide-react'

const NAV = [
  { href: '/admin/dashboard',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings',          label: 'Bookings',  icon: PackageOpen },
  { href: '/admin/bookings/history',  label: 'History',   icon: History },
  { href: '/admin/drivers',           label: 'Drivers',   icon: Users },
  { href: '/admin/customers',         label: 'Customers', icon: UserCircle },
  { href: '/admin/invoices',          label: 'Invoices',  icon: Receipt },
  { href: '/admin/pricing',           label: 'Pricing',   icon: Tag },
  { href: '/admin/settings',          label: 'Settings',  icon: Settings },
]

export default function AdminLayout({ children }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/admin_login')
  }

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <Image src="/images/logo.png" alt="GoFastDelivery" width={120} height={36} className="h-9 w-auto object-contain" priority />
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (
            href !== '/admin/dashboard' &&
            href !== '/admin/bookings' &&
            pathname.startsWith(href)
          ) || (
            href === '/admin/bookings' &&
            pathname.startsWith(href) &&
            !pathname.startsWith('/admin/bookings/history')
          )
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                color:      active ? 'var(--accent)'  : 'var(--fg-2)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)';  e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} className="shrink-0" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col shrink-0 border-r border-border"
        style={{ width: '220px', background: 'var(--surface)', position: 'sticky', top: 0, height: '100vh' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(15,17,23,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col lg:hidden border-r border-border transition-transform duration-300"
        style={{
          width: '220px',
          background: 'var(--surface)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: mobileOpen ? '4px 0 24px rgba(0,0,0,0.10)' : 'none',
        }}
      >
        <div className="absolute top-4 right-3">
          <button onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--fg-3)' }}>
            <X size={16} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border sticky top-0 z-30"
          style={{ background: 'var(--surface)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--fg-3)' }}
          >
            <Menu size={18} />
          </button>
          <Image src="/images/logo.png" alt="GoFastDelivery" width={100} height={32} className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-1 ml-2 text-xs" style={{ color: 'var(--fg-3)' }}>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--fg-2)' }}>
              {NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Admin'}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
