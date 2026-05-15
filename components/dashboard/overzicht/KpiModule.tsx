import { KpiHeroCard } from './KpiHeroCard'
import { KpiMiniCard } from './KpiMiniCard'
import { KpiTabs } from './KpiTabs'
import { type KpiKey, type KpiMetric, type ExtraMetric, KPI_KEYS } from './kpi-types'
import styles from './KpiModule.module.css'

/**
 * Top-level KPI-blok: links de active KPI als hero (groot met donut),
 * rechts een 2x2-grid met de overige drie tab-able metrics + één extra
 * "altijd-mini" metric (zoals "Offertes open").
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
        <div className={styles.heroSlot}>
          <KpiHeroCard metric={activeMetric} />
        </div>
        <div className={styles.miniGrid}>
          {others.map((m) => (
            <KpiMiniCard key={m.key} metric={m} href={`${hrefBase}?kpi=${m.key}`} />
          ))}
          {extraMetric && <KpiMiniCard key={extraMetric.key} metric={extraMetric} />}
        </div>
      </div>
      <KpiTabs active={active} hrefBase={hrefBase} />
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
