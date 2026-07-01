'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Star, Quote } from 'lucide-react'
import GradientHeading from './GradientHeading'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'

const REVIEWS = [
  {
    name: 'Sarah M.',
    city: 'Calgary',
    role: 'Small Business Owner',
    initial: 'S',
    color: '#e51c1c',
    quote: 'Absolutely incredible service. My package arrived two hours after pickup, faster than I expected. Will use GoFastDelivery for all my business deliveries from now on.',
    highlight: 'two hours after pickup',
  },
  {
    name: 'James T.',
    city: 'Airdrie',
    role: 'E-commerce Seller',
    initial: 'J',
    color: '#1bb908',
    quote: 'The real-time tracking is a game changer. I knew exactly where my delivery was the whole time. Professional, prompt, and perfectly priced.',
    highlight: 'real-time tracking',
  },
  {
    name: 'Lisa K.',
    city: 'Cochrane',
    role: 'Regular Customer',
    initial: 'L',
    color: '#e51c1c',
    quote: 'Skeptical about same-day delivery to Cochrane, but they absolutely nailed it. Friendly driver, careful handling, and perfectly on time every single visit.',
    highlight: 'perfectly on time',
  },
  {
    name: 'Mark D.',
    city: 'Okotoks',
    role: 'Logistics Manager',
    initial: 'M',
    color: '#1bb908',
    quote: "Switched our company's same-day deliveries to GoFast three months ago. Zero missed pickups, zero client complaints. The live tracking dashboard alone is worth every penny.",
    highlight: 'Zero missed pickups',
  },
  {
    name: 'Rachel B.',
    city: 'Chestermere',
    role: 'Online Retailer',
    initial: 'R',
    color: '#e51c1c',
    quote: 'Booked at 9am, delivered by noon. My customers are happier than ever and I never have to worry about last-mile delivery again. Genuinely the best in Calgary.',
    highlight: 'best in Calgary',
  },
]

function highlightQuote(quote, highlight) {
  if (!highlight) return quote
  const idx = quote.toLowerCase().indexOf(highlight.toLowerCase())
  if (idx === -1) return quote
  return (
    <>
      {quote.slice(0, idx)}
      <mark
        style={{
          background: 'none',
          color: 'var(--brand-green)',
          fontStyle: 'normal',
          fontWeight: 900,
        }}
      >
        {quote.slice(idx, idx + highlight.length)}
      </mark>
      {quote.slice(idx + highlight.length)}
    </>
  )
}

