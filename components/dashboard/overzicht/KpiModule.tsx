import { KpiHeroCard } from './KpiHeroCard'
import { KpiMiniCard } from './KpiMiniCard'
import { KpiTabs } from './KpiTabs'
import { type KpiKey, type KpiMetric, type ExtraMetric, KPI_KEYS } from './kpi-types'
import styles from './KpiModule.module.css'

/**
 * Top-level KPI-blok. Layout:
 *  - Linker kolom: hero (groot met donut) + tabs direct daaronder
 *  - Rechter kolom: 2x2 mini-grid (3 niet-actieve tab-metrics + 1 extra)
 *
 * Door tabs IN de linker kolom te zetten (niet onder de hele rij) blijft
 * de tab-pill compact en dichtbij de hero, ongeacht hoe hoog de mini-grid
 * uitvalt.
 *
 * URL-param: `?kpi=omzet|leads|conversie|reactietijd` (default 'omzet').
 */
export function KpiModule({
  metrics,
  active,
  hrefBase,
  extraMetric,
}: {
  metrics: Record<KpiKey, KpiMetric>
  active: KpiKey
  hrefBase: string
  /** Optionele extra mini-card (geen tab, niet klikbaar). */
  extraMetric?: ExtraMetric
}) {
  const activeMetric = metrics[active]
  const others = KPI_KEYS.filter((k) => k !== active).map((k) => metrics[k])

  return (
    <div className={styles.module}>
      <div className={styles.grid}>
        <div className={styles.leftColumn}>
          <KpiHeroCard metric={activeMetric} />
          <KpiTabs active={active} hrefBase={hrefBase} />
        </div>
        <div className={styles.miniGrid}>
          {others.map((m) => (
            <KpiMiniCard key={m.key} metric={m} href={`${hrefBase}?kpi=${m.key}`} />
          ))}
          {extraMetric && <KpiMiniCard key={extraMetric.key} metric={extraMetric} />}
        </div>
      </div>
    </div>
  )
}

/**
 * Parse `?kpi=...` met whitelist + default. Helper voor de page.tsx.
 */
export function parseKpiKey(raw: string | undefined): KpiKey {
  if (raw === 'leads' || raw === 'conversie' || raw === 'reactietijd' || raw === 'omzet') {
    return raw
  }
  return 'omzet'
}
