import styles from './DistributionBars.module.css'

export function DistributionBars({
  title,
  rows,
}: {
  title: string
  rows: Array<{ label: string; count: number }>
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.empty}>Geen data in deze periode.</p>
      </div>
    )
  }
  const total = rows.reduce((a, b) => a + b.count, 0)
  return (
    <div className={styles.section}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
          return (
            <li key={row.label} className={styles.row}>
              <div className={styles.rowHeader}>
                <span className={styles.rowLabel}>{row.label}</span>
                <span className={styles.rowMeta}>
                  {row.count} ({pct}%)
                </span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${pct}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
