'use client'

import { scaleSeries, toLinePath } from './chart-math'

type Props = {
  data: number[]
  color?: string
  width?: number
  height?: number
}

/** Mini-lijn zonder assen — voor KPI-kaarten. */
export function Sparkline({ data, color = 'var(--color-primary)', width = 48, height = 20 }: Props) {
  const pts = scaleSeries(data, { w: width, h: height, pad: 2 })
  if (pts.length < 2) return null
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path
        d={toLinePath(pts)}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
