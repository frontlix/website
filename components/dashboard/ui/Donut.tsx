/**
 * SVG donut-progress met brand-gradient. Geclamped op 0–100% voor
 * de visuele boog; de getoonde percentage-tekst kan boven de 100% gaan
 * (als value > doel, dan zegt 't bijv. "112%" maar de boog blijft vol).
 */
export function Donut({
  pct,
  size = 96,
  stroke = 10,
  showLabel = true,
}: {
  pct: number
  size?: number
  stroke?: number
  showLabel?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (clamped / 100) * circumference
  const gradientId = 'donut-grad-' + Math.round(Math.random() * 1e9)

  // CSS-variabelen-fallback voor responsive sizing: desktop pakt de
   // `size` prop, mobile-CSS kan via --donut-size kleiner maken zonder
   // dat we de SVG-content opnieuw moeten meten. SVG schaalt 100% mee.
  return (
    <div
      style={{
        position: 'relative',
        width: `var(--donut-size, ${size}px)`,
        height: `var(--donut-size, ${size}px)`,
        flexShrink: 0,
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1A56FF" />
            <stop offset="100%" stopColor="#00CFFF" />
          </linearGradient>
        </defs>
        {/* Achtergrond-ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border, rgba(0,0,0,0.08))"
          strokeWidth={stroke}
        />
        {/* Voortgangs-boog */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.4s ease-out' }}
        />
      </svg>
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `var(--donut-label-size, ${size <= 80 ? 13 : 16}px)`,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--fg, #1A1A1A)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(pct)}%
        </div>
      )}
    </div>
  )
}
