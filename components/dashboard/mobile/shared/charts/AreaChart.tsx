'use client'

import { useId } from 'react'
import { scaleSeries, toLinePath, toAreaPath } from './chart-math'
import styles from './AreaChart.module.css'

type Props = {
  data: number[]
  /** Stroke + gradient color. Default: primary→accent gradient via tokens. */
  color?: string
  width?: number
  height?: number
}

/** Responsieve area-chart. preserveAspectRatio=none stretcht naar 100% breedte;
 * géén non-scaling-stroke (botst met preserveAspectRatio=none op iOS Safari). */
export function AreaChart({ data, color = 'var(--color-primary)', width = 320, height = 84 }: Props) {
  const id = useId()
  const pad = 4
  const pts = scaleSeries(data, { w: width, h: height, pad })
  if (pts.length === 0) return null
  const line = toLinePath(pts)
  const area = toAreaPath(pts, width, height)
  const last = pts[pts.length - 1]

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />
    </svg>
  )
}
