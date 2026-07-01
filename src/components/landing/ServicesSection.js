'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Zap, MapPin, Building2, Clock, Flame, ArrowUpRight } from 'lucide-react'
import GradientHeading from './GradientHeading'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'

const SERVICES = [
  {
    num: '01',
    icon: Zap,
    title: 'Same-Day Delivery',
    tagline: 'Pick up. Drop off. Done today.',
    desc: 'Same-city pickup and delivery within hours. Perfect for urgent parcels, documents, and anything that cannot wait until tomorrow.',
    stat: '< 3 hrs',
    statLabel: 'avg turnaround',
    accent: '#ff580d',
    img: '/images/services/Same-Day-Delivery.webp',
    imgAlt: 'Courier making a fast same-day delivery',
    tags: ['Urgent parcels', 'Documents', 'Medical supplies'],
  },
  {
    num: '02',
    icon: MapPin,
    title: 'Express Pickup',
    tagline: 'Booked in minutes. At your door fast.',
    desc: 'Schedule a pickup in seconds from your phone. Our nearest driver heads to you immediately, with no waiting and no stress.',
    stat: '15 min',
    statLabel: 'avg pickup time',
    accent: '#1bb908',
    img: '/images/services/Express-Pickup.webp',
    imgAlt: 'Driver picking up a package at a door',
    tags: ['On-demand', 'Real-time tracking', 'Door-to-door'],
  },
  {
    num: '03',
    icon: Building2,
    title: 'Business Delivery',
    tagline: 'Scale your logistics. We handle the rest.',
    desc: 'Recurring bulk deliveries for Calgary businesses of all sizes. Dedicated drivers, priority routing, and seamless workflow integration.',
    stat: '500+',
    statLabel: 'businesses served',
    accent: '#ff580d',
    img: '/images/services/Business-Delivery.webp',
    imgAlt: 'Business packages ready for bulk delivery',
    tags: ['Bulk orders', 'B2B logistics', 'Recurring runs'],
  },
  {
    num: '04',
    icon: Clock,
    title: 'Scheduled Runs',
    tagline: 'Plan it once. Rely on it forever.',
    desc: 'Set up recurring delivery schedules and forget about it. We show up on time, every time, without you lifting a finger.',
    stat: '99.2%',
    statLabel: 'on-time rate',
    accent: '#1bb908',
    img: '/images/services/Scheduled-Runs.webp',
    imgAlt: 'Delivery driver checking schedule on phone',
    tags: ['Recurring', 'Automated', 'Zero effort'],
  },
  {
    num: '05',
    icon: Flame,
    title: 'Hotshot Delivery',
    tagline: 'When it absolutely cannot wait.',
    desc: 'Dedicated single-load rush delivery for time-critical freight. One driver, one pickup, one destination with no stops and no delays. Ideal for urgent parts, medical supplies, legal documents, and last-minute business shipments across Calgary and beyond.',
    stat: '1 hr',
    statLabel: 'priority dispatch',
    accent: '#ff580d',
    img: '/images/services/Hotshot-Delivery.webp',
    imgAlt: 'Driver rushing an urgent hotshot delivery',
    tags: ['Rush freight', 'Dedicated driver', 'No stops'],
  },
]

