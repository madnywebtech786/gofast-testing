'use client'
import { Building2, ShoppingBag, Users, ArrowRight, Package, Clock, Shield, Zap } from 'lucide-react'
import GradientHeading from './GradientHeading'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'

const TYPES = [
  {
    code: 'B2B',
    label: 'Business to Business',
    icon: Building2,
    accent: '#ff580d',
    accentDim: 'rgba(255,88,13,0.08)',
    accentBorder: 'rgba(255,88,13,0.18)',
    tagline: "Powering Calgary's supply chains.",
    desc: 'Logistics between companies: warehouses, offices, retailers, and suppliers. Recurring bulk runs, inter-office transfers, and time-sensitive commercial freight handled with zero disruption.',
    features: [
      { icon: Clock,   text: 'Scheduled recurring routes' },
      { icon: Package, text: 'Bulk & pallet-ready handling' },
      { icon: Shield,  text: 'Proof of delivery on every run' },
      { icon: Zap,     text: 'Priority dispatch for urgent freight' },
    ],
    stat: '500+',
    statLabel: 'businesses served',
    popular: false,
  },
  {
    code: 'B2C',
    label: 'Business to Customer',
    icon: ShoppingBag,
    accent: '#1bb908',
    accentDim: 'rgba(27,185,8,0.08)',
    accentBorder: 'rgba(27,185,8,0.18)',
    tagline: 'Your brand, at their door.',
    desc: 'From e-commerce stores to local retailers, we deliver directly to end customers same-day. Shareable status tracking links, white-glove handling, and a delivery experience that reflects your brand.',
    features: [
      { icon: Zap,     text: 'Same-day order fulfillment' },
      { icon: Shield,  text: 'Live status updates for customers' },
      { icon: Package, text: 'Fragile & high-value item care' },
      { icon: Clock,   text: 'Branded delivery experience' },
    ],
    stat: '< 3 hrs',
    statLabel: 'avg delivery time',
    popular: true,
  },
  {
    code: 'C2C',
    label: 'Customer to Customer',
    icon: Users,
    accent: '#ff580d',
    accentDim: 'rgba(255,88,13,0.08)',
    accentBorder: 'rgba(255,88,13,0.18)',
    tagline: 'Send anything, to anyone.',
    desc: 'Send gifts, sell locally, or pass along documents with ease. We pick up from one person and deliver straight to another. Same day, fully tracked, no business account needed.',
    features: [
      { icon: Zap,     text: 'On-demand same-day pickup' },
      { icon: Shield,  text: 'End-to-end status tracking' },
      { icon: Package, text: 'Gifts, marketplaces & documents' },
      { icon: Clock,   text: 'No business account required' },
    ],
    stat: '15 min',
    statLabel: 'avg pickup time',
    popular: false,
  },
]

