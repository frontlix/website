import { ArrowUp, ArrowDown, Flame } from 'lucide-react'
import { Donut } from '@/components/dashboard/ui/Donut'
import {
  type KpiMetric,
  formatKpiValue,
  computeDelta,
  pctVanDoel,
  nogTotDoel,
  renderIcon,
} from './kpi-types'
import styles from './KpiHeroCard.module.css'

/**
 * Grote KPI-kaart bovenaan (active metric).
 * Layout: icon-badge + label + grote waarde + vs-vorige-week aan de
 * linkerkant; donut met doel-info aan de rechterkant.
 */
export function KpiHeroCard({ metric }: { metric: KpiMetric }) {
  const { prefix, number, suffix } = formatKpiValue(metric.value, metric.unit)
  const delta = computeDelta(metric)
  const pct = pctVanDoel(metric)
  const nog = nogTotDoel(metric)

  return (
    <div className={styles.card}>
      {/* ── Linker blok: icon + label + value + vs-vorige-week ── */}
      <div className={styles.left}>
        <div className={styles.iconBadge} aria-hidden>
          {renderIcon(metric.iconKind, 20)}
        </div>

        <div className={styles.body}>
          <div className={styles.headRow}>
            <span className={styles.label}>{metric.label.toUpperCase()}</span>
            {delta.uitschieter && (
              <span className={styles.badgeUitschieter}>
                <Flame size={11} strokeWidth={2.5} />
                Uitschieter
              </span>
            )}
          </div>

          <div className={styles.valueRow}>
            {prefix && <span className={styles.valueAffix}>{prefix}</span>}
            <span className={styles.valueNumber}>{number}</span>
            {suffix && <span className={styles.valueAffixSuffix}>{suffix}</span>}
            {/* Mobile-only kopie van de uitschieter-badge — verschijnt naast het
                getal i.p.v. naast het label, zodat de hero-card op telefoon
                één regel minder hoog wordt. Op desktop verborgen via CSS
                (.badgeUitschieterMobile { display: none } in default).
                De badge in .headRow blijft 1-op-1 actief voor desktop. */}
            {delta.uitschieter && (
              <span className={styles.badgeUitschieterMobile}>
                <Flame size={11} strokeWidth={2.5} />
                Uitschieter
              </span>
            )}
          </div>

          <div className={styles.deltaRow}>
            {delta.display !== '—' ? (
              <>
                <span className={`${styles.delta} ${delta.up ? styles.deltaUp : styles.deltaDown}`}>
                  {delta.up ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
                  {delta.display}
                </span>
                <span className={styles.deltaSep}>·</span>
                <span className={styles.compareLabel}>{metric.compareLabel}</span>
                <span className={styles.deltaSep}>·</span>
              </>
            ) : null}
            <span className={styles.rangeLabel}>{metric.rangeLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Rechter blok: donut + doel-info ── */}
      <div className={styles.right}>
        <Donut pct={pct} size={104} stroke={10} />
        <div className={styles.doelBlock}>
          <div className={styles.doelLabel}>Doel</div>
          <div className={styles.doelValue}>
            {prefix && <span className={styles.doelAffix}>{prefix}</span>}
            <span>{metric.doel.toLocaleString('nl-NL')}</span>
            {suffix && <span className={styles.doelAffix}>{suffix}</span>}
          </div>
          <div className={`${styles.nog} ${nog.done ? styles.nogDone : ''}`}>
            {nog.display}
          </div>
        </div>
      </div>
    </div>
  )
}
