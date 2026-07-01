'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function AssignDriverForm({ bookingId, currentDriverId }) {
  const router = useRouter()
  const [drivers, setDrivers] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState(currentDriverId ?? '')
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [merged, setMerged]     = useState(false)

  useEffect(() => {
    fetch('/api/drivers')
      .then((r) => r.json())
      .then((data) => setDrivers(Array.isArray(data) ? data : []))
      .catch(() => setDrivers([]))
      .finally(() => setFetching(false))
  }, [])

  async function handleAssign(e) {
    e.preventDefault()
    if (!selectedDriverId) return
    setError(''); setSuccess(false); setMerged(false); setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriverId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Assignment failed.'); return }
      setMerged(data.merged ?? false)
      setSuccess(true)
      router.refresh()
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  if (fetching) return <p className="text-sm" style={{ color: 'var(--fg-3)' }}>Loading drivers…</p>

  if (drivers.length === 0) return (
    <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
      No active drivers available.{' '}
      <a href="/admin/drivers/new" style={{ color: 'var(--accent)' }} className="font-semibold hover:underline">Add a driver</a>
    </p>
  )

  const driverOptions = drivers.map((d) => ({
    value: d._id,
    label: d.name,
    meta: d.pendingStopCount > 0 ? `${d.pendingStopCount} active stops` : '',
  }))

  const sel = drivers.find((d) => d._id === selectedDriverId)

  return (
    <form onSubmit={handleAssign} className="space-y-3">
      <Select
        label="Select Driver"
        placeholder="— Choose a driver —"
        value={selectedDriverId}
        onChange={setSelectedDriverId}
        options={driverOptions}
        required
      />

      {sel?.pendingStopCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
          style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)', color: 'var(--warning)' }}>
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>Driver has {sel.pendingStopCount} active stop{sel.pendingStopCount > 1 ? 's' : ''}. This booking will be merged into their route.</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
          style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
          <AlertCircle size={12} className="mt-0.5 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
          style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)' }}>
          <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
          {merged ? "Merged into driver's existing route." : 'Driver assigned successfully.'}
        </div>
      )}

      <Button type="submit" loading={loading} disabled={!selectedDriverId} variant="primary">
        Assign Driver
      </Button>
    </form>
  )
}
