'use client'

import { useId } from 'react'

type Props = {
  data: number[]
  width?: number
  height?: number
  color?: string
}

/**
 * Inline mini-area-chart (SVG, geen library). Wordt rechtsonder in een
 * KPI-card geplaatst. Gradient-fill matcht --primary; lijn is solid.
 *
 * Gebruikt useId() voor de gradient-id zodat server en client dezelfde
 * id renderen (geen hydration-mismatch).
 */
export function Sparkline({
  data,
  width = 88,
  height = 36,
  color = 'var(--primary)',
}: Props) {
  // Unieke gradient-id per Sparkline-instance vermijdt SVG-defs-clashes;
  // useId() blijft stabiel tussen server en client. Als hook moet deze call
  // onvoorwaardelijk vóór elke early return staan (React Rules of Hooks).
  const gradientId = `dash-spark-${useId()}`

  if (!data.length) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : 0

  const points = data.map((v, i): [number, number] => {
    const x = data.length > 1 ? i * step : width / 2
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y]
  })
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`

  return (
    <svg className="dash-kpi-spark" width={width} height={height}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A56FF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1A56FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
