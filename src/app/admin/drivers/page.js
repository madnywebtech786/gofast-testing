import Link from 'next/link'
import { requireAdmin } from '@/lib/dal'
import { findAllDrivers } from '@/lib/db/drivers'
import Button from '@/components/ui/Button'
import { UserPlus, Truck, Phone, ChevronRight } from 'lucide-react'

export const metadata = { title: 'Drivers — Go Fast Delivery' }

export default async function AdminDriversPage() {
  await requireAdmin()
  const drivers = await findAllDrivers()
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 anim-fade-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Drivers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link href="/admin/drivers/new">
          <Button variant="primary" size="sm" icon={<UserPlus size={14} />}>Add Driver</Button>
        </Link>
      </div>

      {drivers.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-20 text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
            <Truck size={22} style={{ color: 'var(--fg-3)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>No drivers registered yet.</p>
          <Link href="/admin/drivers/new" className="mt-3 inline-block text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            Add your first driver →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white overflow-hidden anim-fade-up s1">
          {/* Table — desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, i) => (
                  <tr key={d._id.toString()} className={`anim-fade-up s${Math.min(i + 1, 6)}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>{d.name}</p>
                          <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{d.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-xs mono" style={{ color: 'var(--fg-2)' }}>
                        <Phone size={11} style={{ color: 'var(--fg-3)' }} />
                        {d.phone ?? '—'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link href={`/admin/drivers/${d._id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:text-accent"
                        style={{ color: 'var(--fg-3)' }}
                      >
                        View <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="sm:hidden divide-y divide-border">
            {drivers.map((d) => (
              <Link key={d._id.toString()} href={`/admin/drivers/${d._id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-(--surface-2) transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>{d.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{d.phone ?? d.email}</p>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--fg-3)' }} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
