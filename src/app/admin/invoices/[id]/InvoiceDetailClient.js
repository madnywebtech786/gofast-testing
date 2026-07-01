'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Pencil, Trash2, X,
  FileText, CheckCircle2, AlertTriangle, Send, Building2, User, Loader2,
} from 'lucide-react'
import { triggerPrint } from '../InvoicePDF'
import { useToast } from '@/components/ui/Toast'

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)', icon: FileText },
  sent:    { label: 'Sent',    color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.2)',   icon: Send },
  paid:    { label: 'Paid',    color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   border: 'rgba(22,163,74,0.2)',   icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   border: 'rgba(220,38,38,0.2)',   icon: AlertTriangle },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatMoney(amount, currency = 'CAD') {
  return `${currency} $${Number(amount ?? 0).toFixed(2)}`
}

function calcTotals(invoice) {
  const items    = invoice.items ?? []
  const subtotal = items.reduce((s, it) => s + (it.rate ?? 0) * (it.quantity ?? 0), 0)
  const taxAmt   = Math.round(subtotal * ((invoice.taxRate ?? 5) / 100) * 100) / 100
  const total    = subtotal + taxAmt
  const balance  = total - (invoice.amountPaid ?? 0)
  return { subtotal, taxAmt, total, balance }
}

const CARD = {
  background: '#ffffff',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
}

