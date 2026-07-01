'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Plus, Upload, Trash2, Search, AlertCircle, CheckCircle2, FileText, Tag } from 'lucide-react'

const WEIGHT_SLABS = [
  { value: 'up_to_10', label: 'Up to 10 kg' },
  { value: '10_to_25', label: '10–25 kg' },
  { value: '25_to_50', label: '25–50 kg' },
  { value: '50_plus',  label: '50+ kg' },
]

function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/)
  const rows = []
  for (const line of lines) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    if (cols.length < 3) continue
    const [fromCity, toCity, col3, col4] = cols
    let weightSlab = 'up_to_10', price
    if (col4 !== undefined && !isNaN(Number(col4))) {
      weightSlab = normalizeWeightSlab(col3); price = Number(col4)
    } else if (!isNaN(Number(col3))) {
      price = Number(col3)
    } else { continue }
    if (!fromCity || !toCity || price <= 0) continue
    rows.push({ fromCity, toCity, weightSlab, price })
  }
  return rows
}

function normalizeWeightSlab(raw) {
  const s = String(raw).toLowerCase().replace(/\s/g, '')
  if (s.includes('25_to_50') || s.includes('25-50')) return '25_to_50'
  if (s.includes('10_to_25') || s.includes('10-25')) return '10_to_25'
  if (s.includes('50')) return '50_plus'
  return 'up_to_10'
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-border" style={{ background: 'var(--surface-2)' }}>
        <h2 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-3)' }}>{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function PricingPage() {
  const [rules, setRules]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm]       = useState({ fromCity: '', toCity: '', weightSlab: 'up_to_10', price: '' })
  const fileRef               = useRef(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvError, setCsvError]     = useState('')
  const [importing, setImporting]   = useState(false)
  const [filter, setFilter]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pricing/rules')
      if (res.ok) setRules(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAddRule(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!form.fromCity.trim() || !form.toCity.trim() || !form.price) {
      setError('From city, to city, and price are required.'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/pricing/rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save rule.'); return }
      setSuccess('Rule saved.')
      setForm({ fromCity: '', toCity: '', weightSlab: 'up_to_10', price: '' })
      await load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this pricing rule?')) return
    await fetch('/api/pricing/rules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await load()
  }

  function handleFileChange(e) {
    setCsvError(''); setCsvPreview([])
    const file = e.target.files?.[0]
    if (!file) return
    setCsvLoading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSVText(ev.target.result)
        rows.length === 0 ? setCsvError('No valid rows found. Expected: From City, To City, Weight Slab (optional), Price') : setCsvPreview(rows)
      } catch { setCsvError('Failed to parse file.') }
      finally { setCsvLoading(false) }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!csvPreview.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/pricing/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: csvPreview }) })
      const d = await res.json()
      if (!res.ok) { setCsvError(d.error || 'Import failed'); return }
      setSuccess(`Imported ${d.imported} rules.`)
      setCsvPreview([])
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } finally { setImporting(false) }
  }

  const filtered = filter.trim()
    ? rules.filter((r) => r.fromCityDisplay?.toLowerCase().includes(filter.toLowerCase()) || r.toCityDisplay?.toLowerCase().includes(filter.toLowerCase()))
    : rules

  const alertDanger  = 'flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs'
  const alertSuccess = 'flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs'

  return (
    <div className="space-y-6">
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Pricing Manager</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>Set rates by route and package weight</p>
      </div>

      {/* Manual entry */}
      <SectionCard title="Add / Update a Rate" subtitle="Set a price for a specific route and weight bracket">
        <form onSubmit={handleAddRule} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="From City" type="text" value={form.fromCity}
              onChange={(e) => setForm((f) => ({ ...f, fromCity: e.target.value }))} placeholder="Calgary" />
            <Input label="To City" type="text" value={form.toCity}
              onChange={(e) => setForm((f) => ({ ...f, toCity: e.target.value }))} placeholder="Edmonton" />
            <Select label="Weight Slab" value={form.weightSlab}
              onChange={(v) => setForm((f) => ({ ...f, weightSlab: v }))} options={WEIGHT_SLABS} />
            <Input label="Price (CAD)" type="number" min="0" step="0.01" value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="25.00" />
          </div>

          {error   && <div className={alertDanger}  style={{ background: 'var(--danger-bg)',  border: '1px solid var(--danger)',  color: 'var(--danger)'  }}><AlertCircle  size={12} className="mt-0.5 shrink-0" />{error}</div>}
          {success && <div className={alertSuccess} style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)' }}><CheckCircle2 size={12} className="mt-0.5 shrink-0" />{success}</div>}

          <Button type="submit" loading={saving} variant="primary" icon={<Plus size={14} />}>Save Rule</Button>
        </form>
      </SectionCard>

      {/* CSV import */}
      <SectionCard title="Import from CSV" subtitle="Columns: From City, To City, Weight Slab (optional), Price">
        <div className="space-y-4">
          <div className="rounded-xl p-3.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--fg-3)' }}>
              <FileText size={11} /> Example CSV
            </p>
            <pre className="text-xs leading-relaxed mono" style={{ color: 'var(--fg-2)' }}>
{`From City,To City,Weight Slab,Price
Calgary,Edmonton,up_to_10,45.00
Calgary,Airdrie,up_to_10,15.00
Edmonton,Calgary,10_to_25,65.00`}
            </pre>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileChange}
            className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:cursor-pointer file:bg-(--accent-dim) file:text-accent transition"
            style={{ color: 'var(--fg-2)' }}
          />

          {csvLoading && <p className="text-xs" style={{ color: 'var(--fg-3)' }}>Parsing…</p>}
          {csvError && (
            <div className={alertDanger} style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
              <AlertCircle size={12} className="mt-0.5 shrink-0" />{csvError}
            </div>
          )}

          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold" style={{ color: 'var(--fg-2)' }}>{csvPreview.length} rows ready to import</p>
              <div className="rounded-xl overflow-hidden border border-border max-h-48 overflow-y-auto">
                <table className="data-table">
                  <thead><tr><th>From</th><th>To</th><th>Weight</th><th className="text-right">Price</th></tr></thead>
                  <tbody>
                    {csvPreview.map((r, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--fg)' }}>{r.fromCity}</td>
                        <td>{r.toCity}</td>
                        <td className="text-xs">{WEIGHT_SLABS.find((w) => w.value === r.weightSlab)?.label ?? r.weightSlab}</td>
                        <td className="text-right mono font-semibold" style={{ color: 'var(--accent)' }}>{Number(r.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={handleImport} loading={importing} variant="success" icon={<Upload size={13} />}>
                Import {csvPreview.length} Rules
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Rules table */}
      <SectionCard title={`Current Rates (${rules.length})`}>
        <div className="space-y-4">
          <Input
            icon={<Search size={14} />}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by city…"
          />

          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" style={{ color: 'var(--fg-3)' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Tag size={28} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--fg-3)' }} />
              <p className="text-sm" style={{ color: 'var(--fg-3)' }}>No pricing rules yet.</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr><th>From</th><th>To</th><th>Weight</th><th className="text-right">Price (CAD)</th><th /></tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r._id}>
                      <td className="font-semibold" style={{ color: 'var(--fg)' }}>{r.fromCityDisplay}</td>
                      <td>{r.toCityDisplay}</td>
                      <td className="text-xs">{WEIGHT_SLABS.find((w) => w.value === r.weightSlab)?.label ?? r.weightSlab}</td>
                      <td className="text-right mono font-bold" style={{ color: 'var(--accent)' }}>{Number(r.price).toFixed(2)}</td>
                      <td className="text-right">
                        <button onClick={() => handleDelete(r._id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--fg-3)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-3)';  e.currentTarget.style.background = 'transparent' }}
                          title="Delete rule">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
