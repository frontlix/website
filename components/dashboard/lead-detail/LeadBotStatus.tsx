import { Bot } from 'lucide-react'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { Lead, GesprekFase } from '@/lib/dashboard/database.types'
import styles from './LeadBotStatus.module.css'

const FASE_LABELS: Record<GesprekFase, string> = {
  info_verzamelen:    'Verzamelt info',
  offerte_besproken:  'Offerte verstuurd',
  onderhandelen:      'Owner-review',
  datum_kiezen:       'Datum kiezen',
  afspraak_bevestigd: 'Afspraak bevestigd',
}

const FASE_DESCRIPTIONS: Record<GesprekFase, string> = {
  info_verzamelen:    'Stelt vragen over m², dienst en planten',
  offerte_besproken:  'Wacht op klant-reactie op offerte',
  onderhandelen:      'Onderhandelt — owner-aandacht mogelijk nodig',
  datum_kiezen:       'Klant kiest een afspraak-moment',
  afspraak_bevestigd: 'Wacht op afronding van de klus',
}

/**
 * Bot-status strip — sticky-balk onder de lead-header die in één
 * regel laat zien wat Surface op dit moment 'denkt' te doen.
 * Maakt zichtbaar dat de bot autonoom werkt + welke fase het is.
 */
export function LeadBotStatus({ lead }: { lead: Lead }) {
  const fase = lead.gesprek_fase
  const label = FASE_LABELS[fase] ?? 'Actief'
  const description = FASE_DESCRIPTIONS[fase] ?? 'In gesprek met klant'

  return (
    <div className={styles.strip}>
      <div className={styles.left}>
        <Bot size={16} className={styles.botIcon} />
        <span className={styles.surfaceLabel}>Surface:</span>
        <span className={styles.description}>{description}</span>
      </div>
      <div className={styles.right}>
        <Pill tone="blue">Fase: {label}</Pill>
        <span className={styles.leadId}>L-{lead.lead_id.slice(-4).toUpperCase()}</span>
        <button type="button" className={styles.pauseBtn} disabled>
          Pauzeren
        </button>
      </div>
    </div>
  )
}
