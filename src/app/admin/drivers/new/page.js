'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ArrowLeft, CheckCircle2, Copy, AlertCircle, Mail, User, Phone } from 'lucide-react'

export default function AddDriverPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [createdDriver, setCreatedDriver] = useState(null)
  const [copied, setCopied]               = useState(false)

  function set(field, value) { setForm((p) => ({ ...p, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/drivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create driver.'); return }
      setCreatedDriver(data)
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  function copyCredentials() {
    navigator.clipboard.writeText(`Email: ${createdDriver.email}\nPassword: ${createdDriver.tempPassword}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (createdDriver) {
    return (
      <div className="max-w-lg anim-fade-up">
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center gap-3" style={{ background: 'var(--success-bg)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <CheckCircle2 size={16} />
            </div>
            <h2 className="text-base font-bold" style={{ color: 'var(--fg)' }}>Driver Created</h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
              Share these credentials with <strong style={{ color: 'var(--fg)' }}>{createdDriver.name}</strong>. The password is shown only once.
            </p>
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Email</span>
                <span className="mono text-sm" style={{ color: 'var(--fg)' }}>{createdDriver.email}</span>
              </div>
              <div className="h-px" style={{ background: 'var(--border)' }} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-3)' }}>Password</span>
                <span className="mono text-sm font-bold" style={{ color: 'var(--accent)' }}>{createdDriver.tempPassword}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" onClick={copyCredentials} icon={<Copy size={13} />}>
                {copied ? 'Copied!' : 'Copy Credentials'}
              </Button>
              <Button variant="secondary" onClick={() => router.push('/admin/drivers')}>Back to Drivers</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6 anim-fade-up">
        <button onClick={() => router.push('/admin/drivers')}
          className="p-1.5 rounded-lg transition-colors hover:bg-(--surface-2)"
          style={{ color: 'var(--fg-3)' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Add New Driver</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-3)' }}>Create a driver account and share credentials</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden anim-fade-up s1">
        <div className="px-5 py-4 border-b border-border" style={{ background: 'var(--surface-2)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>Driver Details</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Input label="Full Name" name="name" type="text" required value={form.name}
            onChange={(e) => set('name', e.target.value)} placeholder="Liam Thompson"
            icon={<User size={14} />} />

          <Input label="Email" name="email" type="email" required value={form.email}
            onChange={(e) => set('email', e.target.value)} placeholder="liam.thompson@gmail.com"
            icon={<Mail size={14} />} />

          <Input label="Phone" name="phone" type="tel" value={form.phone}
            onChange={(e) => set('phone', e.target.value)} placeholder="403-555-0182"
            icon={<Phone size={14} />} />

          {error && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
              style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle size={12} className="mt-0.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={loading} variant="primary">Create Driver</Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/drivers')}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