function ServiceRow({ service, index, isOpen, onToggle, sectionVisible }) {
  const Icon = service.icon
  const isOrange = service.accent === '#ff580d'

  return (
    <div
      className="relative border-b overflow-hidden"
      style={{
        borderColor: 'rgba(0,0,0,0.07)',
        opacity: sectionVisible ? 1 : 0,
        transform: sectionVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${index * 0.09}s, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${index * 0.09}s`,
      }}
    >
      {/* Row trigger */}
      <button
        onClick={onToggle}
        className="w-full text-left group"
        aria-expanded={isOpen}
      >
        <div
          className="relative flex items-center gap-6 px-6 md:px-10"
          style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
        >
          {/* Big number */}
          <span
            className="shrink-0 font-black leading-none select-none transition-colors duration-300"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              color: isOpen ? service.accent : 'rgba(0,0,0,0.1)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {service.num}
          </span>

          {/* Icon */}
          <div
            className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
            style={{
              background: isOpen
                ? (isOrange ? 'rgba(255,88,13,0.2)' : 'rgba(27,185,8,0.2)')
                : 'rgba(0,0,0,0.05)',
              border: `1px solid ${isOpen ? service.accent + '50' : 'rgba(0,0,0,0.1)'}`,
            }}
          >
            <Icon
              size={18}
              strokeWidth={2.2}
              style={{ color: isOpen ? service.accent : 'rgba(0,0,0,0.3)', transition: 'color 0.3s' }}
            />
          </div>

          {/* Title + tagline */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-black leading-tight transition-colors duration-300"
              style={{
                fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                color: isOpen ? '#0d0d0d' : 'rgba(0,0,0,0.55)',
              }}
            >
              {service.title}
            </h3>
            <p
              className="text-xs md:text-sm font-medium mt-0.5 transition-all duration-300"
              style={{
                color: isOpen ? service.accent : 'rgba(0,0,0,0.25)',
                maxHeight: isOpen ? '4em' : '0',
                overflow: 'hidden',
              }}
            >
              {service.tagline}
            </p>
          </div>

          {/* Stat — desktop */}
          <div
            className="hidden md:flex flex-col items-end shrink-0 transition-opacity duration-300"
            style={{ opacity: isOpen ? 1 : 0.3 }}
          >
            <span
              className="text-2xl font-black leading-none"
              style={{ color: service.accent }}
            >
              {service.stat}
            </span>
            <span className="text-[10px] font-semibold mt-0.5 uppercase tracking-widest" style={{ color: 'rgba(0,0,0,0.4)' }}>
              {service.statLabel}
            </span>
          </div>

          {/* Arrow toggle */}
          <div
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              background: isOpen ? service.accent : 'rgba(0,0,0,0.07)',
              transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          >
            <ArrowUpRight
              size={14}
              strokeWidth={2.5}
              style={{ color: isOpen ? '#fff' : 'rgba(0,0,0,0.35)' }}
            />
          </div>
        </div>
      </button>

      {/* Expandable body — grid-rows trick avoids maxHeight reflow */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.5s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
        <div className="flex flex-col md:flex-row gap-0 px-6 md:px-10 pb-8 pt-4">

          {/* Left: desc + tags + stat (mobile) */}
          <div className="flex-1 flex flex-col gap-5 md:pr-10">
            <p className="text-sm md:text-base leading-relaxed" style={{ color: 'rgba(0,0,0,0.55)' }}>
              {service.desc}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {service.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: isOrange ? 'rgba(255,88,13,0.12)' : 'rgba(27,185,8,0.1)',
                    color: service.accent,
                    border: `1px solid ${service.accent}30`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Stat mobile */}
            <div className="flex md:hidden items-center gap-3">
              <span className="text-3xl font-black" style={{ color: service.accent }}>{service.stat}</span>
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(0,0,0,0.4)' }}>{service.statLabel}</span>
            </div>
          </div>

          {/* Right: photo */}
          <div
            className="relative shrink-0 rounded-2xl overflow-hidden mt-5 md:mt-0 w-full md:max-w-85"
            style={{
              height: '200px',
              border: `1px solid ${service.accent}30`,
            }}
          >
            <Image
              src={service.img}
              alt={service.imgAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 340px"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${service.accent}40 0%, transparent 50%)`,
              }}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Left accent line on open */}
      <div
        className="absolute left-0 top-0 w-0.75 transition-all duration-500"
        style={{
          background: service.accent,
          height: isOpen ? '100%' : '0%',
        }}
      />
    </div>
  )
}

export default function ServicesSection() {
  const [openIndex, setOpenIndex] = useState(0)
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.08 })
  const pausedRef = useRef(false)
  const pauseTimerRef = useRef(null)

  // Auto-cycle through accordion items every 5s; pause on manual click, resume after 10s
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pausedRef.current) {
        setOpenIndex(prev => (prev + 1) % SERVICES.length)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  function handleToggle(i) {
    setOpenIndex(openIndex === i ? -1 : i)
    pausedRef.current = true
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
    pauseTimerRef.current = setTimeout(() => {
      pausedRef.current = false
    }, 10000)
  }

  return (
    <section
      id="services"
      ref={ref}
      className="relative overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-150 h-100 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(255,88,13,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />


      <div className="relative max-w-7xl mx-auto px-0 sm:px-4 lg:px-8 py-16 md:py-24">

        {/* Header */}
        <div className="px-6 md:px-10 lg:px-0 mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <span
              className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
              style={{ background: 'rgba(255,88,13,0.12)', color: '#ff580d' }}
            >
              What We Offer
            </span>
            <GradientHeading
              parts={[
                { text: 'Our ',      color: 'black' },
                { text: 'Delivery',  color: 'green', highlight: true },
                { text: '\nServices', color: 'green' },
              ]}
              className="text-2xl sm:text-3xl lg:text-4xl"
            />
          </div>
          <p
            className="text-sm leading-relaxed max-w-xs"
            style={{ color: 'rgba(0,0,0,0.45)' }}
          >
            Five ways we move Canada forward. Pick the one that fits your need.
          </p>
        </div>

        {/* Accordion list */}
        <div
          className="border-t"
          style={{ borderColor: 'rgba(0,0,0,0.07)' }}
        >
          {SERVICES.map((service, i) => (
            <ServiceRow
              key={service.num}
              service={service}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => handleToggle(i)}
              sectionVisible={isVisible}
            />
          ))}
        </div>

      </div>


    </section>
  )
}