function TypeCard({ type, index, visible }) {
  const Icon = type.icon
  const isOrange = type.accent === '#ff580d'

  return (
    <div
      className="group relative flex flex-col"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(48px)',
        transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 0.12}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${index * 0.12}s`,
      }}
    >
   

      {/* Card */}
      <div
        className="relative flex flex-col flex-1 rounded-3xl overflow-hidden cursor-default"
        style={{
          background: '#ffffff',
          border: `1.5px solid ${type.accentBorder}`,
          boxShadow: type.popular
            ? `0 8px 32px rgba(0,0,0,0.1), 0 0 0 1.5px ${type.accent}30`
            : '0 4px 20px rgba(0,0,0,0.05)',
          transition: 'box-shadow 0.35s ease, transform 0.35s ease, border-color 0.35s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 20px 52px rgba(0,0,0,0.12), 0 0 0 1.5px ${type.accent}50`
          e.currentTarget.style.transform = 'translateY(-5px)'
          e.currentTarget.style.borderColor = type.accent + '55'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = type.popular
            ? `0 8px 32px rgba(0,0,0,0.1), 0 0 0 1.5px ${type.accent}30`
            : '0 4px 20px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = type.accentBorder
        }}
      >
        {/* Top accent stripe */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, ${type.accent}, ${isOrange ? '#ffb08a' : '#74ee56'})`,
          }}
        />

        {/* Watermark code */}
        <div
          className="absolute top-3 right-4 font-black select-none pointer-events-none leading-none"
          style={{
            fontSize: 'clamp(3.5rem, 6vw, 5rem)',
            color: isOrange ? 'rgba(255,88,13,0.06)' : 'rgba(27,185,8,0.06)',
            letterSpacing: '-0.04em',
          }}
          aria-hidden="true"
        >
          {type.code}
        </div>

        <div className="relative flex flex-col gap-5 p-7 flex-1">

          {/* Icon + code badge */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: type.accentDim,
                border: `1px solid ${type.accentBorder}`,
              }}
            >
              <Icon size={20} style={{ color: type.accent }} strokeWidth={1.8} />
            </div>
            <div>
              <span
                className="inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-black tracking-widest uppercase"
                style={{
                  background: type.accentDim,
                  color: type.accent,
                  border: `1px solid ${type.accentBorder}`,
                }}
              >
                {type.code}
              </span>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(0,0,0,0.38)' }}>
                {type.label}
              </p>
            </div>
          </div>

          {/* Tagline + desc */}
          <div>
            <h3
              className="font-black leading-snug mb-2"
              style={{ fontSize: 'clamp(1.05rem, 1.8vw, 1.2rem)', color: '#0d0d0d' }}
            >
              {type.tagline}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(0,0,0,0.5)' }}>
              {type.desc}
            </p>
          </div>

          {/* Divider */}
          <div
            className="h-px w-full"
            style={{ background: `linear-gradient(90deg, ${type.accent}35, transparent)` }}
          />

          {/* Features */}
          <ul className="flex flex-col gap-2.5">
            {type.features.map(({ icon: FIcon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: type.accentDim }}
                >
                  <FIcon size={11} style={{ color: type.accent }} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'rgba(0,0,0,0.58)' }}>
                  {text}
                </span>
              </li>
            ))}
          </ul>

          {/* Stat row — pushed to bottom */}
          <div
            className="mt-auto pt-5 flex items-center justify-between border-t"
            style={{ borderColor: 'rgba(0,0,0,0.07)' }}
          >
            <div>
              <p
                className="font-black leading-none"
                style={{ fontSize: 'clamp(1.5rem, 2.5vw, 1.9rem)', color: '#e51c1c' }}
              >
                {type.stat}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(0,0,0,0.32)' }}>
                {type.statLabel}
              </p>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{
                background: type.accentDim,
                border: `1px solid ${type.accentBorder}`,
              }}
            >
              <ArrowRight size={14} style={{ color: type.accent }} strokeWidth={2.5} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function DeliveryTypesSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.08 })

  return (
    <section
      id="delivery-types"
      ref={ref}
      className="relative overflow-hidden"
      style={{ background: '#faf8f4' }}
    >
      {/* Dot grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Ambient glows */}
      <div
        className="absolute top-0 right-0 w-96 h-80 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top right, rgba(255,88,13,0.06) 0%, transparent 65%)',
          filter: 'blur(32px)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-72 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at bottom left, rgba(27,185,8,0.05) 0%, transparent 65%)',
          filter: 'blur(32px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">

        {/* Header */}
        <div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.55s ease, transform 0.55s ease',
          }}
        >
          <div className="flex flex-col gap-3">
            <span
              className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase w-fit"
              style={{ background: 'rgba(27,185,8,0.1)', color: '#1bb908' }}
            >
              Delivery Categories
            </span>
            <GradientHeading
              parts={[
                { text: 'Who We ',  color: 'black' },
                { text: 'Deliver',  color: 'green', highlight: true },
                { text: ' For',     color: 'black' },
              ]}
              className="text-2xl sm:text-3xl lg:text-4xl"
            />
          </div>
          <p
            className="text-sm leading-relaxed max-w-xs"
            style={{ color: 'rgba(0,0,0,0.42)' }}
          >
            Whether you ship between businesses, sell to customers, or send person-to-person, we have the right solution.
          </p>
        </div>

        {/* Equal-height cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch">
          {TYPES.map((type, i) => (
            <TypeCard key={type.code} type={type} index={i} visible={isVisible} />
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.6s ease 0.5s',
          }}
        >
          <p className="text-xs font-semibold" style={{ color: 'rgba(0,0,0,0.35)' }}>
            Not sure which fits your need?
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:opacity-90"
            style={{ background: '#1bb908', color: '#fff' }}
          >
            Talk to us <ArrowRight size={14} strokeWidth={2.5} />
          </a>
        </div>

      </div>
    </section>
  )
}
