import Link from 'next/link'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import type { ConversationPreview } from '@/lib/dashboard/inbox-queries'
import styles from './ConversationsList.module.css'

/**
 * Linkerkolom van Inbox — lijst van actieve gesprekken.
 * Geselecteerd gesprek krijgt active-state highlight.
 */
export function ConversationsList({
  conversations,
  selectedLeadId,
}: {
  conversations: ConversationPreview[]
  selectedLeadId: string | null
}) {
  if (conversations.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>Geen actieve gesprekken</div>
        <div className={styles.emptySub}>
          Zodra een lead via WhatsApp reageert verschijnt het hier.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {conversations.map((c) => (
        <Link
          key={c.leadId}
          href={`/inbox?lead=${c.leadId}`}
          className={`${styles.item} ${selectedLeadId === c.leadId ? styles.itemActive : ''}`}
        >
          <Avatar name={c.naam} size="md" />
          <div className={styles.itemBody}>
            <div className={styles.itemHead}>
              <span className={styles.naam}>{c.naam}</span>
              <span className={styles.time}>
                {formatTime(c.laatsteBericht.timestamp)}
              </span>
            </div>
            <div className={styles.preview}>
              {c.laatsteBericht.richting === 'uitgaand' && (
                <span className={styles.bullet}>Jij: </span>
              )}
              {previewText(c.laatsteBericht.tekst, c.laatsteBericht.type)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function previewText(text: string | null, type: string): string {
  if (text) return text
  // Berichten zonder tekst zijn typisch media-only — toon type-hint.
  if (type === 'image' || type === 'foto') return '📷 Foto'
  if (type === 'audio') return '🎤 Spraakbericht'
  if (type === 'document') return '📄 Document'
  return `[${type}]`
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const today =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (today) {
    return date.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays < 7) {
    return date.toLocaleDateString('nl-NL', { weekday: 'short' })
  }

  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
