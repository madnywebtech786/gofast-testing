'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Check } from 'lucide-react'

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
    { label: '',            color: 'var(--border)' },
    { label: 'Weak',        color: '#dc2626' },
    { label: 'Fair',        color: '#d97706' },
    { label: 'Good',        color: '#ca8a04' },
    { label: 'Strong',      color: '#16a34a' },
    { label: 'Very Strong', color: '#15803d' },
  ]
  return { score, ...map[score] }
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = getStrength(password)
  if (!password) return null

  const rules = [
    { met: password.length >= 8,          text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password),        text: 'One uppercase letter' },
    { met: /[0-9]/.test(password),        text: 'One number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'One special character (!@#$…)' },
  ]

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= score ? color : 'var(--border)' }} />
          ))}
        </div>
        {label && <span className="text-[11px] font-bold shrink-0" style={{ color }}>{label}</span>}
      </div>
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResetPasswordClient() {
  const router  = useRouter()
  const [resetToken,  setResetToken]  = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [focused,     setFocused]     = useState(null)

  useEffect(() => {
    const token = sessionStorage.getItem('pr_token')
    if (!token) { router.replace('/forgot-password'); return }
    setResetToken(token)
  }, [router])

  const { score } = getStrength(password)
  const passwordStrong = score >= 4
  const passwordsMatch = password === confirm
  const canSubmit = passwordStrong && passwordsMatch && password.length > 0 && confirm.length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    if (!passwordsMatch) { setError('Passwords do not match.'); return }
    if (!passwordStrong) { setError('Please choose a stronger password.'); return }

    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resetToken, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 400) {
          setError(data.error || 'Invalid or expired reset link. Please start over.')
        } else if (res.status === 429) {
          setError('Too many attempts. Please wait a few minutes and try again.')
        } else {
          setError('Unable to reset your password right now. Please try again in a moment.')
        }
        return
      }
      // Clean up session storage
      sessionStorage.removeItem('pr_email')
      sessionStorage.removeItem('pr_token')
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Could not connect. Please check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (field) =>
    `w-full outline-none transition-all text-sm font-medium rounded-xl text-foreground pl-10 pr-11 py-3.5 border-[1.5px] ${
      focused === field
        ? 'bg-surface border-accent/50 shadow-[0_0_0_3px_var(--accent-glow)]'
        : 'bg-background border-border'
    }`

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
            Almost There
          </span>
          <h2 className="font-black leading-[0.92] tracking-tight mb-5 text-foreground" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
            Choose a<br />
            new<br />
            <span className="text-accent">password.</span>
          </h2>
          <p className="text-sm leading-relaxed max-w-xs text-muted">
            Pick something strong. We recommend a mix of letters, numbers, and symbols.
          </p>
        </div>

        <div className="relative flex flex-col gap-3">
          {[
            { icon: '🔑', text: 'Min 8 characters' },
            { icon: '🔡', text: 'One uppercase letter' },
            { icon: '🔢', text: 'One number' },
            { icon: '✳️',  text: 'One special character' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-base">{item.icon}</span>
              <span className="text-xs font-semibold text-muted">{item.text}</span>
            </div>
          ))}
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

          {success ? (
            <div className="flex flex-col items-center text-center gap-5 py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #15960a 100%)' }}>
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-2xl text-foreground mb-2">Password updated!</h2>
                <p className="text-sm text-muted leading-relaxed">
                  Your password has been reset successfully. Redirecting you to sign in…
                </p>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-black leading-tight tracking-tight text-foreground mb-2" style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)' }}>
                  New password
                </h1>
                <p className="text-sm text-muted">
                  Create a strong password for your GoFastDelivery account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password"
                    className={`text-[11px] font-black tracking-widest uppercase transition-colors ${focused === 'password' ? 'text-accent' : 'text-muted'}`}>
                    New Password
                  </label>
                  <div className="relative">
                    <Lock size={14}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${focused === 'password' ? 'text-accent' : 'text-muted'}`} />
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      maxLength={72}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••"
                      className={inputCls('password')}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={password} />
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm"
                    className={`text-[11px] font-black tracking-widest uppercase transition-colors ${focused === 'confirm' ? 'text-accent' : 'text-muted'}`}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={14}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${focused === 'confirm' ? 'text-accent' : 'text-muted'}`} />
                    <input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      maxLength={72}
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError('') }}
                      onFocus={() => setFocused('confirm')}
                      onBlur={() => setFocused(null)}
                      placeholder="••••••••"
                      className={`w-full outline-none transition-all text-sm font-medium rounded-xl text-foreground pl-10 pr-11 py-3.5 border-[1.5px] ${
                        focused === 'confirm'
                          ? 'bg-surface border-accent/50 shadow-[0_0_0_3px_var(--accent-glow)]'
                          : confirm && !passwordsMatch
                          ? 'bg-background border-danger/50 shadow-[0_0_0_3px_rgba(220,38,38,0.1)]'
                          : confirm && passwordsMatch
                          ? 'bg-background border-accent/40'
                          : 'bg-background border-border'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {confirm && !passwordsMatch && (
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--danger)' }}>
                      Passwords do not match.
                    </p>
                  )}
                  {confirm && passwordsMatch && (
                    <p className="text-[11px] font-semibold flex items-center gap-1" style={{ color: '#16a34a' }}>
                      <Check size={11} strokeWidth={3} />Passwords match
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold bg-danger/6 border border-danger/18 text-danger">
                    <AlertCircle size={13} className="shrink-0" />{error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm text-white bg-accent hover:bg-accent-hover hover:-translate-y-px transition-all disabled:opacity-50 shadow-[0_6px_24px_var(--accent-glow)] hover:shadow-[0_10px_32px_var(--accent-glow)]"
                >
                  {loading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Updating password…</>
                    : <>Reset Password <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
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
