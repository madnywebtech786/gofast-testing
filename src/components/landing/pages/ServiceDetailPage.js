'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import GradientHeading from '@/components/landing/GradientHeading'
import { useIntersectionObserver } from '@/components/landing/hooks/useIntersectionObserver'
import {
  ArrowRight, Clock, Zap, MapPin, Building2, Flame,
  FileText, Pill, Scale, Package, UtensilsCrossed, Gift,
  ShoppingCart, RotateCcw, Briefcase, Bike, PartyPopper, BoxIcon,
  Factory, Syringe, ClipboardList, Truck, Handshake, ChefHat,
  Mail, RefreshCw, FlaskConical, Salad, Repeat, Printer,
  Stethoscope, Wrench, AlertTriangle, FilePen, Gem,
  DoorOpen, MapPinned, CheckCheck, Clock3, PackageCheck, BadgeCheck,
  UserCheck, LayoutDashboard, Gauge, Receipt, Shuffle, BadgeDollarSign,
  CalendarClock, Timer, Bell, PenLine, Route, MessageSquare,
  Rocket, Shield, Users, Plus, Minus,
} from 'lucide-react'

export const ALL_SERVICES = [
  {
    slug: 'same-day-delivery',
    num: '01',
    icon: Zap,
    title: 'Same-Day Delivery',
    tagline: 'Pick up. Drop off. Done today.',
    shortDesc: 'Pickup and delivery within hours anywhere in Calgary and surrounding areas.',
    heroDesc: 'When it needs to arrive today, we make it happen. GoFastDelivery\'s same-day service connects pickup and drop-off points across Calgary in under 3 hours on average, whether it\'s a single envelope or a full box of supplies.',
    stat: '< 3 hrs',
    statLabel: 'avg turnaround',
    accent: '#ff580d',
    img: '/images/services/Same-Day-Delivery.webp',
    imgAlt: 'Courier making a fast same-day delivery',
    tags: ['Urgent parcels', 'Documents', 'Medical supplies'],
    features: [
      { icon: DoorOpen,    title: 'Door-to-Door Pickup',    desc: 'We collect directly from your location. No need to drop off anywhere.' },
      { icon: MapPinned,   title: 'Live Status Tracking',    desc: 'Follow your delivery through every stage: assigned, picked up, en route, and delivered.' },
      { icon: CheckCheck,  title: 'Proof of Delivery',      desc: 'Photo confirmation and signature capture at every drop-off.' },
      { icon: MapPin,      title: 'Calgary-Wide Coverage',  desc: 'All 8 cities in our network, including surrounding communities.' },
      { icon: Package,     title: 'Any Package Type',       desc: 'Documents, boxes, food, medical supplies, gifts and more.' },
      { icon: BadgeCheck,  title: 'No Hidden Fees',         desc: 'Transparent pricing shown upfront before you confirm the booking.' },
    ],
    useCases: [
      { label: 'Urgent Documents',   icon: FileText },
      { label: 'Medical Supplies',   icon: Pill },
      { label: 'Legal Filings',      icon: Scale },
      { label: 'Retail Orders',      icon: Package },
      { label: 'Food Deliveries',    icon: UtensilsCrossed },
      { label: 'Last-Minute Gifts',  icon: Gift },
    ],
    faq: [
      { q: 'How fast is same-day delivery?', a: 'Average turnaround is under 3 hours from pickup confirmation, depending on distance and driver availability.' },
      { q: 'What areas do you cover?', a: 'We cover Calgary, Cochrane, Airdrie, Okotoks, High River, Chestermere, Strathmore, and Langdon.' },
      { q: 'Can I track my package?', a: 'Yes. Every booking includes live status tracking accessible from your customer dashboard and via a shareable tracking link.' },
      { q: 'Is there a weight or size limit?', a: 'We handle most standard courier loads. Contact us for oversized or heavy freight and we can usually accommodate.' },
    ],
  },
  {
    slug: 'express-pickup',
    num: '02',
    icon: MapPin,
    title: 'Express Pickup',
    tagline: 'Booked in minutes. At your door fast.',
    shortDesc: 'Schedule a pickup in seconds from your phone. Our nearest driver heads to you immediately.',
    heroDesc: 'Don\'t wait for a pickup window that never comes. Book your express pickup in under a minute and a nearby GoFastDelivery driver will be at your door fast. No lengthy scheduling, no guesswork.',
    stat: '15 min',
    statLabel: 'avg pickup time',
    accent: '#1bb908',
    img: '/images/services/Express-Pickup.webp',
    imgAlt: 'Driver picking up a package at a door',
    tags: ['On-demand', 'Real-time tracking', 'Door-to-door'],
    features: [
      { icon: Rocket,       title: 'On-Demand Booking',          desc: 'Create a pickup request from your phone or desktop in under 60 seconds.' },
      { icon: MapPinned,    title: 'Nearest Driver Dispatch',    desc: 'Our system routes the closest available driver directly to you.' },
      { icon: Timer,        title: 'Real-Time ETA',              desc: 'Get an estimated arrival time the moment a driver is assigned to your pickup.' },
      { icon: CalendarClock,title: 'Flexible Scheduling',        desc: 'Book for right now or schedule up to 24 hours in advance.' },
      { icon: Shield,       title: 'Package Handling Guaranteed',desc: 'Every driver is trained in safe package handling procedures.' },
      { icon: Bell,         title: 'Instant Confirmation',       desc: 'Get a confirmation SMS and email the moment your pickup is assigned.' },
    ],
    useCases: [
      { label: 'Marketplace Sellers',    icon: ShoppingCart },
      { label: 'Retail Returns',         icon: RotateCcw },
      { label: 'Inter-Office Transfers', icon: Briefcase },
      { label: 'Personal Courier',       icon: Bike },
      { label: 'Event Supplies',         icon: PartyPopper },
      { label: 'Fragile Items',          icon: BoxIcon },
    ],
    faq: [
      { q: 'How do I book an express pickup?', a: 'Create an account, enter pickup and drop-off addresses, choose your package type, and confirm. It takes under 2 minutes.' },
      { q: 'Can I schedule a pickup in advance?', a: 'Yes. You can schedule up to 24 hours in advance or book on-demand for immediate pickup.' },
      { q: 'What if the driver is late?', a: 'We\'ll notify you proactively. Our 99.2% on-time rate means this is rare, but we always communicate.' },
      { q: 'Is there a minimum order value?', a: 'No minimum. Single-item pickups are welcome.' },
    ],
  },
  {
    slug: 'business-delivery',
    num: '03',
    icon: Building2,
    title: 'Business Delivery',
    tagline: 'Scale your logistics. We handle the rest.',
    shortDesc: 'Recurring bulk deliveries for Calgary businesses. Dedicated drivers, priority routing, seamless integration.',
    heroDesc: 'Growing Calgary businesses need a logistics partner that scales with them. Our B2B service provides dedicated drivers, bulk delivery management, priority routing, and account-level reporting so your operations keep moving.',
    stat: '500+',
    statLabel: 'businesses served',
    accent: '#ff580d',
    img: '/images/services/Business-Delivery.webp',
    imgAlt: 'Business packages ready for bulk delivery',
    tags: ['Bulk orders', 'B2B logistics', 'Recurring runs'],
    features: [
      { icon: UserCheck,      title: 'Dedicated Account Driver',  desc: 'Regular clients get assigned drivers who know your addresses and preferences.' },
      { icon: LayoutDashboard,title: 'Bulk Booking Dashboard',    desc: 'Manage multiple deliveries at once through your business portal.' },
      { icon: Gauge,          title: 'Priority Routing',          desc: 'Business bookings receive priority dispatch during peak hours.' },
      { icon: Receipt,        title: 'Monthly Invoicing',         desc: 'Consolidated invoicing for all deliveries with no per-transaction friction.' },
      { icon: Shuffle,        title: 'B2B, B2C, C2C Support',    desc: 'We handle all delivery directions for modern business models.' },
      { icon: BadgeDollarSign,title: 'Volume Discounts',          desc: 'Regular high-volume clients qualify for negotiated rate structures.' },
    ],
    useCases: [
      { label: 'E-Commerce Fulfilment', icon: Factory },
      { label: 'Pharmacy Deliveries',   icon: Syringe },
      { label: 'Office Supplies',       icon: ClipboardList },
      { label: 'Wholesale Distribution',icon: Truck },
      { label: 'B2B Transfers',         icon: Handshake },
      { label: 'Restaurant Catering',   icon: ChefHat },
    ],
    faq: [
      { q: 'Is there a minimum volume for business accounts?', a: 'No hard minimum. We work with businesses of all sizes. Volume discounts unlock at higher tiers.' },
      { q: 'Can I get a dedicated driver every day?', a: 'Yes, regular business clients can request dedicated driver assignments.' },
      { q: 'Do you support B2C deliveries on behalf of our business?', a: 'Absolutely. We handle B2B, B2C, and C2C delivery flows. Your customers get the same great experience.' },
      { q: 'How does billing work?', a: 'We offer monthly consolidated invoicing for business accounts. No per-delivery manual payments needed.' },
    ],
  },
  {
    slug: 'scheduled-runs',
    num: '04',
    icon: Clock,
    title: 'Scheduled Runs',
    tagline: 'Plan it once. Rely on it forever.',
    shortDesc: 'Set up recurring delivery schedules and forget about it. We show up on time, every time.',
    heroDesc: 'Stop rebuilding your delivery schedule from scratch every week. GoFastDelivery\'s scheduled runs let you set it up once, daily, weekly, or custom, and we handle the rest with 99.2% on-time reliability.',
    stat: '99.2%',
    statLabel: 'on-time rate',
    accent: '#1bb908',
    img: '/images/services/Scheduled-Runs.webp',
    imgAlt: 'Delivery driver checking schedule on phone',
    tags: ['Recurring', 'Automated', 'Zero effort'],
    features: [
      { icon: CalendarClock,title: 'Daily or Weekly Runs',    desc: 'Set any recurrence pattern: daily, weekdays, specific days, or custom intervals.' },
      { icon: Clock3,        title: '99.2% On-Time Rate',     desc: 'Scheduled runs are prioritized and pre-dispatched to ensure punctuality.' },
      { icon: RefreshCw,     title: 'Auto-Confirmation',      desc: 'Receive automated confirmations and completion reports without lifting a finger.' },
      { icon: PenLine,       title: 'Easy Schedule Changes',  desc: 'Modify or pause your schedule anytime from your dashboard. No phone calls needed.' },
      { icon: Route,         title: 'Multiple Drop-Offs',     desc: 'One scheduled run can cover multiple addresses in an optimized route.' },
      { icon: MessageSquare, title: 'SMS Delivery Alerts',    desc: 'Your recipients get automatic arrival notifications for every run.' },
    ],
    useCases: [
      { label: 'Daily Mail Runs',      icon: Mail },
      { label: 'Weekly Restocking',    icon: Package },
      { label: 'Recurring Lab Samples',icon: FlaskConical },
      { label: 'Meal Plans',           icon: Salad },
      { label: 'Subscription Boxes',   icon: Repeat },
      { label: 'Print & Distribution', icon: Printer },
    ],
    faq: [
      { q: 'Can I pause a scheduled run without cancelling?', a: 'Yes. Pause and resume any schedule directly from your dashboard at no extra charge.' },
      { q: 'What if I need to add a stop to an existing run?', a: 'You can modify the route up to 2 hours before the scheduled pickup time.' },
      { q: 'Do you guarantee on-time arrival?', a: 'Our 99.2% on-time rate speaks for itself. For time-critical runs, contact us to discuss priority SLAs.' },
      { q: 'Is there a discount for long-term scheduled contracts?', a: 'Yes. Monthly and annual commitments qualify for preferential rates.' },
    ],
  },
  {
    slug: 'hotshot-delivery',
    num: '05',
    icon: Flame,
    title: 'Hotshot Delivery',
    tagline: 'When it absolutely cannot wait.',
    shortDesc: 'Dedicated single-load rush delivery for time-critical freight. One driver, one pickup, no stops.',
    heroDesc: 'Some deliveries can\'t afford to wait in a queue. Hotshot gives you a dedicated driver dispatched immediately: one pickup, one destination, zero stops. Used by medical facilities, legal firms, and businesses where every minute of delay has a real cost.',
    stat: '1 hr',
    statLabel: 'priority dispatch',
    accent: '#ff580d',
    img: '/images/services/Hotshot-Delivery.webp',
    imgAlt: 'Driver rushing an urgent hotshot delivery',
    tags: ['Rush freight', 'Dedicated driver', 'No stops'],
    features: [
      { icon: Zap,         title: 'Immediate Dispatch',             desc: 'A driver is assigned within minutes of booking. No waiting, no queuing.' },
      { icon: Users,       title: 'One Load, One Driver',           desc: 'No shared routes. Your delivery is the only priority for that driver.' },
      { icon: Route,       title: 'Zero Stops en Route',            desc: 'Direct point-to-point with no intermediate stops or detours.' },
      { icon: Gauge,       title: 'Priority GPS Routing',           desc: 'Our system identifies the fastest current route in real time.' },
      { icon: FilePen,     title: 'Chain of Custody Documentation', desc: 'Full documentation for sensitive or regulated deliveries.' },
      { icon: Clock3,      title: '24/7 Availability',              desc: 'Hotshot runs are available around the clock for true emergencies.' },
    ],
    useCases: [
      { label: 'Medical Specimens',    icon: Stethoscope },
      { label: 'Legal Documents',      icon: Scale },
      { label: 'Critical Parts',       icon: Wrench },
      { label: 'Emergency Supplies',   icon: AlertTriangle },
      { label: 'Time-Locked Contracts',icon: FilePen },
      { label: 'High-Value Items',     icon: Gem },
    ],
    faq: [
      { q: 'What makes hotshot different from same-day?', a: 'Hotshot is a dedicated single-load service: one driver, one pickup, one destination, no stops. Same-day routes may have multiple deliveries.' },
      { q: 'Is hotshot available 24/7?', a: 'Yes. Hotshot delivery is available around the clock including weekends and holidays.' },
      { q: 'How quickly will a driver be dispatched?', a: 'Typically within 15–30 minutes of booking confirmation, depending on driver proximity.' },
      { q: 'Can I use hotshot for regulated medical cargo?', a: 'Yes. We provide chain of custody documentation for medical and pharmaceutical deliveries.' },
    ],
  },
]

