'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X, Phone, Mail, MapPin, ChevronDown } from 'lucide-react'
import { useSpring, animated } from '@react-spring/web'

const SERVICE_ITEMS = [
  { label: 'Same-Day Delivery', href: '/services/same-day-delivery' },
  { label: 'Express Pickup',    href: '/services/express-pickup' },
  { label: 'Business Delivery', href: '/services/business-delivery' },
  { label: 'Scheduled Runs',    href: '/services/scheduled-runs' },
  { label: 'Hotshot Delivery',  href: '/services/hotshot-delivery' },
]

const NAV_LINKS = [
  { label: 'Home',          href: '/',         scroll: false },
  { label: 'About',         href: '/about',    scroll: false },
  { label: 'Services',      href: null,        scroll: false, dropdown: true },
  { label: 'Track Package', href: '/track',    scroll: false },
  { label: 'Reviews',       href: '/#reviews', scroll: true },
  { label: 'Contact',       href: '/contact',  scroll: false },
]

const CITIES = [
  'Calgary', 'Cochrane', 'Airdrie', 'Okotoks', 'High River', 'Chestermere', 'Strathmore', 'Langdon',
]

const DELIVERY_ITEMS = [
  'Small Packages & Boxes', 'Envelopes & Documents', 'Packed Food', 'Medical & Pharmaceutical Supplies',
  'Totes', 'Gifts & Flowers', 'Industrial Samples',
]

