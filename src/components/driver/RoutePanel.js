'use client'

import Badge from '@/components/ui/Badge'

export default function RoutePanel({ stops = [], activeStopIndex = 0 }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide px-1">Route Stops</h3>
      <ol className="space-y-2">
        {stops.map((stop, i) => {
          const isDone = i < activeStopIndex
          const isCurrent = i === activeStopIndex
          return (
            <li
              key={i}
              className={[
                'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                isCurrent
                  ? 'border-primary bg-primary/5'
                  : isDone
                  ? 'border-border bg-surface/50 opacity-60'
                  : 'border-border bg-white dark:bg-surface',
              ].join(' ')}
            >
              <span
                className={[
                  'flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold',
                  isDone ? 'bg-success' : isCurrent ? 'bg-primary' : 'bg-border text-muted',
                ].join(' ')}
              >
                {isDone ? '✓' : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge status={stop.stopType === 'pickup' ? 'assigned' : 'in_transit'}
                    label={stop.stopType === 'pickup' ? 'Pickup' : 'Drop-off'} />
                  {isCurrent && (
                    <span className="text-xs text-primary font-medium">← Current</span>
                  )}
                </div>
                <p className="text-xs text-foreground mt-1 line-clamp-2">{stop.address}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
