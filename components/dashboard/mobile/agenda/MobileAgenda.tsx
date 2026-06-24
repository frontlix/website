'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MobileDrilldownLayer } from '../drilldowns/MobileDrilldownLayer'
import { AgendaWeek } from './AgendaWeek'
import { FlowKlus } from './FlowKlus'
import { FlowPlaatsbezoek } from './FlowPlaatsbezoek'
import { FlowEigen } from './FlowEigen'
import { FlowAfronden } from './FlowAfronden'
import { AgendaHerplanSheet } from './AgendaHerplanSheet'
import { AgendaAnnuleerSheet } from './AgendaAnnuleerSheet'
import { AgendaNewSheet, type NieuweAfspraakInput } from './AgendaNewSheet'
import { bookAppointment } from '@/lib/dashboard/agenda-actions'
import type { KlantOptie } from '@/components/dashboard/v2/agenda/KlantSelect'
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
  /** Bestaande leads voor de klant-keuze in "Nieuwe afspraak". */
  klanten: KlantOptie[]
}

export function MobileAgenda({ data }: { data: MobileAgendaData }) {
  const router = useRouter()
  const [detail, setDetail] = useState<AgendaEvent | null>(null)
  const [herplan, setHerplan] = useState<AgendaEvent | null>(null)
  const [annuleer, setAnnuleer] = useState<AgendaEvent | null>(null)
  const [afronden, setAfronden] = useState<AgendaEvent | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [boeken, startBoeken] = useTransition()

  // Nieuwe afspraak echt boeken via de bot (zelfde server-action als desktop).
  // Sluit + ververst bij succes; toont de fout bij mislukking.
  const boekAfspraak = (a: NieuweAfspraakInput) => {
    startBoeken(async () => {
      const res = await bookAppointment(a.leadId, a.datum, a.tijd, {
        notifyWhatsapp: a.notifyWhatsapp,
        notifyEmail: a.notifyEmail,
      })
      if (res.ok) {
        setNewOpen(false)
        router.refresh()
      } else {
        window.alert(res.error || 'Afspraak boeken mislukt.')
      }
    })
  }

  const isKlus = detail?.kind === 'klus'
  // Externe (lead-loze) Google-afspraken (kind 'eigen') zijn READ-ONLY: ze
  // krijgen een eigen detail zonder lead-acties, en mogen nooit in de
  // afrond-/herplan-/annuleer-flows belanden (die sturen anders een verkeerde
  // leadId naar de bot).
  const isEigen = detail?.kind === 'eigen'
  const detailTitle = detail ? (isKlus ? 'Klus' : isEigen ? 'Eigen afspraak' : 'Plaatsbezoek') : ''

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
        {detail && isEigen && <FlowEigen ev={detail} />}
        {detail && !isKlus && !isEigen && (
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
      <AgendaNewSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        klanten={data.klanten}
        busy={boeken}
        onSave={boekAfspraak}
      />
    </div>
  )
}
