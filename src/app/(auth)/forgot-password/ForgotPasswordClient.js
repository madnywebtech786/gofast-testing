'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordClient() {
  const router  = useRouter()
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [focused, setFocused] = useState(false)

  // Clear any stale password-reset session data when landing on this page
  useEffect(() => {
    sessionStorage.removeItem('pr_email')
    sessionStorage.removeItem('pr_token')
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || 'Too many requests. Please wait a few minutes and try again.')
        } else {
          setError('Unable to send the code right now. Please try again in a moment.')
        }
        return
      }
      // Store email in sessionStorage for the OTP page, then navigate immediately
      sessionStorage.setItem('pr_email', email.toLowerCase().trim())
      setSent(true)
      router.push('/verify-otp')
    } catch {
      setError('Could not connect. Please check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">

      {/* ── LEFT: brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden p-14 bg-background">
        <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-50" />
        <div className="absolute pointer-events-none -top-20 -left-20 w-[450px] h-[450px] rounded-full bg-secondary/10 blur-[40px]" />
        <div className="absolute pointer-events-none -bottom-16 -right-16 w-[350px] h-[350px] rounded-full bg-accent/8 blur-[40px]" />

        <div className="relative">
          <Image src="/images/logo.png" alt="GoFastDelivery" width={130} height={44} className="h-10 w-auto object-contain" />
        </div>

        <div className="relative">
          <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 bg-accent/10 text-accent">
            Account Recovery
          </span>
          <h2 className="font-black leading-[0.92] tracking-tight mb-5 text-foreground" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
            Forgot<br />
            your<br />
            <span className="text-accent">password?</span>
          </h2>
          <p className="text-sm leading-relaxed max-w-xs text-muted">
            No worries — enter your email and we&apos;ll send you a secure one-time code to reset it.
          </p>
        </div>

        <div className="relative flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-xs font-semibold text-muted">
            Secure · Encrypted · Expires in 5 minutes
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
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary transition-colors">
            <ArrowRight size={11} className="rotate-180" />Back to Login
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto pt-8">

          {sent ? (
            <div className="flex flex-col items-center text-center gap-5 py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #15960a 100%)' }}>
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-2xl text-foreground mb-2">Check your inbox</h2>
                <p className="text-sm text-muted leading-relaxed">
                  If <strong className="text-foreground">{email}</strong> is linked to an account,
                  we&apos;ve sent a 6-digit code.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-black leading-tight tracking-tight text-foreground mb-2" style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)' }}>
                  Reset password
                </h1>
                <p className="text-sm text-muted">
                  Enter your account email and we&apos;ll send you a verification code.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email"
                    className={`text-[11px] font-black tracking-widest uppercase transition-colors ${focused ? 'text-accent' : 'text-muted'}`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={14}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${focused ? 'text-accent' : 'text-muted'}`} />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="you@example.com"
                      className={`w-full outline-none transition-all text-sm font-medium rounded-xl text-foreground pl-10 pr-4 py-3.5 border-[1.5px] ${
                        focused
                          ? 'bg-surface border-accent/50 shadow-[0_0_0_3px_var(--accent-glow)]'
                          : 'bg-background border-border'
                      }`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold bg-danger/6 border border-danger/18 text-danger">
                    <AlertCircle size={13} className="shrink-0" />{error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm text-white bg-accent hover:bg-accent-hover hover:-translate-y-px transition-all disabled:opacity-50 shadow-[0_6px_24px_var(--accent-glow)] hover:shadow-[0_10px_32px_var(--accent-glow)]"
                >
                  {loading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Sending code…</>
                    : <>Send Verification Code <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
                  }
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted">
                  Remembered your password?{' '}
                  <Link href="/login" className="font-bold text-secondary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
