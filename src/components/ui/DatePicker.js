'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import { CalendarDays, X } from 'lucide-react'
import 'react-day-picker/src/style.css'

/**
 * DatePicker — themed calendar input matching the GoFastDelivery design system.
 *
 * Props:
 *   label       — field label (optional)
 *   value       — ISO date string "YYYY-MM-DD" or ''
 *   onChange(v) — called with "YYYY-MM-DD" string or '' when cleared
 *   placeholder — trigger text when no date selected
 *   error       — error message string
 *   helper      — helper text string
 *   disabled    — boolean
 *   required    — boolean
 *   className   — extra className on root wrapper
 *   clearable   — show clear button when a date is selected (default true)
 */
export default function DatePicker({
  label,
  value = '',
  onChange,
  placeholder = 'Pick a date…',
  error,
  helper,
  disabled = false,
  required = false,
  className = '',
  clearable = true,
}) {
  const [open, setOpen]           = useState(false)
  const [showAbove, setShowAbove] = useState(false)
  const wrapRef = useRef(null)

  const selected = value
    ? (() => { const d = parse(value, 'yyyy-MM-dd', new Date()); return isValid(d) ? d : undefined })()
    : undefined

  const displayText = selected ? format(selected, 'MMM d, yyyy') : ''

  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (!open || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setShowAbove(window.innerHeight - rect.bottom < 360)
  }, [open])

  function handleSelect(day) {
    if (!day) return
    onChange?.(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  function handleClear(e) {
    e.stopPropagation()
    onChange?.('')
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={wrapRef}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide select-none" style={{ color: '#64748b' }}>
          {label}{required && <span style={{ color: 'var(--danger)' }} aria-hidden> *</span>}
        </label>
      )}

      <div className="relative" style={{ zIndex: open ? 200 : 'auto' }}>
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) setOpen(p => !p) }}
          className="w-full flex items-center gap-2 text-left rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-150 cursor-pointer select-none"
          style={{
            background:  disabled ? '#f8f9fc' : '#ffffff',
            borderColor: error ? 'var(--danger)' : open ? 'var(--accent)' : 'var(--border-2)',
            boxShadow:   open ? '0 0 0 3px var(--accent-dim)' : 'none',
            color:       displayText ? 'var(--fg)' : 'var(--fg-3)',
            opacity:     disabled ? 0.55 : 1,
          }}
        >
          <CalendarDays size={14} style={{ color: open ? 'var(--accent)' : 'var(--fg-3)', flexShrink: 0, transition: 'color 0.15s' }} />
          <span className="flex-1 truncate">{displayText || placeholder}</span>
          {clearable && selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={e => e.key === 'Enter' && handleClear(e)}
              className="flex items-center justify-center rounded-full transition-colors"
              style={{ color: 'var(--fg-3)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-3)'}
              aria-label="Clear date"
            >
              <X size={12} />
            </span>
          )}
        </button>

        {/* Calendar popover */}
        {open && (
          <div
            className="dropdown-menu gfd-datepicker-popover"
            style={{
              position:     'absolute',
              zIndex:       200,
              padding:      '4px',
              width:        'auto',
              minWidth:     '0',
              left:         '0',
              top:          showAbove ? 'auto' : '100%',
              bottom:       showAbove ? '100%' : 'auto',
              marginTop:    showAbove ? '0' : '0.5rem',
              marginBottom: showAbove ? '0.5rem' : '0',
            }}
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              showOutsideDays
              defaultMonth={selected}
            />
          </div>
        )}
      </div>

      {error  && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      {helper && !error && <p className="text-xs" style={{ color: 'var(--fg-3)' }}>{helper}</p>}
    </div>
  )
}
