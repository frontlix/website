'use client'

import { Briefcase, Pause, Play } from 'lucide-react'
import type { Lead, GesprekFase } from '@/lib/dashboard/database.types'
import { useBotAction } from '@/components/dashboard/bot-actions/use-bot-action'
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
  onderhandelen:      'Onderhandelt, owner-aandacht mogelijk nodig',
  datum_kiezen:       'Klant kiest een afspraak-moment',
  afspraak_bevestigd: 'Wacht op afronding van de klus',
}

/**
 * Bot-status strip, toont wat Surface doet + een toggle om de bot te
 * pauzeren / hervatten. Wanneer gepauzeerd negeert de bot inkomende WhatsApp-
 * berichten voor deze lead en mag de owner zelf antwoorden via de composer.
 */
export function LeadBotStatus({ lead }: { lead: Lead }) {
  const fase = lead.gesprek_fase
  const faseLabel = FASE_LABELS[fase] ?? 'Actief'
  const description = FASE_DESCRIPTIONS[fase] ?? 'In gesprek met klant'
  const paused = lead.bot_gepauzeerd

  const { run, pending, error } = useBotAction(
    `/api/dashboard/lead/${lead.lead_id}/bot-pauzeren`,
  )

  const onToggle = () => {
    run({ paused: !paused })
  }

  return (
    <div className={styles.strip}>
      <div className={styles.left}>
        <Briefcase size={15} className={styles.icon} />
        <span className={styles.surfaceLabel}>Surface:</span>
        <span className={styles.description}>
          {paused ? 'Gepauzeerd, owner antwoordt handmatig' : description}
        </span>
        {error && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', marginLeft: 8 }}>{error}</span>}
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
        <button
          type="button"
          className={styles.pauseBtn}
          onClick={onToggle}
          disabled={pending}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          <span>{pending ? 'Bezig…' : paused ? 'Bot hervatten' : 'Bot pauzeren'}</span>
        </button>
      </div>
    </div>
  )
}
