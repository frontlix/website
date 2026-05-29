import styles from './AnalyseSectionCard.module.css'

type Props = {
  title: string
  /** Optionele rechter-badge (bv. "44% akkoord"). */
  badge?: string
  children: React.ReactNode
}

export function AnalyseSectionCard({ title, badge, children }: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        {badge && <span className={styles.badge}>{badge}</span>}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
