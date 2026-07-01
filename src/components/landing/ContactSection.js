'use client'
import { useState, useCallback } from 'react'
import { Phone, Mail, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react'
import GradientHeading from './GradientHeading'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'

const CONTACT_INFO = [
  {
    icon: Phone,
    label: 'CALL US',
    value: '+1 825-488-2316',
    sub: 'Mon – Sat, 8am – 8pm',
    color: '#ff580d',
  },
  {
    icon: Mail,
    label: 'EMAIL',
    value: 'info@gfdelivery.ca',
    sub: 'Reply within 2 hours',
    color: '#1bb908',
  },
  {
    icon: MapPin,
    label: 'SERVICE AREA',
    value: 'Calgary & Surroundings',
    sub: '8 communities covered',
    color: '#ff580d',
  },
]

const PROMISES = [
  'No hidden fees, ever',
  'Real-time SMS updates',
  'Verified local drivers',
  'Same-day response guaranteed',
]

function validate(fields) {
  const errors = {}
  if (!fields.name.trim())    errors.name = 'Required'
  if (!fields.email.trim())   errors.email = 'Required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Invalid email'
  if (!fields.message.trim()) errors.message = 'Required'
  return errors
}

// Floating label input — label rises on focus or when value is present
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
    <div className="relative" style={{ borderBottom: `1.5px solid ${error ? '#ef4444' : focused ? '#ff580d' : 'rgba(0,0,0,0.15)'}`, transition: 'border-color 0.2s ease' }}>
      <label
        htmlFor={name}
        className="absolute left-0 font-bold pointer-events-none transition-all duration-200"
        style={{
          top: lifted ? '4px' : '50%',
          transform: lifted ? 'none' : textarea ? 'translateY(-50%)' : 'translateY(-50%)',
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
          id={name}
          name={name}
          rows={4}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...baseStyle, paddingTop: '1.8rem' }}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={baseStyle}
        />
      )}

      {error && (
        <span className="absolute right-0 bottom-1.5 text-[10px] font-bold text-red-500">
          {error}
        </span>
      )}
    </div>
  )
}

export default function ContactSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.06 })
  const [fields, setFields] = useState({ name: '', email: '', phone: '', message: '' })
  const [errors, setErrors]  = useState({})
  const [status, setStatus]  = useState('idle')

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
    <section
      id="contact"
      ref={ref}
      className="relative overflow-hidden"
      style={{ background: '#faf8f4' }}
    >
      {/* Orange glow top-left */}
      <div
        className="absolute top-0 left-0 w-96 h-96 pointer-events-none"
        style={{ background: 'radial-gradient(circle at top left, rgba(255,88,13,0.12) 0%, transparent 65%)', filter: 'blur(20px)' }}
      />
      {/* Green glow bottom-right */}
      <div
        className="absolute bottom-0 right-0 w-80 h-80 pointer-events-none"
        style={{ background: 'radial-gradient(circle at bottom right, rgba(27,185,8,0.06) 0%, transparent 65%)', filter: 'blur(20px)' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[44%_56%] gap-12 xl:gap-20 items-start">

          {/* ── LEFT: Info panel ── */}
          <div
            className="flex flex-col gap-10"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-24px)',
              transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
            }}
          >
            {/* Heading */}
            <div className="flex flex-col gap-4">
              <span
                className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase w-fit"
                style={{ background: 'rgba(255,88,13,0.12)', color: '#ff580d' }}
              >
                Get In Touch
              </span>
              <GradientHeading
                parts={[
                  { text: 'Let\'s Talk', color: 'black' },
                  { text: '\nDelivery.', color: 'green', highlight: true },
                ]}
                className="text-2xl sm:text-3xl lg:text-4xl"
              />
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Have a question, need a quote, or want to set up recurring deliveries? Our team responds fast.
              </p>
            </div>

            {/* Contact info rows — terminal style */}
            <div className="flex flex-col gap-0">
              {CONTACT_INFO.map(({ icon: Icon, label, value, sub, color }, i) => (
                <div
                  key={label}
                  className="flex items-start gap-4 py-5 border-b"
                  style={{
                    borderColor: 'rgba(0,0,0,0.08)',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateX(0)' : 'translateX(-16px)',
                    transition: `opacity 0.5s ease ${0.25 + i * 0.1}s, transform 0.5s ease ${0.25 + i * 0.1}s`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    <Icon size={16} style={{ color }} strokeWidth={2.2} />
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black tracking-[0.25em] mb-1"
                      style={{ color: 'rgba(0,0,0,0.35)', fontFamily: 'monospace' }}
                    >
                      {label}
                    </p>
                    <p className="text-sm font-black leading-none" style={{ color: 'rgba(0,0,0,0.85)' }}>
                      {value}
                    </p>
                    <p className="text-[11px] mt-1 font-medium" style={{ color: 'rgba(0,0,0,0.4)' }}>
                      {sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Promise list */}
            <div
              className="flex flex-col gap-2.5"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.5s ease 0.6s',
              }}
            >
              {PROMISES.map((p, i) => (
                <div key={p} className="flex items-center gap-2.5">
                  <CheckCircle2 size={13} style={{ color: '#1bb908', opacity: 0.8 }} strokeWidth={2.5} />
                  <span className="text-xs font-semibold" style={{ color: 'rgba(0,0,0,0.45)' }}>{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Form card ── */}
          <div
            className="relative"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
              transition: 'opacity 0.65s ease 0.2s, transform 0.65s ease 0.2s',
            }}
          >
            {/* Card shadow blob */}
            <div
              className="absolute -inset-4 rounded-3xl pointer-events-none"
              style={{ background: 'rgba(255,88,13,0.06)', filter: 'blur(32px)' }}
            />

            <div
              className="relative rounded-3xl p-8 md:p-10 flex flex-col gap-8"
              style={{
                background: '#ffffff',
                boxShadow: '0 32px 80px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.06)',
              }}
            >
              <div>
                <h3 className="text-xl font-black" style={{ color: 'var(--landing-text)' }}>
                  Send Us a Message
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--landing-text-2)' }}>
                  We reply within 2 hours on business days.
                </p>
              </div>

              {status === 'success' ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(27,185,8,0.1)' }}
                  >
                    <CheckCircle2 size={32} style={{ color: '#1bb908' }} strokeWidth={2} />
                  </div>
                  <p className="text-lg font-black" style={{ color: 'var(--landing-text)' }}>Message Sent!</p>
                  <p className="text-sm" style={{ color: 'var(--landing-text-2)' }}>
                    We&apos;ll get back to you within 2 hours.
                  </p>
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
                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FloatInput
                      name="name" label="Your Name"
                      value={fields.name} onChange={handleChange} error={errors.name}
                    />
                    <FloatInput
                      name="email" label="Email Address" type="email"
                      value={fields.email} onChange={handleChange} error={errors.email}
                    />
                  </div>

                  {/* Phone */}
                  <FloatInput
                    name="phone" label="Phone Number (optional)" type="tel"
                    value={fields.phone} onChange={handleChange} error={errors.phone}
                  />

                  {/* Message */}
                  <FloatInput
                    name="message" label="Your Message"
                    value={fields.message} onChange={handleChange} error={errors.message}
                    textarea
                  />

                  {status === 'error' && (
                    <p className="text-xs font-bold text-red-500 -mt-2">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  {/* Submit */}
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
  )
}
