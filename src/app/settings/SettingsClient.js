'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import { User, Lock, Check, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'

// ── Password strength ─────────────────────────────────────────────────────────

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)             score++
  if (pw.length >= 12)            score++
  if (/[A-Z]/.test(pw))          score++
  if (/[0-9]/.test(pw))          score++
  if (/[^A-Za-z0-9]/.test(pw))   score++
  const map = [
    { label: '',          color: 'var(--border)' },
    { label: 'Weak',      color: '#dc2626' },
    { label: 'Fair',      color: '#d97706' },
    { label: 'Good',      color: '#ca8a04' },
    { label: 'Strong',    color: '#16a34a' },
    { label: 'Very Strong', color: '#15803d' },
  ]
  return { score, ...map[score] }
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = getStrength(password)
  if (!password) return null

  const rules = [
    { met: password.length >= 8,           text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password),         text: 'One uppercase letter' },
    { met: /[0-9]/.test(password),         text: 'One number' },
    { met: /[^A-Za-z0-9]/.test(password),  text: 'One special character (!@#$…)' },
  ]

  return (
    <div className="mt-3 space-y-2">
      {/* Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= score ? color : 'var(--border)' }}
            />
          ))}
        </div>
        {label && (
          <span className="text-[11px] font-bold shrink-0" style={{ color }}>{label}</span>
        )}
      </div>
      {/* Rules */}
      <ul className="space-y-1">
        {rules.map((r) => (
          <li key={r.text} className="flex items-center gap-1.5 text-[11px]"
            style={{ color: r.met ? '#16a34a' : 'var(--fg-3)' }}>
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
              style={{ background: r.met ? '#dcfce7' : 'var(--surface-2)', transition: 'background 0.2s' }}>
              {r.met
                ? <Check size={8} style={{ color: '#16a34a' }} strokeWidth={3} />
                : <div className="w-1 h-1 rounded-full bg-current opacity-40" />
              }
            </div>
            {r.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Input helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--fg-2)' }}>
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>{hint}</p>}
    </div>
  )
}

const inputCls = [
  'w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all outline-none',
  'bg-white focus:ring-2 focus:border-transparent',
].join(' ')

const inputStyle = {
  borderColor: 'var(--border)',
  color: 'var(--fg)',
  '--tw-ring-color': 'var(--accent-glow)',
}

function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputCls}
      style={inputStyle}
    />
  )
}

