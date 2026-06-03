import { Pill } from '@/components/dashboard/ui/Pill'
import styles from './Trechter.module.css'

type FunnelRow = { label: string; count: number; pct: number }

/**
 * Trechter (funnel) widget, toont door wat % van de leads in elke fase
 * is gekomen. Counts/percentages worden door de caller berekend op basis
 * van echte query-data.
 */
export function Trechter({ rows }: { rows: FunnelRow[] }) {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div className="dash-card-title">Trechter deze week</div>
        <Pill tone="blue" dot>
          Live
        </Pill>
      </div>
      <div className={styles.body}>
        {rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <div className={styles.rowHead}>
              <span className={styles.label}>{row.label}</span>
              <span className={`${styles.value} dash-tabular`}>
                {row.count} · {row.pct}%
              </span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
