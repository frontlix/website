'use client'

/**
 * LeadOfferte — orchestrator van de Offerte-tab in lead-detail.
 *
 * Combineert:
 *  - OfferteHeader (versie-badge, save-state, PDF-knoppen)
 *  - LeadContextChips (readonly chips uit lead-velden)
 *  - OfferteRegelsTable (inline-bewerkbare regels — auto + handmatig)
 *  - OfferteSidebar (totalen + korting + verzendopties)
 *
 * Fase 1: lokale state, geen DB-persist. Sidebar-aanpassingen muteren
 * UI-state maar worden nog niet teruggeschreven. Fase 2 voegt
 * debounced auto-save toe.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead, Offerte, Prijsregel } from '@/lib/dashboard/database.types'
import { berekenTotalen } from '@/lib/dashboard/btw-calc'
import { LeadContextChips } from './LeadContextChips'
import { OfferteHeader } from './OfferteHeader'
import OfferteRegelsTable, { type RegelEdit } from './OfferteRegelsTable'
import { OfferteSidebar } from './OfferteSidebar'
import type { VerzendOpties } from './VerzendoptiesKaart'
import styles from './LeadOfferte.module.css'

type Props = {
  leadId: string
  offertes: Offerte[]
  prijsregels: Prijsregel[]
  lead: Lead
  /** Aantal foto's bij deze lead — toont "Foto's meesturen (n)" in verzendopties. */
  fotosCount?: number
}

/** Parse decimaal-string (komma of punt) naar number; ongeldig → 0. */
function parseDecimal(input: string | null | undefined): number {
  if (!input) return 0
  const n = Number.parseFloat(String(input).replace(',', '.').trim())
  return Number.isFinite(n) ? n : 0
}

/** Bereken ISO-date string n dagen vanaf basis (default vandaag). */
function addDays(basis: string | null, dagen: number): string {
  const d = basis ? new Date(basis) : new Date()
  d.setDate(d.getDate() + dagen)
  return d.toISOString()
}

export function LeadOfferte({
  leadId: _leadId,
  offertes,
  prijsregels,
  lead,
  fotosCount = 0,
}: Props) {
  const router = useRouter()

  // Huidige offerte = laatste versie (offertes komt DESC binnen)
  const huidige: Offerte | undefined = offertes[0]
  const verstuurd = Boolean(lead.offerte_verstuurd)
  const versie = huidige?.versie ?? 1

  // ─── Lokale UI-state ───────────────────────────────────────
  const [regels, setRegels] = useState<RegelEdit[]>([])
  const [kortingPct, setKortingPct] = useState<number>(
    Number(lead.korting_percentage ?? 0),
  )
  const [kortingOmschrijving, setKortingOmschrijving] = useState<string>(
    lead.korting_omschrijving ?? '',
  )
  const [verzendOpties, setVerzendOpties] = useState<VerzendOpties>({
    geldigheidDagen: lead.offerte_geldigheid_dagen ?? 30,
    metGarantie: true,
    metVoorwaarden: true,
    metFotos: fotosCount > 0,
  })

  // ─── Computed: totalen ──────────────────────────────────────
  const regelTotalen = useMemo(
    () => regels.map((r) => parseDecimal(r.aantal) * parseDecimal(r.stukprijs)),
    [regels],
  )
  const totalen = useMemo(
    () => berekenTotalen(regelTotalen, kortingPct),
    [regelTotalen, kortingPct],
  )

  // Geldigheid: vanaf aangemaakt_op (of nu) + N dagen
  const geldigTot = useMemo(
    () => addDays(huidige?.aangemaakt_op ?? null, verzendOpties.geldigheidDagen),
    [huidige?.aangemaakt_op, verzendOpties.geldigheidDagen],
  )

  // ─── Counts voor UI ─────────────────────────────────────────
  const hasAutoRegels = regels.some((r) => r.bron === 'auto_lead')
  const heeftRegels = regels.length > 0

  // ─── Handlers ───────────────────────────────────────────────
  const handleKortingChange = (pct: number, omschrijving: string) => {
    setKortingPct(pct)
    setKortingOmschrijving(omschrijving)
  }

  const handlePreviewClick = () => {
    // Fase 1: stub. Fase 2 → server-action die concept-PDF genereert.
    alert(
      'Preview huidige versie wordt binnenkort gekoppeld.\n\nVoor nu: gebruik "Bekijk verzonden offerte" om de laatst verzonden PDF te zien.',
    )
  }

  const handlePdfClick = () => {
    // Sidebar "Bekijk PDF" — opent huidige verstuurde PDF (zelfde als header-link)
    if (huidige?.pdf_url) {
      window.open(huidige.pdf_url, '_blank', 'noopener,noreferrer')
    } else {
      alert('Nog geen verzonden PDF beschikbaar.')
    }
  }

  const handleSendClick = () => {
    // Fase 1: stub. Fase 2 → server-action die concept → nieuwe versie commit
    // + PDF genereert. Daarna in een latere stap koppelen we de bot-call voor
    // de WhatsApp-flow (zie spec, sectie 2.5).
    alert(
      `Versie v${versie + 1} opgeslagen — WhatsApp-versturen wordt binnenkort gekoppeld.\n\n(Fase 1 stub — geen DB-write)`,
    )
  }

  const handleEditInfoClick = () => {
    // Switch naar info-tab via URL-param
    router.push(`?tab=info`, { scroll: false })
  }

  return (
    <section className={styles.section}>
      <OfferteHeader
        versie={versie}
        verstuurd={verstuurd}
        verstuurdOp={lead.offerte_verstuurd_op}
        hasAutoRegels={hasAutoRegels}
        verzondenPdfUrl={huidige?.pdf_url ?? null}
        onPreviewClick={handlePreviewClick}
      />

      <LeadContextChips lead={lead} onEditInfoClick={handleEditInfoClick} />

      <div className={styles.body}>
        <div className={styles.main}>
          <OfferteRegelsTable initialRegels={prijsregels} onChange={setRegels} />
        </div>

        <div className={styles.aside}>
          <OfferteSidebar
            totalen={totalen}
            geldigTot={geldigTot}
            kortingPct={kortingPct}
            kortingOmschrijving={kortingOmschrijving}
            verzendOpties={verzendOpties}
            fotosCount={fotosCount}
            onKortingChange={handleKortingChange}
            onVerzendOptiesChange={setVerzendOpties}
            onPdfClick={handlePdfClick}
            onSendClick={handleSendClick}
            versturenDisabled={!heeftRegels}
          />
        </div>
      </div>
    </section>
  )
}
