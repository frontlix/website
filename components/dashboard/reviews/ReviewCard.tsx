import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import { StarRating } from '@/components/dashboard/mobile/shared/StarRating'
import styles from './ReviewCard.module.css'

export type ReviewItem = {
  id: string
  leadId: string
  naam: string
  plaats: string
  datum: string
  score: number // 0-5
  nps: 'promoter' | 'passive' | 'detractor'
  text: string
  published: boolean
}

/**
 * Review-card, toont één review met avatar/naam/plaats/datum,
 * star-rating, body-text, en NPS-tone met published-pill.
 */
export function ReviewCard({ review }: { review: ReviewItem }) {
  const accentClass =
    review.nps === 'promoter'
      ? styles.accentGreen
      : review.nps === 'detractor'
        ? styles.accentRed
        : styles.accentGray

  return (
    <div className="dash-card">
      <div className={`${styles.head} ${accentClass}`}>
        <div className={styles.headLeft}>
          <Avatar name={review.naam} />
          <div className={styles.identity}>
            <div className={styles.naam}>{review.naam}</div>
            <div className={styles.plaats}>
              {review.plaats} · {review.datum}
            </div>
          </div>
        </div>
        <div className={styles.headRight}>
          <div className={styles.score}>
            <StarRating value={review.score} size={15} />
            <span className="dash-tabular">{review.score.toLocaleString('nl-NL')}</span>
          </div>
          <Pill
            tone={review.nps === 'promoter' ? 'green' : review.nps === 'detractor' ? 'red' : 'gray'}
          >
            {labelFor(review.nps)}
          </Pill>
        </div>
      </div>

      <div className={styles.body}>
        <p className={styles.text}>{review.text}</p>
        <div className={styles.footer}>
          {review.published ? (
            <Pill tone="green" dot>Gepubliceerd</Pill>
          ) : (
            <Pill tone="amber">Niet gepubliceerd</Pill>
          )}
          <Link href={`/leads/${review.leadId}`} className={styles.openLink}>
            Open lead
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}

function labelFor(nps: ReviewItem['nps']): string {
  return nps === 'promoter' ? 'Promoter' : nps === 'detractor' ? 'Detractor' : 'Passive'
}
