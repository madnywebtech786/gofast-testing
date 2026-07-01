export default function Card({ children, className = '', padding = true, hover = false }) {
  return (
    <div
      className={[
        'rounded-xl border border-border bg-white',
        padding ? 'p-5' : '',
        hover ? 'transition-all duration-200 hover:border-(--border-2) hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
