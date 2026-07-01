'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) dialog.showModal()
    else dialog.close()
  }, [open])

  function handleClick(e) {
    if (e.target === dialogRef.current) onClose?.()
  }

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      onCancel={onClose}
      className={[
        'w-full rounded-2xl p-0 shadow-xl',
        'bg-white border border-border text-foreground',
        'backdrop:bg-black/40 backdrop:backdrop-blur-sm',
        'open:flex open:flex-col',
        widths[size] ?? widths.md,
      ].join(' ')}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{title}</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors hover:bg-(--surface-2)"
          style={{ color: 'var(--fg-3)' }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  )
}
