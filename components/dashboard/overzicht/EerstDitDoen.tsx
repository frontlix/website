import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { DashboardAction } from '@/lib/dashboard/eerst-dit-doen'
import styles from './EerstDitDoen.module.css'

/**
 * "Eerst dit doen" — top-prio actie-lijst bovenaan het overzicht.
 *
 * Render-contract: deze component rendert *altijd* iets als hij gemount
 * is. De parent moet zelf de zichtbaarheid bepalen door 'm niet te
 * renderen als `actions.length === 0`. Dat houdt de component dom en
 * voorkomt dat we hier business-logica over "is dit relevant?" zetten.
 */
export function EerstDitDoen({
  actions,
  counts,
}: {
  actions: DashboardAction[]
  counts: { hot: number; warm: number }
}) {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">Eerst dit doen</div>
          <div className="dash-card-sub">
            {actions.length} acti{actions.length === 1 ? 'e' : 'es'} · gesorteerd op urgentie & waarde
          </div>
        </div>
        <div className={styles.toneCounts}>
          {counts.hot > 0 && (
            <Pill tone="red">
              <span className={`${styles.toneDot} ${styles.toneDotHot}`} />
              {counts.hot} hot
            </Pill>
          )}
          {counts.warm > 0 && (
            <Pill tone="amber">
              <span className={`${styles.toneDot} ${styles.toneDotWarm}`} />
              {counts.warm} warm
            </Pill>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {actions.map((action, idx) => (
          <Link
            key={action.id}
            href={`/leads/${action.leadId}`}
            className={styles.row}
          >
            <div
              className={`${styles.idx} ${
                action.tone === 'hot' ? styles.idxHot : styles.idxWarm
              }`}
            >
              {idx + 1}
            </div>
            <div className={styles.rowBody}>
              <div className={styles.title}>{action.title}</div>
              <div className={styles.subtitle}>{action.subtitle}</div>
            </div>
            <div
              className={`${styles.wait} ${
                action.tone === 'hot' ? styles.waitHot : styles.waitWarm
              }`}
            >
              {action.waitLabel}
            </div>
            <span className={styles.chev}>
              <ChevronRight size={14} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
