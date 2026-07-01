const STATUS_CONFIG = {
  pending:           { label: 'Pending',          dot: '#ca8a04', bg: '#fef9c3', text: '#854d0e' },
  assigned:          { label: 'Assigned',          dot: '#2563eb', bg: '#dbeafe', text: '#1e40af' },
  assigned_pickup:   { label: 'Pickup Scheduled',  dot: '#2563eb', bg: '#dbeafe', text: '#1e40af' },
  picked_up:         { label: 'Ready to Deliver',   dot: '#0284c7', bg: '#e0f2fe', text: '#0c4a6e' },
  assigned_delivery: { label: 'On the Way',         dot: '#d97706', bg: '#fef3c7', text: '#92400e' },
  in_transit:        { label: 'In Transit',         dot: '#d97706', bg: '#fef3c7', text: '#92400e' },
  delivered:         { label: 'Delivered',          dot: '#16a34a', bg: '#dcfce7', text: '#14532d' },
  cancelled:         { label: 'Cancelled',          dot: '#dc2626', bg: '#fee2e2', text: '#7f1d1d' },
  failed_pickup:     { label: 'Pickup Failed',       dot: '#dc2626', bg: '#fee2e2', text: '#7f1d1d' },
  failed_dropoff:    { label: 'Delivery Failed',     dot: '#dc2626', bg: '#fee2e2', text: '#7f1d1d' },
}

export default function Badge({ status, label, className = '' }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status ?? '—', dot: '#94a3b8', bg: '#f1f5f9', text: '#475569' }
  const text = label ?? cfg.label

  return (
    <span
      className={['inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold', className].join(' ')}
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {text}
    </span>
  )
}
