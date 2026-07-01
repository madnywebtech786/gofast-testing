'use client'
import Link from 'next/link'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'
import { ArrowRight, Zap } from 'lucide-react'

const STREAKS = [
  { y: '18%',  w: '38%', delay: '0s',    dur: '3.2s', opacity: 0.07 },
  { y: '34%',  w: '55%', delay: '0.7s',  dur: '3.8s', opacity: 0.05 },
  { y: '52%',  w: '28%', delay: '0.3s',  dur: '2.9s', opacity: 0.09 },
  { y: '67%',  w: '44%', delay: '1.1s',  dur: '4.1s', opacity: 0.04 },
  { y: '80%',  w: '62%', delay: '0.5s',  dur: '3.5s', opacity: 0.06 },
  { y: '12%',  w: '20%', delay: '1.6s',  dur: '2.6s', opacity: 0.05 },
  { y: '88%',  w: '35%', delay: '0.9s',  dur: '3.0s', opacity: 0.04 },
]

const TRUST_ITEMS = ['8000+ deliveries', '99.2% on-time', 'Calgary-based', 'No hidden fees']

export default function CTASection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 })

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ background: '#faf8f4' }}
    >
      {/* Animated speed streaks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STREAKS.map((s, i) => (
          <div
            key={i}
            className="absolute left-0 h-px"
            style={{
              top: s.y,
              width: s.w,
              background: `linear-gradient(90deg, transparent, rgba(255,88,13,${s.opacity * 8}), transparent)`,
              animation: `speed-streak ${s.dur} ease-in-out ${s.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,88,13,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,88,13,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Orange bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(255,88,13,0.12) 0%, transparent 60%)' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-36 flex flex-col items-center">

        {/* Eyebrow */}
        <div
          className="flex items-center gap-2 mb-8"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <div className="h-px w-8" style={{ background: 'rgba(255,88,13,0.5)' }} />
          <span
            className="text-[10px] font-black tracking-[0.3em] uppercase"
            style={{ color: 'rgba(255,88,13,0.7)' }}
          >
            Ready when you are
          </span>
          <div className="h-px w-8" style={{ background: 'rgba(255,88,13,0.5)' }} />
        </div>

        {/* Giant headline */}
        <div
          className="text-center mb-6"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
          }}
        >
          <h2
            className="font-black leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', color: '#0d0d0d' }}
          >
            Ship It.
          </h2>
          <h2
            className="font-black leading-[0.95] tracking-tight"
            style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              WebkitTextStroke: '2px rgba(255,88,13,0.5)',
              color: 'transparent',
            }}
          >
            Today.
          </h2>
        </div>

        {/* Sub */}
        <p
          className="text-base md:text-lg text-center max-w-xl leading-relaxed mb-10"
          style={{
            color: 'rgba(0,0,0,0.5)',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 0.22s, transform 0.6s ease 0.22s',
          }}
        >
          Join thousands of customers who trust GoFastDelivery for same-day courier service across the city.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 mb-14"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 0.32s, transform 0.6s ease 0.32s',
          }}
        >
          <Link
            href="/login"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-sm text-white transition-all cta-pulse hover:scale-105"
            style={{ background: '#ff580d', fontSize: '0.95rem' }}
          >
            <Zap size={16} strokeWidth={2.5} />
            Create Free Account
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <a
            href="#contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all hover:border-white/30"
            style={{
              border: '1.5px solid rgba(0,0,0,0.15)',
              color: 'rgba(0,0,0,0.65)',
              fontSize: '0.95rem',
            }}
          >
            Contact Us
          </a>
        </div>

        {/* Trust strip */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.42s',
          }}
        >
          {TRUST_ITEMS.map((item, i) => (
            <span key={item} className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'rgba(0,0,0,0.45)' }}>
              <span className="w-1 h-1 rounded-full" style={{ background: i % 2 === 0 ? '#ff580d' : '#1bb908', opacity: 0.7 }} />
              {item}
            </span>
          ))}
        </div>

      </div>

      {/* Bottom rule */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,88,13,0.3), rgba(27,185,8,0.2), transparent)' }}
      />
    </section>
  )
}
