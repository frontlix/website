'use client'

import { type ConversationPreview } from '@/lib/dashboard/inbox-queries'
import { shortTimeAgo } from '@/lib/dashboard/relative-time'
import { getAvatarColor } from '@/components/dashboard/mobile/shared/avatar-color'
import styles from './InboxRow.module.css'

interface InboxRowProps {
  convo: ConversationPreview
}

/** Initialen uit naam — maximaal 2 letters. */
function initials(naam: string): string {
  return naam
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * Bepaalt of het laatste bericht ongelezen is.
 * Ongelezen als: richting is inkomend EN (nooit gezien OF timestamp > gelezen-op).
 */
function isUnread(convo: ConversationPreview): boolean {
  if (convo.laatsteBericht.richting !== 'inkomend') return false
  if (convo.inboxGelezenOp === null) return true
  return convo.laatsteBericht.timestamp > convo.inboxGelezenOp
}

/**
 * Enkelvoudige rij in de inbox-lijst. Geen swipe hier — dat doet
 * SwipeableInboxRow als wrapper. Toont avatar (initialen, 40px),
 * naam, timestamp, preview-tekst en optionele unread-badge.
 */
export function InboxRow({ convo }: InboxRowProps) {
  const unread = isUnread(convo)
  const isSurface = convo.laatsteBericht.richting === 'uitgaand'

  return (
    <div className={styles.row}>
      {/* Avatar met initialen — kleur per naam (gedeeld met de Leads-kaarten) */}
      <div
        className={styles.avatar}
        style={{ background: getAvatarColor(convo.naam) }}
        aria-hidden="true"
      >
        {initials(convo.naam)}
      </div>

      <div className={styles.content}>
        {/* Bovenste rij: naam + timestamp */}
        <div className={styles.topRow}>
          <span className={`${styles.naam} ${unread ? styles.naamUnread : ''}`}>
            {convo.naam}
          </span>
          <span className={`${styles.time} ${unread ? styles.timeUnread : ''}`}>
            {shortTimeAgo(convo.laatsteBericht.timestamp)}
          </span>
        </div>

        {/* Onderste rij: prefix + preview + unread badge */}
        <div className={styles.bottomRow}>
          {/* Sparkle-prefix als het laatste bericht van Surface/uitgaand is */}
          {isSurface && (
            <span className={styles.surfacePrefix} aria-hidden="true">
              {/* Klein blauw gradient spark-icoontje */}
              <svg width="7" height="7" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </span>
          )}

          <span
            className={`${styles.preview} ${unread ? styles.previewUnread : ''}`}
            aria-label={`Laatste bericht: ${convo.laatsteBericht.tekst ?? ''}`}
          >
            {convo.laatsteBericht.tekst ?? ''}
          </span>

          {/* Unread badge */}
          {unread && (
            <span className={styles.unreadBadge} aria-label="Ongelezen">
              1
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
