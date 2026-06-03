import Link from 'next/link'
import { Wallet, Inbox, TrendingUp, Clock } from 'lucide-react'
import { type KpiKey, KPI_KEYS } from './kpi-types'
import styles from './KpiTabs.module.css'

const TAB_LABELS: Record<KpiKey, string> = {
  omzet: 'Omzet',
  leads: 'Leads',
  conversie: 'Conversie',
  reactietijd: 'Reactietijd',
}

const TAB_ICONS: Record<KpiKey, typeof Wallet> = {
  omzet: Wallet,
  leads: Inbox,
  conversie: TrendingUp,
  reactietijd: Clock,
}

/**
 * URL-driven tab-rij die kiest welke KPI als hero (active) wordt
 * gerenderd. Server-side `Link`-componenten, geen JS-state nodig.
 */
export function KpiTabs({
  active,
  hrefBase,
}: {
  active: KpiKey
  /** Pathname + bestaande query-params, zonder ?kpi=. */
  hrefBase: string
}) {
  return (
    <div className={styles.tabs}>
      {KPI_KEYS.map((key) => {
        const Icon = TAB_ICONS[key]
        const isActive = key === active
        return (
          <Link
            key={key}
            href={`${hrefBase}?kpi=${key}`}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            scroll={false}
            aria-pressed={isActive}
            data-kpi={key}
          >
            <Icon size={13} strokeWidth={2.25} />
            <span>{TAB_LABELS[key]}</span>
          </Link>
        )
      })}
    </div>
  )
}
