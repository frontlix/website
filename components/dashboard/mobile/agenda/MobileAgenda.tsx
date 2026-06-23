'use client'

import { useState } from 'react'
import { MobileDrilldownLayer } from '../drilldowns/MobileDrilldownLayer'
import { AgendaWeek } from './AgendaWeek'
import { FlowKlus } from './FlowKlus'
import { FlowPlaatsbezoek } from './FlowPlaatsbezoek'
import { FlowAfronden } from './FlowAfronden'
import { AgendaHerplanSheet } from './AgendaHerplanSheet'
import { AgendaAnnuleerSheet } from './AgendaAnnuleerSheet'
import { AgendaNewSheet } from './AgendaNewSheet'
import type { AgendaEvent, AgendaWeekDay } from './agenda-mock'
import styles from './MobileAgenda.module.css'

export type MobileAgendaData = {
  /** Echte afspraken van de week, gemapt naar AgendaEvent. */
  events: AgendaEvent[]
  /** Vandaag ('YYYY-MM-DD', Amsterdam). */
  todayDate: string
  /** Huidige tijd 'HH:MM' (Amsterdam). */
  nowTime: string
  /** 7 week-dagen voor de day-jump-strip. */
  weekDays: AgendaWeekDay[]
  /** Subtitle, bv. "Week 20 · 11 t/m 17 mei 2026". */
  weekLabel: string
  /** Maandag-key (YYYY-MM-DD) van de vorige week. */
  prevWeekKey: string
  /** Maandag-key (YYYY-MM-DD) van de volgende week. */
  nextWeekKey: string
  /** True als de getoonde week de huidige week is (→ "Vandaag" inactief). */
  isCurrentWeek: boolean
}

export function MobileAgenda({ data }: { data: MobileAgendaData }) {
  const [detail, setDetail] = useState<AgendaEvent | null>(null)
  const [herplan, setHerplan] = useState<AgendaEvent | null>(null)
  const [annuleer, setAnnuleer] = useState<AgendaEvent | null>(null)
  const [afronden, setAfronden] = useState<AgendaEvent | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const isKlus = detail?.kind === 'klus'
  const detailTitle = detail ? (isKlus ? 'Klus' : 'Plaatsbezoek') : ''

  return (
    <div className={styles.root}>
      <AgendaWeek
        events={data.events}
        todayDate={data.todayDate}
        nowTime={data.nowTime}
        weekDays={data.weekDays}
        weekLabel={data.weekLabel}
        prevWeekKey={data.prevWeekKey}
        nextWeekKey={data.nextWeekKey}
        isCurrentWeek={data.isCurrentWeek}
        onOpenEvent={(ev) => setDetail(ev)}
        onNew={() => setNewOpen(true)}
        onAfrondenLive={(ev) => setAfronden(ev)}
      />

      <MobileDrilldownLayer open={detail !== null} title={detailTitle} onClose={() => setDetail(null)}>
        {detail && isKlus && (
          <FlowKlus
            ev={detail}
            onHerplan={() => setHerplan(detail)}
            onAnnuleer={() => setAnnuleer(detail)}
            onAfronden={() => setAfronden(detail)}
          />
        )}
        {detail && !isKlus && (
          <FlowPlaatsbezoek
            ev={detail}
            onHerplan={() => setHerplan(detail)}
            onAnnuleer={() => setAnnuleer(detail)}
            onStartOfferte={() => { /* TODO functional pass */ }}
          />
        )}
      </MobileDrilldownLayer>

      {herplan && (
        <AgendaHerplanSheet
          ev={herplan}
          events={data.events}
          open
          onClose={() => setHerplan(null)}
          onConfirm={() => setHerplan(null)}
        />
      )}
      {annuleer && (
        <AgendaAnnuleerSheet
          ev={annuleer}
          open
          onClose={() => setAnnuleer(null)}
          onConfirm={() => { setAnnuleer(null); setDetail(null) }}
        />
      )}
      {afronden && (
        <FlowAfronden ev={afronden} open onClose={() => setAfronden(null)} onDone={() => { setAfronden(null); setDetail(null) }} />
      )}
      <AgendaNewSheet open={newOpen} onClose={() => setNewOpen(false)} onSave={() => setNewOpen(false)} />
    </div>
  )
}
