'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Mail, Lock, User, Phone, AlertCircle,
  ArrowRight, Eye, EyeOff, CheckCircle2, Zap,
  Package, Clock, Shield,
} from 'lucide-react'

const RULES = [
  { id: 'len',   label: '8+ characters',    test: p => p.length >= 8 },
  { id: 'upper', label: 'Uppercase letter', test: p => /[A-Z]/.test(p) },
  { id: 'num',   label: 'One number',       test: p => /[0-9]/.test(p) },
]

const PERKS = [
  { icon: Zap,     text: 'Same-day delivery across 8 cities' },
  { icon: Clock,   text: '99.2% on-time rate' },
  { icon: Shield,  text: 'Live status updates on every order' },
  { icon: Package, text: 'No hidden fees, ever' },
]

function validate({ name, email, password, confirmPassword }) {
  const e = {}
  if (!name.trim()) e.name = 'Required'
  if (!email.trim()) e.email = 'Required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email'
  if (!password) e.password = 'Required'
  else if (!RULES.every(r => r.test(password))) e.password = 'Password too weak'
  if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match'
  return e
}

function FloatField({ id, label, type = 'text', icon: Icon, value, onChange, focused, setFocused, error, placeholder, autoComplete, right }) {
  const active = focused === id
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id}
        className={`text-[11px] font-black tracking-widest uppercase transition-colors ${active ? 'text-secondary' : 'text-muted'}`}>
        {label}
      </label>
      <div className="relative">
        <Icon size={14}
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${active ? 'text-secondary' : error ? 'text-danger' : 'text-muted'}`} />
        <input
          id={id} name={id} type={type}
          autoComplete={autoComplete}
          required={id !== 'phone'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(id)}
          onBlur={() => setFocused(null)}
          placeholder={placeholder}
          className={`w-full outline-none transition-all text-sm font-medium rounded-xl text-foreground pl-10 py-3.5 border-[1.5px] ${right ? 'pr-11' : 'pr-4'} ${
            error
              ? 'border-danger bg-danger/4 shadow-[0_0_0_3px_var(--danger-bg)]'
              : active
                ? 'border-secondary/50 bg-surface shadow-[0_0_0_3px_var(--secondary-dim)]'
                : 'border-border bg-background'
          }`}
        />
        {right && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && (
        <p className="text-[10px] font-bold flex items-center gap-1 text-danger">
          <AlertCircle size={9} strokeWidth={2.5} />{error}
        </p>
      )}
    </div>
  )
}

function StrengthMeter({ password }) {
  if (!password) return null
  const passed = RULES.filter(r => r.test(password)).length
  const colors = ['bg-danger', 'bg-secondary', 'bg-accent']
  const color  = colors[passed - 1] ?? 'bg-danger'
  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex gap-1">
        {RULES.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < passed ? color : 'bg-border'}`} />
        ))}
      </div>
      <div className="flex gap-4 flex-wrap">
        {RULES.map(r => {
          const ok = r.test(password)
          return (
            <span key={r.id} className={`inline-flex items-center gap-1 text-[10px] font-semibold ${ok ? 'text-accent' : 'text-muted'}`}>
              <CheckCircle2 size={9} strokeWidth={ok ? 3 : 2} />{r.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [fields,    setFields]    = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [errors,    setErrors]    = useState({})
  const [focused,   setFocused]   = useState(null)
  const [showPass,  setShowPass]  = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [loading,   setLoading]   = useState(false)

  const onChange = useCallback((e) => {
    const { name, value } = e.target
    setFields(p => ({ ...p, [name]: value }))
    setErrors(p => ({ ...p, [name]: undefined }))
    if (serverErr) setServerErr('')
  }, [serverErr])

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true); setServerErr('')
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fields.name, email: fields.email, password: fields.password, phone: fields.phone || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setServerErr(data.error || 'Sign-up failed. Please try again.'); return }
      router.replace('/customer/overview')
    } catch {
      setServerErr('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">

      {/* ── LEFT: form ── */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 relative overflow-y-auto bg-surface">

        {/* Top nav */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <Link href="/">
            <Image src="/images/logo.png" alt="GoFastDelivery" width={110} height={36} className="h-8 w-auto object-contain" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary transition-colors">
            <ArrowRight size={11} className="rotate-180" />Back to Home
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto pt-10">

          {/* Heading */}
          <div className="mb-8">
            <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 bg-secondary/10 text-secondary">
              Free Account
            </span>
            <h1 className="font-black leading-tight tracking-tight mb-2 text-foreground" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)' }}>
              Create your<br />
              <span className="text-secondary">GoFast</span> account
            </h1>
            {/* Sign in CTA — visible immediately, above the form */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-muted">Already have an account?</span>
              <Link href="/login" className="inline-flex items-center gap-1 text-sm font-black text-accent hover:text-secondary transition-colors">
                Sign in <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

            <div className="grid grid-cols-2 gap-3">
              <FloatField id="name" label="Full Name" icon={User}
                value={fields.name} onChange={onChange}
                focused={focused} setFocused={setFocused}
                error={errors.name} placeholder="Jane Smith"
                autoComplete="name" />
              <FloatField id="phone" label="Phone (opt.)" type="tel" icon={Phone}
                value={fields.phone} onChange={onChange}
                focused={focused} setFocused={setFocused}
                placeholder="+1 (403)…" autoComplete="tel" />
            </div>

            <FloatField id="email" label="Email Address" type="email" icon={Mail}
              value={fields.email} onChange={onChange}
              focused={focused} setFocused={setFocused}
              error={errors.email} placeholder="you@example.com"
              autoComplete="email" />

            <div>
              <FloatField id="password" label="Password"
                type={showPass ? 'text' : 'password'} icon={Lock}
                value={fields.password} onChange={onChange}
                focused={focused} setFocused={setFocused}
                error={errors.password} placeholder="Min 8 chars"
                autoComplete="new-password"
                right={
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="text-muted hover:text-secondary transition-colors">
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                } />
              <StrengthMeter password={fields.password} />
            </div>

            <FloatField id="confirmPassword" label="Confirm Password"
              type={showConf ? 'text' : 'password'} icon={Lock}
              value={fields.confirmPassword} onChange={onChange}
              focused={focused} setFocused={setFocused}
              error={errors.confirmPassword} placeholder="Repeat password"
              autoComplete="new-password"
              right={
                <button type="button" onClick={() => setShowConf(v => !v)}
                  className="text-muted hover:text-secondary transition-colors">
                  {showConf ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              } />

            {serverErr && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold bg-danger/6 border border-danger/20 text-danger">
                <AlertCircle size={13} className="shrink-0" />{serverErr}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm text-white mt-1 bg-secondary hover:bg-secondary-hover hover:-translate-y-px transition-all disabled:opacity-50 shadow-[0_6px_24px_var(--secondary-glow)] hover:shadow-[0_10px_32px_var(--secondary-glow)]">
              {loading
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating account…</>
                : <>Create Free Account <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
              }
            </button>

            <p className="text-center text-[10px] text-muted">
              By signing up you agree to our{' '}
              <span className="text-foreground/50 font-bold">Terms</span> &amp;{' '}
              <span className="text-foreground/50 font-bold">Privacy Policy</span>
            </p>
          </form>
        </div>
      </div>

      {/* ── RIGHT: brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden p-14 bg-background">

        <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-50" />
        <div className="absolute pointer-events-none -top-20 -right-20 w-100 h-100 rounded-full bg-secondary/10 blur-2xl" />
        <div className="absolute pointer-events-none -bottom-16 -left-16 w-87.5 h-87.5 rounded-full bg-accent/10 blur-2xl" />

        {/* Stat pills */}
        <div className="relative flex items-center gap-3 flex-wrap">
          {[['8000+', 'Deliveries', 'text-secondary'], ['99.2%', 'On-time', 'text-accent'], ['8', 'Cities', 'text-secondary']].map(([val, lbl, cls]) => (
            <div key={lbl} className="px-4 py-2.5 rounded-2xl bg-surface border border-border shadow-sm">
              <p className={`text-xl font-black leading-none ${cls}`}>{val}</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5 text-muted">{lbl}</p>
            </div>
          ))}
        </div>

        {/* Headline */}
        <div className="relative">
          <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 bg-accent/10 text-accent">
            Calgary&apos;s #1 Courier
          </span>
          <h2 className="font-black leading-[0.92] tracking-tight mb-6 text-foreground" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
            Deliver<br />
            <span className="text-secondary">anything,</span><br />
            anywhere.
          </h2>
          <p className="text-sm leading-relaxed max-w-xs text-muted">
            Join thousands of Calgarians who trust GoFastDelivery for same-day courier service.
          </p>
        </div>

        {/* Perks */}
        <div className="relative flex flex-col gap-3">
          {PERKS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-secondary/10 border border-secondary/15">
                <Icon size={14} strokeWidth={2.2} className="text-secondary" />
              </div>
              <span className="text-sm font-semibold text-foreground/60">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
