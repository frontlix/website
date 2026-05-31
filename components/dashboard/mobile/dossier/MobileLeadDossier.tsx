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
import type { MobileDossierData } from './dossier-mappers'
import styles from './MobileLeadDossier.module.css'

type Tab = 'info' | 'offerte' | 'fotos' | 'activiteit'
const TABS: Array<{ k: Tab; l: string }> = [
  { k: 'info', l: 'Info' }, { k: 'offerte', l: 'Offerte' }, { k: 'fotos', l: "Foto's" }, { k: 'activiteit', l: 'Activiteit' },
]

export function MobileLeadDossier({ data }: { data: MobileDossierData }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')
  const { lead } = data

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <DossierHeader lead={lead} onBack={() => router.push('/leads')} />
        <DossierFactStrip facts={factStrip(lead)} />
        <DossierSurfaceStrip fase={data.surface.fase} message={data.surface.message} />
        <DossierTabs active={tab} tabs={TABS} onSelect={(k) => setTab(k as Tab)} />
        <div className={styles.tabBody}>
          {tab === 'info' && (
            <DossInfo
              lead={lead}
              contact={data.contact}
              dienst={data.dienst}
              bijzonderheden={data.bijzonderheden}
              vragen={data.vragen}
            />
          )}
          {tab === 'offerte' && <DossOfferte offerte={data.offerte} />}
          {tab === 'fotos' && <DossFotos fotos={data.fotos} />}
          {tab === 'activiteit' && <DossActiviteit activity={data.activity} />}
        </div>
      </div>
      <DossierActionBar
        // Bel + WhatsApp zijn veilige native intents.
        onCall={() => {
          if (data.telefoonRaw) window.location.href = `tel:${data.telefoonRaw}`
        }}
        onWhatsApp={() => {
          if (data.waTel) window.open(`https://wa.me/${data.waTel}`, '_blank', 'noopener')
        }}
        // Offerte VERSTUREN blijft de (handmatige, desktop) flow — hier tonen we
        // alleen de offerte-tab. Geen automatische send (sendOfferteMail).
        onSendOfferte={() => setTab('offerte')}
      />
    </div>
  )
}
