export default function SpeedLines({ color = 'orange', opacity = 0.15, className = '' }) {
  const stroke = color === 'green' ? '#1bb908' : '#ff580d'
  return (
    <svg
      viewBox="0 0 400 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <line x1="0" y1="60"  x2="320" y2="20"  stroke={stroke} strokeWidth="3"  strokeOpacity={opacity}           strokeLinecap="round" />
      <line x1="0" y1="90"  x2="380" y2="40"  stroke={stroke} strokeWidth="5"  strokeOpacity={opacity * 1.4}     strokeLinecap="round" />
      <line x1="0" y1="120" x2="400" y2="80"  stroke={stroke} strokeWidth="8"  strokeOpacity={opacity * 1.8}     strokeLinecap="round" />
      <line x1="0" y1="150" x2="370" y2="120" stroke={stroke} strokeWidth="4"  strokeOpacity={opacity}           strokeLinecap="round" />
      <line x1="0" y1="175" x2="300" y2="155" stroke={stroke} strokeWidth="2"  strokeOpacity={opacity * 0.7}     strokeLinecap="round" />
      <polygon
        points="390,80 360,68 360,92"
        fill={stroke}
        fillOpacity={opacity * 1.8}
      />
    </svg>
  )
}
