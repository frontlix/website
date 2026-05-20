import styles from './TrendStat.module.css'

/**
 * Eén vakje in de 4-koloms strip onder de lead-instroom chart.
 * Gebruikt eigen module-CSS zodat de classes niet vastzitten aan
 * de page.module.css van de overzicht-pagina.
 */
export function TrendStat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className={styles.trendStat}>
      <div className={styles.trendStatLabel}>{label}</div>
      <div className={styles.trendStatValue}>{value}</div>
      <div className={styles.trendStatSub}>{sub}</div>
    </div>
  )
}
