import {
  MessageSquare,
  MessageCircle,
  Image as ImageIcon,
  FileText,
  StickyNote,
  ArrowRightCircle,
  Check,
  Calendar,
  Plus,
} from 'lucide-react'
import type { ActivityEvent, ActivityType } from '@/lib/dashboard/lead-queries'
import { formatRelative } from '@/lib/dashboard/format'
import styles from './LeadActivityTimeline.module.css'

const TYPE_ICON: Record<ActivityType, React.ReactElement> = {
  bericht_in: <MessageSquare size={14} />,
  bericht_uit: <MessageCircle size={14} />,
  foto_geupload: <ImageIcon size={14} />,
  offerte_verstuurd: <FileText size={14} />,
  notitie_toegevoegd: <StickyNote size={14} />,
  status_gewijzigd: <ArrowRightCircle size={14} />,
  akkoord: <Check size={14} />,
  afspraak_geboekt: <Calendar size={14} />,
  lead_aangemaakt: <Plus size={14} />,
}

const TYPE_DOT_CLASS: Record<ActivityType, string> = {
  bericht_in: styles.dotPrimary,
  bericht_uit: styles.dotAccent,
  foto_geupload: styles.dotAccent,
  offerte_verstuurd: styles.dotPrimary,
  notitie_toegevoegd: styles.dotMuted,
  status_gewijzigd: styles.dotPrimary,
  akkoord: styles.dotPrimary,
  afspraak_geboekt: styles.dotPrimary,
  lead_aangemaakt: styles.dotMuted,
}

export function LeadActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className={styles.empty}>Nog geen activiteit.</p>
  }
  return (
    <ol className={styles.timeline}>
      {events.map((e) => (
        <li key={e.id} className={styles.event}>
          <span
            className={`${styles.dot} ${TYPE_DOT_CLASS[e.type]}`}
            aria-hidden="true"
          >
            {TYPE_ICON[e.type]}
          </span>
          <div className={styles.body}>
            <div className={styles.label}>{e.label}</div>
            {e.details && <div className={styles.details}>{e.details}</div>}
            <time className={styles.time} dateTime={e.timestamp}>
              {formatRelative(e.timestamp)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
