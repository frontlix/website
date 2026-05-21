'use client'

/**
 * LeadOfferte — orchestrator van de Offerte-tab in lead-detail.
 *
 * Combineert:
 *  - OfferteHeader (versie-badge, save-state, PDF-knoppen, revert-knop)
 *  - LeadContextChips (readonly chips uit lead-velden)
 *  - OfferteRegelsTable (inline-bewerkbare regels — auto + handmatig)
 *  - OfferteSidebar (totalen + korting + verzendopties)
 *
 * Fase 2a: debounced auto-save naar concept-rij + revert naar verzonden versie.
 *  - Elke wijziging in regels / korting-pct / korting-omschrijving start een
 *    600ms-debounce. Bij timeout firet `saveDraft()` server-action.
 *  - SaveState propageert naar OfferteHeader (`saving` / `saved` / `idle`).
 *  - Revert-knop verschijnt alleen als er TEGELIJK een concept én een
 *    verzonden versie bestaat — opent confirm-dialog, dan `revertConcept()`.
 *
 * Auto-save schrijft naar de concept-rij; verzonden versies blijven immutable.
 * "Versturen" promoveert het concept naar verzonden (Fase 2.5, nog stub).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead, Offerte, Prijsregel } from '@/lib/dashboard/database.types'
import { berekenTotalen } from '@/lib/dashboard/btw-calc'
import {
  saveDraft,
  revertConcept,
  type DraftRegelInput,
} from '@/lib/dashboard/offerte-draft-actions'
import {
  getKostprijzen,
  type Kostprijs,
} from '@/lib/dashboard/kostprijzen-actions'
import { berekenMarge } from '@/lib/dashboard/marge-calc'
import { KostprijzenModal } from './KostprijzenModal'
import { LeadContextChips } from './LeadContextChips'
import { LegacyOfferteNotice } from './LegacyOfferteNotice'
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
  /**
   * Toont owner-only UI (MargeKaart, Kostprijzen-modal). Default `false` —
   * de page bepaalt dit op basis van `dashboard_user_profiles.is_owner`.
   */
  isOwner?: boolean
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

/**
 * Map UI-state (RegelEdit) → server-payload (DraftRegelInput).
 * String-velden worden geparsed; lege aantal/eenheid → null.
 */
function toServerRegels(regels: RegelEdit[]): DraftRegelInput[] {
  return regels.map((r, idx) => {
    const aantalNum = parseDecimal(r.aantal)
    const aantal = r.aantal.trim() === '' ? null : aantalNum
    const eenheid = r.eenheid.trim() === '' ? null : r.eenheid.trim()
    return {
      id: r.id,
      bron: r.bron,
      omschrijving: r.omschrijving,
      aantal,
      eenheid,
      stukprijs: parseDecimal(r.stukprijs),
      volgorde: idx + 1,
    }
  })
}

/** Stabiele hash voor change-detection — vermijd dubbele saves bij irrelevante re-renders. */
function regelsFingerprint(regels: RegelEdit[]): string {
  return JSON.stringify(
    regels.map((r) => [r.bron, r.omschrijving, r.aantal, r.eenheid, r.stukprijs]),
  )
}

