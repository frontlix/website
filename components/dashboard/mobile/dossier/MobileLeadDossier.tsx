'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DossierHeader } from './DossierHeader'
import { DossierFactStrip } from './DossierFactStrip'
import { DossierTabs } from './DossierTabs'
import { DossInfo } from './DossInfo'
import { DossFotos } from './DossFotos'
import { DossActiviteit } from './DossActiviteit'
import { DossierActionBar } from './DossierActionBar'
import { factStrip } from './dossier-helpers'
import type { MobileDossierData } from './dossier-mappers'
import { MobileOfferteEditor } from './offerte/MobileOfferteEditor'
import type { Lead, Offerte, Prijsregel } from '@/lib/dashboard/database.types'
import type { ManualOffertePricing } from '@/lib/dashboard/pricing-types'
import styles from './MobileLeadDossier.module.css'

type Tab = 'info' | 'offerte' | 'fotos' | 'activiteit'
const TABS: Array<{ k: Tab; l: string }> = [
  { k: 'info', l: 'Info' }, { k: 'offerte', l: 'Offerte' }, { k: 'fotos', l: "Foto's" }, { k: 'activiteit', l: 'Activiteit' },
]

/** Props voor het ingebedde desktop-offerte-formulier op mobiel. */
export type MobileOfferteFormProps = {
  leadId: string
  lead: Lead
  prijsregels: Prijsregel[]
  offertes: Offerte[]
  fotosCount: number
  pricing: ManualOffertePricing
}

export function MobileLeadDossier({
  data,
  offerteForm,
}: {
  data: MobileDossierData
  offerteForm: MobileOfferteFormProps
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')
  const { lead } = data

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
          {/* Offerte-tab: mobiele accordion-editor. Zelfde datamodel + rekenwerk
              + persistentie als de desktop-vorm, dus identieke totalen. De sticky
              actiebalk levert daarnaast de PDF-CTA. */}
          {tab === 'offerte' && <MobileOfferteEditor {...offerteForm} />}
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
        // externe WhatsApp-app. Consistent met de leads-lijst en het overzicht.
        onWhatsApp={() => {
          router.push(`/inbox?lead=${lead.id}`)
        }}
        // Op de Offerte-tab opent de knop de PDF-preview (review-stap). Het
        // formulier slaat zelf al automatisch op; versturen blijft de desktop-flow.
        // Op andere tabs springt-ie naar de Offerte-tab.
        primaryLabel={tab === 'offerte' ? 'Bekijk PDF' : undefined}
        onSendOfferte={
          tab === 'offerte'
            ? () =>
                window.open(
                  `/offerte-preview/${offerteForm.leadId}`,
                  '_blank',
                  'noopener,noreferrer',
                )
            : () => setTab('offerte')
        }
      />
    </div>
  )
}
