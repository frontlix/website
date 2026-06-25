'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DossierHeader } from './DossierHeader'
import { DossierFactStrip } from './DossierFactStrip'
import { DossierTabs } from './DossierTabs'
import { DossInfo } from './DossInfo'
import { DossFotos } from './DossFotos'
import { DossActiviteit } from './DossActiviteit'
import { DossNotities } from './DossNotities'
import { DossBeheer } from './DossBeheer'
import { DossierActionBar } from './DossierActionBar'
import { factStrip } from './dossier-helpers'
import type { MobileDossierData } from './dossier-mappers'
import { MobileOfferteEditor } from './offerte/MobileOfferteEditor'
import { MobileOfferteGoedkeuring } from './offerte/MobileOfferteGoedkeuring'
import { MobileOpdrachtbonActions } from './offerte/MobileOpdrachtbonActions'
import { LeadTagsRow } from '@/components/dashboard/v2/dossier/LeadTagsRow'
import { addNote, deleteNote, updateNote, setNoteTargets } from '@/lib/dashboard/note-actions'
import { archiveLead, unarchiveLead, markeerGeenEchteLead } from '@/lib/dashboard/lead-actions'
import type { Tag } from '@/lib/dashboard/database.types'
import type { Lead, Offerte, Prijsregel } from '@/lib/dashboard/database.types'
import type { ManualOffertePricing } from '@/lib/dashboard/pricing-types'
import styles from './MobileLeadDossier.module.css'

type Tab = 'info' | 'offerte' | 'fotos' | 'notities' | 'activiteit'
const TABS: Array<{ k: Tab; l: string }> = [
  { k: 'info', l: 'Info' }, { k: 'offerte', l: 'Offerte' }, { k: 'fotos', l: "Foto's" }, { k: 'notities', l: 'Notities' }, { k: 'activiteit', l: 'Activiteit' },
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
  leadTags,
  allTags,
  offerteForm,
  archived: archivedInitial = false,
}: {
  data: MobileDossierData
  leadTags: Tag[]
  allTags: Tag[]
  offerteForm: MobileOfferteFormProps
  /** Is deze lead gearchiveerd? Bepaalt de badge + terug-knop + beheeracties. */
  archived?: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('info')
  const { lead } = data
  const [, startNote] = useTransition()
  // Live archief-stand (optimistisch); start uit de server-prop. Bepaalt de
  // badge, waar de terug-knop heen gaat en de Beheer-knoppen.
  const [archived, setArchived] = useState(archivedInitial)
  const [beheerPending, startBeheer] = useTransition()
  // Brug naar de PDF-preview-overlay binnen de editor, zodat de sticky
  // actiebalk-knop "Bekijk PDF" dezelfde nette overlay opent (i.p.v. de
  // route-versie die mobiel slecht oogt).
  const pdfApiRef = useRef<{ openPdf: () => void } | null>(null)

  // Team-notities: zelfde server-actions als desktop (note-actions), met
  // optimistische refresh. revalidatePath('/leads/<id>') raakt ook dit pad.
  const voegNotitieToe = (tekst: string) => {
    startNote(async () => {
      const res = await addNote(data.leadId, tekst)
      if (res.ok) router.refresh()
      else window.alert(res.error || 'Toevoegen mislukt.')
    })
  }
  const verwijderNotitie = (id: string) => {
    startNote(async () => {
      const res = await deleteNote(id, data.leadId)
      if (res.ok) router.refresh()
      else window.alert(res.error || 'Verwijderen mislukt.')
    })
  }
  const bewerkNotitie = (id: string, tekst: string) => {
    startNote(async () => {
      const res = await updateNote(id, data.leadId, tekst)
      if (res.ok) router.refresh()
      else window.alert(res.error || 'Bewerken mislukt.')
    })
  }
  const zetNotitieTargets = (
    id: string,
    targets: { opAfspraak: boolean; opOpdrachtbon: boolean },
  ) => {
    startNote(async () => {
      const res = await setNoteTargets(id, data.leadId, targets)
      if (res.ok) router.refresh()
      else window.alert(res.error || 'Opslaan van de vinkjes mislukt.')
    })
  }

  // Lead-beheer: zelfde server-actions als desktop, optimistisch met rollback.
  const toggleArchief = () => {
    const next = !archived
    setArchived(next)
    startBeheer(async () => {
      const res = next ? await archiveLead(data.leadId) : await unarchiveLead(data.leadId)
      if (res.ok) router.refresh()
      else setArchived(!next)
    })
  }
  const markeerGeenEcht = () => {
    setArchived(true) // markeren archiveert ook
    startBeheer(async () => {
      const res = await markeerGeenEchteLead(data.leadId)
      if (res.ok) router.refresh()
      else setArchived(false)
    })
  }

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        {/* Terug naar de lijst waar deze lead leeft: gearchiveerd → het archief
            (?filter=archief, mobiel start-chip), anders de actieve lijst. */}
        <DossierHeader lead={lead} archived={archived} onBack={() => router.push(archived ? '/leads?filter=archief' : '/leads')} />
        <DossierFactStrip facts={factStrip(lead)} />
        <div className={styles.tagsRow}>
          <LeadTagsRow leadId={lead.id} leadTags={leadTags} allTags={allTags} live />
        </div>
        {data.offerte.terGoedkeuring ? (
          <MobileOfferteGoedkeuring
            leadId={data.leadId}
            dienst={data.offerte.terGoedkeuring.dienst}
            m2={data.offerte.terGoedkeuring.m2}
            totaal={data.offerte.terGoedkeuring.totaal}
            onAanpassen={() => setTab('offerte')}
          />
        ) : null}
        <DossierTabs active={tab} tabs={TABS} onSelect={(k) => setTab(k as Tab)} />
        <div className={styles.tabBody}>
          {tab === 'info' && (
            <>
              <DossInfo
                lead={lead}
                contact={data.contact}
                waTel={data.waTel}
                dienst={data.dienst}
                bijzonderheden={data.bijzonderheden}
              />
              <DossBeheer
                archived={archived}
                pending={beheerPending}
                onToggleArchief={toggleArchief}
                onGeenEcht={markeerGeenEcht}
              />
            </>
          )}
          {/* Offerte-tab: mobiele accordion-editor. Zelfde datamodel + rekenwerk
              + persistentie als de desktop-vorm, dus identieke totalen. De sticky
              actiebalk levert daarnaast de PDF-CTA. */}
          {tab === 'offerte' && (
            <>
              <MobileOfferteEditor {...offerteForm} pdfApiRef={pdfApiRef} />
              <MobileOpdrachtbonActions model={data.opdrachtbon} klantNaam={lead.naam} />
            </>
          )}
          {tab === 'fotos' && <DossFotos fotos={data.fotos} />}
          {tab === 'notities' && (
            <DossNotities
              notities={data.notes}
              onAdd={voegNotitieToe}
              onDelete={verwijderNotitie}
              onUpdate={bewerkNotitie}
              onSetTargets={zetNotitieTargets}
            />
          )}
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
            ? () => pdfApiRef.current?.openPdf()
            : () => setTab('offerte')
        }
      />
    </div>
  )
}
