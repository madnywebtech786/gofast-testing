'use client'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import GradientHeading from '@/components/landing/GradientHeading'
import { useIntersectionObserver } from '@/components/landing/hooks/useIntersectionObserver'
import { useCountUp } from '@/components/landing/hooks/useCountUp'
import {
  ArrowRight, CheckCircle2, MapPin, Clock, Shield,
  Zap, Users, Award, TrendingUp, PackageCheck, Star,
  FileText, Package, Pill, UtensilsCrossed, Gift, Wrench, Laptop, Scale,
} from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { target: 8000, suffix: '+', label: 'Deliveries',    sub: 'completed this year',      accent: '#ff580d' },
  { target: 500,  suffix: '+', label: 'Businesses',    sub: 'trust us every day',        accent: '#1bb908' },
  { target: 10,   suffix: '+', label: 'Years',         sub: 'of on-the-ground expertise',accent: '#ff580d' },
  { target: 8,    suffix: '',  label: 'Cities',        sub: 'across Calgary & area',     accent: '#1bb908' },
]

const HOW_STEPS = [
  {
    num: '01',
    title: 'Book in Minutes',
    desc: 'Create a free account and place your order online with your pickup address, drop-off, and any special instructions. Done in under 2 minutes.',
    detail: 'No phone calls. No contracts.',
    accent: '#1bb908',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Driver Assigned Instantly',
    desc: 'Our dispatch routes the nearest verified driver to your pickup location. You get a name, photo, and live ETA, not an anonymous number.',
    detail: 'Avg. dispatch under 4 min.',
    accent: '#ff580d',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><rect x="9" y="11" width="14" height="10" rx="1"/><circle cx="12" cy="20" r="1"/><circle cx="20" cy="20" r="1"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Live Status Updates',
    desc: 'Track your order through every stage: Order Placed, Driver Assigned, Picked Up, and Delivered. Share your unique tracking link so your recipient always knows what\'s happening.',
    detail: 'Instant notifications at each stage.',
    accent: '#1bb908',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  },
  {
    num: '04',
    title: 'Delivered with Proof',
    desc: 'Every delivery is confirmed with a photo and optional signature. You receive a completion notification the instant it\'s done.',
    detail: 'Photo + timestamp on every drop.',
    accent: '#ff580d',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
]

const COVERAGE_CITIES = [
  { name: 'Calgary',      time: 'Same-day',  anchor: true },
  { name: 'Airdrie',      time: '~45 min',   anchor: false },
  { name: 'Cochrane',     time: '~50 min',   anchor: false },
  { name: 'Okotoks',      time: '~40 min',   anchor: false },
  { name: 'High River',   time: '~55 min',   anchor: false },
  { name: 'Chestermere',  time: '~30 min',   anchor: false },
  { name: 'Strathmore',   time: '~50 min',   anchor: false },
  { name: 'Langdon',      time: '~45 min',   anchor: false },
]

const ITEM_CATEGORIES = [
  { label: 'Documents & Envelopes', icon: FileText },
  { label: 'Retail Packages',       icon: Package },
  { label: 'Medical Supplies',      icon: Pill },
  { label: 'Food & Meal Kits',      icon: UtensilsCrossed },
  { label: 'Gifts & Flowers',       icon: Gift },
  { label: 'Industrial Samples',    icon: Wrench },
  { label: 'Electronics',           icon: Laptop },
  { label: 'Legal Documents',       icon: Scale },
]

const VALUES = [
  {
    icon: Zap,
    title: 'Speed First',
    desc: 'We route smarter so your package arrives when promised, or even earlier.',
    accent: '#ff580d',
  },
  {
    icon: Shield,
    title: 'Zero Surprises',
    desc: 'Transparent pricing, live tracking, real human support. No hidden fees.',
    accent: '#1bb908',
  },
  {
    icon: Users,
    title: 'Local & Trusted',
    desc: 'Every driver is verified, Calgary-based, and your neighbor. Not a call-center.',
    accent: '#ff580d',
  },
  {
    icon: Award,
    title: 'Relentless Quality',
    desc: '99.2% on-time rate. We obsess over every route and every pickup window.',
    accent: '#1bb908',
  },
]

const PILLARS = [
  { icon: CheckCircle2, label: 'Verified Drivers',  note: 'Background checked' },
  { icon: Clock,        label: 'Same-Day Support',  note: 'Real humans, fast replies' },
  { icon: MapPin,       label: 'Local Knowledge',   note: 'Born and raised in Calgary' },
  { icon: PackageCheck, label: 'Proof of Delivery', note: 'Photo + signature capture' },
  { icon: TrendingUp,   label: '99.2% On-Time',     note: 'Industry-leading reliability' },
  { icon: Star,         label: '4.9★ Rated',        note: 'Across 8000+ deliveries' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBlock({ stat, active, index }) {
  const count = useCountUp(stat.target, 1800, active)
  const isOrange = stat.accent === '#ff580d'
  return (
    <div
      className="relative flex flex-col gap-2 p-8 rounded-3xl overflow-hidden"
      style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.07)',
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.6s ease ${index * 0.12}s, transform 0.6s ease ${index * 0.12}s`,
      }}
    >
      {/* Watermark numeral behind */}
      <span
        className="absolute right-4 bottom-2 font-black leading-none pointer-events-none select-none"
        style={{
          fontSize: 'clamp(5rem, 10vw, 8rem)',
          color: isOrange ? 'rgba(255,88,13,0.06)' : 'rgba(27,185,8,0.06)',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {count.toLocaleString()}{stat.suffix}
      </span>
      {/* Accent top bar */}
      <div className="w-8 h-1 rounded-full mb-1" style={{ background: stat.accent }} />
      <span
        className="font-black tabular-nums leading-none"
        style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', color: stat.accent }}
      >
        {count.toLocaleString()}{stat.suffix}
      </span>
      <span className="text-base font-black" style={{ color: 'var(--landing-text)' }}>{stat.label}</span>
      <span className="text-xs leading-snug" style={{ color: 'var(--landing-text-2)' }}>{stat.sub}</span>
    </div>
  )
}

function StatsSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 })
  return (
    <section ref={ref} style={{ background: '#faf8f4', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="mb-10"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <span
            className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'rgba(255,88,13,0.1)', color: '#ff580d' }}
          >
            By The Numbers
          </span>
          <GradientHeading
            parts={[
              { text: 'A Decade of ', color: 'black' },
              { text: 'Real Results', color: 'green', highlight: true },
            ]}
            className="text-2xl sm:text-3xl lg:text-4xl"
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => <StatBlock key={s.label} stat={s} active={isVisible} index={i} />)}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.06 })

  return (
    <section ref={ref} style={{ background: '#ffffff', padding: '5rem 0', overflow: 'hidden' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ── */}
        <div
          className="mb-14"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <span
            className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'rgba(255,88,13,0.1)', color: '#ff580d' }}
          >
            How It Works
          </span>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <GradientHeading
              parts={[
                { text: 'From Booking to', color: 'black' },
                { text: '\nDoor in Hours', color: 'green', highlight: true },
              ]}
              className="text-2xl sm:text-3xl lg:text-4xl"
            />
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'var(--landing-text-2)' }}>
              No phone tag, no guesswork. Our entire process is designed to get your package moving in minutes and delivered the same day.
            </p>
          </div>
        </div>

        {/* ── Steps + Coverage grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-8 xl:gap-12">

          {/* LEFT: 4 process steps */}
          <div className="flex flex-col gap-0">
            {HOW_STEPS.map((step, i) => (
              <div
                key={step.num}
                className="relative flex gap-5"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(-24px)',
                  transition: `opacity 0.55s ease ${0.1 + i * 0.1}s, transform 0.55s ease ${0.1 + i * 0.1}s`,
                }}
              >
                {/* Step spine: number + connector line */}
                <div className="flex flex-col items-center shrink-0" style={{ width: '44px' }}>
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 z-10"
                    style={{
                      background: step.accent,
                      boxShadow: `0 4px 16px ${step.accent}40`,
                      color: '#fff',
                    }}
                  >
                    {step.icon}
                  </div>
                  {i < HOW_STEPS.length - 1 && (
                    <div
                      className="flex-1 w-px my-1"
                      style={{
                        background: `linear-gradient(180deg, ${step.accent}60, ${HOW_STEPS[i + 1].accent}30)`,
                        minHeight: '32px',
                      }}
                    />
                  )}
                </div>

                {/* Step content */}
                <div
                  className="flex-1 pb-8"
                  style={{ paddingTop: '6px' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-black tracking-[0.2em] uppercase"
                      style={{ color: step.accent }}
                    >
                      Step {step.num}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${step.accent}12`,
                        color: step.accent,
                        border: `1px solid ${step.accent}25`,
                      }}
                    >
                      {step.detail}
                    </span>
                  </div>
                  <h3
                    className="text-base font-black mb-1.5 leading-snug"
                    style={{ color: '#0d0d0d', fontFamily: 'var(--font-montserrat, system-ui)' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-2)' }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: Coverage card + What we deliver strip */}
          <div
            className="flex flex-col gap-5"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'opacity 0.6s ease 0.25s, transform 0.6s ease 0.25s',
            }}
          >

            {/* Coverage card */}
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.07)',
              }}
            >
              {/* Card header bar */}
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ background: '#0d0d0d' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#1bb908', boxShadow: '0 0 6px rgba(27,185,8,0.8)' }}
                  />
                  <span
                    className="text-[11px] font-black tracking-widest uppercase"
                    style={{ color: '#ffffff' }}
                  >
                    Coverage Area
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(27,185,8,0.2)', color: '#1bb908', border: '1px solid rgba(27,185,8,0.3)' }}
                >
                  8 Cities Active
                </span>
              </div>

              {/* City list */}
              <div className="p-4" style={{ background: '#faf8f4' }}>
                <div className="grid grid-cols-1 gap-2">
                  {COVERAGE_CITIES.map((city, i) => (
                    <div
                      key={city.name}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                      style={{
                        background: city.anchor ? '#0d0d0d' : '#ffffff',
                        border: city.anchor ? 'none' : '1px solid rgba(0,0,0,0.06)',
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'translateX(0)' : 'translateX(12px)',
                        transition: `opacity 0.4s ease ${0.35 + i * 0.055}s, transform 0.4s ease ${0.35 + i * 0.055}s`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <MapPin
                          size={12}
                          strokeWidth={2.5}
                          style={{ color: city.anchor ? '#1bb908' : 'rgba(0,0,0,0.3)', flexShrink: 0 }}
                        />
                        <span
                          className="text-sm font-bold"
                          style={{ color: city.anchor ? '#ffffff' : '#0d0d0d' }}
                        >
                          {city.name}
                        </span>
                        {city.anchor && (
                          <span
                            className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(27,185,8,0.25)', color: '#1bb908' }}
                          >
                            Hub
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                        style={{
                          background: city.anchor ? 'rgba(27,185,8,0.2)' : 'rgba(255,88,13,0.08)',
                          color: city.anchor ? '#1bb908' : '#ff580d',
                          border: city.anchor ? '1px solid rgba(27,185,8,0.3)' : '1px solid rgba(255,88,13,0.18)',
                        }}
                      >
                        {city.time}
                      </span>
                    </div>
                  ))}
                </div>
                <p
                  className="text-[10px] font-semibold mt-3 text-center"
                  style={{ color: 'rgba(0,0,0,0.3)' }}
                >
                  Delivery times are estimates from Calgary hub
                </p>
              </div>
            </div>

            {/* What we handle strip */}
            <div
              className="rounded-3xl p-5"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              }}
            >
              <p
                className="text-[10px] font-black tracking-[0.18em] uppercase mb-4"
                style={{ color: 'rgba(0,0,0,0.35)' }}
              >
                What We Deliver
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ITEM_CATEGORIES.map((cat, i) => (
                  <div
                    key={cat.label}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{
                      background: '#faf8f4',
                      border: '1px solid rgba(0,0,0,0.05)',
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
                      transition: `opacity 0.4s ease ${0.5 + i * 0.05}s, transform 0.4s ease ${0.5 + i * 0.05}s`,
                    }}
                  >
                    <cat.icon size={14} strokeWidth={2} aria-hidden="true" style={{ color: '#1bb908', flexShrink: 0 }} />
                    <span className="text-[11px] font-semibold leading-tight" style={{ color: '#0d0d0d' }}>
                      {cat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ValuesSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.08 })
  return (
    <section ref={ref} style={{ background: '#faf8f4', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <div>
            <span
              className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
              style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
            >
              What We Stand For
            </span>
            <GradientHeading
              parts={[
                { text: 'Our Core ', color: 'black' },
                { text: 'Values', color: 'green', highlight: true },
              ]}
              className="text-2xl sm:text-3xl lg:text-4xl"
            />
          </div>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--landing-text-2)' }}>
            Four principles that guide every pickup, every route, and every knock on the door.
          </p>
        </div>

        {/* Values — 2-col on mobile, 4-col on lg. Bold number + icon + text */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((val, i) => {
            const Icon = val.icon
            const isOrange = val.accent === '#ff580d'
            return (
              <div
                key={val.title}
                className="group relative flex flex-col gap-5 p-7 rounded-3xl overflow-hidden transition-all"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
                  transition: `opacity 0.55s ease ${0.1 + i * 0.1}s, transform 0.55s ease ${0.1 + i * 0.1}s`,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 12px 40px ${val.accent}18`; e.currentTarget.style.borderColor = `${val.accent}35` }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)' }}
              >
                {/* Large faint number behind */}
                <span
                  className="absolute right-4 top-4 font-black pointer-events-none select-none leading-none"
                  style={{ fontSize: '5rem', color: isOrange ? 'rgba(255,88,13,0.06)' : 'rgba(27,185,8,0.06)' }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isOrange ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)',
                    border: `1px solid ${val.accent}25`,
                  }}
                >
                  <Icon size={20} strokeWidth={2.2} style={{ color: val.accent }} />
                </div>
                <div>
                  <h3 className="text-base font-black mb-2" style={{ color: 'var(--landing-text)' }}>{val.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-2)' }}>{val.desc}</p>
                </div>
                {/* Bottom accent line — grows on hover */}
                <div
                  className="absolute bottom-0 left-0 h-0.5 transition-all duration-500"
                  style={{ background: val.accent, width: '2.5rem' }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function TeamSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.08 })
  return (
    <section ref={ref} style={{ background: '#ffffff', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">

          {/* LEFT: photo */}
          <div
            className="relative order-2 lg:order-1"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-28px)',
              transition: 'opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s',
            }}
          >
            {/* Decorative offset block */}
            <div
              className="absolute -top-4 -left-4 w-full h-full rounded-3xl"
              style={{ background: 'var(--brand-green-dim)', border: '1.5px solid var(--brand-green)', zIndex: 0 }}
            />
            <div
              className="relative rounded-3xl overflow-hidden shadow-xl"
              style={{ height: 'clamp(280px, 42vw, 460px)', zIndex: 1 }}
            >
              <Image
                src="/images/Our-Team-img.webp"
                alt="GoFastDelivery driver at work"
                fill className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(13,13,13,0.5) 100%)' }}
              />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-white font-black text-lg leading-tight drop-shadow">
                  Trusted by 500+ Calgary Businesses
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  Join the growing community that relies on us every day.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: content */}
          <div
            className="flex flex-col gap-8 order-1 lg:order-2"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(28px)',
              transition: 'opacity 0.65s ease 0.2s, transform 0.65s ease 0.2s',
            }}
          >
            <div>
              <span
                className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
                style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
              >
                Our Team
              </span>
              <GradientHeading
                parts={[
                  { text: 'People You ', color: 'black' },
                  { text: 'Can Count On', color: 'green', highlight: true },
                ]}
                className="text-2xl sm:text-3xl lg:text-4xl mb-4"
              />
              <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--landing-text-2)' }}>
                Every driver in our network is personally vetted, background-checked, and trained to handle your deliveries with care. We don&apos;t just hire anyone with a vehicle. We build a team of reliable professionals who represent GoFastDelivery at every door.
              </p>
            </div>

            {/* Pillars grid — 2×3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PILLARS.map(({ icon: Icon, label, note }, i) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{
                    background: '#faf8f4',
                    border: '1px solid rgba(0,0,0,0.06)',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateX(0)' : 'translateX(16px)',
                    transition: `opacity 0.5s ease ${0.3 + i * 0.07}s, transform 0.5s ease ${0.3 + i * 0.07}s`,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--brand-green-dim)', border: '1px solid rgba(27,185,8,0.2)' }}
                  >
                    <Icon size={15} strokeWidth={2.2} style={{ color: 'var(--brand-green)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-black" style={{ color: 'var(--landing-text)' }}>{label}</p>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--landing-text-2)' }}>{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CTABand() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.2 })
  return (
    <section ref={ref} style={{ background: '#faf8f4', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two-column CTA — wide headline left, buttons right */}
        <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] gap-10 items-center">
          <div
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-24px)',
              transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            }}
          >
            <span
              className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-5"
              style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
            >
              Ready to Ship?
            </span>
            <GradientHeading
              parts={[
                { text: "Calgary's Fastest", color: 'black' },
                { text: '\nCourier', color: 'green', highlight: true },
                { text: ' Is Standing By', color: 'black' },
              ]}
              className="text-2xl sm:text-3xl lg:text-4xl"
            />
            <p className="text-sm leading-relaxed mt-4 max-w-md" style={{ color: 'var(--landing-text-2)' }}>
              Create a free account and place your first delivery in under 2 minutes. No contracts, no setup fees. Just fast, reliable service when you need it.
            </p>
          </div>

          <div
            className="flex flex-col gap-3"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(24px)',
              transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
            }}
          >
            {/* Trust micro-line */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#1bb908', boxShadow: '0 0 6px #1bb908' }} />
              <span className="text-[11px] font-semibold" style={{ color: 'var(--landing-text-2)' }}>
                8,000+ deliveries · 99.2% on-time · Calgary-based
              </span>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-sm shadow-lg transition-all hover:opacity-90 cta-pulse"
              style={{ background: 'var(--brand-green)' }}
            >
              Join Now <ArrowRight size={15} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-sm border-2 transition-all hover:border-green-600"
              style={{ borderColor: 'var(--landing-border)', color: 'var(--landing-text)' }}
            >
              Get In Touch
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [heroRef, heroVisible] = useIntersectionObserver({ threshold: 0.05 })

  return (
    <div data-page="landing" style={{ background: 'var(--landing-bg)' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ background: 'var(--landing-bg)', paddingTop: '1rem', paddingBottom: '5rem' }}
      >
        <div className="hero-blob-orange" style={{ opacity: 0.55 }} />
        <div className="hero-blob-green"  style={{ opacity: 0.45 }} />
        <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2 mb-8 text-xs font-semibold"
            style={{ color: 'var(--landing-text-2)', opacity: heroVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
          >
            <Link href="/" className="hover:underline" style={{ color: 'var(--brand-green)' }}>Home</Link>
            <span style={{ color: 'rgba(0,0,0,0.3)' }}>/</span>
            <span>About Us</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">

            {/* LEFT: text */}
            <div
              className="flex flex-col gap-7"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateX(0)' : 'translateX(-32px)',
                transition: 'opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s',
              }}
            >
              <span
                className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase w-fit"
                style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
              >
                About GoFastDelivery
              </span>

              <GradientHeading
                parts={[
                  { text: "Calgary's ", color: 'black' },
                  { text: 'Most Trusted', color: 'black', highlight: true },
                  { text: '\nCourier,', color: 'green' },
                  { text: ' Since Day One', color: 'black' },
                ]}
                className="text-3xl sm:text-4xl lg:text-5xl"
              />

              <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--landing-text-2)' }}>
                GoFastDelivery was built by Calgarians, for Everyone. Over a decade of same-day delivery across the city and surrounding communities, every order handled by a verified local driver, tracked live from pickup to drop-off, with zero hidden fees.
              </p>

              {/* 10+ years callout — inline badge */}
              <div
                className="flex items-center gap-4 px-5 py-4 rounded-2xl w-fit"
                style={{
                  background: 'linear-gradient(135deg, var(--brand-green-dim), rgba(255,88,13,0.06))',
                  border: '1.5px solid var(--brand-green)',
                }}
              >
                <div
                  className="shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl"
                  style={{ background: 'var(--brand-green)', boxShadow: '0 4px 18px rgba(27,185,8,0.35)' }}
                >
                  <span className="text-xl font-black text-white leading-none">10+</span>
                  <span className="text-[9px] font-black text-white tracking-widest uppercase mt-0.5">Years</span>
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--landing-text)' }}>10+ Years of Logistics Experience</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--landing-text-2)' }}>A decade on the ground means faster routes, fewer errors, better service.</p>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white font-black text-sm shadow-lg transition-all hover:opacity-90 cta-pulse"
                  style={{ background: 'var(--brand-green)' }}
                >
                  Create Account <ArrowRight size={15} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm border-2 transition-all"
                  style={{ borderColor: 'var(--landing-border)', color: 'var(--landing-text)' }}
                >
                  Contact Us
                </Link>
              </div>
            </div>

            {/* RIGHT: photo */}
            <div
              className="relative"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
                transition: 'opacity 0.65s ease 0.25s, transform 0.65s ease 0.25s',
              }}
            >
              {/* Offset decorative ring */}
              <div
                className="absolute -inset-3 rounded-3xl pointer-events-none"
                style={{ border: '1.5px dashed rgba(27,185,8,0.25)', borderRadius: '1.75rem' }}
              />
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl hero-float"
                style={{ height: 'clamp(280px, 45vw, 500px)', border: '2px solid rgba(255,88,13,0.12)' }}
              >
                <Image
                  src="/images/About-GoFastDelivery-img.webp"
                  alt="GoFastDelivery courier on the road"
                  fill className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading="lazy"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(13,13,13,0.5) 100%)' }} />
              </div>

              {/* Float cards */}
              <div
                className="absolute -bottom-5 -left-4 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl z-10"
                style={{ background: 'white', border: '1px solid var(--landing-border)', minWidth: '170px' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--brand-green)' }}>
                  <Award size={18} strokeWidth={2} stroke="white" />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--landing-text-2)' }}>Est. 2016</p>
                  <p className="text-sm font-black" style={{ color: 'var(--landing-text)' }}>Decade of Trust</p>
                </div>
              </div>

              <div
                className="absolute -top-4 -right-3 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-xl z-10"
                style={{ background: 'white', border: '1px solid rgba(27,185,8,0.25)', minWidth: '155px' }}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#1bb908', animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#1bb908' }} />
                </span>
                <p className="text-xs font-black" style={{ color: 'var(--landing-text)' }}>Live Drivers Active</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── #faf8f4 */}
      <StatsSection />

      {/* ── HOW IT WORKS / COVERAGE ── #ffffff */}
      <HowItWorksSection />

      {/* ── VALUES ── #faf8f4 */}
      <ValuesSection />

      {/* ── TEAM / PILLARS ── #ffffff */}
      <TeamSection />

      {/* ── CTA ── #faf8f4 */}
      <CTABand />

      <Footer />
    </div>
  )
}
