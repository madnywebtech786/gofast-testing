'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { AlertCircle, ArrowRight, Eye, EyeOff, Truck, Navigation, Clock } from 'lucide-react'


const STREAKS = [
  { top: '12%', w: '45%', delay: '0s',   dur: '2.8s', op: 0.18 },
  { top: '28%', w: '60%', delay: '0.6s', dur: '3.2s', op: 0.12 },
  { top: '44%', w: '35%', delay: '1.1s', dur: '2.5s', op: 0.20 },
  { top: '60%', w: '50%', delay: '0.3s', dur: '3.5s', op: 0.10 },
  { top: '76%', w: '42%', delay: '0.9s', dur: '2.9s', op: 0.16 },
  { top: '88%', w: '28%', delay: '1.5s', dur: '3.1s', op: 0.10 },
]

const SHIFT_STATS = [
  { icon: Navigation, label: 'Avg Route',   value: '18 km',  cls: 'text-accent'    },
  { icon: Clock,      label: 'Shift Hours', value: '8 hrs',  cls: 'text-secondary' },
  { icon: Truck,      label: 'Daily Drops', value: '22 avg', cls: 'text-accent'    },
]

export default function DriverLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [focused,  setFocused]  = useState(null)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'driver' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid credentials.'); return }
      setEmail(''); setPassword('')
      router.replace(data.redirect)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-stretch bg-background font-sans">

      {/* Speed streaks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STREAKS.map((s, i) => (
          <div key={i} className="absolute left-0" style={{
            top: s.top, width: s.w, height: '1.5px',
            background: `linear-gradient(90deg, transparent, rgba(27,185,8,${s.op}), transparent)`,
            animation: `streak-drive ${s.dur} linear ${s.delay} infinite`,
          }} />
        ))}
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none dot-grid-bg opacity-40" />

      {/* ── LEFT: Brand slab ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-surface border-r border-border" style={{ width: '44%' }}>
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_20%_60%,var(--accent-dim)_0%,transparent_55%)]" />
        <div className="absolute pointer-events-none inset-0"
          style={{ background: 'repeating-linear-gradient(105deg, transparent, transparent 60px, rgba(27,185,8,0.04) 60px, rgba(27,185,8,0.04) 61px)' }} />

        <div className="relative z-10 flex flex-col h-full px-10 py-10">
          <Image src="/images/logo.png" alt="GoFastDelivery" width={130} height={44} className="h-10 w-auto object-contain mb-auto" />

          <div className="my-auto">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 bg-accent/8 border-2 border-accent/20 shadow-[0_4px_24px_var(--accent-dim)]">
              <Truck size={30} className="text-accent" strokeWidth={1.8} />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 bg-accent/8 border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]" />
              <span className="text-[9px] font-black tracking-[0.25em] uppercase text-accent">Driver Portal · Calgary</span>
            </div>
            <h2 className="font-black leading-[0.88] tracking-tighter text-foreground" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.2rem)' }}>
              Time to<br />
              <span className="text-accent">Deliver.</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted max-w-[260px]">
              Your route, stops, and updates. Everything you need for today&apos;s shift in one place.
            </p>
          </div>

          {/* Shift stats */}
          <div className="flex flex-col gap-3 mt-auto pt-8 border-t border-border">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-muted">Calgary drivers · avg stats</p>
            {SHIFT_STATS.map(({ icon: Icon, label, value, cls }, i) => (
              <div key={label} className="flex items-center gap-3" style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateX(0)' : 'translateX(-12px)',
                transition: `opacity 0.4s ease ${i * 0.1 + 0.3}s, transform 0.4s ease ${i * 0.1 + 0.3}s`,
              }}>
                <Icon size={13} className={cls} />
                <span className="text-xs font-semibold text-muted">{label}</span>
                <span className={`ml-auto text-xs font-black tabular-nums ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-12 py-12 relative">
        <div className="absolute inset-y-0 left-0 w-px pointer-events-none bg-[linear-gradient(180deg,transparent,var(--accent-dim)_40%,var(--accent-dim)_60%,transparent)]" />

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
              Start Your Shift
            </h1>
            <p className="text-sm mt-1.5 text-muted">Sign in to see today&apos;s deliveries</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.5s ease 0.25s, transform 0.5s ease 0.25s',
          }}>

            <div className="flex flex-col gap-1.5">
              <label className={`text-[9px] font-black tracking-[0.25em] uppercase transition-colors ${focused === 'email' ? 'text-accent' : 'text-muted'}`}>
                Email
              </label>
              <input
                type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                placeholder="driver@gofastdelivery.ca"
                className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium text-foreground outline-none transition-all border-[1.5px] ${
                  focused === 'email'
                    ? 'bg-surface border-accent/50 shadow-[0_0_0_3px_var(--accent-dim)]'
                    : 'bg-background border-border'
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`text-[9px] font-black tracking-[0.25em] uppercase transition-colors ${focused === 'password' ? 'text-accent' : 'text-muted'}`}>
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
                      ? 'bg-surface border-accent/50 shadow-[0_0_0_3px_var(--accent-dim)]'
                      : 'bg-background border-border'
                  }`}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors">
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
              className="group relative w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-black text-base text-white mt-2 overflow-hidden transition-all disabled:opacity-60 tracking-[0.03em] bg-accent hover:bg-accent-hover shadow-[0_6px_28px_var(--accent-glow)] hover:shadow-[0_8px_40px_var(--accent-glow)]">
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.1)_50%,transparent_60%)]" />
              {loading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Signing in…</>
              ) : (
                <><Truck size={16} strokeWidth={2.2} />Begin Shift<ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>

        </div>
      </div>

      <style>{`
        @keyframes streak-drive {
          0%   { transform: translateX(-110%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(200vw); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
