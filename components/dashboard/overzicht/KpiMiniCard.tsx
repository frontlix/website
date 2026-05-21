import Link from 'next/link'
import { ArrowUp, ArrowDown, Flame } from 'lucide-react'
import {
  type KpiMetric,
  type ExtraMetric,
  formatKpiValue,
  computeDelta,
} from './kpi-types'
import styles from './KpiMiniCard.module.css'

/**
 * Compacte KPI-kaart die je naast de hero ziet.
 *
 * Twee gebruiken:
 * - Klikbaar (via `href`) → klik maakt 'm de nieuwe active (hero).
 *   Gebruikt voor de drie niet-actieve tab-able metrics.
 * - Statisch (geen `href`) → puur informatief, geen click-actie.
 *   Gebruikt voor de "Offertes open"-extra metric die geen hero kan zijn.
 */
export function KpiMiniCard({
  metric,
  href,
  isActive,
}: {
  metric: KpiMetric | ExtraMetric
  href?: string
  /** True als deze mini de hero-KPI is. Op desktop verbergt CSS 'm dan
   *  (geen duplicaat met hero); op mobile blijft 'ie zichtbaar zodat
   *  de 4-vakjes-overview compleet blijft. */
  isActive?: boolean
}) {
  const { prefix, number, suffix } = formatKpiValue(metric.value, metric.unit)
  const delta = computeDelta(metric as KpiMetric)

  const content = (
    <>
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
      {delta.display !== '—' && (
        <div className={`${styles.delta} ${delta.up ? styles.deltaUp : styles.deltaDown}`}>
          {delta.up ? (
            <ArrowUp size={12} strokeWidth={2.5} />
          ) : (
            <ArrowDown size={12} strokeWidth={2.5} />
          )}
          {delta.display}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={`${styles.card} ${styles.clickable}`}
        scroll={false}
        data-kpi={metric.key}
        data-active={isActive ? 'true' : undefined}
      >
        {content}
      </Link>
    )
  }
  return (
    <div className={styles.card} data-kpi={metric.key}>
      {content}
    </div>
  )
}
