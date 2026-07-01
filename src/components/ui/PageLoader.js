'use client'

/**
 * PageLoader — "Launch Sequence" full-page loader for GoFastDelivery.
 *
 * Clean & Premium aesthetic. A detailed delivery truck launches across
 * a cinematic road scene on the brand warm-white background. Electric
 * green progress bar, cinematic motion blur, headlight cone, lane
 * markings, animated exhaust, spinning wheels with spokes.
 *
 * Props:
 *   label   — context-specific copy (default "Loading…")
 *   variant — "full" fixed overlay (default) | "inline" centered in parent
 */
export default function PageLoader({ label = 'Loading…', variant = 'full' }) {
  const isInline = variant === 'inline'

  return (
    <>
      <style>{`

        /* ═══════════════════════════════════════════
           KEYFRAMES
        ═══════════════════════════════════════════ */

        /* Whole scene fades in */
        @keyframes gl-scene-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* Truck launches from left, overshoots slightly, settles */
        @keyframes gl-truck-launch {
          0%   { transform: translateX(-340px); opacity: 0; }
          6%   { opacity: 1; }
          62%  { transform: translateX(calc(50vw - 240px)); animation-timing-function: cubic-bezier(0.22,1,0.36,1); }
          72%  { transform: translateX(calc(50vw - 220px)); }
          78%  { transform: translateX(calc(50vw - 232px)); }
          84%  { transform: translateX(calc(50vw - 226px)); }
          100% { transform: translateX(calc(50vw - 228px)); }
        }
        /* Clamp for very narrow screens */
        @media (max-width: 500px) {
          @keyframes gl-truck-launch {
            0%   { transform: translateX(-280px); opacity: 0; }
            6%   { opacity: 1; }
            65%  { transform: translateX(calc(50vw - 160px)); animation-timing-function: cubic-bezier(0.22,1,0.36,1); }
            75%  { transform: translateX(calc(50vw - 140px)); }
            82%  { transform: translateX(calc(50vw - 152px)); }
            100% { transform: translateX(calc(50vw - 148px)); }
          }
        }

        /* Truck body bobs slightly on the road */
        @keyframes gl-truck-idle {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-1.5px); }
        }

        /* Wheels spin */
        @keyframes gl-wheel {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Exhaust puffs float up and fade */
        @keyframes gl-exhaust-1 {
          0%   { transform: translate(0,0) scale(1); opacity: 0.55; }
          100% { transform: translate(-18px,-28px) scale(2.2); opacity: 0; }
        }
        @keyframes gl-exhaust-2 {
          0%   { transform: translate(0,0) scale(0.8); opacity: 0.4; }
          100% { transform: translate(-10px,-22px) scale(1.8); opacity: 0; }
        }
        @keyframes gl-exhaust-3 {
          0%   { transform: translate(0,0) scale(0.6); opacity: 0.3; }
          100% { transform: translate(-24px,-18px) scale(1.5); opacity: 0; }
        }

        /* Headlight cone pulses */
        @keyframes gl-headlight {
          0%,100% { opacity: 0.22; }
          50%     { opacity: 0.34; }
        }

        /* Road lane dashes scroll left */
        @keyframes gl-lane-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-120px); }
        }

        /* Speed streaks shoot right then vanish */
        @keyframes gl-streak-a {
          0%   { transform: translateX(-60px) scaleX(0.2); opacity: 0; }
          20%  { opacity: 0.7; }
          100% { transform: translateX(100vw) scaleX(0.05); opacity: 0; }
        }
        @keyframes gl-streak-b {
          0%   { transform: translateX(-40px) scaleX(0.15); opacity: 0; }
          25%  { opacity: 0.5; }
          100% { transform: translateX(100vw) scaleX(0.04); opacity: 0; }
        }
        @keyframes gl-streak-c {
          0%   { transform: translateX(-20px) scaleX(0.1); opacity: 0; }
          30%  { opacity: 0.35; }
          100% { transform: translateX(100vw) scaleX(0.03); opacity: 0; }
        }

        /* Progress bar fills */
        @keyframes gl-bar {
          0%   { width: 0%; }
          65%  { width: 82%; }
          78%  { width: 76%; }
          90%  { width: 82%; }
          100% { width: 82%; }
        }
        /* Progress bar shimmer */
        @keyframes gl-bar-shimmer {
          0%   { left: -60%; }
          100% { left: 120%; }
        }

        /* Label fades + slides up */
        @keyframes gl-label-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Wordmark letters assemble */
        @keyframes gl-letter {
          from { opacity: 0; transform: translateY(16px) scaleY(0.6); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0)   scaleY(1);   filter: blur(0); }
        }

        /* Dot loader pulses */
        @keyframes gl-dot {
          0%,80%,100% { transform: scale(0.6); opacity: 0.25; }
          40%          { transform: scale(1);   opacity: 1; }
        }

        /* Subtle road ground shadow under truck */
        @keyframes gl-shadow-pulse {
          0%,100% { transform: scaleX(1);   opacity: 0.18; }
          50%      { transform: scaleX(0.9); opacity: 0.12; }
        }

        /* Road edge glow blink */
        @keyframes gl-road-glow {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 0.85; }
        }

        /* ═══════════════════════════════════════════
           APPLIED ANIMATION CLASSES
        ═══════════════════════════════════════════ */

        .gl-scene      { animation: gl-scene-in 0.4s ease both; }

        .gl-truck-wrap { animation: gl-truck-launch 2.6s cubic-bezier(0.25,0.46,0.45,0.94) 0.15s both; }
        .gl-truck-body { animation: gl-truck-idle 1.4s ease-in-out 2.9s infinite; }

        .gl-wheel-rear { animation: gl-wheel 0.28s linear infinite; transform-origin: 50% 50%; }
        .gl-wheel-front{ animation: gl-wheel 0.28s linear infinite; transform-origin: 50% 50%; }

        .gl-exhaust-1  { animation: gl-exhaust-1 0.9s ease-out 2.8s infinite; }
        .gl-exhaust-2  { animation: gl-exhaust-2 0.9s ease-out 3.1s infinite; }
        .gl-exhaust-3  { animation: gl-exhaust-3 0.9s ease-out 3.35s infinite; }

        .gl-headlight  { animation: gl-headlight 1.8s ease-in-out 2.6s infinite; }

        .gl-lane       { animation: gl-lane-scroll 0.8s linear infinite; }

        .gl-streak-a   { animation: gl-streak-a 1.1s ease-out 0.2s both; }
        .gl-streak-b   { animation: gl-streak-b 0.95s ease-out 0.32s both; }
        .gl-streak-c   { animation: gl-streak-c 0.8s ease-out 0.44s both; }

        .gl-bar        { animation: gl-bar 2.6s cubic-bezier(0.25,0.46,0.45,0.94) 0.15s both; }
        .gl-bar-shimmer{ animation: gl-bar-shimmer 1.6s ease-in-out 1.2s infinite; }

        .gl-label      { animation: gl-label-in 0.5s cubic-bezier(0.22,1,0.36,1) 1.8s both; }

        .gl-L1  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.55s both; }
        .gl-L2  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.63s both; }
        .gl-L3  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.71s both; }
        .gl-L4  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.79s both; }
        .gl-L5  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.87s both; }
        .gl-L6  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.95s both; }
        .gl-L7  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.03s both; }
        .gl-L8  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.11s both; }
        .gl-L9  { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.19s both; }
        .gl-L10 { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.27s both; }
        .gl-L11 { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.35s both; }
        .gl-L12 { animation: gl-letter 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.43s both; }

        .gl-dot-1 { animation: gl-dot 1.2s ease-in-out 2.2s infinite; }
        .gl-dot-2 { animation: gl-dot 1.2s ease-in-out 2.36s infinite; }
        .gl-dot-3 { animation: gl-dot 1.2s ease-in-out 2.52s infinite; }

        .gl-shadow { animation: gl-shadow-pulse 1.4s ease-in-out 2.8s infinite; transform-origin: center; }
        .gl-road-glow { animation: gl-road-glow 2s ease-in-out 2.6s infinite; }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .gl-scene,.gl-truck-wrap,.gl-truck-body,.gl-wheel-rear,.gl-wheel-front,
          .gl-exhaust-1,.gl-exhaust-2,.gl-exhaust-3,.gl-headlight,.gl-lane,
          .gl-streak-a,.gl-streak-b,.gl-streak-c,.gl-bar,.gl-bar-shimmer,
          .gl-label,.gl-L1,.gl-L2,.gl-L3,.gl-L4,.gl-L5,.gl-L6,.gl-L7,.gl-L8,
          .gl-L9,.gl-L10,.gl-L11,.gl-L12,.gl-dot-1,.gl-dot-2,.gl-dot-3,
          .gl-shadow,.gl-road-glow {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>

      {/* ═══ OUTER WRAPPER ═══ */}
      <div
        className={[
          'gl-scene',
          isInline
            ? 'relative flex items-center justify-center min-h-[40vh] w-full overflow-hidden'
            : 'fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden',
        ].join(' ')}
        style={{ background: '#faf8f4' }}
        role="status"
        aria-label={label}
        aria-live="polite"
      >

        {/* ─── SUBTLE GRID TEXTURE ─── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* ─── LARGE AMBIENT GREEN GLOW (top-center) ─── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '-10%', left: '50%',
            transform: 'translateX(-50%)',
            width: '70vw', maxWidth: '800px', height: '55vh',
            background: 'radial-gradient(ellipse at 50% 20%, rgba(27,185,8,0.13) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* ─── RED ACCENT GLOW (bottom-right) ─── */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: '10%', right: '10%',
            width: '300px', height: '200px',
            background: 'radial-gradient(ellipse, rgba(229,28,28,0.07) 0%, transparent 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        {/* ═══ MAIN CONTENT COLUMN ═══ */}
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '0px', width: '100%', maxWidth: '100vw',
            position: 'relative',
          }}
        >

          {/* ─── WORDMARK ─── */}
          <div
            style={{
              display: 'flex', alignItems: 'flex-end', gap: '0px',
              marginBottom: '36px',
              userSelect: 'none',
            }}
            aria-hidden="true"
          >
            {/* GO */}
            {['G','O'].map((ch, i) => (
              <span
                key={i}
                className={`gl-L${i + 1}`}
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-montserrat, system-ui)',
                  fontWeight: 900,
                  fontSize: 'clamp(32px, 6vw, 56px)',
                  letterSpacing: '-0.02em',
                  color: '#0d0d0d',
                  lineHeight: 1,
                }}
              >
                {ch}
              </span>
            ))}
            {/* GREEN DOT separator */}
            <span
              className="gl-L3"
              style={{
                display: 'inline-block',
                width: 'clamp(7px,1.2vw,11px)',
                height: 'clamp(7px,1.2vw,11px)',
                borderRadius: '50%',
                background: '#1bb908',
                boxShadow: '0 0 10px rgba(27,185,8,0.6), 0 0 20px rgba(27,185,8,0.3)',
                margin: '0 clamp(3px,0.6vw,6px)',
                marginBottom: '6px',
                alignSelf: 'flex-end',
                flexShrink: 0,
              }}
            />
            {/* FAST */}
            {['F','A','S','T'].map((ch, i) => (
              <span
                key={i}
                className={`gl-L${i + 4}`}
                style={{
                  display: 'inline-block',
                  fontFamily: 'var(--font-montserrat, system-ui)',
                  fontWeight: 900,
                  fontSize: 'clamp(32px, 6vw, 56px)',
                  letterSpacing: '-0.02em',
                  color: '#0d0d0d',
                  lineHeight: 1,
                }}
              >
                {ch}
              </span>
            ))}
            {/* DELIVERY */}
            <span
              className="gl-L8"
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-montserrat, system-ui)',
                fontWeight: 500,
                fontSize: 'clamp(10px, 1.6vw, 15px)',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8492a6',
                marginLeft: 'clamp(6px,1vw,10px)',
                marginBottom: 'clamp(3px,0.5vw,6px)',
                alignSelf: 'flex-end',
              }}
            >
              Delivery
            </span>
          </div>

          {/* ═══ ROAD SCENE ═══ */}
          <div
            style={{
              position: 'relative',
              width: '100vw',
              height: 'clamp(110px, 18vh, 160px)',
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >

            {/* ── SPEED STREAKS (fire before truck arrives) ── */}
            <div
              className="gl-streak-a"
              style={{
                position: 'absolute',
                left: 0, top: '38%',
                width: 'clamp(120px,20vw,220px)', height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(27,185,8,0.55), rgba(27,185,8,0.08))',
                borderRadius: '2px', transformOrigin: 'left',
              }}
            />
            <div
              className="gl-streak-b"
              style={{
                position: 'absolute',
                left: 0, top: '46%',
                width: 'clamp(80px,14vw,160px)', height: '1.5px',
                background: 'linear-gradient(90deg, transparent, rgba(229,28,28,0.4), rgba(229,28,28,0.06))',
                borderRadius: '2px', transformOrigin: 'left',
              }}
            />
            <div
              className="gl-streak-c"
              style={{
                position: 'absolute',
                left: 0, top: '54%',
                width: 'clamp(60px,10vw,120px)', height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(27,185,8,0.35), transparent)',
                borderRadius: '2px', transformOrigin: 'left',
              }}
            />

            {/* ── ROAD BAND ── */}
            <div
              style={{
                position: 'absolute',
                left: 0, right: 0,
                top: '28%',
                height: '46%',
                background: 'linear-gradient(180deg, #e8e4df 0%, #ddd9d3 40%, #d2cdc6 100%)',
                boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.07), inset 0 -2px 6px rgba(0,0,0,0.05)',
              }}
            >
              {/* Road top edge — glowing green line */}
              <div
                className="gl-road-glow"
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent 0%, #1bb908 20%, #1bb908 80%, transparent 100%)',
                  boxShadow: '0 0 8px rgba(27,185,8,0.5)',
                }}
              />
              {/* Road bottom edge */}
              <div
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.15) 80%, transparent 100%)',
                }}
              />

              {/* Scrolling lane dashes */}
              <div
                style={{
                  position: 'absolute', top: '50%', left: '-120px', right: 0,
                  transform: 'translateY(-50%)',
                  overflow: 'hidden', height: '3px',
                }}
              >
                <div
                  className="gl-lane"
                  style={{
                    display: 'flex', gap: '28px',
                    width: 'calc(100vw + 240px)',
                  }}
                >
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: '40px', height: '3px', flexShrink: 0,
                        background: 'rgba(255,255,255,0.45)',
                        borderRadius: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ── ROAD SHADOW (below road) ── */}
            <div
              style={{
                position: 'absolute',
                left: '5%', right: '5%',
                top: '72%',
                height: '12px',
                background: 'radial-gradient(ellipse, rgba(0,0,0,0.1) 0%, transparent 70%)',
                filter: 'blur(4px)',
              }}
            />

            {/* ── TRUCK WRAPPER (positioned on road) ── */}
            <div
              className="gl-truck-wrap"
              style={{
                position: 'absolute',
                bottom: '26%',
                left: 0,
              }}
            >
              {/* Ground shadow under truck */}
              <div
                className="gl-shadow"
                style={{
                  position: 'absolute',
                  bottom: '-5px',
                  left: '10%', right: '10%',
                  height: '8px',
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.2) 0%, transparent 70%)',
                  filter: 'blur(3px)',
                }}
              />

              {/* Exhaust smoke puffs */}
              <div style={{ position: 'absolute', left: '6px', top: '10px' }}>
                <div className="gl-exhaust-1" style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(180,180,180,0.55)', filter: 'blur(3px)' }} />
                <div className="gl-exhaust-2" style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(200,200,200,0.4)', filter: 'blur(2px)', top: '3px', left: '3px' }} />
                <div className="gl-exhaust-3" style={{ position: 'absolute', width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(220,220,220,0.3)', filter: 'blur(2px)', top: '6px', left: '-2px' }} />
              </div>

              <div className="gl-truck-body">
                {/* ── THE TRUCK SVG ── */}
                <svg
                  width="clamp(180px,28vw,260px)"
                  viewBox="0 0 260 82"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Headlight cone gradient */}
                    <radialGradient id="gl-hlight" cx="100%" cy="50%" r="100%" fx="95%" fy="50%">
                      <stop offset="0%"   stopColor="#fffde0" stopOpacity="0.9"/>
                      <stop offset="40%"  stopColor="#fffac0" stopOpacity="0.5"/>
                      <stop offset="100%" stopColor="#fffde0" stopOpacity="0"/>
                    </radialGradient>
                    {/* Trailer side gradient */}
                    <linearGradient id="gl-trailer-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#20c90a"/>
                      <stop offset="100%" stopColor="#0fa000"/>
                    </linearGradient>
                    {/* Cab gradient */}
                    <linearGradient id="gl-cab-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#178a06"/>
                      <stop offset="100%" stopColor="#0c6604"/>
                    </linearGradient>
                    {/* Windshield gradient */}
                    <linearGradient id="gl-wind-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%"   stopColor="#ddf5ff" stopOpacity="0.95"/>
                      <stop offset="100%" stopColor="#b8e8ff" stopOpacity="0.75"/>
                    </linearGradient>
                    {/* Wheel gradient */}
                    <radialGradient id="gl-wheel-grad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%"   stopColor="#555"/>
                      <stop offset="60%"  stopColor="#222"/>
                      <stop offset="100%" stopColor="#111"/>
                    </radialGradient>
                    {/* Wheel hub */}
                    <radialGradient id="gl-hub" cx="50%" cy="50%" r="50%">
                      <stop offset="0%"   stopColor="#bbb"/>
                      <stop offset="100%" stopColor="#888"/>
                    </radialGradient>
                    {/* Trailer window strip */}
                    <linearGradient id="gl-strip-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="rgba(255,255,255,0.18)"/>
                      <stop offset="50%"  stopColor="rgba(255,255,255,0.28)"/>
                      <stop offset="100%" stopColor="rgba(255,255,255,0.1)"/>
                    </linearGradient>
                  </defs>

                  {/* ── HEADLIGHT CONE (rendered first / behind) ── */}
                  <ellipse
                    className="gl-headlight"
                    cx="270" cy="32"
                    rx="80" ry="28"
                    fill="url(#gl-hlight)"
                  />

                  {/* ── TRAILER ── */}
                  {/* Trailer main body */}
                  <rect x="4" y="10" width="164" height="48" rx="4" fill="url(#gl-trailer-grad)"/>
                  {/* Top shine */}
                  <rect x="4" y="10" width="164" height="12" rx="4" fill="rgba(255,255,255,0.16)"/>
                  {/* Bottom edge shadow */}
                  <rect x="4" y="51" width="164" height="7" rx="2" fill="rgba(0,0,0,0.14)"/>
                  {/* Vertical panel lines on trailer */}
                  {[28, 52, 76, 100, 124].map(x => (
                    <line key={x} x1={x} y1="12" x2={x} y2="56" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
                  ))}
                  {/* Horizontal accent stripe */}
                  <rect x="4" y="34" width="164" height="4" fill="rgba(0,0,0,0.12)"/>
                  {/* White window strip */}
                  <rect x="6" y="14" width="160" height="8" rx="2" fill="url(#gl-strip-grad)"/>
                  {/* GOFAST text on trailer */}
                  <text
                    x="44" y="47"
                    fontFamily="var(--font-montserrat, system-ui)"
                    fontSize="11"
                    fontWeight="900"
                    letterSpacing="3"
                    fill="rgba(255,255,255,0.92)"
                  >GOFAST</text>
                  {/* Red accent stripe */}
                  <rect x="4" y="54" width="164" height="4" rx="1" fill="#e51c1c" opacity="0.85"/>

                  {/* ── CAB ── */}
                  {/* Cab body */}
                  <path d="M168 14 L168 58 L214 58 L222 48 L222 28 L208 14 Z" fill="url(#gl-cab-grad)"/>
                  {/* Cab top shine */}
                  <path d="M168 14 L208 14 L216 22 L168 22 Z" fill="rgba(255,255,255,0.16)"/>
                  {/* Windshield */}
                  <path d="M175 16 L206 16 L216 26 L216 44 L175 44 Z" fill="url(#gl-wind-grad)" rx="2"/>
                  {/* Windshield frame */}
                  <path d="M175 16 L206 16 L216 26 L216 44 L175 44 Z" stroke="rgba(0,0,0,0.15)" strokeWidth="1" fill="none"/>
                  {/* A-pillar reflection */}
                  <line x1="178" y1="17" x2="178" y2="43" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
                  {/* Door seam */}
                  <line x1="168" y1="26" x2="221" y2="26" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
                  {/* Door handle */}
                  <rect x="192" y="34" width="10" height="2.5" rx="1.25" fill="rgba(255,255,255,0.3)"/>
                  {/* Exhaust pipe */}
                  <rect x="170" y="8" width="5" height="14" rx="2" fill="#0a5502"/>
                  <rect x="170" y="8" width="5" height="3" rx="1" fill="#333"/>
                  {/* Cab bottom skirt */}
                  <rect x="168" y="54" width="54" height="4" rx="1" fill="rgba(0,0,0,0.2)"/>
                  {/* GoFast door logo circle */}
                  <circle cx="194" cy="48" r="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
                  <text x="191.5" y="51" fontFamily="monospace" fontSize="4.5" fontWeight="bold" fill="white">GF</text>

                  {/* ── FRONT BUMPER / NOSE ── */}
                  <rect x="218" y="40" width="8" height="18" rx="2" fill="#0a5502"/>
                  {/* Grille slats */}
                  {[43,47,51,55].map(y => (
                    <line key={y} x1="218" y1={y} x2="226" y2={y} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                  ))}
                  {/* Front bumper lip */}
                  <rect x="216" y="56" width="10" height="3" rx="1" fill="#0d0d0d"/>
                  {/* License plate area */}
                  <rect x="219" y="50" width="7" height="5" rx="0.5" fill="white" opacity="0.7"/>
                  <text x="219.8" y="54.2" fontFamily="monospace" fontSize="3.2" fill="#333">GFD</text>

                  {/* ── HEADLIGHT ── */}
                  <rect x="220" y="28" width="8" height="10" rx="2" fill="#fffde0" opacity="0.95"/>
                  {/* Headlight inner */}
                  <rect x="221" y="29" width="6" height="8" rx="1" fill="#fff9c4"/>
                  {/* DRL strip */}
                  <rect x="220" y="27" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.8)"/>

                  {/* ── CHASSIS / UNDERBODY ── */}
                  <rect x="4" y="56" width="218" height="5" rx="1" fill="#0a5502"/>
                  <rect x="4" y="59" width="218" height="2" rx="1" fill="rgba(0,0,0,0.2)"/>

                  {/* ── REAR WHEEL LEFT ── */}
                  <g transform="translate(32,65)">
                    <circle r="14" fill="url(#gl-wheel-grad)"/>
                    {/* Tyre tread ring */}
                    <circle r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"/>
                    {/* Rim */}
                    <circle r="10" fill="#1a1a1a"/>
                    {/* Spokes */}
                    <g className="gl-wheel-rear">
                      {[0,60,120,180,240,300].map(deg => {
                        const rad = (deg * Math.PI) / 180
                        return (
                          <line
                            key={deg}
                            x1={0} y1={0}
                            x2={Math.cos(rad) * 9} y2={Math.sin(rad) * 9}
                            stroke="#888" strokeWidth="1.5"
                          />
                        )
                      })}
                    </g>
                    {/* Hub */}
                    <circle r="3.5" fill="url(#gl-hub)"/>
                    <circle r="1.5" fill="#ccc"/>
                    {/* Tyre highlight */}
                    <ellipse cx="-5" cy="-8" rx="3" ry="5" fill="rgba(255,255,255,0.07)" transform="rotate(-20)"/>
                  </g>

                  {/* ── REAR WHEEL RIGHT ── */}
                  <g transform="translate(72,65)">
                    <circle r="14" fill="url(#gl-wheel-grad)"/>
                    <circle r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"/>
                    <circle r="10" fill="#1a1a1a"/>
                    <g className="gl-wheel-rear">
                      {[0,60,120,180,240,300].map(deg => {
                        const rad = (deg * Math.PI) / 180
                        return (
                          <line key={deg} x1={0} y1={0}
                            x2={Math.cos(rad) * 9} y2={Math.sin(rad) * 9}
                            stroke="#888" strokeWidth="1.5"
                          />
                        )
                      })}
                    </g>
                    <circle r="3.5" fill="url(#gl-hub)"/>
                    <circle r="1.5" fill="#ccc"/>
                  </g>

                  {/* ── FRONT WHEEL ── */}
                  <g transform="translate(200,65)">
                    <circle r="13" fill="url(#gl-wheel-grad)"/>
                    <circle r="13" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"/>
                    <circle r="9" fill="#1a1a1a"/>
                    <g className="gl-wheel-front">
                      {[0,60,120,180,240,300].map(deg => {
                        const rad = (deg * Math.PI) / 180
                        return (
                          <line key={deg} x1={0} y1={0}
                            x2={Math.cos(rad) * 8} y2={Math.sin(rad) * 8}
                            stroke="#888" strokeWidth="1.5"
                          />
                        )
                      })}
                    </g>
                    <circle r="3" fill="url(#gl-hub)"/>
                    <circle r="1.2" fill="#ccc"/>
                  </g>

                  {/* ── REAR RED TAIL LIGHTS ── */}
                  <rect x="4" y="16" width="4" height="12" rx="1.5" fill="#ff2a2a" opacity="0.9"/>
                  <rect x="4" y="16" width="4" height="12" rx="1.5" fill="rgba(255,42,42,0.4)" filter="blur(2px)"/>
                  {/* Reflector */}
                  <rect x="4" y="48" width="3" height="5" rx="1" fill="#e51c1c" opacity="0.8"/>
                </svg>
              </div>
            </div>
          </div>

          {/* ═══ PROGRESS BAR ═══ */}
          <div
            style={{
              width: '100vw',
              position: 'relative',
              marginTop: '-1px',
            }}
            aria-hidden="true"
          >
            {/* Track */}
            <div style={{ width: '100%', height: '3px', background: 'rgba(0,0,0,0.06)' }}>
              {/* Fill */}
              <div
                className="gl-bar"
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #0fa000, #1bb908, #25d60d)',
                  boxShadow: '0 0 10px rgba(27,185,8,0.7), 0 0 20px rgba(27,185,8,0.3)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Shimmer sweep */}
                <div
                  className="gl-bar-shimmer"
                  style={{
                    position: 'absolute', top: 0, bottom: 0,
                    width: '60px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ═══ LABEL AREA ═══ */}
          <div
            className="gl-label"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              marginTop: '24px',
            }}
          >
            {/* Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {[1,2,3].map(n => (
                <span
                  key={n}
                  className={`gl-dot-${n}`}
                  style={{
                    display: 'inline-block',
                    width: n === 2 ? '8px' : '6px',
                    height: n === 2 ? '8px' : '6px',
                    borderRadius: '50%',
                    background: n === 2 ? '#e51c1c' : '#1bb908',
                    boxShadow: n === 2
                      ? '0 0 5px rgba(229,28,28,0.6)'
                      : '0 0 5px rgba(27,185,8,0.6)',
                  }}
                />
              ))}
            </div>

            {/* Label text */}
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-montserrat, system-ui)',
                fontWeight: 600,
                fontSize: 'clamp(10px, 1.4vw, 12px)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.35)',
              }}
            >
              {label}
            </p>

            {/* Dots right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {[3,2,1].map(n => (
                <span
                  key={n}
                  className={`gl-dot-${n}`}
                  style={{
                    display: 'inline-block',
                    width: n === 2 ? '8px' : '6px',
                    height: n === 2 ? '8px' : '6px',
                    borderRadius: '50%',
                    background: n === 2 ? '#e51c1c' : '#1bb908',
                    boxShadow: n === 2
                      ? '0 0 5px rgba(229,28,28,0.6)'
                      : '0 0 5px rgba(27,185,8,0.6)',
                    opacity: 0.4,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ─── TAGLINE ─── */}
          <p
            className="gl-label"
            style={{
              margin: '10px 0 0',
              fontFamily: 'var(--font-montserrat, system-ui)',
              fontWeight: 400,
              fontSize: 'clamp(9px, 1.2vw, 11px)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.2)',
              animationDelay: '1.95s',
            }}
          >
            Calgary&apos;s Same-Day Courier
          </p>
        </div>
      </div>
    </>
  )
}