export default function ReviewsSection() {
  const [active, setActive] = useState(0)
  const [prev, setPrev] = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const timerRef = useRef(null)
  const [ref, sectionVisible] = useIntersectionObserver({ threshold: 0.1 })

  const goTo = useCallback((idx) => {
    if (transitioning || idx === active) return
    setTransitioning(true)
    setPrev(active)
    setActive(idx)
    setTimeout(() => {
      setPrev(null)
      setTransitioning(false)
    }, 500)
  }, [active, transitioning])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActive(a => {
        const next = (a + 1) % REVIEWS.length
        setPrev(a)
        setTransitioning(true)
        setTimeout(() => { setPrev(null); setTransitioning(false) }, 500)
        return next
      })
    }, 5000)
  }, [])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  const review = REVIEWS[active]

  return (
    <section
      id="reviews"
      ref={ref}
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Warm texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.035) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      <div className="absolute top-0 right-0 w-125 h-125 pointer-events-none" style={{
        background: 'radial-gradient(circle at top right, rgba(255,88,13,0.05) 0%, transparent 60%)',
        filter: 'blur(60px)',
      }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16" style={{
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <span
            className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
          >
            Customer Reviews
          </span>
          <GradientHeading
            parts={[
              { text: 'Real Words from ', color: 'black' },
              { text: 'Real',   color: 'black', highlight: true },
              { text: ' Customers', color: 'green' },
            ]}
            className="text-2xl sm:text-3xl lg:text-4xl"
          />
        </div>

        {/* Slider stage */}
        <div style={{
          opacity: sectionVisible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.15s',
        }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 xl:gap-10 items-stretch">

            {/* ── MAIN QUOTE CARD ── */}
            <div
              className="relative rounded-3xl overflow-hidden flex flex-col justify-between"
              style={{
                background: 'linear-gradient(145deg, #fdfcfb 0%, #fff8f5 100%)',
                border: '1.5px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 48px rgba(0,0,0,0.07)',
                minHeight: '320px',
                padding: '2.5rem',
              }}
            >
              {/* Accent left stripe */}
              <div
                className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all duration-500"
                style={{ background: `linear-gradient(180deg, ${review.color}, ${review.color}40)` }}
              />

              {/* Giant quote icon */}
              <div
                className="absolute top-6 right-8 pointer-events-none"
                style={{ color: 'rgba(255,88,13,0.07)' }}
              >
                <Quote size={80} strokeWidth={1} fill="currentColor" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-6 relative">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="var(--stat-color)" color="var(--stat-color)" />
                ))}
              </div>

              {/* Quote text — animates on change */}
              <div
                className="relative flex-1"
                key={active}
                style={{ animation: 'review-slide-in 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
              >
                <p
                  className="font-black leading-snug"
                  style={{
                    fontSize: 'clamp(1.25rem, 2.5vw, 1.65rem)',
                    color: 'var(--landing-text)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  &ldquo;{highlightQuote(review.quote, review.highlight)}&rdquo;
                </p>
              </div>

              {/* Author row */}
              <div
                className="flex items-center gap-4 mt-8 pt-6 relative"
                key={`author-${active}`}
                style={{ borderTop: '1px solid rgba(0,0,0,0.06)', animation: 'review-slide-in 0.5s cubic-bezier(0.22,1,0.36,1) 0.06s both' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shrink-0"
                  style={{ background: review.color, boxShadow: `0 4px 16px ${review.color}50` }}
                >
                  {review.initial}
                </div>
                <div>
                  <p className="font-black text-base leading-none" style={{ color: 'var(--landing-text)' }}>{review.name}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--landing-text-2)' }}>
                    {review.role} · {review.city}, AB
                  </p>
                </div>
                <div
                  className="ml-auto px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0"
                  style={{ background: 'rgba(27,185,8,0.1)', color: '#1bb908' }}
                >
                  ✓ Verified
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex flex-col gap-4">

              {/* Aggregate score card */}
              <div
                className="rounded-2xl p-6 flex items-center gap-5"
                style={{
                  background: 'linear-gradient(135deg, #0d0d0d, #1a0800)',
                  border: '1px solid rgba(255,88,13,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
              >
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-5xl font-black leading-none" style={{ color: 'var(--stat-color)' }}>4.9</span>
                  <div className="flex gap-0.5 mt-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={11} fill="#ff580d" color="#ff580d" />
                    ))}
                  </div>
                </div>
                <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.07)' }} />
                <div className="flex flex-col gap-2 text-left">
                  <p className="text-xs font-black text-white leading-none">8000+ deliveries</p>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>across Calgary & area</p>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black"
                    style={{ background: 'rgba(255,88,13,0.15)', color: '#ff580d' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#ff580d', animation: 'ping 1.4s infinite' }} />
                    99.2% on-time
                  </div>
                </div>
              </div>

              {/* Reviewer thumbnails */}
              <div
                className="rounded-2xl p-4 flex flex-col gap-1"
                style={{
                  background: '#fafaf9',
                  border: '1.5px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                {REVIEWS.map((r, i) => (
                  <button
                    key={r.name}
                    onClick={() => { goTo(i); resetTimer() }}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left w-full transition-all duration-200"
                    style={{
                      background: i === active ? 'white' : 'transparent',
                      boxShadow: i === active ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
                      border: i === active ? `1.5px solid ${r.color}30` : '1.5px solid transparent',
                    }}
                    aria-label={`View review from ${r.name}`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all duration-200"
                      style={{
                        background: i === active ? r.color : 'rgba(0,0,0,0.08)',
                        color: i === active ? 'white' : 'rgba(0,0,0,0.3)',
                        boxShadow: i === active ? `0 2px 8px ${r.color}50` : 'none',
                      }}
                    >
                      {r.initial}
                    </div>
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-black leading-none truncate transition-colors duration-200"
                        style={{ color: i === active ? 'var(--landing-text)' : 'rgba(0,0,0,0.35)' }}
                      >
                        {r.name}
                      </p>
                      <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: 'rgba(0,0,0,0.25)' }}>
                        {r.city}
                      </p>
                    </div>
                    {/* Stars — only when active */}
                    {i === active && (
                      <div className="flex gap-0.5 shrink-0">
                        {[...Array(5)].map((_, s) => (
                          <Star key={s} size={9} fill={r.color} color={r.color} />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.07)' }}>
                <div
                  key={active}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${review.color}, ${review.color}80)`,
                    animation: 'review-progress 5s linear forwards',
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
