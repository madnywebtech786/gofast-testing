'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle2 size={16} />,
  error:   <AlertCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  info:    <Info size={16} />,
}

const STYLES = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', text: '#14532d' },
  error:   { bg: '#fff1f2', border: '#fca5a5', icon: '#dc2626', text: '#7f1d1d' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706', text: '#78350f' },
  info:    { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', text: '#1e3a8a' },
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    // Trigger enter animation
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (toast.duration === Infinity) return
    timerRef.current = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => onRemove(toast.id), 300)
    }, toast.duration ?? 4000)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, toast.duration, onRemove])

  function handleClose() {
    clearTimeout(timerRef.current)
    setLeaving(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const s = STYLES[toast.type] ?? STYLES.info

  return (
    <div
      role="alert"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        minWidth: 280,
        maxWidth: 380,
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        pointerEvents: 'all',
      }}
    >
      <span style={{ color: s.icon, marginTop: 1, flexShrink: 0 }}>
        {ICONS[toast.type] ?? ICONS.info}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: s.text, marginBottom: toast.message ? 2 : 0 }}>
            {toast.title}
          </p>
        )}
        {toast.message && (
          <p style={{ fontSize: '0.8125rem', color: s.text, opacity: 0.85, lineHeight: 1.4 }}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={handleClose}
        style={{ color: s.icon, opacity: 0.6, flexShrink: 0, marginTop: 1, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }])
    return id
  }, [])

  return (
    <ToastContext.Provider value={add}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const add = useContext(ToastContext)
  if (!add) throw new Error('useToast must be used inside ToastProvider')

  return {
    success: (title, message, opts) => add({ type: 'success', title, message, ...opts }),
    error:   (title, message, opts) => add({ type: 'error',   title, message, ...opts }),
    warning: (title, message, opts) => add({ type: 'warning', title, message, ...opts }),
    info:    (title, message, opts) => add({ type: 'info',    title, message, ...opts }),
  }
}
