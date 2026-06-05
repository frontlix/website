'use client'

import { useEffect, useRef, useState } from 'react'
import { axisTicks } from './chart-ticks'

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

  // Linker-inset voor de y-as cijfers; de lijn start hierna zodat de
  // labels niet over de data vallen.
  const PAD_LEFT = 26
  // Baseline op 0 (niet min) zodat de "0"-tick klopt en de hoogte eerlijk is.
  const max = Math.max(...data)
  const range = max || 1
  const step = data.length > 1 ? (width - PAD_LEFT) / (data.length - 1) : 0

  // y-positie voor een waarde, zelfde schaal als de lijn.
  const yFor = (v: number) => height - (v / range) * (height - 14) - 4

  const points = data.map((v, i): [number, number] => {
    const x = data.length > 1 ? PAD_LEFT + i * step : (width + PAD_LEFT) / 2
    return [x, yFor(v)]
  })
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${width},${height} L ${PAD_LEFT},${height} Z`
  const lastPoint = points[points.length - 1]

  // Nette integer y-as ticks (0..max) zodat geen tussenstap ontbreekt.
  const ticks = axisTicks(max)

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
        {/* Gridlines + y-as cijfers op de tick-waarden */}
        {ticks.map((t) => {
          const gy = yFor(t)
          return (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                x2={width}
                y1={gy}
                y2={gy}
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
              <text
                x={0}
                y={gy}
                dy="0.32em"
                fontSize={11}
                fill="var(--fg-muted)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t}
              </text>
            </g>
          )
        })}
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
