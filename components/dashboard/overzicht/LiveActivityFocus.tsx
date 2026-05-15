import Link from 'next/link'
import { X } from 'lucide-react'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { LiveActivityFeed, type ActivityItem } from './LiveActivityFeed'
import styles from './LiveActivityFocus.module.css'

/**
 * Focus-modus: alleen de Live-activiteit feed in beeld, full-width.
 * Activeer via "?focus=live" op /dashboard. "Sluit focus-modus" gaat
 * terug naar /dashboard (dropt alle params).
 */
export function LiveActivityFocus({
  chatbotName,
  items,
}: {
  chatbotName: string
  items: ActivityItem[]
}) {
  const tijd = new Date().toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.title}>
          <LiveDot />
          <span className={styles.titleText}>
            {chatbotName} — live feed
          </span>
          <span className={styles.titleSep}>·</span>
          <span className={styles.titleTime}>{tijd}</span>
        </div>
        <Link href="/dashboard" className={styles.closeBtn} scroll={false}>
          <X size={14} />
          <span>Sluit focus-modus</span>
        </Link>
      </div>

      <div className={styles.feedWrap}>
        <LiveActivityFeed items={items} />
      </div>
    </div>
  )
}
