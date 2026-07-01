'use client'
import { UserPlus, Calendar, Truck, CheckCircle } from 'lucide-react'
import GradientHeading from './GradientHeading'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'

const STEPS = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Create Account',
    detail: 'Free in 2 min',
    desc: 'Sign up for free in under 2 minutes. No credit card, no commitment. Just your name and email.',
    accent: '#ff580d',
    dim: 'rgba(255,88,13,0.08)',
    tilt: '-rotate-1',
    side: 'left',
  },
  {
    num: '02',
    icon: Calendar,
    title: 'Book a Pickup',
    detail: 'Instant booking',
    desc: 'Tell us what, where, and when. Scheduling takes 60 seconds and you get instant confirmation.',
    accent: '#1bb908',
    dim: 'rgba(27,185,8,0.08)',
    tilt: 'rotate-1',
    side: 'right',
  },
  {
    num: '03',
    icon: Truck,
    title: 'Driver Collects',
    detail: 'Live status updates',
    desc: 'A verified driver picks up your package and you can track every status update in real time, from Pick Up to Delivery.',
    accent: '#ff580d',
    dim: 'rgba(255,88,13,0.08)',
    tilt: '-rotate-1',
    side: 'left',
  },
  {
    num: '04',
    icon: CheckCircle,
    title: 'Delivered',
    detail: 'Same day, guaranteed',
    desc: 'Your package arrives at its destination fast and intact.',
    accent: '#1bb908',
    dim: 'rgba(27,185,8,0.08)',
    tilt: 'rotate-1',
    side: 'right',
  },
]

function StepCard({ step, index, isVisible }) {
  const Icon = step.icon
  const isOrange = step.accent === '#ff580d'

  return (
    <div
      className={`relative flex flex-col ${step.side === 'right' ? 'items-end md:items-end' : 'items-start md:items-start'}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateY(0) scale(1)'
          : `translateY(48px) scale(0.96)`,
        transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 0.13}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 0.13}s`,
      }}
    >
      {/* Card */}
      <div
        className={`relative group bg-white rounded-3xl p-7 shadow-sm hover:shadow-xl ${step.tilt} transition-all duration-300 hover:scale-[1.02] hover:rotate-0 cursor-default`}
        style={{
          maxWidth: '320px',
          width: '100%',
          border: '1.5px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Paper grain texture */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
          }}
        />

        {/* Top: number stamp + icon */}
        <div className="flex items-start justify-between gap-4 mb-5">
          {/* Ink-stamp number */}
          <div className="relative">
            <span
              className="block font-black leading-none select-none"
              style={{
                fontSize: '5rem',
                color: step.dim,
                lineHeight: 0.85,
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {step.num}
            </span>
            {/* Stamp underline */}
            <div
              className="absolute -bottom-1 left-0 h-0.5 rounded-full transition-all duration-500 group-hover:w-full"
              style={{ background: step.accent, width: '60%' }}
            />
          </div>

          {/* Icon bubble */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{
              background: step.dim,
              border: `1.5px solid ${step.accent}30`,
            }}
          >
            <Icon size={20} strokeWidth={2.2} style={{ color: step.accent }} />
          </div>
        </div>

        {/* Detail pill */}
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3"
          style={{ background: step.dim, color: step.accent }}
        >
          {step.detail}
        </span>

        {/* Text */}
        <h3
          className="text-lg font-black mb-2 leading-tight"
          style={{ color: 'var(--landing-text)' }}
        >
          {step.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-2)' }}>
          {step.desc}
        </p>

        {/* Bottom accent strip */}
        <div
          className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, ${step.accent}, transparent)` }}
        />
      </div>
    </div>
  )
}

export default function ProcessSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.06 })

  return (
    <section
      id="process"
      ref={ref}
      className="relative py-24 overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Paper grain on section bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '512px 512px',
          opacity: 0.018,
        }}
      />

      {/* Faint dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Soft orange bloom top-right */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,88,13,0.07) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />
      {/* Soft green bloom bottom-left */}
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(27,185,8,0.06) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-20">
          <span
            className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'var(--brand-orange-dim)', color: 'var(--brand-orange)' }}
          >
            How It Works
          </span>
          <GradientHeading
            parts={[
              { text: 'Four Steps ', color: 'black' },
              { text: 'to Fast',     color: 'black', highlight: true },
              { text: ' Delivery',   color: 'green' },
            ]}
            className="text-2xl sm:text-3xl lg:text-4xl"
          />
          <p className="mt-4 text-base max-w-md mx-auto" style={{ color: 'var(--landing-text-2)' }}>
            From sign-up to doorstep, the whole process takes minutes, not hours.
          </p>
        </div>

        {/* ── Desktop zigzag layout ── */}
        <div className="hidden md:block relative">

          {/* SVG connecting path — single continuous S-curve 1→2→3→4 */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 800 780"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            {/* Full path: step1 (left,top) → step2 (right,offset) → step3 (left,lower) → step4 (right,offset) */}
            <path
              d="M 160 170 C 160 310, 640 200, 640 310 C 640 420, 160 390, 160 500 C 160 590, 640 490, 640 600"
              fill="none"
              stroke="url(#pathGrad)"
              strokeWidth="1.8"
              strokeDasharray="7 5"
              strokeLinecap="round"
              className={`process-path${isVisible ? ' animate' : ''}`}
            />
            <defs>
              <linearGradient id="pathGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#ff580d" stopOpacity="0.35" />
                <stop offset="50%"  stopColor="#ff580d" stopOpacity="0.2"  />
                <stop offset="75%"  stopColor="#1bb908" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1bb908" stopOpacity="0.35" />
              </linearGradient>
            </defs>
          </svg>

          {/* Row 1: steps 1 & 2 */}
          <div className="grid grid-cols-2 gap-16 mb-16">
            <StepCard step={STEPS[0]} index={0} isVisible={isVisible} />
            <div className="flex justify-end mt-24">
              <StepCard step={STEPS[1]} index={1} isVisible={isVisible} />
            </div>
          </div>

          {/* Row 2: steps 3 & 4 */}
          <div className="grid grid-cols-2 gap-16">
            <StepCard step={STEPS[2]} index={2} isVisible={isVisible} />
            <div className="flex justify-end mt-24">
              <StepCard step={STEPS[3]} index={3} isVisible={isVisible} />
            </div>
          </div>
        </div>

        {/* ── Mobile vertical stack ── */}
        <div className="flex flex-col gap-6 md:hidden">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex flex-col items-center">
              <StepCard step={step} index={i} isVisible={isVisible} />
              {i < STEPS.length - 1 && (
                <div
                  className="mt-4 flex flex-col items-center gap-1"
                  style={{ color: 'rgba(255,88,13,0.3)' }}
                >
                  {[0,1,2].map(d => (
                    <div key={d} className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,88,13,0.35)' }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div
          className="mt-20 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
          style={{
            background: 'white',
            border: '1.5px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.05)',
          }}
        >
          <div>
            <p className="text-xl font-black" style={{ color: 'var(--landing-text)' }}>
              Ready to ship your first package?
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--landing-text-2)' }}>
              Create your free account and book a pickup in under 3 minutes.
            </p>
          </div>
          <a
            href="/login"
            className="shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-sm transition-all hover:opacity-90 shadow-lg cta-pulse"
            style={{ background: 'var(--brand-orange)', whiteSpace: 'nowrap' }}
          >
            Get Started Free
          </a>
        </div>

      </div>
    </section>
  )
}
