'use client'

// AgendaEventRow, medium-density afspraak-rij.
// Port van ABShared.jsx `ABEventRow` (default/medium density).
// Tijd-kolom + 3px kleur-rail (--tone via color-mix) + content (type-badge,
// m², "Bezig"-badge bij now, naam, adres met pin) + chevron.
// data-state: now → getinte achtergrond, done → 0.55 opacity + line-through.

import { ChevronRight, MapPin } from 'lucide-react'
import type { AgendaEvent } from './agenda-mock'
import { eventTone } from './agenda-mobile-helpers'
import styles from './AgendaEventRow.module.css'

// Kind → leesbaar badge-label (kind komt lowercase uit de mock).
const KIND_LABEL: Record<AgendaEvent['kind'], string> = {
  plaatsbezoek: 'Plaatsbezoek',
  klus: 'Klus',
  bel: 'Bel',
  eigen: 'Eigen',
}

interface AgendaEventRowProps {
  ev: AgendaEvent
  state: 'now' | 'idle' | 'done'
  /** Laatste rij in de groep → geen onderrand. */
  last?: boolean
  onClick?: () => void
}

export function AgendaEventRow({ ev, state, last, onClick }: AgendaEventRowProps) {
  const isNow = state === 'now'

  return (
    <div
      className={styles.row}
      data-state={state}
      data-last={last ? 'true' : undefined}
      // Per-event tint stroomt via --tone (kind → token, zie eventTone).
      style={{ '--tone': eventTone(ev.kind) } as React.CSSProperties}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {/* Tijd-kolom */}
      <div className={styles.timeCol}>
        <span className={styles.timeStart}>{ev.start}</span>
        <span className={styles.timeEnd}>{ev.end}</span>
      </div>

      {/* Kleur-rail */}
      <span className={styles.rail} aria-hidden="true" />

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.badges}>
          <span className={styles.kindBadge}>{KIND_LABEL[ev.kind]}</span>
          {ev.m2 != null && <span className={styles.m2}>{ev.m2}m²</span>}
          {isNow && (
            <span className={styles.bezig}>
              <span className={styles.bezigDot} aria-hidden="true" />
              Bezig
            </span>
          )}
        </div>
        <p className={styles.naam}>{ev.naam}</p>
        <p className={styles.adres}>
          <MapPin size={10} aria-hidden="true" />
          <span className={styles.adresText}>{ev.adres}</span>
        </p>
      </div>

      <ChevronRight size={14} className={styles.chevron} aria-hidden="true" />
    </div>
  )
}
