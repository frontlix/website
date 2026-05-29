import { StarRating } from '../shared/StarRating'
import { GoogleMark } from './ReviewAtoms'
import styles from './ReviewScoreHeader.module.css'

type Props = { score: number; total: number; deltaMaand: number; bedrijfsnaam?: string }

export function ReviewScoreHeader({ score, total, deltaMaand, bedrijfsnaam = 'Schoon Straatje' }: Props) {
  // Komma-notatie zoals Google (nl-NL): 4.8 → "4,8".
  const scoreLabel = score.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (
    <section className={styles.header}>
      <div className={styles.top}>
        <GoogleMark size={20} />
        <span className={styles.brand}>Google-reviews</span>
        <span className={styles.tenant}>{bedrijfsnaam}</span>
      </div>
      <div className={styles.scoreRow}>
        <div className={styles.score}>{scoreLabel}</div>
        <div className={styles.scoreMeta}>
          <StarRating value={score} size={18} />
          <div className={styles.count}>{total} reviews · +{deltaMaand} deze maand</div>
        </div>
      </div>
    </section>
  )
}
