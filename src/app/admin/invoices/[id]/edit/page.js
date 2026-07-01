'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import InvoiceForm from '../../InvoiceForm'
import { useToast } from '@/components/ui/Toast'

export default function EditInvoicePage() {
  const router = useRouter()
  const { id } = useParams()
  const toast  = useToast()

  const [invoice, setInvoice]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(res => {
        if (res.status === 404) { setNotFound(true); return null }
        return res.json()
      })
      .then(data => { if (data) setInvoice(data) })
      .catch(() => setError('Failed to load invoice.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(data) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error('Failed to save invoice', body.error || 'Please check the form and try again.')
        setError(body.error || 'Failed to update invoice')
        return
      }
      toast.success('Invoice updated!', `Invoice ${body.invoiceNumber} has been saved.`)
      router.push('/admin/invoices')
      router.refresh()
    } catch {
      toast.error('Network error', 'Could not reach the server. Please try again.')
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="text-center py-32">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--fg-2)' }}>Invoice not found.</p>
        <Link href="/admin/invoices" className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          ← Back to Invoices
        </Link>
      </div>
    )
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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
          Edit Invoice <span style={{ color: 'var(--accent)' }}>{invoice?.invoiceNumber}</span>
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>
          Update the details below and save
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
        {invoice && (
          <InvoiceForm
            initial={invoice}
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