function PasswordInput({ value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputCls + ' pr-10'}
        style={inputStyle}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
        style={{ color: 'var(--fg-3)' }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function Tabs({ active, onChange }) {
  const tabs = [
    { id: 'info',     label: 'Profile Info', icon: User },
    { id: 'password', label: 'Password',     icon: Lock },
  ]
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: active === id ? 'white' : 'transparent',
            color: active === id ? 'var(--fg)' : 'var(--fg-3)',
            boxShadow: active === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsClient({ role, initialUser }) {
  const toast = useToast()
  const [tab, setTab] = useState('info')

  // ── Info tab state ──────────────────────────────────────────────────────────
  const isCustomer = role === 'customer'

  const [info, setInfo] = useState({
    name:        initialUser?.name        ?? '',
    phone:       initialUser?.phone       ?? '',
    // customer-only
    contactName: initialUser?.contactName ?? '',
    companyName: initialUser?.companyName ?? '',
    buzzCode:    initialUser?.buzzCode    ?? '',
    // admin-only
    address:     initialUser?.address     ?? '',
  })
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoError,  setInfoError]  = useState('')

  // ── Password tab state ──────────────────────────────────────────────────────
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwError,  setPwError]    = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const strength = getStrength(pw.next)
  const isPasswordValid =
    strength.score >= 4 &&
    pw.next === pw.confirm &&
    pw.current.length > 0

  async function handleInfoSave(e) {
    e.preventDefault()
    setInfoError('')
    setInfoSaving(true)
    try {
      const body = isCustomer
        ? { name: info.name, phone: info.phone, contactName: info.contactName, companyName: info.companyName, buzzCode: info.buzzCode }
        : { name: info.name, phone: info.phone, address: info.address }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setInfoError(data.error || 'Failed to save.'); return }
      toast.success('Profile updated', 'Your information has been saved.')
    } catch {
      setInfoError('Network error. Please try again.')
    } finally {
      setInfoSaving(false)
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match.'); return }
    if (strength.score < 4)     { setPwError('Password is not strong enough.'); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error || 'Failed to update password.'); return }
      setPwSuccess(true)
      setPw({ current: '', next: '', confirm: '' })
      toast.success('Password updated', 'Your password has been changed successfully.')
    } catch {
      setPwError('Network error. Please try again.')
    } finally {
      setPwSaving(false)
    }
  }

  const email = initialUser?.email ?? ''

  return (
    <div className="max-w-xl space-y-6">

      {/* Header */}
      <div className="anim-fade-up">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-3)' }}>
          Manage your account information and security
        </p>
      </div>

      {/* Avatar + email pill */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-white anim-fade-up">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
          style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)' }}
        >
          {(info.name || email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--fg)' }}>{info.name || '—'}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--fg-3)' }}>{email}</p>
          <span
            className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            {role}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="anim-fade-up s1">
        <Tabs active={tab} onChange={setTab} />
      </div>

      {/* ── Info tab ───────────────────────────────────────────────────────── */}
      {tab === 'info' && (
        <form onSubmit={handleInfoSave} className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s2">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2"
            style={{ background: 'var(--surface-2)' }}>
            <User size={14} style={{ color: 'var(--fg-3)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Profile Information</span>
          </div>

          <div className="px-6 py-5 space-y-4">

            {/* Email — read-only */}
            <Field label="Email address" hint="Contact support to change your email.">
              <div
                className="w-full rounded-xl border px-3.5 py-2.5 text-sm"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--fg-3)' }}
              >
                {email}
              </div>
            </Field>

            <Field label="Full name" required>
              <TextInput value={info.name} onChange={(v) => setInfo((p) => ({ ...p, name: v }))} placeholder="John Smith" />
            </Field>

            <Field label="Phone number">
              <TextInput value={info.phone} onChange={(v) => setInfo((p) => ({ ...p, phone: v }))} placeholder="+1 403-000-0000" type="tel" />
            </Field>

            {isCustomer && (
              <>
                <div className="pt-1 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3 mt-3" style={{ color: 'var(--fg-3)' }}>
                    Default Pickup Details
                  </p>
                  <p className="text-[11px] mb-4 leading-relaxed" style={{ color: 'var(--fg-3)' }}>
                    These will be pre-filled when you create a new booking. You can always edit them during booking.
                  </p>
                </div>

                <Field label="Contact name">
                  <TextInput value={info.contactName} onChange={(v) => setInfo((p) => ({ ...p, contactName: v }))} placeholder="John Smith" />
                </Field>

                <Field label="Company name">
                  <TextInput value={info.companyName} onChange={(v) => setInfo((p) => ({ ...p, companyName: v }))} placeholder="ABC Corp (optional)" />
                </Field>

                <Field label="Address">
                  <TextInput value={info.buzzCode} onChange={(v) => setInfo((p) => ({ ...p, buzzCode: v }))} placeholder="#4B, buzz 1234" />
                </Field>
              </>
            )}

            {!isCustomer && (
              <Field label="Address">
                <TextInput value={info.address} onChange={(v) => setInfo((p) => ({ ...p, address: v }))} placeholder="123 Main St, Calgary, AB" />
              </Field>
            )}

            {infoError && (
              <div className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs"
                style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--danger)' }}>
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {infoError}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end"
            style={{ background: 'var(--surface-2)' }}>
            <button
              type="submit"
              disabled={infoSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'var(--accent)', boxShadow: '0 2px 10px var(--accent-glow)' }}
            >
              {infoSaving ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" />
                </svg>
              ) : <Check size={14} />}
              {infoSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* ── Password tab ───────────────────────────────────────────────────── */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordSave} className="bg-white rounded-2xl border border-border overflow-hidden anim-fade-up s2">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2"
            style={{ background: 'var(--surface-2)' }}>
            <Shield size={14} style={{ color: 'var(--fg-3)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Change Password</span>
          </div>

          <div className="px-6 py-5 space-y-4">

            <Field label="Current password" required>
              <PasswordInput
                value={pw.current}
                onChange={(v) => setPw((p) => ({ ...p, current: v }))}
                placeholder="Enter your current password"
              />
            </Field>

            <Field label="New password" required>
              <PasswordInput
                value={pw.next}
                onChange={(v) => { setPw((p) => ({ ...p, next: v })); setPwSuccess(false) }}
                placeholder="Create a strong password"
              />
              <PasswordStrengthBar password={pw.next} />
            </Field>

            <Field label="Confirm new password" required>
              <div className="relative">
                <PasswordInput
                  value={pw.confirm}
                  onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
                  placeholder="Repeat your new password"
                />
                {pw.confirm && pw.next && (
                  <div
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-[11px] font-semibold"
                    style={{ color: pw.confirm === pw.next ? '#16a34a' : '#dc2626' }}
                  >
                    {pw.confirm === pw.next ? '✓ Match' : '✗ No match'}
                  </div>
                )}
              </div>
            </Field>

            {pwError && (
              <div className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs"
                style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--danger)' }}>
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {pwError}
              </div>
            )}

            {pwSuccess && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-3 text-xs"
                style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#14532d' }}>
                <Check size={13} />
                Password updated successfully.
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border flex items-center justify-between"
            style={{ background: 'var(--surface-2)' }}>
            <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>
              Use 8+ chars with uppercase, number &amp; special character.
            </p>
            <button
              type="submit"
              disabled={pwSaving || !isPasswordValid}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--accent)', boxShadow: '0 2px 10px var(--accent-glow)' }}
            >
              {pwSaving ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="25 10" />
                </svg>
              ) : <Lock size={14} />}
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
