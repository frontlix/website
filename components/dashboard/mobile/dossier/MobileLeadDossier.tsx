'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DossierHeader } from './DossierHeader'
import { DossierFactStrip } from './DossierFactStrip'
import { DossierTabs } from './DossierTabs'
import { DossInfo } from './DossInfo'
import { DossOfferteEdit } from './offerte/DossOfferteEdit'
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
  // Brug naar de offerte-editor: de actiebalk-knop "Controleer & stuur" opent
  // de PDF-preview die binnen DossOfferteEdit leeft (registreert openPdf hierin).
  const pdfApiRef = useRef<{ openPdf: () => void } | null>(null)

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <DossierHeader lead={lead} onBack={() => router.push('/leads')} />
        <DossierFactStrip facts={factStrip(lead)} />
        <DossierTabs active={tab} tabs={TABS} onSelect={(k) => setTab(k as Tab)} />
        <div className={styles.tabBody}>
          {tab === 'info' && (
            <DossInfo
              lead={lead}
              contact={data.contact}
              waTel={data.waTel}
              dienst={data.dienst}
              bijzonderheden={data.bijzonderheden}
              vragen={data.vragen}
            />
          )}
          {tab === 'offerte' && <DossOfferteEdit offerte={data.offerte} pdfApiRef={pdfApiRef} />}
          {tab === 'fotos' && <DossFotos fotos={data.fotos} />}
          {tab === 'activiteit' && <DossActiviteit activity={data.activity} />}
        </div>
      </div>
      <DossierActionBar
        // Bel + WhatsApp zijn veilige native intents.
        onCall={() => {
          if (data.telefoonRaw) window.location.href = `tel:${data.telefoonRaw}`
        }}
        // WhatsApp → het IN-APP gesprek met deze lead (inbox-thread), niet de
        // externe WhatsApp-app. Consistent met de leads-lijst (SwipeableLeadCard)
        // en het overzicht, zodat je vanuit het dossier direct verder kunt chatten.
        onWhatsApp={() => {
          router.push(`/inbox?lead=${lead.id}`)
        }}
        // Offerte VERSTUREN blijft de (handmatige, desktop) flow. Op de Offerte-tab
        // opent de knop de PDF-preview ("Controleer & stuur"); op andere tabs
        // springt-ie naar de Offerte-tab. Geen automatische send (sendOfferteMail).
        primaryLabel={tab === 'offerte' ? 'Controleer & stuur' : undefined}
        onSendOfferte={
          tab === 'offerte' ? () => pdfApiRef.current?.openPdf() : () => setTab('offerte')
        }
      />
    </div>
  )
}
