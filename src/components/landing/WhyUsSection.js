'use client'
import Image from 'next/image'
import { Zap, Shield, ScanEye, BadgeDollarSign } from 'lucide-react'
import GradientHeading from './GradientHeading'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'
import { useSpring, animated } from '@react-spring/web'

const FEATURES = [
  {
    icon: Zap,
    color: 'orange',
    title: 'Lightning Fast',
    stat: '< 3hrs',
    statLabel: 'avg delivery',
    desc: 'Same-day delivery across Calgary and Surrounding areas. We move at the speed your business demands.',
  },
  {
    icon: Shield,
    color: 'green',
    title: 'Fully Reliable',
    stat: '99.2%',
    statLabel: 'on-time rate',
    desc: 'Consistent, on-time delivery every single time. No excuses, just results.',
  },
  {
    icon: ScanEye,
    color: 'orange',
    title: 'Real-Time Tracking',
    stat: 'Live',
    statLabel: 'status updates',
    desc: 'Follow your order through every stage: assigned, picked up, en route, and delivered.',
  },
  {
    icon: BadgeDollarSign,
    color: 'green',
    title: 'Best Pricing',
    stat: '#1',
    statLabel: 'value in Calgary',
    desc: 'Competitive rates with no hidden fees. The best value in Calgary and surrounding area courier services.',
  },
]

function FeatureCard({ feature, delay }) {
  const [ref, isVisible] = useIntersectionObserver()
  const isOrange = feature.color === 'orange'

  const spring = useSpring({
    from: { opacity: 0, y: 40 },
    to: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 },
    config: { tension: 260, friction: 26 },
    delay,
  })

  const Icon = feature.icon
  const accentColor  = isOrange ? '#ff580d' : '#1bb908'
  const accentDim    = isOrange ? 'rgba(255,88,13,0.15)' : 'rgba(27,185,8,0.15)'

  return (
    <animated.div
      ref={ref}
      style={spring}
      className={`why-card${isOrange ? '' : ' why-card-green'} rounded-3xl p-7 flex flex-col gap-5 cursor-default`}
    >
      {/* Top row: icon + stat */}
      <div className="flex items-start justify-between gap-4">
        {/* Spinning ring icon */}
        <div
          className={`icon-ring${isOrange ? '' : ' icon-ring-green'} w-14 h-14 rounded-2xl flex items-center justify-center`}
          style={{ background: accentDim }}
        >
          <Icon size={26} style={{ color: accentColor }} strokeWidth={1.8} />
        </div>
        {/* Stat bubble */}
        <div className="text-right">
          <p className="text-2xl font-black leading-none" style={{ color: isOrange ? 'var(--stat-color)' : accentColor }}>
            {feature.stat}
          </p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'rgba(0,0,0,0.4)' }}>
            {feature.statLabel}
          </p>
        </div>
      </div>

      {/* Thin accent line */}
      <div
        className="h-px w-full"
        style={{ background: `linear-gradient(90deg, ${accentColor}60, transparent)` }}
      />

      {/* Text */}
      <div>
        <h3 className="text-lg font-black mb-2" style={{ color: '#0d0d0d' }}>{feature.title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(0,0,0,0.55)' }}>
          {feature.desc}
        </p>
      </div>
    </animated.div>
  )
}

export default function WhyUsSection() {
  return (
    <section
      id="why-us"
      className="relative section-clip-both overflow-hidden"
      style={{ background: '#faf8f4' }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,88,13,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(27,185,8,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Two-column layout: left heading + photo, right cards */}
        <div className="grid grid-cols-1 lg:grid-cols-[42%_58%] gap-14 items-center">

          {/* Left: heading + photo */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <span
                className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase w-fit"
                style={{ background: 'rgba(27,185,8,0.12)', color: '#1bb908' }}
              >
                Why Choose Us
              </span>
              <GradientHeading
                parts={[
                  { text: 'Why ',    color: 'black' },
                  { text: 'GoFast',  color: 'green', highlight: true },
                  { text: ' Beats',  color: 'black' },
                  { text: ' Everyone', color: 'black' },
                ]}
                className="text-2xl sm:text-3xl lg:text-4xl"
              />
              <p className="text-base leading-relaxed max-w-sm" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Speed and reliability aren&apos;t buzzwords here. They&apos;re our daily standard. See why all businesses trust us above other couriers.
              </p>
            </div>

            {/* Real photo */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ height: '260px' }}>
              <Image
                src="/images/Why-Choose-Us-img.webp"
                alt="GoFastDelivery courier delivering packages"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 480px"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(255,88,13,0.25) 0%, transparent 60%)' }}
              />
              {/* Badge overlay */}
              <div
                className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-black tracking-wider uppercase"
                style={{ background: 'rgba(255,88,13,0.9)', color: 'white' }}
              >
                Calgary&apos;s Best 
              </div>
            </div>
          </div>

          {/* Right: 2×2 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} delay={i * 100} />
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
