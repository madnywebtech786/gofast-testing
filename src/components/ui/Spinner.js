export default function Spinner({ size = 'md', className = '' }) {
  const sz = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' }
  return (
    <svg
      className={[sz[size] ?? sz.md, className].join(' ')}
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path style={{ opacity: 0.9 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
