import { cacheLife, cacheTag } from 'next/cache'
import { requireAdmin } from '@/lib/dal'
import { getBookingCounters } from '@/lib/db/bookings'
import { findAllDrivers } from '@/lib/db/drivers'
import Link from 'next/link'
import {
  Clock, Zap, CheckCircle2, Users,
  PackageOpen, UserPlus, ChevronRight, Circle,
} from 'lucide-react'

export const metadata = { title: 'Dashboard — Go Fast Delivery' }

async function getStats() {
  'use cache'
  cacheLife('seconds')
  cacheTag('booking-counters')
  return getBookingCounters()
}

function StatCard({ label, value, sub, icon: Icon, href, accent }) {
  const inner = (
    <div
      className="group relative rounded-xl border border-border bg-white p-5 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] hover:border-(--border-2) overflow-hidden anim-fade-up"
    >
      {accent && (
        <div
          className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 pl-2">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-3)' }}>{label}</p>
          <p className="text-3xl font-bold leading-none mono" style={{ color: accent ?? 'var(--fg)' }}>
            {value}
          </p>
          {sub && <p className="text-xs mt-2" style={{ color: 'var(--fg-3)' }}>{sub}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent ? `${accent}15` : 'var(--surface-2)', color: accent ?? 'var(--fg-3)' }}
        >
          <Icon size={18} />
        </div>
      </div>
      {href && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: accent ?? 'var(--fg-3)' }}>
          View all <ChevronRight size={12} />
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

const QUICK_ACTIONS = [
  { href: '/admin/bookings',    label: 'Review pending bookings', icon: PackageOpen, desc: 'Assign drivers to new orders' },
  { href: '/admin/drivers/new', label: 'Add new driver',          icon: UserPlus,    desc: 'Register a driver account'  },
  { href: '/admin/drivers',     label: 'Manage drivers',          icon: Users,       desc: 'View and manage driver fleet' },
]

export default async function DashboardPage() {
  await requireAdmin()
  const [stats, drivers] = await Promise.all([getStats(), findAllDrivers()])
  return (
    <div>
      <div className="mb-8 anim-fade-up">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
          Live dispatch overview — {new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending"         value={stats.pending}        icon={Clock}        href="/admin/bookings"              accent={stats.pending > 0 ? '#d97706' : undefined}  sub="awaiting assignment" />
        <StatCard label="In Transit"      value={stats.active}         icon={Zap}          href="/admin/bookings?tab=assigned" accent={stats.active > 0 ? '#2563eb' : undefined}   sub="active deliveries" />
        <StatCard label="Delivered Today" value={stats.todayDelivered} icon={CheckCircle2} href="/admin/bookings?status=delivered_today" accent="#16a34a" sub="completed today" />
        <StatCard label="Drivers"         value={drivers.length} icon={Users} href="/admin/drivers" accent="#16a34a" sub="registered drivers" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Quick actions */}
        <div className="rounded-xl border border-border bg-white overflow-hidden anim-fade-up s2">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Quick Actions</h2>
          </div>
          <div className="divide-y divide-border">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-(--surface-2)"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--primary-bg)', color: 'var(--primary)' }}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{desc}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--fg-3)' }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Driver roster */}
        <div className="rounded-xl border border-border bg-white overflow-hidden anim-fade-up s3">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Driver Fleet</h2>
            <Link href="/admin/drivers" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              View all →
            </Link>
          </div>
          {drivers.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Users size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--fg-3)' }} />
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No drivers registered yet.</p>
              <Link href="/admin/drivers/new" className="mt-2 inline-block text-xs font-medium" style={{ color: 'var(--primary)' }}>Add first driver →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {drivers.slice(0, 7).map((d) => (
                <li key={d._id.toString()}>
                  <Link href={`/admin/drivers/${d._id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-(--surface-2)">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{d.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
