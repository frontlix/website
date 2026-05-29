'use client'

import { useState } from 'react'
import { MobileDrilldownLayer } from '../drilldowns/MobileDrilldownLayer'
import { AgendaWeek } from './AgendaWeek'
import { FlowKlus } from './FlowKlus'
import { FlowPlaatsbezoek } from './FlowPlaatsbezoek'
import { FlowAfronden } from './FlowAfronden'
import { AgendaHerplanSheet } from './AgendaHerplanSheet'
import { AgendaNewSheet } from './AgendaNewSheet'
import { AG_EVENTS } from './agenda-mock'
import type { AgendaEvent } from './agenda-mock'
import styles from './MobileAgenda.module.css'

export function MobileAgenda() {
  const [detail, setDetail] = useState<AgendaEvent | null>(null)
  const [herplan, setHerplan] = useState<AgendaEvent | null>(null)
  const [afronden, setAfronden] = useState<AgendaEvent | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const isKlus = detail?.kind === 'klus'
  const detailTitle = detail ? (isKlus ? 'Klus' : 'Plaatsbezoek') : ''

  return (
    <div className={styles.root}>
      <AgendaWeek
        events={AG_EVENTS}
        onOpenEvent={(ev) => setDetail(ev)}
        onNew={() => setNewOpen(true)}
        onAfrondenLive={(ev) => setAfronden(ev)}
      />

      <MobileDrilldownLayer open={detail !== null} title={detailTitle} onClose={() => setDetail(null)}>
        {detail && isKlus && (
          <FlowKlus ev={detail} onHerplan={() => setHerplan(detail)} onAfronden={() => setAfronden(detail)} />
        )}
        {detail && !isKlus && (
          <FlowPlaatsbezoek ev={detail} onHerplan={() => setHerplan(detail)} onStartOfferte={() => { /* TODO functional pass */ }} />
        )}
      </MobileDrilldownLayer>

      {herplan && <AgendaHerplanSheet ev={herplan} open onClose={() => setHerplan(null)} onConfirm={() => setHerplan(null)} />}
      {afronden && (
        <FlowAfronden ev={afronden} open onClose={() => setAfronden(null)} onDone={() => { setAfronden(null); setDetail(null) }} />
      )}
      <AgendaNewSheet open={newOpen} onClose={() => setNewOpen(false)} onSave={() => setNewOpen(false)} />
    </div>
  )
}
