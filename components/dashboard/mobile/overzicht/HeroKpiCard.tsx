'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import styles from './HeroKpiCard.module.css'

type Delta = {
  value: number
  label: string
}

type Props = {
  omzet: number
  doel: number | null
  delta?: Delta
  werkdagenLeft?: number
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

/**
 * HeroKpiCard — omzet deze maand met SVG goal-ring.
 * Bij doel === null toont 'm een placeholder met CTA naar Instellingen.
 */
export function HeroKpiCard({ omzet, doel, delta, werkdagenLeft }: Props) {
  if (doel === null) {
    return (
      <section className={styles.card} data-variant="no-goal">
        <div className={styles.col}>
          <div className={styles.label}>Omzet deze maand</div>
          <div className={styles.value}>{formatEuro(omzet)}</div>
          {delta && (
            <div className={styles.delta}>
              <ArrowUpRight size={14} />
              {delta.value > 0 ? '+' : ''}
              {formatEuro(delta.value)} {delta.label}
            </div>
          )}
          <Link
            href="/instellingen?section=bedrijf"
            className={styles.setGoal}
          >
            Stel je maanddoel in →
          </Link>
        </div>
      </section>
    )
  }

  // Ring math: omtrek = 2*pi*r; offset trekt aan vanaf 12 uur dankzij rotate(-90)
  const pct = doel > 0 ? Math.min(100, Math.round((omzet / doel) * 100)) : 0
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct / 100)

  return (
    <section className={styles.card}>
      <div className={styles.col}>
        <div className={styles.label}>Omzet deze maand</div>
        <div className={styles.value}>{formatEuro(omzet)}</div>
        {delta && (
          <div className={styles.delta}>
            <ArrowUpRight size={14} />
            {delta.value > 0 ? '+' : ''}
            {formatEuro(delta.value)} {delta.label}
          </div>
        )}
      </div>

      <svg
        className={styles.ring}
        width="110"
        height="110"
        viewBox="0 0 110 110"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="heroRingGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        <circle
          cx="55"
          cy="55"
          r={radius}
          stroke="var(--color-surface-2)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          stroke="url(#heroRingGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 55 55)"
        />
        <text
          x="55"
          y="50"
          textAnchor="middle"
          className={styles.ringValue}
        >
          {pct}
        </text>
        <text
          x="55"
          y="68"
          textAnchor="middle"
          className={styles.ringUnit}
        >
          %
        </text>
      </svg>

      <div className={styles.footer}>
        <span>
          Doel: <strong>{formatEuro(doel)}</strong>
        </span>
        {werkdagenLeft != null && (
          <span className={styles.left}>nog {werkdagenLeft} werkdagen</span>
        )}
      </div>
    </section>
  )
}
