import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/dal'
import { findBookingById } from '@/lib/db/bookings'
import Badge from '@/components/ui/Badge'
import StatusTimeline from '@/components/ui/StatusTimeline'
import AssignDriverForm from '@/components/booking/AssignDriverForm'
import { ArrowLeft, MapPin, User, Phone, CheckCircle2, UserCheck } from 'lucide-react'

export const metadata = { title: 'Booking Detail — Go Fast Delivery Admin' }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-PK', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(s) {
  if (!s) return null
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</span>
    </div>
  )
}

const cardCls   = 'rounded-xl border border-border bg-white overflow-hidden'
const headerCls = 'px-5 py-3.5 border-b border-border bg-(--surface-2)'

export default async function AdminBookingDetailPage({ params }) {
  const { bookingId } = await params
  await requireAdmin()

  const booking = await findBookingById(bookingId)
  if (!booking) notFound()

  const b = JSON.parse(JSON.stringify(booking))
  const canAssign = b.status === 'pending' || b.status === 'picked_up'

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3 anim-fade-up">
        <Link href="/admin/bookings" className="p-1.5 rounded-lg transition-colors hover:bg-(--surface-2)" style={{ color: 'var(--fg-3)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Booking Detail</h1>
          <Badge status={b.status} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* LEFT */}
        <div className="space-y-5">
          {/* Stops */}
          <div className={cardCls + ' anim-fade-up s1'}>
            <div className={headerCls}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Stops</h2>
            </div>
            <ol className="divide-y divide-border">
              {b.stops?.map((stop, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{
                      background: stop.completedAt ? 'var(--success-bg)' : stop.type === 'pickup' ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color:      stop.completedAt ? 'var(--success)'    : stop.type === 'pickup' ? 'var(--success)'    : 'var(--danger)',
                    }}>
                    {stop.completedAt ? <CheckCircle2 size={13} /> : <span>{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: stop.type === 'pickup' ? 'var(--success)' : 'var(--danger)' }}>
                        {stop.type === 'pickup' ? 'Pickup' : 'Drop-off'}
                      </span>
                      {stop.completedAt && (
                        <span className="text-xs" style={{ color: 'var(--success)' }}>{formatDate(stop.completedAt)}</span>
                      )}
                    </div>
                    <p className="text-sm wrap-break-word" style={{ color: stop.completedAt ? 'var(--fg-3)' : 'var(--fg)' }}>
                      {stop.address}
                    </p>
                    {(stop.contactName || stop.contactPhone) && (
                      <div className="flex items-center gap-3 mt-1">
                        {stop.contactName && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-3)' }}>
                            <User size={10} />{stop.contactName}
                          </span>
                        )}
                        {stop.contactPhone && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-3)' }}>
                            <Phone size={10} />{stop.contactPhone}
                          </span>
                        )}
                      </div>
                    )}
                    {stop.notes && <p className="text-xs italic mt-0.5" style={{ color: 'var(--fg-3)' }}>{stop.notes}</p>}
                  </div>
                  <MapPin size={12} className="shrink-0 mt-1" style={{ color: stop.type === 'pickup' ? 'var(--success)' : 'var(--danger)', opacity: 0.5 }} />
                </li>
              ))}
            </ol>
          </div>

          {/* Metadata */}
          <div className={cardCls + ' anim-fade-up s2'}>
            <div className={headerCls}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Details</h2>
            </div>
            <div className="px-5 py-1">
              <MetaRow label="Created" value={formatDate(b.createdAt)} />
              {b.estimatedDurationSeconds && <MetaRow label="Est. Duration" value={formatDuration(b.estimatedDurationSeconds)} />}
              {b.estimatedDistanceMeters  && <MetaRow label="Est. Distance" value={`${(b.estimatedDistanceMeters / 1000).toFixed(1)} km`} />}
              <MetaRow label="Tracking Token" value={<span className="mono text-xs" style={{ color: 'var(--fg-2)' }}>{b.trackingToken}</span>} />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          <div className={cardCls + ' anim-fade-up s3'}>
            <div className={headerCls + ' flex items-center gap-2'}>
              <UserCheck size={13} style={{ color: 'var(--fg-3)' }} />
              <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
                {canAssign ? (b.status === 'picked_up' ? 'Assign Delivery Driver' : 'Assign Driver') : 'Driver Assignment'}
              </h2>
            </div>
            <div className="p-5">
              {canAssign
                ? <AssignDriverForm bookingId={b._id} />
                : <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
                    {b.assignedDriverId ? `Assigned on ${formatDate(b.assignedAt)}` : 'No driver assigned'}
                  </p>
              }
            </div>
          </div>

          <div className={cardCls + ' anim-fade-up s4'}>
            <div className={headerCls}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Status History</h2>
            </div>
            <div className="px-5 py-4">
              <StatusTimeline statusHistory={b.statusHistory} currentStatus={b.status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
