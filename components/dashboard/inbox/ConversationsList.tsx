import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { ConversationPreview } from '@/lib/dashboard/inbox-queries'
import { formatEuro, gesprekFaseLabel } from '@/lib/dashboard/format'
import type { Lead, GesprekFase } from '@/lib/dashboard/database.types'
import styles from './ConversationsList.module.css'

/**
 * Linkerkolom van Inbox — lijst van actieve gesprekken.
 * Toont per rij: avatar, naam + tijd, preview van laatste bericht,
 * status-pill + optionele actie-/prijs-pill. Geselecteerd item krijgt
 * een primary border-accent links.
 */
export function ConversationsList({
  conversations,
  selectedLeadId,
  preservedQuery = '',
}: {
  conversations: ConversationPreview[]
  selectedLeadId: string | null
  /**
   * URL-query-string (zonder ?) die behouden moet blijven wanneer de
   * gebruiker een gesprek aanklikt — bv. "filter=action&q=jansen".
   * Zonder dit zou een klik de actieve filter-tab resetten naar Alles.
   */
  preservedQuery?: string
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

  const buildHref = (leadId: string) => {
    const params = new URLSearchParams(preservedQuery)
    params.set('lead', leadId)
    return `/inbox?${params.toString()}`
  }

  return (
    <div className={styles.list}>
      {conversations.map((c) => (
        <Link
          key={c.leadId}
          href={buildHref(c.leadId)}
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
            <div className={styles.pills}>
              <Pill tone={faseTone(c.gesprekFase)} dot>
                {faseLabel(c.gesprekFase, c.dashboardStatus)}
              </Pill>
              {c.needsAction && (
                <Pill tone="amber">
                  <AlertTriangle size={10} style={{ verticalAlign: '-1px', marginRight: 2 }} />
                  Actie
                </Pill>
              )}
              {c.totaalPrijs && c.totaalPrijs > 0 && (
                <Pill tone="gray">{formatEuro(c.totaalPrijs)}</Pill>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function previewText(text: string | null, type: string): string {
  if (text) return text
  if (type === 'image' || type === 'foto') return '📷 Foto'
  if (type === 'audio') return '🎤 Spraakbericht'
  if (type === 'document') return '📄 Document'
  return `[${type}]`
}

/**
 * Status-label valt terug op dashboard_status (open/afgehandeld) wanneer
 * de gesprek_fase nog niet bepalend is — anders prefereren we de
 * fase-label want die zegt meer over "waar zit het gesprek nu".
 */
function faseLabel(fase: GesprekFase | null, status: Lead['dashboard_status']): string {
  if (status === 'afgehandeld') return 'Afgerond'
  if (status === 'geen_interesse') return 'Afgewezen'
  if (status === 'no_show') return 'No-show'
  if (!fase) return 'Nieuw'
  switch (fase) {
    case 'offerte_besproken':  return 'Offerte verstuurd'
    case 'onderhandelen':      return 'In review'
    case 'afspraak_bevestigd': return 'Goedgekeurd'
    default:                   return gesprekFaseLabel(fase)
  }
}

function faseTone(fase: GesprekFase | null): 'blue' | 'amber' | 'green' | 'gray' {
  switch (fase) {
    case 'info_verzamelen':    return 'blue'
    case 'offerte_besproken':  return 'amber'
    case 'onderhandelen':      return 'amber'
    case 'datum_kiezen':       return 'green'
    case 'afspraak_bevestigd': return 'green'
    default:                   return 'gray'
  }
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
