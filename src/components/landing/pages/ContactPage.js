'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import GradientHeading from '@/components/landing/GradientHeading'
import { useIntersectionObserver } from '@/components/landing/hooks/useIntersectionObserver'
import {
  Phone, Mail, MapPin, ArrowRight, CheckCircle2,
  Clock, MessageSquare, Zap, Building2
} from 'lucide-react'

const CONTACT_INFO = [
  {
    icon: Phone,
    label: 'CALL US',
    value: '+1 825-488-2316',
    sub: 'Mon – Sat, 8am – 8pm',
    href: 'tel:+18254882316',
    accent: '#ff580d',
  },
  {
    icon: Mail,
    label: 'EMAIL',
    value: 'info@gfdelivery.ca',
    sub: 'Reply within 2 hours',
    href: 'mailto:info@gfdelivery.ca',
    accent: '#1bb908',
  },
  {
    icon: MapPin,
    label: 'SERVICE AREA',
    value: 'Calgary & Surroundings',
    sub: '8 cities covered',
    href: null,
    accent: '#ff580d',
  },
]

const QUICK_OPTIONS = [
  { icon: Zap,          label: 'Create Account',   desc: 'Sign up and start booking deliveries in minutes.',              href: '/register',        accent: '#1bb908' },
  { icon: MessageSquare, label: 'General Enquiry', desc: 'Questions about our service, coverage, or pricing.',            href: null,               accent: '#ff580d' },
  { icon: Building2,    label: 'Business Account', desc: 'Set up a recurring delivery account for your business.',        href: '/services/business-delivery', accent: '#ff580d' },
  { icon: Clock,        label: 'Track a Package',  desc: 'Already booked? Enter your tracking number to see live status.', href: '/track',          accent: '#1bb908' },
]

const PROMISES = [
  'No hidden fees, ever',
  'Real-time SMS updates',
  'Verified local drivers',
  'Same-day response guaranteed',
]

function validate(fields) {
  const errors = {}
  if (!fields.name.trim())    errors.name    = 'Required'
  if (!fields.email.trim())   errors.email   = 'Required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Invalid email'
  if (!fields.message.trim()) errors.message = 'Required'
  return errors
}

