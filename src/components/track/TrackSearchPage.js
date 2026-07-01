'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Package, ArrowRight, AlertCircle, Loader2, Truck, X,
} from 'lucide-react'

const TOKEN_RE = /^[A-Za-z0-9_-]{6,32}$/

function clientValidate(token) {
  if (!token) return 'Please enter a tracking number.'
  if (!TOKEN_RE.test(token)) return 'Tracking numbers are 6 to 32 alphanumeric characters (letters, numbers, - and _).'
  return null
}

export default function TrackSearchPage() {
  const router = useRouter()
  const [query,    setQuery]    = useState('')
  const [uiState,  setUiState]  = useState('idle') // idle | loading | not-found | error | rate-limited
  const [errorMsg, setErrorMsg] = useState('')
  const abortRef  = useRef(null)

  const isLoading = uiState === 'loading'
  const isError   = ['error', 'not-found', 'rate-limited'].includes(uiState)

  const doSearch = useCallback(async (token) => {
    const clean = token.trim()

    const validationError = clientValidate(clean)
    if (validationError) {
      setUiState('error')
      setErrorMsg(validationError)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setUiState('loading')
    setErrorMsg('')

    try {
      const res = await fetch(`/api/track/lookup?token=${encodeURIComponent(clean)}`, {
        signal: controller.signal,
        cache: 'no-store',
      })

      if (abortRef.current !== controller) return

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') ?? '60'
        setUiState('rate-limited')
        setErrorMsg(`Too many searches. Please wait ${retryAfter} seconds before trying again.`)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setUiState('not-found')
        setErrorMsg(data.error ?? 'No delivery found for that tracking number.')
        return
      }

      // Valid — redirect then clean up so back-nav shows a fresh form
      setQuery('')
      setUiState('idle')
      router.push(`/track/${encodeURIComponent(clean)}`)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setUiState('error')
      setErrorMsg('Network error. Please check your connection and try again.')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [router])

  function handleSubmit(e) {
    e.preventDefault()
    doSearch(query)
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">

      {/* Background texture */}
      <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-40" />
      <div className="absolute pointer-events-none -top-20 -left-20 w-112.5 h-112.5 rounded-full bg-accent/10 blur-2xl" />
      <div className="absolute pointer-events-none -bottom-16 -right-16 w-100 h-100 rounded-full bg-secondary/8 blur-2xl" />

      {/* Info bar */}
      <div className="bg-accent border-b border-black/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-7 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/85">Calgary&apos;s Same-Day Courier</span>
          <span className="text-[11px] font-semibold flex items-center gap-1.5 text-white/85">
            <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />
            Live Tracking
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-surface border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <Image src="/images/logo.png" alt="GoFastDelivery" width={120} height={40} className="h-8 w-auto object-contain" priority />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-accent transition-colors">
            <ArrowRight size={11} className="rotate-180" />
            GoFastDelivery.ca
          </Link>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto px-4 sm:px-6 pt-12 pb-20">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5 bg-accent/8 border border-accent/18">
            <Truck size={24} strokeWidth={2} className="text-accent" />
          </div>
          <h1 className="font-black leading-tight tracking-tight mb-2 text-foreground" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)' }}>
            Track Your Delivery
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            Enter your tracking number to see the latest status and route.
          </p>
        </div>

        {/* Search card */}
        <form onSubmit={handleSubmit} noValidate className="mb-6">
          <div className="rounded-2xl p-5 bg-surface border border-border shadow-sm">
            <div className="h-0.75 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-hover))] mb-4" />

            <label htmlFor="tracking-input" className="block text-[11px] font-black tracking-widest uppercase mb-2 text-muted">
              Tracking Number
            </label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14}
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isError ? 'text-danger' : 'text-muted'}`} />
                <input
                  id="tracking-input"
                  type="text"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    if (isError) { setUiState('idle'); setErrorMsg('') }
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="e.g. Ztb7iZlQrGcT"
                  autoComplete="off" autoCorrect="off" spellCheck={false}
                  maxLength={32} disabled={isLoading}
                  className={`w-full outline-none text-sm font-medium transition-all disabled:opacity-60 rounded-[10px] font-mono tracking-[0.04em] text-foreground pl-10 pr-9 py-3 border-[1.5px] ${
                    isError
                      ? 'border-danger bg-danger/4 shadow-[0_0_0_3px_var(--danger-bg)]'
                      : 'border-border bg-background'
                  }`}
                />
                {query && !isLoading && (
                  <button type="button"
                    onClick={() => { setQuery(''); setUiState('idle'); setErrorMsg('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:opacity-70 transition-opacity"
                    aria-label="Clear">
                    <X size={13} />
                  </button>
                )}
              </div>

              <button type="submit" disabled={isLoading || !query.trim()}
                className="flex items-center justify-center gap-2 px-5 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 min-w-25 bg-accent hover:bg-accent-hover shadow-[0_4px_16px_var(--accent-glow)]">
                {isLoading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <>Track <ArrowRight size={13} /></>
                }
              </button>
            </div>

            {isError && (
              <div className={`flex items-start gap-2 mt-3 text-xs font-semibold px-3 py-2.5 rounded-xl ${
                uiState === 'rate-limited'
                  ? 'text-secondary bg-secondary/7 border border-secondary/20'
                  : 'text-danger bg-danger/7 border border-danger/18'
              }`}>
                <AlertCircle size={12} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                {errorMsg}
              </div>
            )}

            <p className="text-[10px] mt-3 leading-relaxed text-muted">
              Your tracking number is on your booking confirmation email. Also visible in your{' '}
              <Link href="/login" className="font-bold text-accent hover:underline">customer account</Link>.
            </p>
          </div>
        </form>

        {/* Idle empty state */}
        {uiState === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Package size={28} strokeWidth={1.5} className="text-foreground/12" />
            <p className="text-xs font-medium text-muted">
              Enter your tracking number above and press Track
            </p>
          </div>
        )}

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-5 mt-8">
          {['Live status updates', '99.2% on-time', 'Calgary-based'].map((t, i) => (
            <span key={t} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
              <span className={`w-1 h-1 rounded-full inline-block ${i % 2 === 0 ? 'bg-accent' : 'bg-secondary'}`} />
              {t}
            </span>
          ))}
        </div>
      </main>
    </div>
  )
}
