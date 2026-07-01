'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'

const STATS = [
  { value: '8000+', label: 'Deliveries', cls: 'text-secondary' },
  { value: '99.2%', label: 'On-time',    cls: 'text-accent'    },
  { value: '8',     label: 'Cities',     cls: 'text-secondary' },
]

export default function LoginClient() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'customer' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid credentials. Please try again.'); return }
      setEmail(''); setPassword('')
      router.replace(data.redirect)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">

      {/* ── LEFT: brand panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden p-14 bg-background">
        <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-50" />
        <div className="absolute pointer-events-none -top-20 -left-20 w-[450px] h-[450px] rounded-full bg-secondary/10 blur-[40px]" />
        <div className="absolute pointer-events-none -bottom-16 -right-16 w-[350px] h-[350px] rounded-full bg-accent/8 blur-[40px]" />

        <div className="relative">
          <Image src="/images/logo.png" alt="GoFastDelivery" width={130} height={44} className="h-10 w-auto object-contain" />
        </div>

        <div className="relative">
          <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 bg-secondary/10 text-secondary">
            Customer Portal
          </span>
          <h2 className="font-black leading-[0.92] tracking-tight mb-5 text-foreground" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
            Calgary&apos;s<br />
            <span className="text-secondary">Fastest</span><br />
            Courier.
          </h2>
          <p className="text-sm leading-relaxed max-w-xs text-muted">
            Book pickups, track deliveries, and manage everything from one place.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="flex flex-col gap-1 p-4 rounded-2xl bg-surface border border-border shadow-sm">
              <span className={`text-2xl font-black leading-none ${s.cls}`}>{s.value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="relative flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-xs font-semibold text-muted">
            Drivers on route now · Calgary &amp; surrounding areas
          </span>
        </div>
      </div>

      {/* ── RIGHT: form panel ── */}
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 relative bg-surface">

        {/* Top nav */}
        <div className="absolute top-5 left-6 right-6 flex items-center justify-between">
          <div className="lg:hidden">
            <Image src="/images/logo.png" alt="GoFastDelivery" width={100} height={32} className="h-7 w-auto object-contain" />
          </div>
          <div className="hidden lg:block" />
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary transition-colors">
            <ArrowRight size={11} className="rotate-180" />Back to Home
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto pt-8">

          {/* Heading */}
          <div className="mb-6">
            <h1 className="font-black leading-tight tracking-tight text-foreground" style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1 text-muted">
              Sign in to your GoFast account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email"
                className={`text-[11px] font-black tracking-widest uppercase transition-colors ${focused === 'email' ? 'text-secondary' : 'text-muted'}`}>
                Email
              </label>
              <div className="relative">
                <Mail size={14}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${focused === 'email' ? 'text-secondary' : 'text-muted'}`} />
                <input id="email" type="email" autoComplete="email" required
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  className={`w-full outline-none transition-all text-sm font-medium rounded-xl text-foreground pl-10 pr-4 py-3.5 ${
                    focused === 'email'
                      ? 'bg-surface border-secondary/50 shadow-[0_0_0_3px_var(--secondary-dim)]'
                      : 'bg-background border-border'
                  } border-[1.5px]`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password"
                  className={`text-[11px] font-black tracking-widest uppercase transition-colors ${focused === 'password' ? 'text-secondary' : 'text-muted'}`}>
                  Password
                </label>
                <Link href="/forgot-password" className="text-[11px] font-bold text-accent hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={14}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${focused === 'password' ? 'text-secondary' : 'text-muted'}`} />
                <input id="password" type={showPass ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  className={`w-full outline-none transition-all text-sm font-medium rounded-xl text-foreground pl-10 pr-11 py-3.5 ${
                    focused === 'password'
                      ? 'bg-surface border-secondary/50 shadow-[0_0_0_3px_var(--secondary-dim)]'
                      : 'bg-background border-border'
                  } border-[1.5px]`}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold bg-danger/6 border border-danger/18 text-danger">
                <AlertCircle size={13} className="shrink-0" />{error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm text-white mt-1 bg-secondary hover:bg-secondary-hover hover:-translate-y-px transition-all disabled:opacity-50 shadow-[0_6px_24px_var(--secondary-glow)] hover:shadow-[0_10px_32px_var(--secondary-glow)]">
              {loading
                ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Signing in…</>
                : <>Sign In <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
              }
            </button>
          </form>

          {/* ── Signup CTA ── */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] font-semibold text-muted">Don&apos;t have an account?</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Link href="/register"
              className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm text-accent border-2 border-accent bg-surface hover:bg-accent hover:text-white transition-all shadow-[0_2px_12px_var(--accent-glow)] hover:shadow-[0_6px_24px_var(--accent-glow)]">
              Create Free Account
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <p className="text-center text-[11px] mt-2.5 text-muted">
              Free forever · No credit card required
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
