'use client'
import { useRef, useCallback } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock, Star, Shield } from 'lucide-react'
import GradientHeading from './GradientHeading'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'

// Fixed CTAs shown on every slide
const FIXED_CTA1 = { label: 'Create Account', href: '/register' }
const FIXED_CTA2 = { label: 'Track Package', href: '/track' }

// Pexels stable CDN — verified delivery/logistics/courier photos
const SLIDES = [
  {
    parts: [
      { text: "Calgary's ", color: 'black' },
      { text: 'Fastest',    color: 'orange', highlight: true },
      { text: '\nDelivery', color: 'green' },
      { text: ' Service',   color: 'black' },
    ],
    sub: '10+ years of logistics expertise behind every delivery. Serving Calgary and surrounding areas with same-day speed you can count on.',
    badge: { icon: Clock, text: 'Avg delivery under 3 hrs' },
    img: '/images/slide1.webp',
    imgAlt: 'Delivery driver carrying packages to a customer door',
    accent: '#ff580d',
  },
  {
    parts: [
      { text: 'Real-Time ', color: 'black' },
      { text: 'Tracking.', color: 'orange', highlight: true },
      { text: '\nZero',     color: 'green' },
      { text: ' Surprises.', color: 'black' },
    ],
    sub: 'Know the status of your package at every step, from pickup assigned to delivered. Live updates on every single order.',
    badge: { icon: Shield, text: '99.2% on-time rate' },
    img: '/images/slide2.webp',
    imgAlt: 'Courier driver scanning a package barcode with a phone',
    accent: '#1bb908',
  },
  {
    parts: [
      { text: 'Book in ',   color: 'black' },
      { text: 'Minutes.',   color: 'orange', highlight: true },
      { text: '\nDelivered', color: 'green' },
      { text: ' Today.',    color: 'black' },
    ],
    sub: 'Create a free account, place your order in minutes, and our driver handles the rest door to door.',
    badge: { icon: Star, text: '4.9★ customer rating' },
    img: '/images/slide3.webp',
    imgAlt: 'Happy customer receiving a delivery package at the door',
    accent: '#ff580d',
  },
]

function animateIn(el) {
  if (!el) return
  el.classList.remove('animate')
  el.style.opacity = '0'
  el.style.transform = 'translateX(40px)'
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.opacity = ''
      el.style.transform = ''
      el.classList.add('slide-content', 'animate')
    })
  })
}

function resetContent(el) {
  if (!el) return
  el.classList.remove('animate')
  el.style.opacity = '0'
  el.style.transform = 'translateX(40px)'
}

