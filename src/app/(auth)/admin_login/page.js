'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertCircle, ArrowRight, Eye, EyeOff, Shield, BarChart2, Users, Package } from 'lucide-react'


function useCountUp(target, duration = 1800, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return val
}

// metric.color is a runtime value — inline style is intentional here
const METRICS = [
  { icon: Package,   label: 'Active Bookings',  value: 47,  suffix: '',  color: 'var(--secondary)' },
  { icon: Users,     label: 'Drivers On Road',  value: 12,  suffix: '',  color: 'var(--accent)'    },
  { icon: BarChart2, label: 'Deliveries Today', value: 134, suffix: '',  color: 'var(--secondary)' },
  { icon: Shield,    label: 'On-Time Rate',     value: 99,  suffix: '%', color: 'var(--accent)'    },
]

function MetricCard({ metric, index, animate }) {
  const count = useCountUp(metric.value, 1600 + index * 200, animate)
  const Icon = metric.icon
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border shadow-sm"
      style={{
        opacity: animate ? 1 : 0,
        transform: animate ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.5s ease ${index * 0.1 + 0.3}s, transform 0.5s ease ${index * 0.1 + 0.3}s`,
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${metric.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${metric.color} 25%, transparent)` }}>
        <Icon size={14} style={{ color: metric.color }} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold truncate text-muted">{metric.label}</p>
        <p className="text-lg font-black leading-tight tabular-nums" style={{ color: metric.color }}>
          {count}{metric.suffix}
        </p>
      </div>
      <div className="w-10 h-5 flex items-end gap-px shrink-0">
        {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{
            height: `${animate ? h : 0}%`,
            background: metric.color,
            opacity: 0.2 + (i / 7) * 0.5,
            transition: `height 0.6s ease ${index * 0.1 + i * 0.06}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState(null)
  const [mounted,  setMounted]  = useState(false)
  const [time,     setTime]     = useState('')

  useEffect(() => {
    setMounted(true)
    const tick = () => setTime(new Date().toLocaleTimeString('en-CA', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'admin' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Access denied.'); return }
      setEmail(''); setPassword('')
      router.replace(data.redirect)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background font-sans">

      {/* ── LEFT panel ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-surface border-r border-border" style={{ width: '42%' }}>
        <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-50" />
        <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none bg-[radial-gradient(ellipse_at_30%_0%,var(--secondary-dim)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 pointer-events-none rounded-full bg-accent/7 blur-2xl" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-8 pt-8 pb-6 border-b border-border">
          <Image src="/images/logo.png" alt="GoFastDelivery" width={120} height={40} className="h-9 w-auto object-contain" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
            <span className="text-[11px] font-black tabular-nums text-muted font-mono tracking-[0.08em]">{time}</span>
          </div>
        </div>

        {/* Heading */}
        <div className="relative z-10 px-8 pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-5 bg-secondary/8 border border-secondary/18">
            <Shield size={10} className="text-secondary" />
            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-secondary">Control Panel</span>
          </div>
          <h2 className="font-black leading-[0.9] tracking-tight text-foreground" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}>
            GoFast<br />
            <span className="text-secondary">Admin</span><br />
            Dashboard
          </h2>
          <p className="mt-4 text-xs leading-relaxed text-muted max-w-[240px]">
            Full operational control. Bookings, drivers, pricing, and delivery oversight.
          </p>
        </div>

        {/* Metrics */}
        <div className="relative z-10 px-8 pt-8 flex flex-col gap-2.5">
          <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-1 text-muted font-mono">▸ Live Platform Stats</p>
          {METRICS.map((m, i) => <MetricCard key={m.label} metric={m} index={i} animate={mounted} />)}
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-auto px-8 pb-8 pt-6">
          <div className="h-px mb-5 bg-border" />
          <p className="text-[10px] text-muted font-mono">
            GoFastDelivery Admin Panel · v2.0<br />Authorized access only
          </p>
        </div>
      </div>

      {/* ── RIGHT: Form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-12 py-12 relative">
        <div className="absolute inset-y-0 left-0 w-px pointer-events-none bg-[linear-gradient(180deg,transparent_0%,var(--secondary-dim)_40%,var(--secondary-dim)_60%,transparent_100%)]" />

        {/* Mobile logo */}
        <div className="lg:hidden mb-9">
          <Image src="/images/logo.png" alt="GoFastDelivery" width={120} height={40} className="h-9 w-auto object-contain" />
        </div>

        <div className="w-full max-w-sm mx-auto">

          {/* Heading */}
          <div className="mb-8" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s',
          }}>
            <h1 className="font-black leading-tight tracking-tight text-foreground" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)' }}>
              Secure Sign In
            </h1>
            <p className="text-sm mt-1.5 text-muted">Restricted · Administrators only</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.5s ease 0.25s, transform 0.5s ease 0.25s',
          }}>

            <div className="flex flex-col gap-1.5">
              <label className={`text-[9px] font-black tracking-[0.25em] uppercase transition-colors ${focused === 'email' ? 'text-secondary' : 'text-muted'}`}>
                Email
              </label>
              <input
                type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                placeholder="admin@gofastdelivery.ca"
                className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium text-foreground outline-none transition-all border-[1.5px] ${
                  focused === 'email'
                    ? 'bg-surface border-secondary/50 shadow-[0_0_0_3px_var(--secondary-dim)]'
                    : 'bg-background border-border'
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`text-[9px] font-black tracking-[0.25em] uppercase transition-colors ${focused === 'password' ? 'text-secondary' : 'text-muted'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  className={`w-full px-4 pr-11 py-3.5 rounded-xl text-sm font-medium text-foreground outline-none transition-all border-[1.5px] ${
                    focused === 'password'
                      ? 'bg-surface border-secondary/50 shadow-[0_0_0_3px_var(--secondary-dim)]'
                      : 'bg-background border-border'
                  }`}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-3 text-xs font-semibold bg-danger/6 border border-danger/18 text-danger">
                <AlertCircle size={13} className="shrink-0" />{error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="group relative w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-base text-white mt-2 overflow-hidden transition-all disabled:opacity-60 tracking-[0.03em] bg-secondary hover:bg-secondary-hover shadow-[0_6px_28px_var(--secondary-glow)] hover:shadow-[0_8px_36px_var(--secondary-glow)]">
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.12)_50%,transparent_60%)]" />
              {loading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Authenticating…</>
              ) : (
                <><Shield size={14} strokeWidth={2.5} />Access Dashboard<ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