/* ─── Features — 2-col card grid matching ServicesSection / WhyUsSection style ─── */
function FeaturesSection({ service, isVisible }) {
  const isOrange = service.accent === '#ff580d'
  return (
    <section style={{ background: '#ffffff', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-12"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <div>
            <span
              className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
              style={{ background: isOrange ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)', color: service.accent }}
            >
              What&apos;s Included
            </span>
            <GradientHeading
              parts={[
                { text: 'Everything in ', color: 'black' },
                { text: 'This Service', color: 'green', highlight: true },
              ]}
              className="text-2xl sm:text-3xl lg:text-4xl"
            />
          </div>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--landing-text-2)' }}>
            Every booking includes the full suite. No tiers, no add-ons.
          </p>
        </div>

        {/* 2×3 card grid — matches WhyUsSection why-card pattern */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {service.features.map((f, i) => {
            const FIcon = f.icon
            return (
              <div
                key={f.title}
                className={`why-card ${isOrange ? '' : 'why-card-green'} flex flex-col gap-4 p-7 rounded-3xl`}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.5s ease ${0.06 + i * 0.07}s, transform 0.5s ease ${0.06 + i * 0.07}s`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isOrange ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)',
                    border: `1px solid ${service.accent}25`,
                  }}
                >
                  <FIcon size={20} strokeWidth={2.2} style={{ color: service.accent }} />
                </div>
                <div>
                  <h3 className="text-base font-black mb-2" style={{ color: 'var(--landing-text)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-2)' }}>{f.desc}</p>
                </div>
                {/* Bottom accent line */}
                <div
                  className="h-0.5 rounded-full mt-auto"
                  style={{ background: `linear-gradient(90deg, ${service.accent}, transparent)` }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── Use cases — horizontal pill strip on warm bg ─── */
function UseCasesSection({ service, isVisible }) {
  const isOrange = service.accent === '#ff580d'
  return (
    <section style={{ background: '#faf8f4', padding: '3.5rem 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
          {/* Label */}
          <p
            className="shrink-0 text-[10px] font-black tracking-widest uppercase"
            style={{
              color: service.accent,
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            Ideal For
          </p>
          {/* Divider */}
          <div className="hidden sm:block w-px h-8 shrink-0" style={{ background: 'rgba(0,0,0,0.1)' }} />
          {/* Pills */}
          <div className="flex flex-wrap gap-2.5">
            {service.useCases.map((uc, i) => {
              const UIcon = uc.icon
              return (
                <div
                  key={uc.label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${service.accent}20`,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                    transition: `opacity 0.4s ease ${0.05 + i * 0.05}s, transform 0.4s ease ${0.05 + i * 0.05}s`,
                  }}
                >
                  <UIcon size={13} strokeWidth={2.2} style={{ color: service.accent }} />
                  <span className="text-[11px] font-bold" style={{ color: 'var(--landing-text)' }}>{uc.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ — open list, alternating tint rows ─── */
function FAQSection({ service, isVisible }) {
  const isOrange = service.accent === '#ff580d'
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section style={{ background: '#faf8f4', padding: '5rem 0' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[38%_62%] gap-12 lg:gap-20 items-start">

          {/* LEFT — sticky heading + contact CTA */}
          <div
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
              transition: 'opacity 0.55s ease 0.1s, transform 0.55s ease 0.1s',
            }}
          >
            <span
              className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-5"
              style={{ background: isOrange ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)', color: service.accent }}
            >
              FAQ
            </span>
            <GradientHeading
              parts={[
                { text: 'Questions\n', color: 'black' },
                { text: 'Answered', color: 'green', highlight: true },
              ]}
              className="text-2xl sm:text-3xl lg:text-4xl mb-5"
            />
            <p className="text-sm leading-relaxed mb-7" style={{ color: 'var(--landing-text-2)' }}>
              Everything you need to know about {service.title.toLowerCase()}. Can&apos;t find your answer? We respond within 2 hours.
            </p>
            {/* Progress indicator — shows which item is open */}
            <div className="flex flex-col gap-2 mb-8">
              {service.faq.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                  className="flex items-center gap-3 text-left transition-all group"
                >
                  <div
                    className="w-1 h-5 rounded-full shrink-0 transition-all duration-300"
                    style={{ background: openIndex === i ? service.accent : 'rgba(0,0,0,0.12)' }}
                  />
                  <span
                    className="text-xs font-bold truncate transition-colors duration-200"
                    style={{ color: openIndex === i ? service.accent : 'rgba(0,0,0,0.35)' }}
                  >
                    {item.q}
                  </span>
                </button>
              ))}
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-black transition-opacity hover:opacity-70"
              style={{ color: service.accent }}
            >
              Contact us <ArrowRight size={14} />
            </Link>
          </div>

          {/* RIGHT — accordion */}
          <div
            className="flex flex-col"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
              transition: 'opacity 0.55s ease 0.2s, transform 0.55s ease 0.2s',
            }}
          >
            {service.faq.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <div
                  key={item.q}
                  className="border-b overflow-hidden"
                  style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                >
                  {/* Question row — clickable */}
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    className="w-full flex items-center gap-4 py-5 text-left group"
                  >
                    {/* Number */}
                    <span
                      className="shrink-0 text-[11px] font-black tabular-nums"
                      style={{ color: isOpen ? service.accent : 'rgba(0,0,0,0.2)', fontFamily: 'monospace', transition: 'color 0.2s' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {/* Question text */}
                    <span
                      className="flex-1 text-sm font-black leading-snug transition-colors duration-200"
                      style={{ color: isOpen ? 'var(--landing-text)' : 'rgba(0,0,0,0.55)' }}
                    >
                      {item.q}
                    </span>
                    {/* Toggle icon */}
                    <div
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                      style={{
                        background: isOpen ? service.accent : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      {isOpen
                        ? <Minus size={12} strokeWidth={2.5} color="#fff" />
                        : <Plus  size={12} strokeWidth={2.5} style={{ color: 'rgba(0,0,0,0.4)' }} />
                      }
                    </div>
                  </button>

                  {/* Answer — grid-rows expand trick */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateRows: isOpen ? '1fr' : '0fr',
                      transition: 'grid-template-rows 0.35s cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        className="pb-5 pl-9 pr-2"
                        style={{
                          borderLeft: `2px solid ${service.accent}30`,
                          marginLeft: '1.4rem',
                        }}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--landing-text-2)' }}>
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}

/* ─── Other services — horizontal scrollable on warm bg ─── */
function OtherServicesSection({ service, otherServices, isVisible }) {
  return (
    <section style={{ background: '#faf8f4', padding: '4rem 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <p
            className="text-[10px] font-black tracking-widest uppercase"
            style={{
              color: 'rgba(0,0,0,0.3)',
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}
          >
            Other Services
          </p>
          <Link
            href="/#services"
            className="text-xs font-black flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ color: service.accent, opacity: isVisible ? 1 : 0, transition: 'opacity 0.4s ease 0.2s' }}
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {otherServices.map((s, i) => {
            const SIcon = s.icon
            const sOrange = s.accent === '#ff580d'
            return (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="group flex items-center gap-4 p-5 rounded-2xl transition-all"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(14px)',
                  transition: `opacity 0.45s ease ${i * 0.1}s, transform 0.45s ease ${i * 0.1}s`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.accent}45`; e.currentTarget.style.boxShadow = `0 6px 24px ${s.accent}12` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div
                  className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: sOrange ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)',
                    border: `1px solid ${s.accent}25`,
                  }}
                >
                  <SIcon size={18} strokeWidth={2.2} style={{ color: s.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black truncate" style={{ color: 'var(--landing-text)' }}>{s.title}</h4>
                  <p className="text-[11px] mt-0.5 leading-snug line-clamp-2" style={{ color: 'var(--landing-text-2)' }}>{s.shortDesc}</p>
                </div>
                <ArrowRight
                  size={14}
                  className="shrink-0 opacity-25 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                  style={{ color: s.accent }}
                />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const CTA_STREAKS = [
  { y: '18%', w: '38%', delay: '0s',   dur: '3.2s', op: 0.07 },
  { y: '34%', w: '55%', delay: '0.7s', dur: '3.8s', op: 0.05 },
  { y: '52%', w: '28%', delay: '0.3s', dur: '2.9s', op: 0.09 },
  { y: '67%', w: '44%', delay: '1.1s', dur: '4.1s', op: 0.04 },
  { y: '80%', w: '62%', delay: '0.5s', dur: '3.5s', op: 0.06 },
]

const TRUST_ITEMS = ['8,000+ deliveries', '99.2% on-time', 'Calgary-based', 'No hidden fees']

/* ─── CTA — matches landing CTASection style ─── */
function CTASection({ service }) {
  const isOrange = service.accent === '#ff580d'
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 })
  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ background: '#faf8f4' }}
    >
      {/* Speed streaks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CTA_STREAKS.map((s, i) => (
          <div
            key={i}
            className="absolute left-0 h-px"
            style={{
              top: s.y,
              width: s.w,
              background: `linear-gradient(90deg, transparent, rgba(255,88,13,${s.op * 8}), transparent)`,
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

      {/* Bottom bloom */}
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
          <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: 'rgba(255,88,13,0.7)' }}>
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
            Book It.
          </h2>
          <h2
            className="font-black leading-[0.95] tracking-tight"
            style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              WebkitTextStroke: `2px ${isOrange ? 'rgba(255,88,13,0.5)' : 'rgba(27,185,8,0.5)'}`,
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
          Create a free account and place your first {service.title.toLowerCase()} in under 2 minutes. No contracts, no setup fees.
        </p>

        {/* Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 mb-14"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 0.32s, transform 0.6s ease 0.32s',
          }}
        >
          <Link
            href="/register"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-sm text-white transition-all cta-pulse hover:scale-105"
            style={{ background: service.accent, fontSize: '0.95rem' }}
          >
            <Zap size={16} strokeWidth={2.5} />
            Join Now
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all"
            style={{ border: '1.5px solid rgba(0,0,0,0.15)', color: 'rgba(0,0,0,0.65)', fontSize: '0.95rem' }}
          >
            Ask a Question
          </Link>
        </div>

        {/* Trust strip */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.6s ease 0.42s' }}
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

/* ─── Main export ─── */
export default function ServiceDetailPage({ slug }) {
  const service = ALL_SERVICES.find(s => s.slug === slug)
  if (!service) return notFound()

  const Icon = service.icon
  const isOrange = service.accent === '#ff580d'

  const [heroRef, heroVisible]   = useIntersectionObserver({ threshold: 0.05 })
  const [featRef, featVisible]   = useIntersectionObserver({ threshold: 0.05 })
  const [usecRef, usecVisible]   = useIntersectionObserver({ threshold: 0.1 })
  const [faqRef,  faqVisible]    = useIntersectionObserver({ threshold: 0.05 })
  const [othRef,  othVisible]    = useIntersectionObserver({ threshold: 0.1 })

  const otherServices = ALL_SERVICES.filter(s => s.slug !== slug).slice(0, 3)

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
            <Link href="/#services" className="hover:underline" style={{ color: 'var(--brand-green)' }}>Services</Link>
            <span style={{ color: 'rgba(0,0,0,0.3)' }}>/</span>
            <span>{service.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-center">
            {/* Left */}
            <div
              className="flex flex-col gap-6"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateX(0)' : 'translateX(-28px)',
                transition: 'opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s',
              }}
            >
              <div className="flex items-center gap-4">
                <span
                  className="font-black text-5xl leading-none tabular-nums"
                  style={{ color: `${service.accent}25`, fontVariantNumeric: 'tabular-nums' }}
                >
                  {service.num}
                </span>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isOrange ? 'rgba(255,88,13,0.12)' : 'rgba(27,185,8,0.12)',
                    border: `1px solid ${service.accent}40`,
                  }}
                >
                  <Icon size={22} strokeWidth={2.2} style={{ color: service.accent }} />
                </div>
              </div>

              <span
                className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase w-fit"
                style={{ background: isOrange ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)', color: service.accent }}
              >
                {service.tagline}
              </span>

              <GradientHeading
                parts={[
                  { text: service.title.split(' ').slice(0, -1).join(' ') + ' ', color: 'black' },
                  { text: service.title.split(' ').slice(-1)[0], color: 'green', highlight: true },
                ]}
                className="text-3xl sm:text-4xl lg:text-5xl"
              />

              <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--landing-text-2)' }}>
                {service.heroDesc}
              </p>

              <div className="flex items-center gap-4">
                <div
                  className="flex flex-col items-center justify-center px-6 py-3 rounded-2xl"
                  style={{
                    background: isOrange ? 'rgba(255,88,13,0.1)' : 'rgba(27,185,8,0.1)',
                    border: `1.5px solid ${service.accent}40`,
                  }}
                >
                  <span className="text-2xl font-black leading-none" style={{ color: service.accent }}>{service.stat}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>{service.statLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                      style={{
                        background: isOrange ? 'rgba(255,88,13,0.08)' : 'rgba(27,185,8,0.08)',
                        color: service.accent,
                        border: `1px solid ${service.accent}25`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white font-black text-sm shadow-lg transition-all hover:opacity-90 cta-pulse"
                  style={{ background: service.accent }}
                >
                  Create Account <ArrowRight size={15} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm border-2 transition-all"
                  style={{ borderColor: 'var(--landing-border)', color: 'var(--landing-text)' }}
                >
                  Ask a Question
                </Link>
              </div>
            </div>

            {/* Right: photo */}
            <div
              className="relative"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'translateY(0)' : 'translateY(32px)',
                transition: 'opacity 0.65s ease 0.25s, transform 0.65s ease 0.25s',
              }}
            >
              <div
                className="absolute -inset-4 rounded-3xl blur-2xl opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${service.accent} 0%, transparent 70%)` }}
              />
              <div
                className="relative rounded-3xl overflow-hidden shadow-2xl hero-float"
                style={{ height: 'clamp(280px, 45vw, 500px)', border: `2px solid ${service.accent}25` }}
              >
                <Image
                  src={service.img}
                  alt={service.imgAlt}
                  fill className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(13,13,13,0.55) 100%)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (dark) ── */}
      <div ref={featRef}>
        <FeaturesSection service={service} isVisible={featVisible} />
      </div>

      {/* ── USE CASES (dark) ── */}
      <div ref={usecRef}>
        <UseCasesSection service={service} isVisible={usecVisible} />
      </div>

      {/* ── FAQ (light) ── */}
      <div ref={faqRef}>
        <FAQSection service={service} isVisible={faqVisible} />
      </div>

      {/* ── OTHER SERVICES (white) ── */}
      <div ref={othRef}>
        <OtherServicesSection service={service} otherServices={otherServices} isVisible={othVisible} />
      </div>

      {/* ── CTA (accent color) ── */}
      <CTASection service={service} />

      <Footer />
    </div>
  )
}
