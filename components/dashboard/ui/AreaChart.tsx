'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  data: number[]
  height?: number
}

/**
 * Grote area-chart, breedte volgt container (via ResizeObserver).
 * Client-component nodig omdat we de breedte runtime moeten meten.
 *
 * Gradient fill (--primary → transparant) + gradient lijn
 * (--primary → --accent). Last-point krijgt een witte dot.
 */
export function AreaChart({ data, height = 170 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(w)
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (!data.length) {
    return (
      <div
        ref={ref}
        style={{
          width: '100%',
          height,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--fg-muted)',
          fontSize: 12,
        }}
      >
        Geen data
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : 0

  const points = data.map((v, i): [number, number] => {
    const x = data.length > 1 ? i * step : width / 2
    const y = height - ((v - min) / range) * (height - 14) - 4
    return [x, y]
  })
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`
  const lastPoint = points[points.length - 1]

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg width={width} height={height} className="dash-area-chart">
        <defs>
          <linearGradient id="dash-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A56FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1A56FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="dash-area-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1A56FF" />
            <stop offset="100%" stopColor="#00CFFF" />
          </linearGradient>
        </defs>
        {/* Subtiele gridlines op 25/50/75% hoogte */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0"
            x2={width}
            y1={height * p}
            y2={height * p}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={areaPath} fill="url(#dash-area-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#dash-area-stroke)"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {lastPoint && (
          <circle
            cx={lastPoint[0]}
            cy={lastPoint[1]}
            r="4"
            fill="white"
            stroke="var(--primary)"
            strokeWidth="2.4"
          />
        )}
      </svg>
    </div>
  )
}