function Marquee({ items, reverse = false, dark = false, label }) {
  const dur = reverse ? '28s' : '22s'
  const accent = dark ? 'rgba(255,88,13,0.55)' : 'rgba(255,88,13,0.5)'
  const muted = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.22)'
  const dot = dark ? 'rgba(255,88,13,0.25)' : 'rgba(255,88,13,0.18)'
  const bg = dark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)'
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const repeated = [...items, ...items, ...items]

  const labelSpan = label ? (
    <span
      className="shrink-0 flex items-center px-3 sm:px-4 whitespace-nowrap z-10"
      style={{
        background: '#1bb908',
        color: '#fff',
        fontSize: '8px',
        fontWeight: 900,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        alignSelf: 'stretch',
        borderRight: reverse ? 'none' : '1px solid rgba(0,0,0,0.12)',
        borderLeft: reverse ? '1px solid rgba(0,0,0,0.12)' : 'none',
      }}
    >
      {label}
    </span>
  ) : null

  return (
    <div
      className="flex items-stretch overflow-hidden"
      style={{
        background: bg,
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${border}`,
      }}
    >
      {/* Left label */}
      {!reverse && labelSpan}

      {/* Scrolling track — mask edges so text fades into the labels */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
        }}
      >
        <div
          className="flex whitespace-nowrap"
          style={{ animation: `marquee-scroll ${dur} linear infinite${reverse ? ' reverse' : ''}` }}
        >
          {[0, 1, 2].map(rep => (
            <div key={rep} className="flex items-center shrink-0">
              {repeated.map((item, i) => (
                <span key={`${rep}-${i}`} className="inline-flex items-center gap-3 px-5 py-2">
                  <span
                    className="text-[9px] font-black tracking-[0.22em] uppercase"
                    style={{ color: i % 2 === 0 ? accent : muted }}
                  >
                    {item}
                  </span>
                  <span style={{ color: dot, fontSize: '5px' }}>◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right label */}
      {reverse && labelSpan}
    </div>
  )
}

export default function Navbar() {
  const [scrolled, setScrolled]               = useState(false)
  const [drawerOpen, setDrawerOpen]           = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const navSpring = useSpring({
    backgroundColor: scrolled ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.95)',
    boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : '0 0px 0px rgba(0,0,0,0)',
    config: { tension: 300, friction: 30 },
  })

  const drawerSpring = useSpring({
    transform: drawerOpen ? 'translateX(0%)' : 'translateX(100%)',
    config: { tension: 280, friction: 26 },
  })

  const overlaySpring = useSpring({
    opacity: drawerOpen ? 1 : 0,
    pointerEvents: drawerOpen ? 'auto' : 'none',
    config: { tension: 300, friction: 30 },
  })

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setMobileServicesOpen(false)
  }, [])

  const handleNavClick = useCallback((e, href, isScroll) => {
    if (!isScroll) return // let Next Link handle navigation
    e.preventDefault()
    const wasOpen = drawerOpen
    closeDrawer()
    // Extract hash from href like "/#home"
    const hash = href.split('#')[1]
    const target = hash ? document.getElementById(hash) : null
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), wasOpen ? 350 : 0)
    }
  }, [drawerOpen, closeDrawer])

  return (
    <>
      {/* ── Fixed top wrapper: info bar + marquee + nav ── */}
      <div className="fixed top-0 left-0 right-0 z-50">

        {/* Info bar */}
        <div className="block" style={{ background: '#1bb908', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-0 flex flex-col sm:flex-row sm:h-7 sm:items-center sm:justify-between gap-0.5 sm:gap-4">
            <div className="flex items-center justify-between sm:justify-start sm:gap-5">
              <a
                href="tel:+18254882316"
                className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold transition-colors"
                style={{ color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
              >
                <Phone size={9} strokeWidth={2.2} />
                +1 825-488-2316
              </a>
              <a
                href="mailto:info@gfdelivery.ca"
                className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold transition-colors"
                style={{ color: 'rgba(255,255,255,0.85)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
              >
                <Mail size={9} strokeWidth={2.2} />
                info@gfdelivery.ca
              </a>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-1.5 text-[10px] sm:text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
              <MapPin size={9} strokeWidth={2.2} style={{ color: 'rgba(255,255,255,0.9)' }} />
              Calgary, AB &amp; Surrounding Areas
            </div>
          </div>
        </div>

        {/* Top city marquee */}
        <Marquee items={CITIES} reverse={false} dark={false} label="Service Areas" />

        {/* Main nav */}
        <animated.nav style={navSpring} className="backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <Image
                src="/images/logo.png"
                alt="GoFastDelivery"
                width={130}
                height={44}
                priority
                className="h-9 w-auto object-contain"
              />
            </Link>

            {/* Desktop nav links */}
            <ul className="hidden lg:flex items-center gap-4">
              {NAV_LINKS.map(link => (
                <li key={link.label} className="relative">
                  {link.dropdown ? (
                    /* Services — hover dropdown, no JS state needed */
                    <div ref={dropdownRef} className="relative group">
                      <button
                        className="inline-flex items-center gap-1 text-[13px] font-semibold transition-colors duration-200 group-hover:text-green-600"
                        style={{ color: 'var(--landing-text)' }}
                      >
                        {link.label}
                        <ChevronDown
                          size={13}
                          strokeWidth={2.5}
                          className="transition-transform duration-200 group-hover:rotate-180"
                        />
                      </button>

                      {/* Dropdown panel — shown on group hover */}
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200"
                        style={{ zIndex: 60 }}
                      >
                        <div
                          className="rounded-xl overflow-hidden"
                          style={{
                            background: '#ffffff',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.07)',
                            minWidth: '200px',
                          }}
                        >
                          {SERVICE_ITEMS.map((item, idx) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold transition-colors"
                              style={{
                                color: 'var(--landing-text)',
                                borderBottom: idx < SERVICE_ITEMS.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,185,8,0.05)'; e.currentTarget.style.color = 'var(--brand-green)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--landing-text)' }}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={link.href}
                      onClick={link.scroll ? (e) => handleNavClick(e, link.href, true) : undefined}
                      className="text-[13px] font-semibold transition-colors duration-200"
                      style={{ color: 'var(--landing-text)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-green)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--landing-text)'}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-[12px] font-bold rounded-lg border transition-colors duration-200"
                style={{ borderColor: 'var(--landing-border)', color: 'var(--landing-text)' }}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 text-[12px] font-bold rounded-lg text-white transition-opacity hover:opacity-90 shadow-sm"
                style={{ background: 'var(--brand-green)' }}
              >
                Get Started
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--landing-text)' }}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </animated.nav>
      </div>

      {/* Spacer for fixed header height: info bar + marquee + nav ≈ 116px */}
      <div className="h-29 hidden md:block" />
      <div className="h-22 md:hidden" />

      {/* Overlay */}
      <animated.div
        style={overlaySpring}
        onClick={closeDrawer}
        className="fixed inset-0 z-60 bg-black/50 lg:hidden"
      />

      {/* Mobile drawer */}
      <animated.div
        className="fixed top-0 right-0 z-70 w-screen h-screen lg:hidden flex flex-col overflow-hidden"
        style={{ ...drawerSpring, background: '#0d0d0d' }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,88,13,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,88,13,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between px-7 h-14 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="inline-flex rounded-lg overflow-hidden" style={{ background: 'white', padding: '3px 7px' }}>
            <Image src="/images/logo.png" alt="GoFastDelivery" width={100} height={32} className="h-7 w-auto object-contain" />
          </div>
          <button
            onClick={closeDrawer}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}
            aria-label="Close menu"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="relative flex-1 flex flex-col justify-center px-7 gap-0 overflow-y-auto">
          {NAV_LINKS.map((link, i) => (
            <div key={link.label}>
              {link.dropdown ? (
                <>
                  <button
                    onClick={() => setMobileServicesOpen(v => !v)}
                    className="w-full group flex items-center gap-3 py-3 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-[10px] font-black tabular-nums shrink-0 w-5" style={{ color: 'rgba(255,88,13,0.4)', fontFamily: 'monospace' }}>
                      0{i + 1}
                    </span>
                    <span className="text-base font-black flex-1 text-left" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {link.label}
                    </span>
                    <ChevronDown
                      size={14}
                      strokeWidth={2.5}
                      style={{
                        color: 'rgba(255,88,13,0.5)',
                        transition: 'transform 0.25s ease',
                        transform: mobileServicesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                  {/* Mobile services sub-list */}
                  <div style={{
                    display: 'grid',
                    gridTemplateRows: mobileServicesOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s ease',
                  }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div className="pl-8 flex flex-col pb-2 pt-1">
                        {SERVICE_ITEMS.map(item => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeDrawer}
                            className="py-2.5 border-b text-sm font-bold"
                            style={{ borderColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)' }}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  href={link.href}
                  onClick={link.scroll ? (e) => handleNavClick(e, link.href, true) : closeDrawer}
                  className="group flex items-center gap-3 py-3 border-b"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <span className="text-[10px] font-black tabular-nums shrink-0 w-5" style={{ color: 'rgba(255,88,13,0.4)', fontFamily: 'monospace' }}>
                    0{i + 1}
                  </span>
                  <span
                    className="text-base font-black transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.75)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ff580d' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                  >
                    {link.label}
                  </span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-0 group-hover:translate-x-1" style={{ color: '#ff580d' }}>
                    →
                  </span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom CTAs */}
        <div className="relative px-7 pb-8 flex flex-col gap-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#1bb908', boxShadow: '0 0 6px #1bb908' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
              8000+ deliveries · 99.2% on-time · Calgary-based
            </span>
          </div>
          <Link
            href="/register"
            onClick={closeDrawer}
            className="w-full py-3 text-center text-sm font-black rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #1bb908, #15960a)', boxShadow: '0 4px 16px rgba(27,185,8,0.3)' }}
          >
            Create Account
          </Link>
          <Link
            href="/login"
            onClick={closeDrawer}
            className="w-full py-2.5 text-center text-xs font-black rounded-xl"
            style={{ border: '1.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
          >
            Login
          </Link>
        </div>
      </animated.div>

      {/* ── Bottom sticky delivery items marquee ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <Marquee items={DELIVERY_ITEMS} reverse={true} dark={false} label="Items We Ship" />
      </div>
    </>
  )
}
