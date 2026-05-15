import Link from 'next/link'
import { ArrowUp, ArrowDown, Flame } from 'lucide-react'
import {
  type KpiMetric,
  formatKpiValue,
  computeDelta,
} from './kpi-types'
import styles from './KpiMiniCard.module.css'

/**
 * Compacte KPI-kaart die je naast de hero ziet. Klik op de kaart maakt
 * 'm de nieuwe active (hero) — werkt via URL-param `?kpi=...`.
 */
export function KpiMiniCard({
  metric,
  hrefBase,
}: {
  metric: KpiMetric
  /** Pathname + bestaande query-params, zonder ?kpi=. */
  hrefBase: string
}) {
  const { prefix, number, suffix } = formatKpiValue(metric.value, metric.unit)
  const delta = computeDelta(metric)

  return (
    <Link href={`${hrefBase}?kpi=${metric.key}`} className={styles.card} scroll={false}>
      <div className={styles.head}>
        <span className={styles.label}>{metric.label}</span>
        {delta.uitschieter && (
          <span className={styles.badge} title="Uitschieter — ≥20% verschil vs vorige week">
            <Flame size={11} strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className={styles.valueRow}>
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <span className={styles.number}>{number}</span>
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      <div className={`${styles.delta} ${delta.up ? styles.deltaUp : styles.deltaDown}`}>
        {delta.up ? (
          <ArrowUp size={12} strokeWidth={2.5} />
        ) : (
          <ArrowDown size={12} strokeWidth={2.5} />
        )}
        {delta.display}
      </div>
    </Link>
  )
}