export default function InvoiceDetailClient({ invoice }) {
  const router = useRouter()
  const toast  = useToast()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [error, setError]           = useState('')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)

  async function handleSend() {
    if (sending) return
    setSending(true)
    setSent(false)
    try {
      const res = await fetch(`/api/invoices/${invoice._id}/send`, { method: 'POST' })
      const b   = await res.json()
      if (!res.ok) {
        toast.error('Failed to send invoice', b.error || 'Please try again.')
        return
      }
      setSent(true)
      toast.success('Invoice sent!', `Invoice emailed to ${b.sentTo}`)
      router.refresh()
      setTimeout(() => setSent(false), 4000)
    } catch {
      toast.error('Network error', 'Could not reach the server. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const { subtotal, taxAmt, total, balance } = calcTotals(invoice)
  const currency = invoice.currency ?? 'CAD'

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${invoice._id}`, { method: 'DELETE' })
      if (!res.ok) { const b = await res.json(); setError(b.error || 'Delete failed'); return }
      router.push('/admin/invoices')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Back link ── */}
      <div className="anim-fade-up">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-3)'}
        >
          <ArrowLeft size={13} /> Back to Invoices
        </Link>
      </div>

      {/* ── Hero card — invoice header ── */}
      <div className="anim-fade-up" style={CARD}>
        {/* Green top bar */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))', borderRadius: '14px 14px 0 0' }} />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                Invoice{' '}
                <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</span>
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
              {invoice.clientName} · {formatDate(invoice.invoiceDate)}
            </p>
          </div>

          {/* Balance callout */}
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--fg-3)' }}>Balance Due</p>
            <p className="text-3xl font-black" style={{ color: 'var(--fg)', letterSpacing: '-0.5px' }}>
              {formatMoney(balance, currency)}
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap px-6 pb-5">
          <button
            onClick={() => triggerPrint(invoice)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
            style={{ color: 'var(--fg-2)', background: '#fff', borderColor: 'var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--fg-2)' }}
          >
            <Download size={14} /> Download PDF
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-60"
            style={{
              color: sent ? '#16a34a' : 'var(--fg-2)',
              background: '#fff',
              borderColor: sent ? '#16a34a' : 'var(--border)',
            }}
            onMouseEnter={e => { if (!sending && !sent) { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb' } }}
            onMouseLeave={e => { if (!sent) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-2)' } }}
          >
            {sending
              ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
              : sent
              ? <><CheckCircle2 size={14} /> Sent!</>
              : <><Send size={14} /> Send Invoice</>}
          </button>
          <Link
            href={`/admin/invoices/${invoice._id}/edit`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Pencil size={14} /> Edit Invoice
          </Link>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ml-auto"
            style={{ color: 'white', background: 'var(--danger)', borderColor: 'var(--danger)' }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* ── From + Bill To + Meta ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 anim-fade-up s1">

        {/* From */}
        <div style={CARD} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <Building2 size={13} style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>From</p>
          </div>
          <p className="font-bold text-sm leading-snug" style={{ color: 'var(--fg)' }}>{invoice.companyName || 'GoFastDelivery'}</p>
          {invoice.companyAddress && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--fg-2)' }}>{invoice.companyAddress}</p>}
          {invoice.companyCity    && <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-2)' }}>{invoice.companyCity}</p>}
          {invoice.companyPhone   && <p className="text-xs mt-2 font-medium" style={{ color: 'var(--fg-2)' }}>{invoice.companyPhone}</p>}
          {invoice.companyEmail   && <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{invoice.companyEmail}</p>}
        </div>

        {/* Bill To */}
        <div style={CARD} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)' }}>
              <User size={13} style={{ color: '#2563eb' }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Bill To</p>
          </div>
          <p className="font-bold text-sm leading-snug" style={{ color: 'var(--fg)' }}>{invoice.clientName}</p>
          {invoice.clientAddress && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--fg-2)' }}>{invoice.clientAddress}</p>}
          {invoice.clientCity    && <p className="text-xs leading-relaxed" style={{ color: 'var(--fg-2)' }}>{invoice.clientCity}</p>}
          {invoice.clientPhone   && <p className="text-xs mt-2 font-medium" style={{ color: 'var(--fg-2)' }}>{invoice.clientPhone}</p>}
          {invoice.clientEmail   && <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{invoice.clientEmail}</p>}
        </div>

        {/* Invoice details */}
        <div style={CARD} className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--fg-3)' }}>Details</p>
          <div className="space-y-2.5">
            {[
              ['Invoice Date', formatDate(invoice.invoiceDate)],
              ['Due Date', invoice.dueDate ? formatDate(invoice.dueDate) : (invoice.paymentTerms ?? 'On Receipt')],
              ['Currency', invoice.currency ?? 'CAD'],
              ['Payment Terms', invoice.paymentTerms ?? 'On Receipt'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-baseline gap-2">
                <span className="text-xs shrink-0" style={{ color: 'var(--fg-3)' }}>{label}</span>
                <span className="text-xs font-semibold text-right" style={{ color: 'var(--fg)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Line items ── */}
      <div className="anim-fade-up s2" style={CARD}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Line Items</p>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--fg-3)' }}>
            {invoice.items?.length ?? 0} item{(invoice.items?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Header row */}
        <div className="hidden sm:grid border-b" style={{ gridTemplateColumns: '1fr 90px 60px 100px', borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          {['Description', 'Rate', 'Qty', 'Amount'].map((h, i) => (
            <div key={h} className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wide ${i > 0 ? 'text-right' : ''}`}
              style={{ color: 'var(--fg-3)' }}>
              {h}
            </div>
          ))}
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--accent)' }}>
          {(invoice.items ?? []).map((item, i) => {
            const amt = (item.rate ?? 0) * (item.quantity ?? 0)
            return (
              <div key={i} className="px-5 py-4">
                {/* Desktop row */}
                <div className="hidden sm:grid items-start gap-0" style={{ gridTemplateColumns: '1fr 90px 60px 100px' }}>
                  <div className="pr-4">
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.description}</p>
                    {item.serviceDate && (
                      <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent)' }}>{item.serviceDate}</p>
                    )}
                    {item.details && (
                      <pre className="text-xs mt-2 whitespace-pre-wrap leading-relaxed p-3 rounded-lg"
                        style={{ color: 'var(--fg-2)', fontFamily: 'inherit', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {item.details}
                      </pre>
                    )}
                  </div>
                  <div className="text-sm text-right pt-0.5" style={{ color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>
                    ${Number(item.rate ?? 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-right pt-0.5" style={{ color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>
                    {item.quantity}
                  </div>
                  <div className="text-sm font-bold text-right pt-0.5" style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                    ${amt.toFixed(2)}
                  </div>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{item.description}</p>
                      {item.serviceDate && <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--accent)' }}>{item.serviceDate}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs" style={{ color: 'var(--fg-3)' }}>${item.rate} × {item.quantity}</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--fg)' }}>${amt.toFixed(2)}</p>
                    </div>
                  </div>
                  {item.details && (
                    <pre className="text-xs mt-2 whitespace-pre-wrap leading-relaxed p-3 rounded-lg"
                      style={{ color: 'var(--fg-2)', fontFamily: 'inherit', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      {item.details}
                    </pre>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={{ ...CARD, borderLeft: '3px solid var(--accent)' }} className="p-5 anim-fade-up s3">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-3)' }}>Notes</p>
          <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: 'var(--fg-2)' }}>{invoice.notes}</p>
        </div>
      )}

      {/* ── Totals ── */}
      <div className="flex justify-end anim-fade-up s4">
        <div className="w-full sm:w-96" style={CARD}>

          {/* Row items */}
          <div className="px-6 pt-5 pb-4 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--fg-3)' }}>Subtotal</span>
              <span className="font-semibold" style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--fg-3)' }}>Tax ({invoice.taxRate ?? 5}% GST)</span>
              <span className="font-semibold" style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                ${taxAmt.toFixed(2)}
              </span>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)' }} />

            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold" style={{ color: 'var(--fg)' }}>Total</span>
              <span className="font-bold" style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(total, currency)}
              </span>
            </div>

            {invoice.amountPaid > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: '#16a34a' }}>Amount Paid</span>
                <span className="font-semibold" style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                  −${Number(invoice.amountPaid).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Balance Due footer */}
          <div className="mx-4 mb-4 rounded-xl px-5 py-4 flex justify-between items-center"
            style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Balance Due
              </p>
              <p className="text-2xl font-black leading-none" style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(balance, currency)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <CheckCircle2 size={22} style={{ color: 'rgba(255,255,255,0.9)' }} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Delete confirm modal ── */}
      {showDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={() => !deleting && setShowDelete(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-bold" style={{ color: 'var(--fg)' }}>Delete Invoice?</h2>
              <button onClick={() => !deleting && setShowDelete(false)} className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--fg-3)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              {error && (
                <p className="mb-4 text-sm font-medium px-3 py-2 rounded-lg"
                  style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</p>
              )}
              <p className="text-sm mb-6" style={{ color: 'var(--fg-2)' }}>
                This will permanently delete invoice{' '}
                <strong style={{ color: 'var(--fg)' }}>{invoice.invoiceNumber}</strong> for{' '}
                <strong style={{ color: 'var(--fg)' }}>{invoice.clientName}</strong>.
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDelete(false)} disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-border disabled:opacity-50"
                  style={{ color: 'var(--fg-2)' }}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                  style={{ background: 'var(--danger)', color: 'white' }}>
                  {deleting ? 'Deleting…' : 'Delete Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