function FloatInput({ name, label, type = 'text', value, onChange, error, textarea }) {
  const [focused, setFocused] = useState(false)
  const lifted = focused || value.length > 0

  const baseStyle = {
    background: 'transparent',
    color: 'var(--landing-text)',
    outline: 'none',
    width: '100%',
    fontSize: '0.9rem',
    fontWeight: 500,
    paddingTop: '1.5rem',
    paddingBottom: '0.5rem',
    paddingLeft: 0,
    paddingRight: 0,
    resize: 'none',
    fontFamily: 'inherit',
    border: 'none',
  }

  return (
    <div
      className="relative"
      style={{
        borderBottom: `1.5px solid ${error ? '#ef4444' : focused ? '#ff580d' : 'rgba(0,0,0,0.15)'}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      <label
        htmlFor={name}
        className="absolute left-0 font-bold pointer-events-none transition-all duration-200"
        style={{
          top: lifted ? '4px' : '50%',
          transform: lifted ? 'none' : 'translateY(-50%)',
          fontSize: lifted ? '10px' : '13px',
          color: lifted ? (error ? '#ef4444' : '#ff580d') : 'rgba(0,0,0,0.35)',
          letterSpacing: lifted ? '0.1em' : '0',
          textTransform: lifted ? 'uppercase' : 'none',
        }}
      >
        {label}
      </label>
      {textarea ? (
        <textarea
          id={name} name={name} rows={4} value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...baseStyle, paddingTop: '1.8rem' }}
        />
      ) : (
        <input
          id={name} name={name} type={type} value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={baseStyle}
        />
      )}
      {error && (
        <span className="absolute right-0 bottom-1.5 text-[10px] font-bold text-red-500">{error}</span>
      )}
    </div>
  )
}

export default function ContactPage() {
  const [heroRef, heroVisible] = useIntersectionObserver({ threshold: 0.05 })
  const [formRef, formVisible] = useIntersectionObserver({ threshold: 0.06 })

  const [fields, setFields]   = useState({ name: '', email: '', phone: '', message: '' })
  const [errors, setErrors]   = useState({})
  const [status, setStatus]   = useState('idle')

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFields(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    const errs = validate(fields)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setFields({ name: '', email: '', phone: '', message: '' })
    } catch {
      setStatus('error')
    }
  }, [fields])

  return (
    <div data-page="landing" style={{ background: 'var(--landing-bg)' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ background: 'var(--landing-bg)', paddingTop: '1rem', paddingBottom: '4rem' }}
      >
        <div className="hero-blob-orange" style={{ opacity: 0.5 }} />
        <div className="hero-blob-green" style={{ opacity: 0.4 }} />
        <div className="absolute inset-0 dot-grid-bg pointer-events-none opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2 mb-8 text-xs font-semibold"
            style={{ color: 'var(--landing-text-2)', opacity: heroVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}
          >
            <Link href="/" className="hover:underline" style={{ color: 'var(--brand-green)' }}>Home</Link>
            <span style={{ color: 'rgba(0,0,0,0.3)' }}>/</span>
            <span>Contact</span>
          </div>

          <div className="max-w-3xl">
            <div
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
              }}
            >
              <span
                className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-5"
                style={{ background: 'rgba(255,88,13,0.1)', color: '#ff580d' }}
              >
                Get In Touch
              </span>
              <GradientHeading
                parts={[
                  { text: "We're Here,", color: 'black' },
                  { text: '\nLet\'s Talk.', color: 'green', highlight: true },
                ]}
                className="text-3xl sm:text-4xl lg:text-5xl mb-5"
              />
              <p className="text-base leading-relaxed max-w-xl" style={{ color: 'var(--landing-text-2)' }}>
                Whether you have a question, need a quote, or want to set up recurring deliveries, our team is fast to respond. Real people, real answers, no bots.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── QUICK OPTIONS ── */}
      <section style={{ background: '#faf8f4', padding: '3rem 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_OPTIONS.map((opt, i) => {
              const OIcon = opt.icon
              const card = (
                <div
                  className="flex flex-col gap-3 p-5 rounded-2xl transition-all cursor-pointer"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.07)',
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
                    transition: `opacity 0.5s ease ${0.1 + i * 0.08}s, transform 0.5s ease ${0.1 + i * 0.08}s`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${opt.accent}40`; e.currentTarget.style.boxShadow = `0 6px 24px ${opt.accent}14` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: opt.accent === '#ff580d' ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)',
                      border: `1px solid ${opt.accent}25`,
                    }}
                  >
                    <OIcon size={17} strokeWidth={2.2} style={{ color: opt.accent }} />
                  </div>
                  <div>
                    <p className="text-sm font-black" style={{ color: 'var(--landing-text)' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--landing-text-2)' }}>{opt.desc}</p>
                  </div>
                </div>
              )
              return opt.href
                ? <Link key={opt.label} href={opt.href}>{card}</Link>
                : <div key={opt.label}>{card}</div>
            })}
          </div>
        </div>
      </section>

      {/* ── CONTACT INFO + FORM ── */}
      <section
        ref={formRef}
        className="relative overflow-hidden"
        style={{ background: '#ffffff', padding: '5rem 0' }}
      >
        {/* Subtle ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-64 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(255,88,13,0.06) 0%, transparent 65%)', filter: 'blur(24px)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[42%_58%] gap-12 xl:gap-20 items-start">

            {/* LEFT: Info panel */}
            <div
              className="flex flex-col gap-10"
              style={{
                opacity: formVisible ? 1 : 0,
                transform: formVisible ? 'translateX(0)' : 'translateX(-24px)',
                transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
              }}
            >
              <div>
                <span
                  className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
                  style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
                >
                  Direct Lines
                </span>
                <GradientHeading
                  parts={[
                    { text: 'Reach Us', color: 'black' },
                    { text: '\nAnytime', color: 'green', highlight: true },
                  ]}
                  className="text-2xl sm:text-3xl lg:text-4xl"
                />
                <p className="text-sm leading-relaxed mt-4 max-w-sm" style={{ color: 'rgba(0,0,0,0.5)' }}>
                  Call, email, or send a message below. We prioritise all enquiries and you&apos;ll hear back from a real person within 2 hours on business days.
                </p>
              </div>

              {/* Contact rows */}
              <div className="flex flex-col gap-0">
                {CONTACT_INFO.map(({ icon: Icon, label, value, sub, href, accent }, i) => {
                  const inner = (
                    <div
                      className="flex items-start gap-4 py-5 border-b"
                      style={{
                        borderColor: 'rgba(0,0,0,0.08)',
                        opacity: formVisible ? 1 : 0,
                        transform: formVisible ? 'translateX(0)' : 'translateX(-16px)',
                        transition: `opacity 0.5s ease ${0.25 + i * 0.1}s, transform 0.5s ease ${0.25 + i * 0.1}s`,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
                      >
                        <Icon size={16} style={{ color: accent }} strokeWidth={2.2} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black tracking-[0.25em] mb-1" style={{ color: 'rgba(0,0,0,0.35)', fontFamily: 'monospace' }}>
                          {label}
                        </p>
                        <p className="text-sm font-black leading-none" style={{ color: 'rgba(0,0,0,0.85)' }}>{value}</p>
                        <p className="text-[11px] mt-1 font-medium" style={{ color: 'rgba(0,0,0,0.4)' }}>{sub}</p>
                      </div>
                    </div>
                  )
                  return href
                    ? <a key={label} href={href} className="block hover:opacity-80 transition-opacity">{inner}</a>
                    : <div key={label}>{inner}</div>
                })}
              </div>

              {/* Promise list */}
              <div
                className="flex flex-col gap-2.5"
                style={{ opacity: formVisible ? 1 : 0, transition: 'opacity 0.5s ease 0.6s' }}
              >
                {PROMISES.map(p => (
                  <div key={p} className="flex items-center gap-2.5">
                    <CheckCircle2 size={13} style={{ color: '#1bb908', opacity: 0.8 }} strokeWidth={2.5} />
                    <span className="text-xs font-semibold" style={{ color: 'rgba(0,0,0,0.45)' }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Form card */}
            <div
              style={{
                opacity: formVisible ? 1 : 0,
                transform: formVisible ? 'translateY(0)' : 'translateY(32px)',
                transition: 'opacity 0.65s ease 0.2s, transform 0.65s ease 0.2s',
              }}
            >
              {/* Shadow blob */}
              <div className="absolute -inset-4 rounded-3xl pointer-events-none" style={{ background: 'rgba(255,88,13,0.05)', filter: 'blur(32px)' }} />
              <div
                className="relative rounded-3xl p-8 md:p-10 flex flex-col gap-8"
                style={{ background: '#ffffff', boxShadow: '0 32px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)' }}
              >
                <div>
                  <h3 className="text-xl font-black" style={{ color: 'var(--landing-text)' }}>Send Us a Message</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--landing-text-2)' }}>We reply within 2 hours on business days.</p>
                </div>

                {status === 'success' ? (
                  <div className="flex flex-col items-center gap-4 py-10 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(27,185,8,0.1)' }}>
                      <CheckCircle2 size={32} style={{ color: '#1bb908' }} strokeWidth={2} />
                    </div>
                    <p className="text-lg font-black" style={{ color: 'var(--landing-text)' }}>Message Sent!</p>
                    <p className="text-sm" style={{ color: 'var(--landing-text-2)' }}>We&apos;ll get back to you within 2 hours.</p>
                    <button
                      onClick={() => setStatus('idle')}
                      className="text-xs font-bold underline underline-offset-2"
                      style={{ color: 'var(--brand-orange)' }}
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FloatInput name="name"  label="Your Name"        value={fields.name}  onChange={handleChange} error={errors.name} />
                      <FloatInput name="email" label="Email Address" type="email" value={fields.email} onChange={handleChange} error={errors.email} />
                    </div>
                    <FloatInput name="phone"   label="Phone (optional)" type="tel"  value={fields.phone}   onChange={handleChange} error={errors.phone} />
                    <FloatInput name="message" label="Your Message"                 value={fields.message} onChange={handleChange} error={errors.message} textarea />

                    {status === 'error' && (
                      <p className="text-xs font-bold text-red-500 -mt-2">Something went wrong. Please try again.</p>
                    )}

                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-sm disabled:opacity-60 transition-all hover:opacity-90 hover:scale-[1.01] shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #ff580d, #e04500)' }}
                    >
                      {status === 'loading' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── COVERAGE BAND ── */}
      <section style={{ background: '#faf8f4', padding: '4rem 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: '#ff580d' }}>Service Coverage</p>
              <h3 className="text-xl font-black" style={{ color: 'var(--landing-text)' }}>We Deliver Across 8 Cities</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--landing-text-2)' }}>
                Calgary · Cochrane · Airdrie · Okotoks · High River · Chestermere · Strathmore · Langdon
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white font-black text-sm shrink-0 transition-all hover:opacity-90 cta-pulse"
              style={{ background: 'var(--brand-green)', boxShadow: '0 4px 18px rgba(27,185,8,0.35)' }}
            >
              Get Started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
