import { Briefcase, Pause } from 'lucide-react'
import type { Lead, GesprekFase } from '@/lib/dashboard/database.types'
import styles from './LeadBotStatus.module.css'

const FASE_LABELS: Record<GesprekFase, string> = {
  info_verzamelen:    'Info verzamelen',
  offerte_besproken:  'Offerte verstuurd',
  onderhandelen:      'Owner-review',
  datum_kiezen:       'Datum kiezen',
  afspraak_bevestigd: 'Afspraak bevestigd',
}

const FASE_DESCRIPTIONS: Record<GesprekFase, string> = {
  info_verzamelen:    'Vraagt om bevestiging m²',
  offerte_besproken:  'Wacht op klant-reactie op offerte',
  onderhandelen:      'Onderhandelt — owner-aandacht mogelijk nodig',
  datum_kiezen:       'Klant kiest een afspraak-moment',
  afspraak_bevestigd: 'Wacht op afronding van de klus',
}

/**
 * Bot-status strip — schone neutrale balk onder de lead-header. Toont in
 * één regel wat Surface doet, in welke fase, en het Lead-ID. Rechts een
 * "Bot pauzeren" knop voor handmatige overname.
 */
export function LeadBotStatus({ lead }: { lead: Lead }) {
  const fase = lead.gesprek_fase
  const faseLabel = FASE_LABELS[fase] ?? 'Actief'
  const description = FASE_DESCRIPTIONS[fase] ?? 'In gesprek met klant'

  return (
    <div className={styles.strip}>
      <div className={styles.left}>
        <Briefcase size={15} className={styles.icon} />
        <span className={styles.surfaceLabel}>Surface:</span>
        <span className={styles.description}>{description}</span>
      </div>
      <div className={styles.right}>
        <span className={styles.metaPair}>
          <span className={styles.metaLabel}>Fase:</span>
          <span className={styles.metaValue}>{faseLabel}</span>
        </span>
        <span className={styles.metaPair}>
          <span className={styles.metaLabel}>Lead-ID:</span>
          <span className={styles.metaValue}>L-{lead.lead_id.slice(-4).toUpperCase()}</span>
        </span>
        <button type="button" className={styles.pauseBtn} disabled>
          <Pause size={13} />
          <span>Bot pauzeren</span>
        </button>
      </div>
    </div>
  )
}
