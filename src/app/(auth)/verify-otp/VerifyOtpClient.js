'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, ArrowRight, CheckCircle2, RotateCcw, Mail } from 'lucide-react'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

export default function VerifyOtpClient() {
  const router  = useRouter()
  const [email,    setEmail]    = useState('')
  const [digits,   setDigits]   = useState(Array(OTP_LENGTH).fill(''))
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown,  setCooldown]  = useState(0)
  const inputRefs = useRef([])
  const timerRef  = useRef(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('pr_email')
    if (!stored) { router.replace('/forgot-password'); return }
    setEmail(stored)
    // Auto-focus first box
    inputRefs.current[0]?.focus()
  }, [router])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    timerRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [cooldown])

  function handleDigitChange(index, value) {
    setError('')
    // Allow only one digit
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...digits]
    next[index] = digit
    setDigits(next)
    // Move to next box if filled
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    // Auto-submit when all filled
    if (digit && index === OTP_LENGTH - 1) {
      const code = [...next].join('')
      if (code.length === OTP_LENGTH) submitOtp(code)
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      setError('')
      if (digits[index]) {
        // Clear current
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        // Move back and clear previous
        const next = [...digits]
        next[index - 1] = ''
        setDigits(next)
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    setError('')
    const lastFilled = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[lastFilled]?.focus()
    if (pasted.length === OTP_LENGTH) submitOtp(pasted)
  }

  const submitOtp = useCallback(async (code) => {
    if (loading || success) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || 'Too many attempts. Please wait and try again.')
        } else if (res.status >= 500) {
          setError('Unable to verify the code right now. Please try again in a moment.')
        } else {
          setError(data.error || 'Invalid code. Please try again.')
        }
        // Clear digits on wrong code
        setDigits(Array(OTP_LENGTH).fill(''))
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
        return
      }
      // Store reset token and navigate immediately
      sessionStorage.setItem('pr_token', data.resetToken)
      setSuccess(true)
      router.push('/reset-password')
    } catch {
      setError('Could not connect. Please check your internet connection.')
    } finally {
      setLoading(false)
    }
  }, [email, loading, success, router])

  async function handleResend() {
    if (resending || cooldown > 0) return
    setResending(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, resend: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || 'Please wait before requesting a new code.')
        } else {
          setError('Unable to resend the code right now. Please try again in a moment.')
        }
        return
      }
      setDigits(Array(OTP_LENGTH).fill(''))
      setCooldown(RESEND_COOLDOWN)
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    } catch {
      setError('Could not connect. Please check your internet connection.')
    } finally {
      setResending(false)
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return }
    submitOtp(code)
  }

  const allFilled = digits.every(d => d !== '')

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
            Verification
          </span>
          <h2 className="font-black leading-[0.92] tracking-tight mb-5 text-foreground" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.5rem)' }}>
            Check<br />
            your<br />
            <span className="text-accent">inbox.</span>
          </h2>
          <p className="text-sm leading-relaxed max-w-xs text-muted">
            We&apos;ve sent a 6-digit code to your email. It&apos;s valid for 5 minutes — enter it to continue.
          </p>
        </div>

        <div className="relative flex flex-col gap-3">
          {[
            { icon: '🔒', text: 'One-time use only' },
            { icon: '⏱', text: 'Expires in 5 minutes' },
            { icon: '🛡', text: 'Locked after 5 wrong attempts' },
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
          <Link href="/forgot-password" className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary transition-colors">
            <ArrowRight size={11} className="rotate-180" />Change email
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
                <h2 className="font-black text-2xl text-foreground mb-2">Code verified!</h2>
                <p className="text-sm text-muted">Redirecting you to reset your password…</p>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="mb-8">
                <h1 className="font-black leading-tight tracking-tight text-foreground mb-2" style={{ fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)' }}>
                  Enter your code
                </h1>
                {email && (
                  <div className="flex items-center gap-2 mt-1">
                    <Mail size={13} className="text-muted shrink-0" />
                    <p className="text-sm text-muted">
                      Sent to <strong className="text-foreground">{email}</strong>
                    </p>
                  </div>
                )}
              </div>

              <form onSubmit={handleManualSubmit} className="flex flex-col gap-6">

                {/* OTP boxes */}
                <div>
                  <label className="text-[11px] font-black tracking-widest uppercase text-muted block mb-3">
                    Verification Code
                  </label>
                  <div className="flex gap-2.5" onPaste={handlePaste}>
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        disabled={loading || success}
                        className="flex-1 min-w-0 text-center font-black outline-none transition-all rounded-xl border-[2px] py-4 text-xl"
                        style={{
                          color:       'var(--fg)',
                          background:  digit ? 'var(--accent-glow)' : 'var(--background)',
                          borderColor: error
                            ? 'var(--danger)'
                            : digit
                            ? 'var(--accent)'
                            : 'var(--border)',
                          boxShadow: digit && !error
                            ? '0 0 0 3px var(--accent-glow)'
                            : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted mt-2">You can also paste the code directly.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold bg-danger/6 border border-danger/18 text-danger">
                    <AlertCircle size={13} className="shrink-0" />{error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !allFilled}
                  className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-black text-sm text-white bg-accent hover:bg-accent-hover hover:-translate-y-px transition-all disabled:opacity-50 shadow-[0_6px_24px_var(--accent-glow)] hover:shadow-[0_10px_32px_var(--accent-glow)]"
                >
                  {loading
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Verifying…</>
                    : <>Verify Code <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" /></>
                  }
                </button>
              </form>

              {/* Resend */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-sm text-muted text-center mb-3">Didn&apos;t receive the email?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border-[1.5px] disabled:opacity-50"
                  style={{
                    color:        cooldown > 0 ? 'var(--fg-3)' : 'var(--accent)',
                    borderColor:  cooldown > 0 ? 'var(--border)' : 'var(--accent)',
                    background:   'transparent',
                  }}
                >
                  {resending
                    ? <><div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Resending…</>
                    : cooldown > 0
                    ? <>Resend in {cooldown}s</>
                    : <><RotateCcw size={13} />Resend Code</>
                  }
                </button>
                <p className="text-center text-[11px] mt-3 text-muted">
                  Check your spam folder if you don&apos;t see it.
                </p>
              </div>

            </>
          )}

        </div>
      </div>
    </div>
  )
}
