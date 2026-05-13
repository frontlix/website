import Link from 'next/link'
import { Send, Clock } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import styles from './PendingReviewRow.module.css'

export type PendingReview = {
  id: string
  leadId: string
  naam: string
  plaats: string
  klusDatum: string
  /** Hoe lang geleden is het reviewverzoek verstuurd (of de klus afgerond, als niet verstuurd) */
  daysSince: number
  /** Is er al een review-verzoek verstuurd via WhatsApp? */
  sent: boolean
}

export function PendingReviewRow({ item }: { item: PendingReview }) {
  return (
    <div className="dash-card">
      <div className={styles.row}>
        <Avatar name={item.naam} />
        <div className={styles.body}>
          <div className={styles.headRow}>
            <div className={styles.naam}>{item.naam}</div>
            <Pill tone={item.sent ? 'gray' : 'amber'}>
              {item.sent ? `${item.daysSince}d geleden gevraagd` : 'Nog niet gevraagd'}
            </Pill>
          </div>
          <div className={styles.meta}>
            <Clock size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />
            Klus afgerond: {item.klusDatum} · {item.plaats}
          </div>
        </div>
        <div className={styles.actions}>
          <Link href={`/leads/${item.leadId}`} className={styles.openLink}>
            Open lead
          </Link>
          <button type="button" className={styles.sendBtn} disabled>
            <Send size={12} />
            {item.sent ? 'Opnieuw vragen' : 'Vraag review'}
          </button>
        </div>
      </div>
    </div>
  )
}
