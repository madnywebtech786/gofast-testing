const COLOR_MAP = {
  orange: 'var(--brand-black)',
  green:  'var(--brand-green)',
  black:  'var(--brand-black)',
  white:  '#ffffff',
}

export default function GradientHeading({ parts = [], className = '', as: Tag = 'h2' }) {
  return (
    <Tag className={`font-black leading-tight ${className}`}>
      {parts.map((part, i) => (
        <span
          key={i}
          style={{ color: COLOR_MAP[part.color] ?? COLOR_MAP.black }}
          className={part.highlight ? 'heading-highlight' : ''}
        >
          {part.text}
        </span>
      ))}
    </Tag>
  )
}
