'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'

const EMPTY_ITEM = { description: '', serviceDate: '', rate: '', quantity: '', details: '' }

const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
]
const STATUS_OPTIONS = [
  { value: 'draft',   label: 'Draft' },
  { value: 'sent',    label: 'Sent' },
  { value: 'paid',    label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]
const PAYMENT_TERMS = [
  { value: 'On Receipt', label: 'On Receipt' },
  { value: 'Net 15',     label: 'Net 15' },
  { value: 'Net 30',     label: 'Net 30' },
  { value: 'Net 60',     label: 'Net 60' },
]

const inputCls = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all'
const labelCls = 'block text-xs font-semibold mb-1'

function Field({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className={labelCls} style={{ color: 'var(--fg-2)' }}>
        {label}{required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4 pb-2 border-b border-border">
      <h3 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{subtitle}</p>}
    </div>
  )
}

export default function InvoiceForm({ initial = {}, onSubmit, onCancel, submitting, disableInvoiceNumber = false }) {
  const [form, setForm] = useState({
    companyName:    initial.companyName    ?? 'GoFastDelivery',
    companyAddress: initial.companyAddress ?? '23-9510 Bonaventure Drive SE',
    companyCity:    initial.companyCity    ?? 'Calgary, AB T2J 0E5',
    companyPhone:   initial.companyPhone   ?? '4038905621',
    companyEmail:   initial.companyEmail   ?? 'gofastdelivery2024@gmail.com',
    invoiceNumber:  initial.invoiceNumber  ?? '',
    invoiceDate:    initial.invoiceDate    ? new Date(initial.invoiceDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    dueDate:        initial.dueDate        ? new Date(initial.dueDate).toISOString().slice(0,10)     : '',
    paymentTerms:   initial.paymentTerms   ?? 'On Receipt',
    currency:       initial.currency       ?? 'CAD',
    status:         initial.status         ?? 'draft',
    clientName:     initial.clientName     ?? '',
    clientAddress:  initial.clientAddress  ?? '',
    clientCity:     initial.clientCity     ?? '',
    clientPhone:    initial.clientPhone    ?? '',
    clientEmail:    initial.clientEmail    ?? '',
    items: initial.items?.length
      ? initial.items.map(it => ({
          description: it.description ?? '',
          serviceDate: it.serviceDate ?? '',
          rate:        it.rate        ?? '',
          quantity:    it.quantity    ?? '',
          details:     it.details     ?? '',
        }))
      : [{ ...EMPTY_ITEM }],
    taxRate:    initial.taxRate    ?? 5,
    amountPaid: initial.amountPaid ?? 0,
    notes: initial.notes ?? '',
  })

  const [expandedItems, setExpandedItems] = useState(new Set([0]))

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function setItem(index, key, val) {
    setForm(prev => {
      const items = [...prev.items]
      items[index] = { ...items[index], [key]: val }
      return { ...prev, items }
    })
  }

  function addItem() {
    setForm(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }))
    setExpandedItems(prev => new Set([...prev, form.items.length]))
  }

  function removeItem(index) {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
    setExpandedItems(prev => {
      const n = new Set()
      for (const i of prev) { if (i !== index) n.add(i > index ? i - 1 : i) }
      return n
    })
  }

  function toggleItem(index) {
    setExpandedItems(prev => {
      const n = new Set(prev)
      n.has(index) ? n.delete(index) : n.add(index)
      return n
    })
  }

  const subtotal  = form.items.reduce((s, it) => s + (parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0), 0)
  const taxAmt    = Math.round(subtotal * ((parseFloat(form.taxRate) || 0) / 100) * 100) / 100
  const total     = subtotal + taxAmt
  const balance   = total - (parseFloat(form.amountPaid) || 0)

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...form,
      taxRate:    parseFloat(form.taxRate)    || 0,
      amountPaid: parseFloat(form.amountPaid) || 0,
      items: form.items.map(it => ({
        ...it,
        rate:     parseFloat(it.rate)     || 0,
        quantity: parseFloat(it.quantity) || 0,
      })),
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── 1. Company Info ── */}
      <div>
        <SectionHeader title="Company Info" subtitle="Your business details shown on the invoice" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Company Name" required className="sm:col-span-2">
            <input className={inputCls} value={form.companyName} onChange={e => set('companyName', e.target.value)} required />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input className={inputCls} value={form.companyAddress} onChange={e => set('companyAddress', e.target.value)} placeholder="Street address" />
          </Field>
          <Field label="City, Province, Postal">
            <input className={inputCls} value={form.companyCity} onChange={e => set('companyCity', e.target.value)} placeholder="Calgary, AB T2J 0E5" />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)} />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <input className={inputCls} type="email" value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* ── 2. Invoice Details ── */}
      <div>
        <SectionHeader title="Invoice Details" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Invoice Number" required>
            <input
              className={inputCls}
              value={form.invoiceNumber}
              onChange={disableInvoiceNumber ? undefined : e => set('invoiceNumber', e.target.value)}
              placeholder="INV0001"
              required
              readOnly={disableInvoiceNumber}
              style={disableInvoiceNumber ? { background: 'var(--surface-2)', color: 'var(--fg-3)', cursor: 'not-allowed' } : undefined}
            />
          </Field>
          <DatePicker label="Invoice Date" value={form.invoiceDate} onChange={v => set('invoiceDate', v)} />
          <DatePicker label="Due Date" value={form.dueDate} onChange={v => set('dueDate', v)} />
          <Select label="Payment Terms" value={form.paymentTerms} onChange={v => set('paymentTerms', v)} options={PAYMENT_TERMS} />
          <Select label="Currency" value={form.currency} onChange={v => set('currency', v)} options={CURRENCY_OPTIONS} />
          <Select label="Status" value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
        </div>
      </div>

      {/* ── 3. Bill To ── */}
      <div>
        <SectionHeader title="Bill To" subtitle="Client / company receiving the invoice" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Client / Company Name" required className="sm:col-span-2">
            <input className={inputCls} value={form.clientName} onChange={e => set('clientName', e.target.value)} required />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input className={inputCls} value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)} />
          </Field>
          <Field label="City, Province, Postal">
            <input className={inputCls} value={form.clientCity} onChange={e => set('clientCity', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} />
          </Field>
          <Field label="Email" required className="sm:col-span-2">
            <input className={inputCls} type="email" required value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} placeholder="client@example.com" />
          </Field>
        </div>
      </div>

      {/* ── 4. Invoice Items ── */}
      <div>
        <SectionHeader title="Invoice Items" subtitle="Add one or more line items. Expand each to add daily delivery details." />
        <div className="space-y-2">
          {form.items.map((item, i) => {
            const expanded = expandedItems.has(i)
            const amt = (parseFloat(item.rate) || 0) * (parseFloat(item.quantity) || 0)
            return (
              <div key={i} className="border border-border rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                {/* Item header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button type="button" onClick={() => toggleItem(i)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
                    style={{ color: 'var(--fg-3)', background: 'var(--surface)' }}>
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <span className="text-xs font-bold w-5 shrink-0 text-center" style={{ color: 'var(--fg-3)' }}>
                    {i + 1}
                  </span>
                  <input
                    className="flex-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Description"
                    value={item.description}
                    onChange={e => setItem(i, 'description', e.target.value)}
                    required
                  />
                  <input
                    className="w-20 rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={e => setItem(i, 'rate', e.target.value)}
                  />
                  <input
                    className="w-16 rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Qty"
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={e => setItem(i, 'quantity', e.target.value)}
                  />
                  <span className="w-24 text-sm font-bold text-right shrink-0" style={{ color: 'var(--fg)' }}>
                    ${amt.toFixed(2)}
                  </span>
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="shrink-0 p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--fg-3)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-3)'}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Expanded: service date + details textarea */}
                {expanded && (
                  <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border">
                    <Field label="Service Date / Week Range" className="mt-3">
                      <input className={inputCls} placeholder="e.g. Week of May 19–23, 2026" value={item.serviceDate} onChange={e => setItem(i, 'serviceDate', e.target.value)} />
                    </Field>
                    <Field label="Daily Delivery Details (optional)" >
                      <textarea
                        className={inputCls}
                        rows={6}
                        placeholder={"Tuesday, May 19, 2026\n1) Name, Address\n2) Name, Address\n\nWednesday, May 20, 2026\n..."}
                        value={item.details}
                        onChange={e => setItem(i, 'details', e.target.value)}
                        style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addItem}
          className="mt-3 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-dashed transition-all"
          style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)' }}>
          <Plus size={14} /> Add Line Item
        </button>
      </div>

      {/* ── 5. Tax & Totals ── */}
      <div>
        <SectionHeader title="Tax & Totals" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Field label="Tax Rate (%)">
            <input className={inputCls} type="number" min="0" max="100" step="0.1" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} />
          </Field>
          <Field label="Amount Paid">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} />
          </Field>
        </div>

        {/* Live totals summary */}
        <div className="rounded-xl border border-border bg-white p-4 max-w-xs ml-auto">
          <div className="space-y-2 text-sm">
            {[
              ['Subtotal',                  `$${subtotal.toFixed(2)}`],
              [`Tax (${form.taxRate}% GST)`, `$${taxAmt.toFixed(2)}`],
              ['Total',                      `${form.currency} $${total.toFixed(2)}`],
              ...(parseFloat(form.amountPaid) > 0 ? [['Amount Paid', `−$${Number(form.amountPaid).toFixed(2)}`]] : []),
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span style={{ color: 'var(--fg-3)' }}>{label}</span>
                <span className="font-semibold" style={{ color: 'var(--fg)' }}>{val}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-bold" style={{ color: 'var(--fg)' }}>Balance Due</span>
              <span className="font-bold text-base" style={{ color: 'var(--accent)' }}>{form.currency} ${balance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notes ── */}
      <div>
        <SectionHeader title="Notes (optional)" />
        <textarea
          className={inputCls}
          rows={3}
          placeholder="Payment instructions, thank-you note, etc."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-border transition-all disabled:opacity-50"
            style={{ color: 'var(--fg-2)' }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? 'Saving…' : 'Save Invoice'}
        </button>
      </div>
    </form>
  )
}
