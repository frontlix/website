import { KpiHeroCard } from './KpiHeroCard'
import { KpiMiniCard } from './KpiMiniCard'
import { KpiTabs } from './KpiTabs'
import { type KpiKey, type KpiMetric, KPI_KEYS } from './kpi-types'
import styles from './KpiModule.module.css'

/**
 * Top-level KPI-blok: links de active KPI als hero (groot met donut),
 * rechts de andere drie als mini-cards (klik = wisselen). Onderaan een
 * tabs-rij die ook de actieve KPI bepaalt.
 *
 * URL-param: `?kpi=omzet|leads|conversie|reactietijd` (default 'omzet').
 */
export function KpiModule({
  metrics,
  active,
  hrefBase,
}: {
  metrics: Record<KpiKey, KpiMetric>
  active: KpiKey
  hrefBase: string
}) {
  const activeMetric = metrics[active]
  const others = KPI_KEYS.filter((k) => k !== active).map((k) => metrics[k])

  return (
    <div className={styles.module}>
      <div className={styles.grid}>
        <div className={styles.heroSlot}>
          <KpiHeroCard metric={activeMetric} />
        </div>
        <div className={styles.miniColumn}>
          {others.map((m) => (
            <KpiMiniCard key={m.key} metric={m} hrefBase={hrefBase} />
          ))}
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
