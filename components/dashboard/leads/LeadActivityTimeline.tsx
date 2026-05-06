import {
  MessageSquare,
  Image as ImageIcon,
  FileText,
  StickyNote,
  GitCommit,
  CheckCircle,
  Calendar,
  UserPlus,
} from 'lucide-react'
import type { ActivityEvent, ActivityType } from '@/lib/dashboard/lead-queries'
import { formatRelative, formatDateTimeNL } from '@/lib/dashboard/format'
import styles from './LeadActivityTimeline.module.css'

const ICON_MAP: Record<ActivityType, React.ComponentType<{ size?: number }>> = {
  lead_aangemaakt: UserPlus,
  bericht_in: MessageSquare,
  bericht_uit: MessageSquare,
  foto_geupload: ImageIcon,
  offerte_verstuurd: FileText,
  notitie_toegevoegd: StickyNote,
  status_gewijzigd: GitCommit,
  akkoord: CheckCircle,
  afspraak_geboekt: Calendar,
}

export function LeadActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className={styles.empty}>Geen activiteit vastgelegd.</p>
  }

  return (
    <ol className={styles.timeline}>
      {events.map((event) => {
        const Icon = ICON_MAP[event.type]
        return (
          <li key={event.id} className={styles.event}>
            <div className={`${styles.iconWrap} ${styles[event.type]}`}>
              <Icon size={14} />
            </div>
            <div className={styles.body}>
              <div className={styles.headRow}>
                <span className={styles.label}>{event.label}</span>
                <time className={styles.time} dateTime={event.timestamp} title={formatDateTimeNL(event.timestamp)}>
                  {formatRelative(event.timestamp)}
                </time>
              </div>
              {event.details && <p className={styles.details}>{event.details}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
