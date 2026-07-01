'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import InvoiceForm from '../InvoiceForm'
import { useToast } from '@/components/ui/Toast'

export default function NewInvoicePage() {
  const router = useRouter()
  const toast  = useToast()
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState(null)

  useEffect(() => {
    fetch('/api/invoices/next-number')
      .then(r => r.json())
      .then(d => { setInvoiceNumber(d.invoiceNumber || 'INV001') })
      .catch(() => { setInvoiceNumber('INV001') })
  }, [])

  async function handleSubmit(data) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error('Failed to create invoice', body.error || 'Please check the form and try again.')
        setError(body.error || 'Failed to create invoice')
        return
      }
      toast.success('Invoice created!', `Invoice ${body.invoiceNumber} has been saved.`)
      router.push('/admin/invoices')
      router.refresh()
    } catch {
      toast.error('Network error', 'Could not reach the server. Please try again.')
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="anim-fade-up">
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
          style={{ color: 'var(--fg-3)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-3)'}
        >
          <ArrowLeft size={13} /> Back to Invoices
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>New Invoice</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
          Fill in the details below to create a new invoice
        </p>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-2xl border border-border p-6 anim-fade-up s1">
        {error && (
          <p className="mb-6 text-sm font-medium px-3 py-2 rounded-lg"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        {invoiceNumber === null ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--fg-3)' }}>
            Loading…
          </div>
        ) : (
          <InvoiceForm
            initial={{ invoiceNumber }}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/admin/invoices')}
            submitting={submitting}
            disableInvoiceNumber
          />
        )}
      </div>
    </div>
  )
}
