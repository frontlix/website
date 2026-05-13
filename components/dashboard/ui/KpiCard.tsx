'use client'

import { useEffect, useState } from 'react'
import { Sparkline } from './Sparkline'

type Props = {
  label: string
  value: number
  prefix?: string
  suffix?: string
  /** Vergelijking met vorige periode, bv. "+12%" of "-3.4%" of "—". */
  delta?: string
  /** Sparkline-data (laatste N waarden van de KPI). */
  trend?: number[]
  /** Bij true: een positieve delta is slecht (bv. reactietijd). */
  invertDelta?: boolean
}

/**
 * KPI-card met count-up animatie en optionele sparkline.
 * 'use client' nodig voor de count-up + delta-kleur-logica.
 */
export function KpiCard({
  label,
  value,
  prefix,
  suffix,
  delta,
  trend,
  invertDelta = false,
}: Props) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    // Count-up van 0 naar value over 900ms met cubic ease-out.
    setShown(0)
    const start = Date.now()
    const duration = 900
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const p = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(value * eased)
      if (p >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [value])

  const formatted = formatValue(shown, value)
  const isNeutral = delta === '—' || delta === undefined
  // Bij invertDelta is "+12%" eigenlijk slecht (reactietijd gaat OMHOOG → rood).
  const isPositive =
    delta !== undefined &&
    !delta.startsWith('-') &&
    !delta.startsWith('−') &&
    !delta.startsWith('–')
  const arrowClass = invertDelta
    ? isPositive
      ? 'down'
      : 'up'
    : isPositive
      ? 'up'
      : 'down'

  return (
    <div className="dash-kpi">
      <div className="dash-kpi-label">{label}</div>
      <div className="dash-kpi-value">
        {prefix && <span className="unit">{prefix}</span>}
        <span className="dash-tabular">{formatted}</span>
        {suffix && <span className="unit">{suffix}</span>}
      </div>
      <div className="dash-kpi-foot">
        {!isNeutral && delta && (
          <span className={`dash-kpi-delta ${arrowClass}`}>{delta}</span>
        )}
        {isNeutral && <span className="dash-kpi-delta">—</span>}
        <span>vs vorige periode</span>
      </div>
      {trend && trend.length > 0 && <Sparkline data={trend} />}
    </div>
  )
}

function formatValue(shown: number, target: number): string {
  if (target >= 1000) return Math.round(shown).toLocaleString('nl-NL')
  if (target % 1 === 0) return String(Math.round(shown))
  return shown.toFixed(1)
}
