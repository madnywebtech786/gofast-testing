'use client'

import Spinner from './Spinner'

const base = [
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
  'transition-all duration-150 cursor-pointer select-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:opacity-40 disabled:cursor-not-allowed',
  'active:scale-[0.97]',
].join(' ')

const VARIANTS = {
  primary: [
    'bg-[var(--accent)] text-white shadow-sm',
    'hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_16px_var(--accent-glow)]',
    'focus-visible:ring-[var(--accent)]',
  ].join(' '),
  secondary: [
    'bg-white text-[var(--fg-2)] border border-[var(--border-2)]',
    'hover:bg-[var(--surface-2)] hover:text-[var(--fg)] hover:border-[#94a3b8]',
    'focus-visible:ring-[var(--border-2)]',
    'shadow-sm',
  ].join(' '),
  accent: [
    'bg-[var(--accent)] text-white font-bold shadow-sm',
    'hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_18px_var(--accent-glow)]',
    'focus-visible:ring-[var(--accent)]',
  ].join(' '),
  danger: [
    'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]',
    'hover:bg-[var(--danger)] hover:text-white hover:border-transparent',
    'focus-visible:ring-[var(--danger)]',
  ].join(' '),
  success: [
    'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]',
    'hover:bg-[var(--success)] hover:text-white hover:border-transparent',
    'focus-visible:ring-[var(--success)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--fg-2)]',
    'hover:bg-[var(--surface-2)] hover:text-[var(--fg)]',
    'focus-visible:ring-[var(--border-2)]',
  ].join(' '),
}

const SIZES = {
  xs: 'text-xs px-2.5 py-1.5 h-7',
  sm: 'text-sm px-3.5 py-2 h-8',
  md: 'text-sm px-4 py-2.5 h-10',
  lg: 'text-base px-6 py-3 h-12',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[base, VARIANTS[variant] ?? VARIANTS.primary, SIZES[size] ?? SIZES.md, className].join(' ')}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  )
}
