'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DossierHeader } from './DossierHeader'
import { DossierFactStrip } from './DossierFactStrip'
import { DossierSurfaceStrip } from './DossierSurfaceStrip'
import { DossierTabs } from './DossierTabs'
import { DossInfo } from './DossInfo'
import { DossOfferte } from './DossOfferte'
import { DossFotos } from './DossFotos'
import { DossActiviteit } from './DossActiviteit'
import { DossierActionBar } from './DossierActionBar'
import { factStrip } from './dossier-helpers'
import { DOSS, DOSS_LEAD } from './dossier-mock'
import styles from './MobileLeadDossier.module.css'

type Tab = 'info' | 'offerte' | 'fotos' | 'activiteit'
const TABS: Array<{ k: Tab; l: string }> = [
  { k: 'info', l: 'Info' }, { k: 'offerte', l: 'Offerte' }, { k: 'fotos', l: "Foto's" }, { k: 'activiteit', l: 'Activiteit' },
]

export function MobileLeadDossier() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')
  const lead = DOSS_LEAD // v1 mock — wire getLeadDetail in functional pass

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <DossierHeader lead={lead} onBack={() => router.push('/leads')} />
        <DossierFactStrip facts={factStrip(lead)} />
        <DossierSurfaceStrip fase={DOSS.fase} message={DOSS.surface} />
        <DossierTabs active={tab} tabs={TABS} onSelect={(k) => setTab(k as Tab)} />
        <div className={styles.tabBody}>
          {tab === 'info' && <DossInfo lead={lead} />}
          {tab === 'offerte' && <DossOfferte />}
          {tab === 'fotos' && <DossFotos fotos={lead.fotos} />}
          {tab === 'activiteit' && <DossActiviteit />}
        </div>
      </div>
      <DossierActionBar />
    </div>
  )
}
