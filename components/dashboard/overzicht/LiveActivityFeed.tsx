import Link from 'next/link'
import { Sparkle, MessageCircle, Calendar, FileText } from 'lucide-react'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import styles from './LiveActivityFeed.module.css'

export type ActivityItem = {
  leadId: string
  naam: string
  /** 'new' = nieuwe lead, 'wa' = WhatsApp bericht, 'appt' = afspraak, 'quote' = offerte */
  kind: 'new' | 'wa' | 'appt' | 'quote'
  text: string
  timestamp: string
}

const KIND_ICONS = {
  new:   Sparkle,
  wa:    MessageCircle,
  appt:  Calendar,
  quote: FileText,
}

/**
 * Live-activity-feed — recente events over alle leads heen.
 * Live-pulse-dot in de header signaleert "actief". Voor V1 statisch
 * geserveerd; realtime-subscriptie volgt zodra we Supabase realtime
 * channel hebben aangezet op leads + berichten + offertes.
 */
export function LiveActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="dash-card" style={{ overflow: 'hidden' }}>
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">Live activiteit</div>
          <div className="dash-card-sub">Wat Surface op dit moment doet</div>
        </div>
        <LiveDot />
      </div>
      <div className={styles.feed}>
        {items.length === 0 && (
          <div className={styles.empty}>
            Nog geen activiteit. Komt zodra de eerste lead binnenkomt.
          </div>
        )}
        {items.map((item) => {
          const Icon = KIND_ICONS[item.kind]
          return (
            <Link
              key={`${item.timestamp}-${item.leadId}`}
              href={`/leads/${item.leadId}`}
              className={styles.row}
            >
              <div className={`${styles.icon} ${styles[`icon_${item.kind}`]}`}>
                <Icon size={15} />
              </div>
              <div className={styles.body}>
                <div className={styles.naam}>{item.naam}</div>
                <div className={styles.meta}>{item.text}</div>
              </div>
              <div className={styles.time}>{relativeTime(item.timestamp)}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'nu'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} u`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
