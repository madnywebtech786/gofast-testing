'use client'

import { useId } from 'react'

export default function Input({
  label,
  error,
  helper,
  icon,
  className = '',
  size = 'md',
  required,
  ...props
}) {
  const id = useId()

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3.5 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
  }

  const base = [
    'w-full rounded-xl border transition-all duration-150',
    'bg-white text-[var(--fg)] placeholder-[var(--fg-3)]',
    error
      ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-1 focus:ring-[var(--danger)]'
      : 'border-[var(--border-2)] hover:border-[#94a3b8] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-dim)]',
    'focus:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface-2)]',
    icon ? (size === 'sm' ? 'pl-8' : 'pl-9') : '',
    sizes[size] ?? sizes.md,
    className,
  ].join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wide select-none"
          style={{ color: '#64748b' }}
        >
          {label}{required && <span style={{ color: 'var(--danger)' }} aria-hidden> *</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--fg-3)' }}
          >
            {icon}
          </span>
        )}
        <input id={id} required={required} className={base} {...props} />
      </div>
      {error  && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      {helper && !error && <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{helper}</p>}
    </div>
  )
}