export function LeadOfferte({
  leadId,
  offertes,
  prijsregels,
  lead,
  fotosCount = 0,
  isOwner = false,
}: Props) {
  const router = useRouter()

  // ─── Concept-state ─────────────────────────────────────────
  // Huidige offerte = concept als die bestaat, anders laatste verzonden.
  // `offertes` komt DESC binnen — concept (versie max+1) komt boven verzonden.
  const concept = useMemo(() => offertes.find((o) => o.is_concept), [offertes])
  const laatsteVerzonden = useMemo(
    () => offertes.find((o) => !o.is_concept),
    [offertes],
  )
  const huidige: Offerte | undefined = concept ?? laatsteVerzonden ?? offertes[0]
  const verstuurd = Boolean(lead.offerte_verstuurd)
  const versie = huidige?.versie ?? 1
  // Revert kan alleen als concept én verzonden tegelijk bestaan.
  const canRevert = Boolean(concept && laatsteVerzonden)

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

  // ─── Save-state propagatie naar header ─────────────────────
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  // ─── Debounce-machinerie ───────────────────────────────────
  // We slaan op:
  //  - Een ref naar de skip-first-render flag (init-state is geen wijziging).
  //  - Een ref naar de actieve debounce-timer.
  //  - Een ref naar de "saved → idle" reset-timer (2s na success).
  //  - Een ref naar de laatste fingerprint die we hebben verstuurd —
  //    zo skippen we identiek werk (bv. onChange firet zonder echte diff).
  const isFirstRenderRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFingerprintRef = useRef<string | null>(null)

  /** Voert de daadwerkelijke server-call uit; manages saveState. */
  const flushDraft = useCallback(
    async (
      payloadRegels: RegelEdit[],
      payloadPct: number,
      payloadOmschr: string,
    ) => {
      setSaveState('saving')
      // Cancel een eventuele idle-reset die nog liep van een eerdere save.
      if (idleResetTimerRef.current) {
        clearTimeout(idleResetTimerRef.current)
        idleResetTimerRef.current = null
      }

      const res = await saveDraft(leadId, {
        regels: toServerRegels(payloadRegels),
        kortingPct: payloadPct,
        kortingOmschrijving: payloadOmschr,
      })

      if (res.ok) {
        setSaveState('saved')
        setLastSavedAt(new Date().toISOString())
        // Auto-reset naar idle na 2s zodat "Zojuist bewaard" niet blijft hangen.
        idleResetTimerRef.current = setTimeout(() => {
          setSaveState('idle')
          idleResetTimerRef.current = null
        }, 2000)
      } else {
        setSaveState('idle')
        // Fingerprint resetten zodat een retry niet als "no-op" wordt gezien.
        lastFingerprintRef.current = null
        // eslint-disable-next-line no-alert
        alert(`Opslaan mislukt: ${res.error}`)
      }
    },
    [leadId],
  )

  // ─── Debounced auto-save effect ────────────────────────────
  // 600ms na de laatste wijziging in regels / kortingPct / kortingOmschrijving
  // pushen we de draft naar de server. De eerste render telt niet als
  // wijziging (init-state).
  useEffect(() => {
    // Skip de eerste render — dat is gewoon initiële state-hydratie.
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      lastFingerprintRef.current = regelsFingerprint(regels)
      return
    }

    // Cancel een lopende timer — alleen de meest recente edit telt.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const fp = regelsFingerprint(regels) + `|${kortingPct}|${kortingOmschrijving}`
      // No-op als niets relevants is veranderd.
      if (fp === lastFingerprintRef.current) return
      lastFingerprintRef.current = fp
      void flushDraft(regels, kortingPct, kortingOmschrijving)
    }, 600)

    // Cleanup bij unmount / volgende effect-run.
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [regels, kortingPct, kortingOmschrijving, flushDraft])

  // Cleanup eventuele open timers bij unmount (defensief — React 18
  // StrictMode-veilig zonder dubbele alerts).
  useEffect(() => {
    return () => {
      if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // ─── Computed: totalen ──────────────────────────────────────
  // Voor totalen-berekening hebben we alleen de getallen nodig; voor het
  // marge-zicht hebben we ook de omschrijving + bron nodig zodat
  // berekenMarge() per regel het juiste rule_key kan kiezen.
  const regelTotalen = useMemo(
    () =>
      regels.map((r) => ({
        omschrijving: r.omschrijving,
        totaal: parseDecimal(r.aantal) * parseDecimal(r.stukprijs),
        bron: r.bron,
      })),
    [regels],
  )
  const totalen = useMemo(
    () => berekenTotalen(regelTotalen.map((r) => r.totaal), kortingPct),
    [regelTotalen, kortingPct],
  )

  // ─── Owner-only: kostprijzen + marge ────────────────────────
  const [kostprijzen, setKostprijzen] = useState<Kostprijs[]>([])
  const [kostprijzenModalOpen, setKostprijzenModalOpen] = useState(false)
  const [margeKaartZichtbaar, setMargeKaartZichtbaar] = useState(true)

  // Laad kostprijzen één keer bij mount — alleen voor owners.
  // getKostprijzen() retourneert Kostprijs[] direct (geen Result-wrapper);
  // lege array bij fetch-fout is een veilige fallback (verbergt MargeKaart).
  useEffect(() => {
    if (!isOwner) return
    let cancelled = false
    void getKostprijzen().then((res) => {
      if (cancelled) return
      setKostprijzen(res)
    })
    return () => {
      cancelled = true
    }
  }, [isOwner])

  // Marge-overview wordt live herberekend bij elke regel-/kostprijzen-wijziging.
  const margeOverview = useMemo(() => {
    if (!isOwner || !margeKaartZichtbaar || kostprijzen.length === 0) return undefined
    return berekenMarge(regelTotalen, kostprijzen)
  }, [isOwner, margeKaartZichtbaar, kostprijzen, regelTotalen])

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
    // "Preview huidige versie" toont de PDF van de laatst verzonden versie —
    // zoals de klant 'm heeft ontvangen. Geen concept-rendering hier (daar is
    // de sidebar "PDF"-knop voor).
    const url = laatsteVerzonden?.pdf_url
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      // eslint-disable-next-line no-alert
      alert('Nog geen verzonden offerte beschikbaar — verstuur deze concept-versie eerst.')
    }
  }

  const handleRevertClick = useCallback(async () => {
    // Bevestiging — revert is destructief voor de huidige concept-edits.
    // eslint-disable-next-line no-alert
    const confirmed = window.confirm(
      'Wil je de wijzigingen ongedaan maken en terug naar de verzonden versie?',
    )
    if (!confirmed) return

    // Cancel een lopende debounce — anders schrijft die ná de revert nog weg.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const res = await revertConcept(leadId)
    if (!res.ok) {
      // eslint-disable-next-line no-alert
      alert(`Terugdraaien mislukt: ${res.error}`)
      return
    }
    // Verse server-data ophalen — regels, offertes en lead-velden zijn weer
    // zoals bij de verzonden versie.
    router.refresh()
  }, [leadId, router])

  const handlePdfClick = () => {
    // Sidebar "PDF" → toont de huidige (mogelijk aangepaste) versie als
    // HTML-preview in een nieuw tabblad. Net als een PDF maar live —
    // direct gebaseerd op de regels die nu in de DB staan voor deze lead.
    // De pagina is print-vriendelijk; user kan via browser-print naar PDF.
    const url = `/offerte-preview/${leadId}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSendClick = () => {
    // Fase 2a: stub blijft. Fase 2.5 → server-action die concept → verzonden
    // promoveert, PDF genereert en bot-call uitvoert (TODO).
    alert(
      `Versie v${versie + 1} opgeslagen — WhatsApp-versturen wordt binnenkort gekoppeld.\n\n(Fase 2a stub — geen verzonden-promotie)`,
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
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        verzondenPdfUrl={laatsteVerzonden?.pdf_url ?? huidige?.pdf_url ?? null}
        onPreviewClick={handlePreviewClick}
        onRevertClick={handleRevertClick}
        canRevert={canRevert}
      />

      <LeadContextChips lead={lead} onEditInfoClick={handleEditInfoClick} />

      {/* Legacy notice: verzonden offerte aanwezig maar geen prijsregels —
          oude bot-flow sloeg alleen offertes.totaal_incl + PDF op. Knop
          om alsnog regels uit lead-data te genereren. */}
      {verstuurd && prijsregels.length === 0 ? (
        <LegacyOfferteNotice leadId={leadId} />
      ) : null}

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
            margeOverview={margeOverview}
            onOpenKostprijzen={() => setKostprijzenModalOpen(true)}
            onCloseMarge={() => setMargeKaartZichtbaar(false)}
          />
        </div>
      </div>

      {/* Kostprijzen-modal: in LeadOfferte (niet OfferteSidebar) zodat de
          modal ook over de regels-tabel ligt. Alleen geladen voor owners. */}
      {isOwner ? (
        <KostprijzenModal
          open={kostprijzenModalOpen}
          onClose={() => setKostprijzenModalOpen(false)}
          initialKostprijzen={kostprijzen}
          margeRegels={margeOverview?.regels ?? []}
          onSaved={(nieuw) => {
            setKostprijzen(nieuw)
            // Zorg dat de kaart weer zichtbaar wordt als 'ie net verborgen was.
            setMargeKaartZichtbaar(true)
          }}
        />
      ) : null}
    </section>
  )
}