export default function HeroSlider() {
  const slideRefs = useRef([])

  const handleTransitionEnd = useCallback((swiper) => {
    animateIn(slideRefs.current[swiper.realIndex])
  }, [])

  const handleSlideChange = useCallback((swiper) => {
    slideRefs.current.forEach((el, i) => {
      if (i !== swiper.realIndex) resetContent(el)
    })
  }, [])

  const handleInit = useCallback((swiper) => {
    animateIn(slideRefs.current[swiper.realIndex])
  }, [])

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-8 lg:pt-0"
      style={{ background: 'var(--landing-bg)', minHeight: '92svh' }}
    >
      {/* Atmospheric blobs */}
      <div className="hero-blob-orange" />
      <div className="hero-blob-green" />

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-60" />

      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        autoplay={{ delay: 5500, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop
        pagination={{ clickable: true }}
        className="landing-swiper w-full h-full"
        style={{ minHeight: '92svh' }}
        onTransitionEnd={handleTransitionEnd}
        onSlideChange={handleSlideChange}
        onAfterInit={handleInit}
      >
        {SLIDES.map((slide, i) => {
          const BadgeIcon = slide.badge.icon
          return (
            <SwiperSlide key={i} style={{ minHeight: '92svh' }}>
              <div
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center"
                style={{ minHeight: '92svh', paddingTop: '0.5rem', paddingBottom: '2rem' }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 items-center w-full">

                  {/* ── LEFT: Content ── */}
                  <div
                    ref={el => { slideRefs.current[i] = el }}
                    className="slide-content flex flex-col gap-4 lg:gap-7 order-2 lg:order-1"
                    style={{ opacity: 0, transform: 'translateY(28px)' }}
                  >
                    {/* Badge chip — hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-3">
                      <span
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase"
                        style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: 'var(--brand-green)', boxShadow: '0 0 6px var(--brand-green)' }}
                        />
                        Calgary&apos;s #1 Courier
                      </span>
                    </div>

                    {/* Heading */}
                    <GradientHeading
                      parts={slide.parts}
                      as="h1"
                      className="text-3xl sm:text-4xl lg:text-[2.6rem] xl:text-5xl leading-[1.08]"
                    />

                    {/* Sub */}
                    <p
                      className="text-base lg:text-lg leading-snug lg:leading-relaxed max-w-lg"
                      style={{ color: 'var(--landing-text-2)' }}
                    >
                      {slide.sub}
                    </p>

                    {/* Trust badge */}
                    <div
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl w-fit"
                      style={{
                        background: 'white',
                        border: '1px solid var(--landing-border)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'var(--brand-green-dim)' }}
                      >
                        <BadgeIcon size={16} style={{ color: 'var(--brand-green)' }} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--landing-text)' }}>
                        {slide.badge.text}
                      </span>
                    </div>

                    {/* CTAs — 50% width each on mobile, auto on sm+ */}
                    <div className="flex gap-3">
                      <Link
                        href={FIXED_CTA1.href}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 sm:py-4 sm:px-7 rounded-xl sm:rounded-2xl text-white font-black transition-all shadow-lg cta-pulse group w-1/2 sm:w-auto"
                        style={{ background: 'var(--brand-green)', fontSize: 'clamp(0.72rem, 2.5vw, 0.9rem)' }}
                      >
                        {FIXED_CTA1.label}
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                      <Link
                        href={FIXED_CTA2.href}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 sm:py-4 sm:px-7 rounded-xl sm:rounded-2xl font-black border-2 transition-all w-1/2 sm:w-auto"
                        style={{
                          borderColor: 'var(--landing-border)',
                          color: 'var(--landing-text)',
                          fontSize: 'clamp(0.72rem, 2.5vw, 0.9rem)',
                        }}
                      >
                        {FIXED_CTA2.label}
                      </Link>
                    </div>

                  </div>

                  {/* ── RIGHT: Photo ── */}
                  <div className="relative flex items-center justify-center lg:justify-end order-2 lg:order-2">

                    {/* Main photo card */}
                    <div className="relative w-full max-w-sm xl:max-w-md">

                      {/* Outer glow ring */}
                      <div
                        className="absolute -inset-3 rounded-3xl blur-2xl opacity-20 pointer-events-none"
                        style={{ background: `radial-gradient(circle, ${slide.accent} 0%, transparent 70%)` }}
                      />

                      {/* Photo */}
                      <div
                        className="relative rounded-3xl overflow-hidden shadow-2xl hero-float"
                        style={{
                          border: `2px solid rgba(255,88,13,0.2)`,
                          height: 'clamp(260px, 45vw, 520px)',
                        }}
                      >
                        <Image
                          src={slide.img}
                          alt={slide.imgAlt}
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 1024px) 100vw, 45vw"
                          priority={i === 0}
                        />
                        {/* Bottom gradient overlay */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(180deg, transparent 45%, rgba(13,13,13,0.55) 100%)',
                          }}
                        />
                        {/* Speed-lines overlay at top-right */}
                        <div
                          className="absolute top-0 right-0 w-48 h-32 pointer-events-none opacity-30"
                          style={{
                            background: `linear-gradient(135deg, ${slide.accent}40, transparent)`,
                          }}
                        />
                      </div>

                      {/* Floating accent card — bottom left */}
                      <div
                        className="absolute -bottom-4 -left-5 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl z-10"
                        style={{
                          background: 'white',
                          border: '1px solid var(--landing-border)',
                          minWidth: '160px',
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--brand-green)' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--landing-text-2)' }}>Avg Delivery</p>
                          <p className="text-sm font-black" style={{ color: 'var(--stat-color)' }}>Under 3 Hours</p>
                        </div>
                      </div>

                      {/* Floating accent card — top right */}
                      <div
                        className="absolute -top-4 -right-4 rounded-2xl p-3 flex items-center justify-center shadow-lg z-10"
                        style={{
                          background: 'var(--brand-green)',
                          width: '56px',
                          height: '56px',
                        }}
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>
    </section>
  )
}
