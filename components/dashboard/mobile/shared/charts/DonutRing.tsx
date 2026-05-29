'use client'

import { useId } from 'react'
import { ringGeometry } from './chart-math'
import styles from './DonutRing.module.css'

type Props = {
  pct: number
  size?: number
  stroke?: number
  /** Center overlay (bv. "74%"). */
  children?: React.ReactNode
}

/** Voortgangsring met gradient-stroke (primary→accent-2) + center-overlay. */
export function DonutRing({ pct, size = 62, stroke = 7, children }: Props) {
  const id = useId()
  const { r, circumference, dashOffset, center } = ringGeometry({ size, stroke, pct })

  return (
    <div className={styles.wrap} style={{ '--ring-size': `${size}px` } as React.CSSProperties}>
      <svg width={size} height={size} className={styles.svg} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--color-track-bg)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      {children != null && <div className={styles.center}>{children}</div>}
    </div>
  )
}
