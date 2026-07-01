import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/dal'
import { findDriverById, findActiveRoute } from '@/lib/db/drivers'
import { ArrowLeft, Mail, Phone, Clock, MapPin, CheckCircle2, Circle } from 'lucide-react'

export const metadata = { title: 'Driver Detail — Go Fast Delivery' }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-PK', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon size={13} style={{ color: 'var(--fg-3)' }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>{label}</span>
      </div>
      <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</span>
    </div>
  )
}

const cardCls   = 'rounded-xl border border-border bg-white overflow-hidden'
const headerCls = 'px-5 py-3.5 border-b border-border bg-(--surface-2)'

export default async function AdminDriverDetailPage({ params }) {
  const { driverId } = await params
  await requireAdmin()

  const [driver, route] = await Promise.all([findDriverById(driverId), findActiveRoute(driverId)])
  if (!driver) notFound()

  const d = JSON.parse(JSON.stringify(driver))
  const r = route ? JSON.parse(JSON.stringify(route)) : null

  const pendingStops   = r?.optimizedStops?.filter((s) => !s.completedAt) ?? []
  const completedStops = r?.optimizedStops?.filter((s) =>  s.completedAt) ?? []

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3 anim-fade-up">
        <Link href="/admin/drivers" className="p-1.5 rounded-lg transition-colors hover:bg-(--surface-2)" style={{ color: 'var(--fg-3)' }}>
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{d.name}</h1>
      </div>

      {/* Driver info */}
      <div className={cardCls + ' anim-fade-up s1'}>
        <div className={headerCls}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Driver Info</h2>
        </div>
        <div className="px-5">
          <InfoRow icon={Mail}  label="Email"         value={d.email} />
          <InfoRow icon={Phone} label="Phone"         value={d.phone ?? '—'} />
          <InfoRow icon={Clock} label="Last Location" value={formatDate(d.driverProfile?.currentLocation?.updatedAt)} />
        </div>
      </div>

      {/* Active route */}
      <div className={cardCls + ' anim-fade-up s2'}>
        <div className={headerCls + ' flex items-center justify-between'}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Active Route</h2>
          {r && (
            <div className="flex items-center gap-3">
              {r.totalDistanceMeters && (
                <span className="mono text-xs" style={{ color: 'var(--fg-3)' }}>
                  {(r.totalDistanceMeters / 1000).toFixed(1)} km · {Math.round((r.totalDurationSeconds ?? 0) / 60)} min
                </span>
              )}
              <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                {pendingStops.length} pending · {completedStops.length} done
              </span>
            </div>
          )}
        </div>

        {!r ? (
          <div className="py-12 text-center">
            <MapPin size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--fg-3)' }} />
            <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No active route assigned.</p>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {r.optimizedStops?.map((stop, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{
                    background: stop.completedAt ? 'var(--success-bg)' : 'var(--info-bg)',
                    color:      stop.completedAt ? 'var(--success)'    : 'var(--info)',
                  }}>
                  {stop.completedAt ? <CheckCircle2 size={13} /> : <span>{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: stop.completedAt ? 'var(--fg-3)' : 'var(--fg)' }}>
                    {stop.address}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: stop.stopType === 'pickup' ? 'var(--success)' : 'var(--danger)' }}>
                      {stop.stopType === 'pickup' ? 'Pickup' : 'Drop-off'}
                    </span>
                    {stop.completedAt && (
                      <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{formatDate(stop.completedAt)}</span>
                    )}
                  </div>
                </div>
                <Circle size={7} fill={stop.completedAt ? 'var(--success)' : 'var(--info)'}
                  style={{ color: stop.completedAt ? 'var(--success)' : 'var(--info)', marginTop: '6px', flexShrink: 0 }} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
