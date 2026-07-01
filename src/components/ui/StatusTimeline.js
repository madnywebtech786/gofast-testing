import Badge from './Badge'
import { CheckCircle2, Circle } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-PK', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function StatusTimeline({ statusHistory = [] }) {
  const sorted = [...statusHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  return (
    <ol className="space-y-0">
      {sorted.map((entry, i) => {
        const isLatest = i === sorted.length - 1
        const isLast   = i === sorted.length - 1
        return (
          <li key={i} className="flex gap-3">
            {/* Icon + connector line */}
            <div className="flex flex-col items-center">
              <div className="shrink-0 mt-0.5">
                {isLatest ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: '#dbeafe', color: '#2563eb' }}>
                    <Circle size={10} fill="currentColor" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      background: entry.status === 'delivered' ? '#dcfce7'
                        : entry.status === 'cancelled' ? '#fee2e2'
                        : '#f1f5f9',
                      color: entry.status === 'delivered' ? '#16a34a'
                        : entry.status === 'cancelled' ? '#dc2626'
                        : '#94a3b8',
                    }}>
                    <CheckCircle2 size={13} />
                  </span>
                )}
              </div>
              {!isLast && (
                <div className="w-px flex-1 my-1" style={{ background: '#e2e8f0', minHeight: '20px' }} />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge status={entry.status} />
                <time className="text-xs" style={{ color: 'var(--fg-3)' }}>{formatDate(entry.timestamp)}</time>
              </div>
              {entry.note && (
                <p className="mt-1 text-xs" style={{ color: 'var(--fg-3)' }}>{entry.note}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
