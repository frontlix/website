'use client'

// FlowEigen, READ-ONLY detail voor een externe (lead-loze) Google-afspraak
// (kind 'eigen'). Gerenderd als CONTENT binnen MobileDrilldownLayer; de layer
// levert de header (terug + titel). Bewust GEEN lead-acties (afronden /
// verzetten / annuleren) en GEEN lead-link: er is geen lead om een actie op af
// te vuren. Toont alleen de naam, tijd en de bron (Google Agenda).

import { Calendar } from 'lucide-react'
import { FHero, FDetailCard } from './FlowAtoms'
import { type AgendaEvent } from './agenda-mock'
import { eventTone } from './agenda-mobile-helpers'
import styles from './FlowEigen.module.css'

type FlowEigenProps = {
  ev: AgendaEvent
}

export function FlowEigen({ ev }: FlowEigenProps) {
  return (
    // --tone draagt de event-kleur (eigen → muted) door naar de hero.
    <div className={styles.root} style={{ '--tone': eventTone(ev.kind) } as React.CSSProperties}>
      <FHero ev={ev} kindLabel="Eigen afspraak" />

      <FDetailCard icon="clock" title="Uit je Google Agenda">
        <p className={styles.note}>
          <Calendar size={14} className={styles.noteIcon} aria-hidden="true" />
          Deze afspraak staat rechtstreeks in je Google Agenda en hangt niet aan een lead. Je kunt
          hem hier alleen bekijken, beheren doe je in Google Agenda.
        </p>
      </FDetailCard>
    </div>
  )
}
