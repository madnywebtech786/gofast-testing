import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { MapPin, ArrowRight, Clock, Package } from 'lucide-react'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-PK', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function BookingCard({ booking, href }) {
  const pickupStop  = booking.stops?.find((s) => s.type === 'pickup')
  const dropoffStop = booking.stops?.filter((s) => s.type === 'dropoff').at(-1)
  const extraStops  = Math.max(0, (booking.stops?.length ?? 0) - 2)

  return (
    <Link href={href ?? `/customer/my-bookings/${booking._id}`} className="group block">
      <div
        className="rounded-2xl border border-border bg-white p-4 transition-all duration-200 hover:shadow-md hover:border-(--border-2)"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Accent left strip based on status */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{
            background:
              booking.status === 'delivered'        ? 'var(--success)' :
              booking.status === 'cancelled'        ? 'var(--danger)' :
              booking.status === 'pending'          ? 'var(--warning)' :
              'var(--accent)',
          }}
        />

        <div className="flex items-start justify-between gap-3 pl-2">
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Status + date */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge status={booking.status} />
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-3)' }}>
                <Clock size={10} />{formatDate(booking.createdAt)}
              </span>
              {booking.estimatedPrice && (
                <span className="ml-auto text-xs font-bold mono" style={{ color: 'var(--accent)' }}>
                  ${booking.estimatedPrice}
                </span>
              )}
            </div>

            {/* Route */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(22,163,74,0.12)' }}>
                  <MapPin size={9} style={{ color: 'var(--success)' }} />
                </div>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>
                  {pickupStop?.address ?? 'Pickup location'}
                </p>
              </div>
              {/* Connector */}
              <div className="ml-2 pl-1.5 border-l-2 border-dashed border-border h-3" />
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(220,38,38,0.12)' }}>
                  <MapPin size={9} style={{ color: 'var(--danger)' }} />
                </div>
                <p className="text-sm truncate" style={{ color: 'var(--fg-2)' }}>
                  {dropoffStop?.address ?? 'Drop-off location'}
                </p>
              </div>
              {extraStops > 0 && (
                <p className="text-xs pl-6" style={{ color: 'var(--fg-3)' }}>
                  +{extraStops} more stop{extraStops > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Package type if available */}
            {booking.packageDetails?.kind && (
              <div className="flex items-center gap-1.5">
                <Package size={10} style={{ color: 'var(--fg-3)' }} />
                <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{booking.packageDetails.kind}</span>
              </div>
            )}
          </div>

          <ArrowRight
            size={15}
            className="shrink-0 mt-1 transition-all duration-150 group-hover:translate-x-0.5"
            style={{ color: 'var(--fg-3)' }}
          />
        </div>
      </div>
    </Link>
  )
}
