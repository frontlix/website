import styles from './TopTagsList.module.css'

export function TopTagsList({
  rows,
}: {
  rows: Array<{ naam: string; count: number }>
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.title}>Top tags</h3>
        <p className={styles.empty}>Nog geen tags toegekend.</p>
      </div>
    )
  }
  return (
    <div className={styles.section}>
      <h3 className={styles.title}>Top tags</h3>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.naam} className={styles.row}>
            <span className={styles.naam}>{row.naam}</span>
            <span className={styles.count}>{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
