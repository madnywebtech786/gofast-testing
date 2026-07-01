'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/**
 * Custom styled dropdown — renders a button trigger + animated floating menu.
 *
 * Props:
 *   label        — field label (optional)
 *   placeholder  — trigger text when no value selected
 *   value        — controlled value (must match an option's value)
 *   onChange(v)  — called with selected value string
 *   options      — [{ value, label, meta? }]  meta = optional small sub-text
 *   error        — error message string
 *   helper       — helper text string
 *   disabled     — boolean
 *   className    — extra className on the root wrapper
 *   required     — boolean (for form validation)
 *
 * Usage:
 *   <Select
 *     label="Weight Slab"
 *     value={form.slab}
 *     onChange={(v) => setForm(f => ({ ...f, slab: v }))}
 *     options={[{ value: 'up_to_10', label: 'Up to 10 kg' }, ...]}
 *   />
 */
export default function Select({
  label,
  placeholder = 'Select…',
  value = '',
  onChange,
  options = [],
  error,
  helper,
  disabled = false,
  className = '',
  required = false,
}) {
  const [open, setOpen]           = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [showAbove, setShowAbove] = useState(false)
  const wrapRef  = useRef(null)
  const menuRef  = useRef(null)
  const triggerId = useId()

  const selected = options.find((o) => o.value === value) ?? null

  // Close on outside click
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Keyboard navigation
  function onKeyDown(e) {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); setOpen(true); setHighlighted(0)
      }
      return
    }
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (highlighted >= 0 && options[highlighted]) {
        pick(options[highlighted].value)
      }
    }
  }

  function pick(v) {
    onChange?.(v)
    setOpen(false)
    setHighlighted(-1)
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlighted < 0 || !menuRef.current) return
    const item = menuRef.current.querySelectorAll('[role="option"]')[highlighted]
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted, open])

  // Check if there's enough space below, if not show above
  useEffect(() => {
    if (!open || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const menuHeight = 240 + 20 // max-height + padding
    setShowAbove(spaceBelow < menuHeight)
  }, [open])

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={wrapRef}>
      {label && (
        <label
          htmlFor={triggerId}
          className="text-xs font-semibold uppercase tracking-wide select-none"
          style={{ color: '#64748b' }}
        >
          {label}{required && <span style={{ color: 'var(--danger)' }} aria-hidden> *</span>}
        </label>
      )}

      {/* Hidden native select for form submission / required validation */}
      <select
        aria-hidden="true"
        tabIndex={-1}
        required={required}
        value={value}
        onChange={() => {}}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      >
        <option value="" />
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div className="relative" style={{ zIndex: open ? 200 : 'auto' }}>
        {/* Trigger button */}
        <button
          id={triggerId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onKeyDown={onKeyDown}
          onClick={() => { if (!disabled) { setOpen((p) => !p); setHighlighted(0) } }}
          className="w-full flex items-center justify-between gap-2 text-left rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-150 cursor-pointer select-none"
          style={{
            background: disabled ? '#f8f9fc' : '#ffffff',
            borderColor: error ? 'var(--danger)' : open ? 'var(--accent)' : 'var(--border-2)',
            boxShadow: open ? '0 0 0 3px var(--accent-dim)' : 'none',
            color: selected ? 'var(--fg)' : 'var(--fg-3)',
            opacity: disabled ? 0.55 : 1,
          }}
        >
          <span className="truncate flex-1">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={15}
            style={{
              color: 'var(--fg-3)',
              flexShrink: 0,
              transition: 'transform 0.2s',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Dropdown menu */}
        {open && (
          <div
            ref={menuRef}
            role="listbox"
            className="dropdown-menu"
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              position: 'absolute',
              zIndex: 200,
              bottom: showAbove ? '100%' : 'auto',
              top: showAbove ? 'auto' : '100%',
              left: 0,
              right: 0,
              marginTop: showAbove ? '0' : '0.5rem',
              marginBottom: showAbove ? '0.5rem' : '0',
            }}
          >
            {options.length === 0 ? (
              <div className="px-3 py-3 text-sm" style={{ color: 'var(--fg-3)' }}>No options</div>
            ) : options.map((opt, i) => {
              const isSelected = opt.value === value
              const isHighlighted = highlighted === i
              return (
                <button
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  data-selected={isSelected || undefined}
                  data-highlighted={isHighlighted || undefined}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseLeave={() => setHighlighted(-1)}
                  onClick={() => pick(opt.value)}
                  className="dropdown-item"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.meta && (
                      <span className="block text-xs truncate mt-0.5" style={{ color: isSelected ? 'var(--accent)' : 'var(--fg-3)' }}>
                        {opt.meta}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error  && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      {helper && !error && <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{helper}</p>}
    </div>
  )
}
