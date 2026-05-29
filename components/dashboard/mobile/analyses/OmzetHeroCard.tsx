'use client'

import { AreaChart } from '../shared/charts/AreaChart'
import { DonutRing } from '../shared/charts/DonutRing'
import styles from './OmzetHeroCard.module.css'

type Props = {
  omzetLabel: string
  goalPct: number
  periodLabel: string
  trend: number[]
  monthLabels: string[]
}

export function OmzetHeroCard({ omzetLabel, goalPct, periodLabel, trend, monthLabels }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.top}>
        <div>
          <p className={styles.kicker}>Omzet · {periodLabel}</p>
          <p className={styles.amount}>{omzetLabel}</p>
        </div>
        <DonutRing pct={goalPct}>
          <span className={styles.ringPct}>{goalPct}%</span>
        </DonutRing>
      </div>
      <div className={styles.chart}>
        <AreaChart data={trend} color="var(--color-primary)" />
        <div className={styles.months} aria-hidden="true">
          {monthLabels.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
