'use client'
import { useIntersectionObserver } from './hooks/useIntersectionObserver'
import GradientHeading from './GradientHeading'
import { MapPin, Clock, Zap, CheckCircle2, ArrowRight } from 'lucide-react'

// Polar coords → cartesian. cx/cy = center, r = radius, angleDeg = 0 is top
function polar(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const CX = 220, CY = 220, R1 = 72, R2 = 140

// Cities: angle, ring (1=inner ~72px, 2=outer ~140px), accent color, delivery time label
const CITIES = [
  { id: 'airdrie',     name: 'Airdrie',     angle: 0,   ring: 2, color: '#1bb908', time: '~90 min',  dir: 'N'  },
  { id: 'cochrane',    name: 'Cochrane',    angle: 295, ring: 2, color: '#1bb908', time: '~80 min',  dir: 'NW' },
  { id: 'chestermere', name: 'Chestermere', angle: 75,  ring: 1, color: '#ff580d', time: '~75 min',  dir: 'E'  },
  { id: 'strathmore',  name: 'Strathmore',  angle: 95,  ring: 2, color: '#1bb908', time: '~2 hrs',   dir: 'ESE'},
  { id: 'langdon',     name: 'Langdon',     angle: 118, ring: 2, color: '#ff580d', time: '~100 min', dir: 'SE' },
  { id: 'okotoks',     name: 'Okotoks',     angle: 175, ring: 2, color: '#1bb908', time: '~90 min',  dir: 'S'  },
  { id: 'highriver',   name: 'High River',  angle: 200, ring: 2, color: '#ff580d', time: '~2 hrs',   dir: 'SSW'},
]

const ALL_CITIES = CITIES

const AREA_LIST = [
  { name: 'Calgary',     sub: 'All zones',    time: '< 3 hrs',  primary: true },
  { name: 'Cochrane',    sub: '25 min west',  time: '~80 min'  },
  { name: 'Airdrie',     sub: '30 min north', time: '~90 min'  },
  { name: 'Okotoks',     sub: '30 min south', time: '~90 min'  },
  { name: 'High River',  sub: '45 min south', time: '~2 hrs'   },
  { name: 'Chestermere', sub: '20 min east',  time: '~75 min'  },
  { name: 'Strathmore',  sub: '40 min east',  time: '~2 hrs'   },
  { name: 'Langdon',     sub: '35 min SE',    time: '~100 min' },
]

// Signal strength bars (1-4) based on time string
function signalLevel(time) {
  if (time.includes('< 3') || time.includes('75') || time.includes('80')) return 4
  if (time.includes('90')) return 3
  if (time.includes('100') || time.includes('2 hrs')) return 2
  return 1
}

function SignalBars({ level, color }) {
  return (
    <div className="flex items-end gap-0.5 h-3.5">
      {[1, 2, 3, 4].map(n => (
        <div
          key={n}
          className="w-1 rounded-sm"
          style={{
            height: `${25 * n}%`,
            background: n <= level ? color : 'rgba(0,0,0,0.1)',
            minHeight: '3px',
          }}
        />
      ))}
    </div>
  )
}

function NetworkSVG({ animate }) {
  return (
    <svg
      viewBox="0 0 440 440"
      className="w-full max-w-md mx-auto"
      aria-label="GoFastDelivery network coverage diagram"
    >
      {/* Topo contour rings — decorative */}
      {[180, 155, 130, 105, 80, 55].map((r, i) => (
        <circle
          key={r}
          cx={CX} cy={CY} r={r}
          fill="none"
          stroke="rgba(255,88,13,0.05)"
          strokeWidth={1}
          strokeDasharray={i % 2 === 0 ? 'none' : '3 4'}
        />
      ))}

      {/* Zone rings — inner & outer */}
      <circle cx={CX} cy={CY} r={R1}
        fill="rgba(255,88,13,0.04)"
        stroke="rgba(255,88,13,0.15)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <circle cx={CX} cy={CY} r={R2}
        fill="rgba(27,185,8,0.03)"
        stroke="rgba(27,185,8,0.12)"
        strokeWidth={1}
        strokeDasharray="5 4"
      />

      {/* Spoke lines to each city */}
      {ALL_CITIES.map((city, i) => {
        const r = city.ring === 1 ? R1 : R2
        const pt = polar(CX, CY, r, city.angle)
        const lineLen = Math.hypot(pt.x - CX, pt.y - CY)
        return (
          <line
            key={city.id}
            x1={CX} y1={CY}
            x2={pt.x} y2={pt.y}
            stroke={city.color}
            strokeWidth={city.ring === 1 ? 1.5 : 1}
            strokeOpacity={0.5}
            strokeDasharray={Math.ceil(lineLen)}
            strokeDashoffset={animate ? 0 : Math.ceil(lineLen)}
            style={{
              transition: `stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.07}s`,
            }}
          />
        )
      })}

      {/* City nodes */}
      {ALL_CITIES.map((city, i) => {
        const r = city.ring === 1 ? R1 : R2
        const pt = polar(CX, CY, r, city.angle)
        const isLeft = pt.x < CX - 20
        const isRight = pt.x > CX + 20
        const isTop = pt.y < CY - 20
        const labelX = pt.x + (isLeft ? -10 : isRight ? 10 : 0)
        const labelY = pt.y + (isTop ? -10 : 12)
        const anchor = isLeft ? 'end' : isRight ? 'start' : 'middle'

        return (
          <g key={city.id}
            style={{
              opacity: animate ? 1 : 0,
              transition: `opacity 0.4s ease ${0.15 + i * 0.07}s`,
            }}
          >
            {/* Pulse ring */}
            {animate && (
              <circle
                cx={pt.x} cy={pt.y}
                r={city.ring === 1 ? 9 : 7}
                fill="none"
                stroke={city.color}
                strokeWidth={1.2}
                opacity={0}
                style={{
                  animation: `area-dot-pulse 2.4s ease-out infinite`,
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            )}
            {/* Outer ring */}
            <circle cx={pt.x} cy={pt.y} r={city.ring === 1 ? 6 : 4.5}
              fill="none" stroke={city.color} strokeWidth={1} strokeOpacity={0.3}
            />
            {/* Fill dot */}
            <circle cx={pt.x} cy={pt.y} r={city.ring === 1 ? 4 : 3}
              fill={city.color}
              style={{ filter: `drop-shadow(0 0 ${city.ring === 1 ? 5 : 3}px ${city.color}90)` }}
            />
            {/* White center */}
            <circle cx={pt.x} cy={pt.y} r={city.ring === 1 ? 1.5 : 1} fill="white" />

            {/* Label */}
            {animate && (
              <text
                x={labelX} y={labelY}
                textAnchor={anchor}
                style={{
                  fontSize: city.ring === 1 ? '9px' : '8px',
                  fontWeight: 700,
                  fill: '#3a3a3a',
                  fontFamily: 'var(--font-montserrat), sans-serif',
                }}
              >
                {city.name}
              </text>
            )}
          </g>
        )
      })}

      {/* Calgary center hub */}
      {/* Outer glow */}
      <circle cx={CX} cy={CY} r={22}
        fill="rgba(255,88,13,0.08)"
        stroke="rgba(255,88,13,0.2)"
        strokeWidth={1}
      />
      <circle cx={CX} cy={CY} r={15}
        fill="rgba(255,88,13,0.15)"
        stroke="rgba(255,88,13,0.4)"
        strokeWidth={1.5}
      />
      <circle cx={CX} cy={CY} r={9}
        fill="#ff580d"
        style={{ filter: 'drop-shadow(0 0 8px rgba(255,88,13,0.6))' }}
      />
      <circle cx={CX} cy={CY} r={3.5} fill="white" />

      {/* Calgary label */}
      <text x={CX} y={CY - 28}
        textAnchor="middle"
        style={{
          fontSize: '11px',
          fontWeight: 900,
          fill: '#ff580d',
          fontFamily: 'var(--font-montserrat), sans-serif',
          letterSpacing: '0.04em',
        }}
      >
        CALGARY
      </text>

      {/* Zone distance labels */}
      {animate && (
        <>
          <text x={CX + R1 + 4} y={CY - 4}
            style={{ fontSize: '7px', fill: 'rgba(255,88,13,0.4)', fontFamily: 'monospace', fontWeight: 600 }}
          >~30km</text>
          <text x={CX + R2 + 4} y={CY - 4}
            style={{ fontSize: '7px', fill: 'rgba(27,185,8,0.4)', fontFamily: 'monospace', fontWeight: 600 }}
          >~60km</text>
        </>
      )}

      {/* Compass */}
      {[
        { label: 'N', x: CX,       y: 14   },
        { label: 'S', x: CX,       y: 430  },
        { label: 'E', x: 430,      y: CY+4 },
        { label: 'W', x: 12,       y: CY+4 },
      ].map(({ label, x, y }) => (
        <text key={label} x={x} y={y} textAnchor="middle"
          style={{
            fontSize: '8px',
            fill: 'rgba(255,88,13,0.3)',
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </text>
      ))}
    </svg>
  )
}

function AreaRow({ area, index, visible }) {
  const isOrange = index % 2 === 0
  const color = isOrange ? '#ff580d' : '#1bb908'
  const level = signalLevel(area.time)

  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b last:border-b-0 group"
      style={{
        borderColor: 'rgba(0,0,0,0.05)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(20px)',
        transition: `opacity 0.4s ease ${0.06 + index * 0.04}s, transform 0.4s ease ${0.06 + index * 0.04}s`,
      }}
    >
      {/* Color dot */}
      <div
        className="shrink-0 w-2 h-2 rounded-full"
        style={{
          background: area.primary ? '#ff580d' : color,
          boxShadow: `0 0 6px ${area.primary ? '#ff580d' : color}60`,
        }}
      />

      {/* Name + sub */}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-black leading-none"
          style={{ color: area.primary ? 'var(--brand-orange)' : 'var(--landing-text)' }}
        >
          {area.name}
        </span>
        <span className="text-[10px] font-medium ml-2" style={{ color: 'var(--landing-text-2)' }}>
          {area.sub}
        </span>
      </div>

      {/* Time */}
      <span
        className="shrink-0 text-[10px] font-bold tabular-nums"
        style={{ color: area.primary ? '#ff580d' : color }}
      >
        {area.time}
      </span>

      {/* Signal bars */}
      <SignalBars level={level} color={area.primary ? '#ff580d' : color} />
    </div>
  )
}

export default function ServiceAreasSection() {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.08 })

  return (
    <section
      id="areas"
      ref={ref}
      className="relative py-24 overflow-hidden"
      style={{ background: '#ffffff' }}
    >
      {/* Topographic contour background — large faint rings */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 30% 50%, rgba(255,88,13,0.04) 0%, transparent 55%),
            radial-gradient(circle at 70% 50%, rgba(27,185,8,0.03) 0%, transparent 50%)
          `,
        }}
      />
      {/* Fine dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {/* Top rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent 5%, var(--brand-orange) 40%, var(--brand-green) 60%, transparent 95%)' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-14">
          <span
            className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'var(--brand-green-dim)', color: 'var(--brand-green)' }}
          >
            Service Coverage
          </span>
          <GradientHeading
            parts={[
              { text: 'We Deliver ', color: 'black' },
              { text: 'Across',      color: 'black', highlight: true },
              { text: ' Calgary',    color: 'green' },
              { text: ' & Beyond',  color: 'black' },
            ]}
            className="text-2xl sm:text-3xl lg:text-4xl"
          />
          <p className="mt-4 text-base max-w-lg mx-auto" style={{ color: 'var(--landing-text-2)' }}>
            Same-day delivery across Calgary and 7 surrounding communities, one seamless service.
          </p>
        </div>

        {/* Main two-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[52%_48%] gap-10 xl:gap-16 items-start">

          {/* LEFT — Network SVG inside a card */}
          <div
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'white',
              border: '1.5px solid rgba(0,0,0,0.07)',
              boxShadow: '0 4px 40px rgba(0,0,0,0.06)',
            }}
          >
            {/* Card header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#ff580d', boxShadow: '0 0 6px rgba(255,88,13,0.5)', animation: 'ping-soft 2s ease-in-out infinite' }} />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--landing-text)' }}>
                  Live Coverage Network
                </span>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold" style={{ color: 'var(--landing-text-2)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ff580d' }} />
                  Primary
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#1bb908' }} />
                  Extended
                </span>
              </div>
            </div>

            {/* SVG */}
            <div className="p-4 sm:p-6">
              <NetworkSVG animate={isVisible} />
            </div>

            {/* Card footer stats */}
            <div
              className="grid grid-cols-3 border-t"
              style={{ borderColor: 'rgba(0,0,0,0.06)' }}
            >
              {[
                { val: '8',      label: 'Cities' },
                { val: '99.2%',  label: 'On-Time' },
                { val: '< 3 hrs', label: 'Avg Delivery' },
              ].map(({ val, label }, i) => (
                <div
                  key={label}
                  className="flex flex-col items-center py-4 text-center"
                  style={{ borderRight: i < 2 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}
                >
                  <span className="text-lg font-black" style={{ color: 'var(--stat-color)' }}>{val}</span>
                  <span className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--landing-text-2)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — area list */}
          <div className="flex flex-col gap-5">

            {/* Section label */}
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: 'var(--landing-text-2)' }}>
                All Covered Areas
              </p>
              <div className="h-px w-12" style={{ background: 'var(--brand-orange)' }} />
            </div>

            {/* Area rows */}
            <div
              className="rounded-2xl overflow-hidden px-5"
              style={{
                background: 'white',
                border: '1.5px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 20px rgba(0,0,0,0.04)',
              }}
            >
              {AREA_LIST.map((area, i) => (
                <AreaRow key={area.name} area={area} index={i} visible={isVisible} />
              ))}
            </div>

            {/* CTA card */}
            <div
              className="relative rounded-2xl p-6 overflow-hidden flex items-center justify-between gap-4"
              style={{
                background: 'linear-gradient(135deg, #ff580d 0%, #e04500 100%)',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                transition: 'opacity 0.5s ease 0.6s, transform 0.5s ease 0.6s',
              }}
            >
              <div
                className="absolute -right-8 -top-8 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }}
              />
              <div className="relative">
                <p className="text-sm font-black text-white">Not sure we cover you?</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Message us and we&apos;ll confirm within minutes.
                </p>
              </div>
              <a
                href="#contact"
                className="relative shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-xs font-black hover:opacity-90 transition-opacity whitespace-nowrap"
                style={{ color: 'var(--brand-orange)' }}
              >
                Ask Us <ArrowRight size={11} strokeWidth={3} />
              </a>
            </div>

            {/* Mon–Sat badge */}
            <div
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
              style={{
                background: 'white',
                border: '1.5px solid rgba(0,0,0,0.07)',
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.5s ease 0.7s',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--brand-green-dim)' }}
              >
                <Clock size={16} style={{ color: 'var(--brand-green)' }} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--landing-text)' }}>Monday – Saturday</p>
                <p className="text-xs" style={{ color: 'var(--landing-text-2)' }}>Deliveries run 8am – 8pm across all zones</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
