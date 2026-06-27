'use client'

// ── MobileOfferteEditor ────────────────────────────────────────────────────
// Kalme, sectioned (accordion) offerte-editor voor de mobiele dossier-shell.
// Gebruikt HETZELFDE datamodel + rekenwerk + persistentie als de desktop-vorm
// (LeadOfferteForm): mapLeadToFormData → één ManualOfferteData-state +
// losse geldigheidDagen; computeRules/computeTotals voor de live afleiding;
// 600ms-debounced saveOfferteForm. Mobiel en desktop geven zo identieke totalen.
//
// Vier inklapbare secties (accordion): Klantgegevens (dicht), Werk &
// oppervlakte (open), Actiekorting (dicht), Geldigheid (dicht). Daaronder een
// VAST live prijsoverzicht + PDF/verstuur-acties.
//
// ACCORDION-ANIMATIE (zie module.css): de body staat altijd in de DOM en
// animeert bij openen UITSLUITEND `transform` (translateY -6px → 0), eindigend
// volledig zichtbaar. De dichte staat is een height-collapse (grid 0fr→1fr),
// nooit een opacity:0-eindstaat → print/no-JS toont alles.
//
// Hergebruikte atomen uit OfferteEditAtoms: OStepper, ONumField, OSwitch,
// OClientNote, OAddrInput.
// ──────────────────────────────────────────────────────────────────────────

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronRight,
  User,
  Ruler,
  Tag,
  Calendar,
  FileText,
  MessageCircle,
  Clock,
  Download,
  RotateCcw,
  Plus,
} from 'lucide-react'
import type {
  ManualOfferteData,
  OpmerkingKey,
  RegelOpmerking,
} from '@/lib/dashboard/manual-offerte-types'
import {
  computeRules,
  computeTotals,
  laatsteOnderdeelRegelIndices,
} from '@/lib/dashboard/manual-offerte-rules'
import { formatEuro } from '@/lib/dashboard/format'
import { mapLeadToFormData } from '@/lib/dashboard/offerte-form-mapping'
import { saveOfferteForm, freezeVerstuurdeOfferteData } from '@/lib/dashboard/offerte-form-actions'
import { revertConcept } from '@/lib/dashboard/offerte-draft-actions'
import { OffertePdfDocument } from '@/components/dashboard/offerte/OffertePdf'
import { useBotAction } from '@/components/dashboard/bot-actions/use-bot-action'
import { deliverPdfBlob } from '@/components/dashboard/offerte/pdf-download'
import { toOffertePdfData } from '@/components/dashboard/offerte/offerte-pdf-data'
import {
  buildSentOffertePdfModel,
  type SentOffertePdfModel,
} from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { OStepper, ONumField, OSwitch, OClientNote, OAddrInput } from './OfferteEditAtoms'
import { OffertePdfPreview, type OffertePdfData } from './OffertePdfPreview'
import { OfferteHistorie } from './OfferteHistorie'
import type { MobileOfferteFormProps } from '../MobileLeadDossier'
import styles from './MobileOfferteEditor.module.css'

// Blauwe accent voor de korstmos-toggle (spec: blauw, niet groen).
const TONE_PRIMARY = 'var(--color-primary)'

const MAANDEN_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/** "19 juni 2026" voor de geldig-t/m-weergave in de Geldigheid-sectie. */
function formatDatumLang(d: Date): string {
  return `${d.getDate()} ${MAANDEN_NL[d.getMonth()]} ${d.getFullYear()}`
}

/** "dd-mm-jjjj" voor de PDF-preview + grand-line. */
function formatDatumKort(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

/** Stabiele fingerprint voor change-detection (vermijdt dubbele saves). */
function dataFingerprint(data: ManualOfferteData, geldigheidDagen: number): string {
  return JSON.stringify(data) + `|${geldigheidDagen}`
}

// ── Accordion-sectie ────────────────────────────────────────────────────────
// Kaart met tikbare kop (icon + titel + summary + chevron). De body is altijd
// gerenderd; open/dicht via een height-collapse + transform-only animatie.
function AccordionSection({
  icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className={styles.card}>
      <button
        type="button"
        className={styles.cardHead}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={styles.iconBadge} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.headText}>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.cardSummary}>{summary}</span>
        </span>
        <ChevronRight size={18} className={styles.chev} data-open={open || undefined} aria-hidden="true" />
      </button>
      <div className={styles.bodyClip} data-open={open || undefined}>
        <div className={styles.bodyInner}>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    </section>
  )
}

// ── MobileOpmerking ─────────────────────────────────────────────────────────
// Opmerking-container per offerte-onderdeel (mobiel): tekstveld + schakelaar
// (default AAN). Aan + niet-lege tekst → de opmerking komt in de offerte onder
// dit onderdeel; uit = alleen intern. Ingeklapt tot een knop zolang er geen
// tekst is, zodat de editor rustig blijft.
/** Extra-dienst → opmerking-onderdeel (spiegelt de desktop OfferteEditor).
 *  Invegen levert het voegzand-werk op, dus daar hangt de voegzand-opmerking. */
const DIENST_OPM: Partial<Record<string, { key: OpmerkingKey; label: string }>> = {
  invegen: { key: 'voegzand_normaal', label: 'Voegzand' },
  preventieve_onkruid: { key: 'preventieve_onkruid', label: 'Preventieve onkruidbehandeling' },
  beschermlaag: { key: 'beschermlaag', label: 'Nieuwe beschermlaag' },
}

function MobileOpmerking({
  waarde,
  zet,
  label,
}: {
  waarde?: RegelOpmerking
  zet: (next: RegelOpmerking) => void
  /** Onderdeel-label (bv. "Beschermlaag") zodat duidelijk is bij welk onderdeel
   *  de opmerking hoort. */
  label?: string
}) {
  const tekst = waarde?.tekst ?? ''
  const zichtbaar = waarde?.zichtbaar !== false
  const [open, setOpen] = useState(() => tekst.trim() !== '')

  if (!open) {
    return (
      <button type="button" className={styles.opmAdd} onClick={() => setOpen(true)}>
        <Plus size={13} strokeWidth={2.4} aria-hidden="true" />{' '}
        Opmerking
      </button>
    )
  }

  return (
    <div className={styles.opmWrap}>
      {label ? <span className={styles.opmVeldLabel}>{label}</span> : null}
      <div
        className={styles.opmRij}
        data-uit={!zichtbaar || undefined}
        onBlur={(e) => {
          // Niet inklappen bij het klikken op de schakelaar (de focus blijft in
          // de container); alleen als de focus de container verlaat én leeg is.
          if (
            tekst.trim() === '' &&
            !e.currentTarget.contains(e.relatedTarget as Node | null)
          ) {
            setOpen(false)
          }
        }}
      >
        <textarea
          className={styles.opmInput}
          value={tekst}
          rows={2}
          placeholder="Waarom deze keuze? Komt onder dit onderdeel in de offerte."
          onChange={(e) => zet({ tekst: e.target.value, zichtbaar })}
        />
        <span className={styles.opmToggle}>
          <OSwitch
            on={zichtbaar}
            accent={TONE_PRIMARY}
            label="Opmerking in de offerte tonen"
            onChange={(v) => zet({ tekst, zichtbaar: v })}
          />
          <span className={styles.opmToggleLabel}>{zichtbaar ? 'In offerte' : 'Verborgen'}</span>
        </span>
      </div>
    </div>
  )
}

export function MobileOfferteEditor({
  leadId,
  lead,
  offertes,
  fotosCount,
  pricing,
  pdfApiRef,
}: MobileOfferteFormProps & {
  /** Brug voor de sticky actiebalk: opent de PDF-preview-overlay. */
  pdfApiRef?: RefObject<{ openPdf: () => void } | null>
}) {
  // ─── Enige bron van waarheid (gespiegeld van LeadOfferteForm) ───
  // Echte lead_id ⇒ live opslaan/bewerken (gespiegeld van de desktop-editor).
  const live = Boolean(leadId)
  // Versturen via de bestaande approve-quote-route (zelfde als desktop + het
  // mobiele goedkeur-blok).
  const { run: approveQuote, pending: approving } = useBotAction(
    `/api/dashboard/lead/${leadId}/approve-quote`,
  )
  const router = useRouter()
  const [reverting, startRevert] = useTransition()
  const [data, setData] = useState<ManualOfferteData>(() => mapLeadToFormData(lead))
  const [geldigheidDagen, setGeldigheidDagen] = useState<number>(
    lead.offerte_geldigheid_dagen ?? 14,
  )

  const setField = useCallback(
    <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => {
      setData((s) => ({ ...s, [k]: v }))
    },
    [],
  )

  // Factuur-veld editen zet factuur_zelfde=false.
  const setFactuurField = useCallback(
    <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => {
      setData((s) => ({ ...s, [k]: v, factuur_zelfde: false }))
    },
    [],
  )

  // Voegzand-actief in sync met zakken/m² > 0 (computeRules leest de flags).
  const setVoegzandNormaal = useCallback(
    (patch: Partial<Pick<ManualOfferteData,
      'voegzand_normaal_zakken' | 'voegzand_normaal_m2' | 'voegzand_normaal_prijs'>>) => {
      setData((s) => {
        const next = { ...s, ...patch }
        next.voegzand_normaal_actief =
          (Number(next.voegzand_normaal_zakken) || 0) > 0 ||
          (Number(next.voegzand_normaal_m2) || 0) > 0
        return next
      })
    },
    [],
  )
  const setVoegzandOnkruid = useCallback(
    (patch: Partial<Pick<ManualOfferteData,
      'voegzand_onkruidwerend_zakken' | 'voegzand_onkruidwerend_m2' | 'voegzand_onkruidwerend_prijs'>>) => {
      setData((s) => {
        const next = { ...s, ...patch }
        next.voegzand_onkruidwerend_actief =
          (Number(next.voegzand_onkruidwerend_zakken) || 0) > 0 ||
          (Number(next.voegzand_onkruidwerend_m2) || 0) > 0
        return next
      })
    },
    [],
  )

  // Sub-dienst toggle (behoudt overige sub-waarden zoals 'invegen'/'onderhoud').
  const toggleSub = useCallback((k: ManualOfferteData['sub'][number]) => {
    setData((s) => {
      const has = s.sub.includes(k)
      return { ...s, sub: has ? s.sub.filter((x) => x !== k) : [...s.sub, k] }
    })
  }, [])

  // Display-only toelichting voor voegzand (geen schema-kolom).
  const [voegzandNote, setVoegzandNote] = useState('')

  // Per-onderdeel opmerking bijwerken (tekst + schakelaar). Gepersisteerd via
  // data.regel_opmerkingen (offerte_regel_opmerkingen) en door computeRules
  // onder de juiste regel in de offerte gezet.
  const zetOpmerking = useCallback((key: OpmerkingKey, next: RegelOpmerking) => {
    setData((s) => ({
      ...s,
      regel_opmerkingen: { ...(s.regel_opmerkingen ?? {}), [key]: next },
    }))
  }, [])

  // ─── Save-state + debounce (1:1 LeadOfferteForm) ───
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const isFirstRenderRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFingerprintRef = useRef<string | null>(null)

  const flushSave = useCallback(
    async (payload: ManualOfferteData, dagen: number) => {
      setSaveState('saving')
      if (idleResetTimerRef.current) {
        clearTimeout(idleResetTimerRef.current)
        idleResetTimerRef.current = null
      }
      const res = await saveOfferteForm(leadId, payload, dagen)
      if (res.ok) {
        setSaveState('saved')
        idleResetTimerRef.current = setTimeout(() => {
          setSaveState('idle')
          idleResetTimerRef.current = null
        }, 2000)
      } else {
        setSaveState('idle')
        lastFingerprintRef.current = null
        // eslint-disable-next-line no-alert
        alert(`Opslaan mislukt: ${res.error}`)
      }
    },
    [leadId],
  )

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      lastFingerprintRef.current = dataFingerprint(data, geldigheidDagen)
      return
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      const fp = dataFingerprint(data, geldigheidDagen)
      if (fp === lastFingerprintRef.current) return
      lastFingerprintRef.current = fp
      void flushSave(data, geldigheidDagen)
    }, 600)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [data, geldigheidDagen, flushSave])

  useEffect(() => {
    return () => {
      if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // ─── Live afleiding (identiek aan desktop) ───
  const rules = useMemo(() => computeRules(data, pricing), [data, pricing])
  const totals = useMemo(() => computeTotals(rules, data), [rules, data])
  // Regel-index per onderdeel die het opmerking-veld krijgt (laatste regel).
  const opmIndices = useMemo(() => laatsteOnderdeelRegelIndices(rules), [rules])
  // Welke onderdelen een regel opleveren; alleen die krijgen een opmerking-veld.
  const actieveOpm = useMemo(() => new Set(opmIndices.values()), [opmIndices])
  /** Opmerking-veld voor één onderdeel, onder de bijbehorende optie. Het label
   *  maakt duidelijk bij welk onderdeel het hoort; alleen getoond als dat
   *  onderdeel ook echt een regel oplevert. */
  const opm = (key: OpmerkingKey, label: string) =>
    actieveOpm.has(key) ? (
      <MobileOpmerking
        label={label}
        waarde={data.regel_opmerkingen?.[key]}
        zet={(next) => zetOpmerking(key, next)}
      />
    ) : null
  /** Opmerking voor een niet-regel-onderdeel (conditie / korting): altijd tonen. */
  const opmVast = (key: OpmerkingKey, label: string) => (
    <MobileOpmerking
      label={label}
      waarde={data.regel_opmerkingen?.[key]}
      zet={(next) => zetOpmerking(key, next)}
    />
  )

  const reiskostenTotaal = useMemo(
    () => rules.filter((r) => r.eenheid === 'km').reduce((s, r) => s + r.totaal, 0),
    [rules],
  )
  const dienstenSubtotaal = totals.subtotal - reiskostenTotaal
  const kortbareGrondslag = dienstenSubtotaal + totals.korstmosToeslag
  const effectiveKortingPct =
    kortbareGrondslag > 0 ? (totals.kortingBedrag / kortbareGrondslag) * 100 : 0

  const vervalDatum = useMemo(
    () => new Date(Date.now() + geldigheidDagen * 86400000),
    [geldigheidDagen],
  )

  const arbeidTotaal =
    (Number(data.extra_arbeid_minuten) || 0) *
    (Number(data.extra_arbeid_personen) || 0) *
    pricing.extra_arbeid_per_min

  // ─── Accordion open/dicht state (defaults per spec) ───
  const [openKlant, setOpenKlant] = useState(false)
  const [openWerk, setOpenWerk] = useState(true)
  const [openKorting, setOpenKorting] = useState(false)
  const [openGeldig, setOpenGeldig] = useState(false)

  // ─── Overlays ───
  const [pdfOpen, setPdfOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  const flushPending = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      const fp = dataFingerprint(data, geldigheidDagen)
      if (fp !== lastFingerprintRef.current) {
        lastFingerprintRef.current = fp
        void flushSave(data, geldigheidDagen)
      }
    }
  }, [data, geldigheidDagen, flushSave])

  // Sticky actiebalk-knop "Bekijk PDF" opent dezelfde nette PDF-overlay als de
  // PDF-knop in het overzicht (i.p.v. de route-versie die mobiel slecht oogt).
  useEffect(() => {
    if (!pdfApiRef) return
    pdfApiRef.current = {
      openPdf: () => {
        flushPending()
        setPdfOpen(true)
      },
    }
    return () => {
      if (pdfApiRef) pdfApiRef.current = null
    }
  }, [pdfApiRef, flushPending])

  const handleSendClick = useCallback(() => {
    if (!leadId || approving) return
    // eslint-disable-next-line no-alert
    if (!window.confirm('Offerte nu naar de klant sturen via WhatsApp?')) return
    // Schrijf eerst het laatst bewerkte concept weg, dan versturen via de bot.
    flushPending()
    // Na een geslaagde verzending: bevries de volledige editor-invoer in de
    // verstuurde snapshot (de bot schrijft alleen pricing+regels), zodat "Terug
    // naar verstuurde versie" later de werk-invoer compleet kan terugzetten.
    approveQuote(undefined, () => {
      void freezeVerstuurdeOfferteData(leadId).catch(() => {})
    })
  }, [leadId, approving, flushPending, approveQuote])

  // "Terug naar verstuurde versie": draait het concept terug naar de laatst
  // verstuurde offerte (prijsregels + werk-invoer). De server geeft de
  // herstelde editor-state terug zodat we de lokale state direct vervangen (de
  // UI toont meteen de verstuurde waarden; router.refresh is een soft refresh
  // die client-state behoudt). Alleen tonen als er een concept te herstellen is.
  const handleRevert = useCallback(() => {
    if (!leadId || reverting) return
    // eslint-disable-next-line no-alert
    if (!window.confirm('Wijzigingen ongedaan maken en terug naar de laatst verstuurde offerte?')) {
      return
    }
    startRevert(async () => {
      const res = await revertConcept(leadId)
      if (!res.ok) {
        // eslint-disable-next-line no-alert
        window.alert(res.error)
        return
      }
      if (res.data) {
        setData(res.data.form)
        setGeldigheidDagen(res.data.geldigheidDagen)
        lastFingerprintRef.current = dataFingerprint(res.data.form, res.data.geldigheidDagen)
      }
      router.refresh()
    })
  }, [leadId, reverting, router])

  // ─── PDF-data uit de live state (OffertePdfData-contract) ───
  const pdfData: OffertePdfData = toOffertePdfData({
    data,
    rules,
    totals,
    nr: `${new Date().getFullYear()}-${leadId.replace(/\D/g, '').slice(-4).padStart(4, '0')}`,
    datum: formatDatumKort(new Date()),
    geldigTot: formatDatumKort(vervalDatum),
    effectiveKortingPct,
    toelichting: voegzandNote || undefined,
  })

  // Download de offerte als echte PDF: zelfde @react-pdf-document als de
  // desktop-wizard (OffertePdfDocument), client-side gegenereerd. Aflevering via
  // deliverPdfBlob, op de telefoon het deel-/bewaar-vel (iOS negeert
  // <a download> voor blob-URLs), op desktop een gewone download.
  const handleDownloadPdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      flushPending()
      const { pdf } = await import('@react-pdf/renderer')
      const blob = await pdf(
        <OffertePdfDocument
          data={data}
          rules={rules}
          totals={totals}
          offerteNummer={pdfData.nr}
          geldigheidDagen={geldigheidDagen}
          origin={typeof window !== 'undefined' ? window.location.origin : undefined}
        />,
      ).toBlob()
      const slug = (data.naam || 'klant')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      await deliverPdfBlob(blob, `offerte-${slug || 'schoon-straatje'}.pdf`)
    } catch (e) {
      console.error('[MobileOfferteEditor] PDF download failed:', e)
      // eslint-disable-next-line no-alert
      alert('PDF maken mislukt, probeer het opnieuw.')
    } finally {
      setPdfBusy(false)
    }
  }

  // ─── Versies voor de historie-overlay (afgeleid van offertes) ───
  // Basisgegevens (klant/adres) voor verstuurde versies, afgeleid van de lead.
  const baseDataVoorVersies = useMemo(() => mapLeadToFormData(lead), [lead])

  const versies = useMemo(
    () =>
      offertes.map((o) => {
        const model: SentOffertePdfModel | null = o.is_concept
          ? null
          : buildSentOffertePdfModel({
              offerte: {
                regels_snapshot: o.regels_snapshot,
                totaal_incl: o.totaal_incl,
                korting_pct: o.korting_pct,
                versie: o.versie,
                aangemaakt_op: o.aangemaakt_op,
                offertenummer: (o as { offertenummer?: string | null }).offertenummer ?? null,
              },
              baseData: baseDataVoorVersies,
              leadId,
              geldigheidFallback: lead.offerte_geldigheid_dagen ?? 14,
            })
        const datum = o.aangemaakt_op ? formatDatumKort(new Date(o.aangemaakt_op)) : '—'
        const pdfData: OffertePdfData | null = model
          ? toOffertePdfData({
              data: model.data,
              rules: model.rules,
              totals: model.totals,
              nr: model.offerteNummer,
              datum,
              geldigTot: formatDatumKort(
                new Date(
                  (o.aangemaakt_op ? new Date(o.aangemaakt_op).getTime() : Date.now()) +
                    model.geldigheidDagen * 24 * 60 * 60 * 1000,
                ),
              ),
              effectiveKortingPct: model.totals.discount,
            })
          : null
        return {
          versie: o.versie,
          totaalIncl: o.totaal_incl,
          datum,
          verstuurd: !o.is_concept,
          pdfData,
          downloadModel: model,
        }
      }),
    [offertes, baseDataVoorVersies, leadId, lead.offerte_geldigheid_dagen],
  )

  // ─── Summaries voor de kop-rijen ───
  const klantSummary = data.naam || 'Nog geen naam'
  const werkSummary = `${data.m2 || 0} m²${data.sub.length ? `, ${data.sub.length} dienst${data.sub.length === 1 ? '' : 'en'}` : ''}`
  const kortingSummary =
    totals.kortingBedrag > 0 ? `Korting ${formatEuro(totals.kortingBedrag)}` : 'Geen korting'
  const geldigSummary = `${geldigheidDagen} dagen`

  const savedTone = saveState === 'saved' || undefined

  return (
    <div className={styles.wrap}>
      <div className={styles.saveStatus} aria-live="polite">
        {saveState !== 'idle' && (
          <span className={styles.saveLabel} data-saved={savedTone}>
            {saveState === 'saving' ? 'Opslaan…' : 'Opgeslagen'}
          </span>
        )}
      </div>

      {/* ── 1. Klantgegevens (default DICHT) ── */}
      <AccordionSection
        icon={<User size={17} />}
        title="Klantgegevens"
        summary={klantSummary}
        open={openKlant}
        onToggle={() => setOpenKlant((o) => !o)}
      >
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Naam</span>
          <input
            className={styles.input}
            value={data.naam}
            onChange={(e) => setField('naam', e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Bedrijf <span className={styles.labelHint}>(optioneel)</span>
          </span>
          <input
            className={styles.input}
            value={data.bedrijf}
            onChange={(e) => setField('bedrijf', e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>E-mail</span>
          <input
            type="email"
            className={styles.input}
            value={data.email}
            onChange={(e) => setField('email', e.target.value)}
          />
        </label>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Postcode</span>
            <input
              className={styles.input}
              value={data.postcode}
              onChange={(e) => setField('postcode', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Huisnr.</span>
            <input
              className={styles.input}
              value={data.huisnummer}
              onChange={(e) => setField('huisnummer', e.target.value)}
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Straat</span>
          <input
            className={styles.input}
            value={data.straat}
            onChange={(e) => setField('straat', e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Plaats</span>
          <input
            className={styles.input}
            value={data.plaats}
            onChange={(e) => setField('plaats', e.target.value)}
          />
        </label>

        <div className={styles.toggleRow}>
          <span className={styles.toggleRowText}>
            <span className={styles.toggleRowLabel}>Afwijkend factuuradres</span>
            <span className={styles.toggleRowSub}>
              {data.factuur_zelfde ? 'Zelfde als werkadres' : 'Apart factuuradres'}
            </span>
          </span>
          <OSwitch
            on={!data.factuur_zelfde}
            accent={TONE_PRIMARY}
            label="Afwijkend factuuradres"
            onChange={(v) => setField('factuur_zelfde', !v)}
          />
        </div>

        {!data.factuur_zelfde && (
          <>
            <div className={styles.factInfo}>
              <span>Geldt alleen voor deze offerte, klantgegevens blijven ongewijzigd.</span>
            </div>
            <OAddrInput
              value={data.factuur_postcode}
              onChange={(v) => setFactuurField('factuur_postcode', v)}
              placeholder="Factuur-postcode"
            />
            <OAddrInput
              value={data.factuur_huisnummer}
              onChange={(v) => setFactuurField('factuur_huisnummer', v)}
              placeholder="Factuur-huisnummer"
            />
            <OAddrInput
              value={data.factuur_straat}
              onChange={(v) => setFactuurField('factuur_straat', v)}
              placeholder="Factuur-straat"
            />
            <OAddrInput
              value={data.factuur_plaats}
              onChange={(v) => setFactuurField('factuur_plaats', v)}
              placeholder="Factuur-plaats"
            />
          </>
        )}
      </AccordionSection>

      {/* ── 2. Werk & oppervlakte (default OPEN) ── */}
      <AccordionSection
        icon={<Ruler size={17} />}
        title="Werk & oppervlakte"
        summary={werkSummary}
        open={openWerk}
        onToggle={() => setOpenWerk((o) => !o)}
      >
        {/* Oppervlakte */}
        <div className={styles.controlRow}>
          <span className={styles.controlRowLabel}>Oppervlakte</span>
          <OStepper value={data.m2} onChange={(v) => setField('m2', v)} step={5} suffix="m²" />
        </div>
        {opm('reiniging', 'Reiniging')}
        {opm('reiskosten', 'Reiskosten')}

        {/* Extra arbeid: 3-koloms grid */}
        <div>
          <div className={styles.subHead}>Extra arbeid</div>
          <div className={`${styles.arbeidGrid} ${styles.mt8}`}>
            <div className={styles.arbeidCell}>
              <span className={styles.arbeidLabel}>Minuten</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                className={styles.arbeidInput}
                value={data.extra_arbeid_minuten || ''}
                placeholder="0"
                onChange={(e) =>
                  setField('extra_arbeid_minuten', Number(e.target.value) || 0)
                }
              />
            </div>
            <div className={styles.arbeidCell}>
              <span className={styles.arbeidLabel}>Personen</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className={styles.arbeidInput}
                value={data.extra_arbeid_personen || ''}
                placeholder="1"
                onChange={(e) =>
                  setField('extra_arbeid_personen', Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
            <div className={styles.arbeidCell}>
              <span className={styles.arbeidLabel}>Totaal</span>
              <span className={styles.valueBox}>{formatEuro(arbeidTotaal)}</span>
            </div>
          </div>
          {opmVast('extra_arbeid', 'Extra arbeid')}
        </div>

        {/* Voegzand */}
        <div>
          <div className={styles.subHead}>Voegzand</div>
          <div className={styles.subStack}>
            <div className={styles.zandCard}>
              <span className={styles.zandName}>Normaal</span>
              <div className={styles.controlRow}>
                <span className={styles.controlRowLabel}>Aantal zakken</span>
                <OStepper
                  value={data.voegzand_normaal_zakken}
                  onChange={(v) => setVoegzandNormaal({ voegzand_normaal_zakken: v })}
                  suffix="zak"
                />
              </div>
              <div className={styles.zandLine}>
                <span className={styles.zandUnit}>
                  <ONumField
                    value={data.voegzand_normaal_m2}
                    onChange={(v) => setVoegzandNormaal({ voegzand_normaal_m2: v })}
                  />
                  <span className={styles.zandUnitLbl}>m²</span>
                </span>
                <span className={styles.zandUnit}>
                  <ONumField
                    value={data.voegzand_normaal_prijs}
                    onChange={(v) => setVoegzandNormaal({ voegzand_normaal_prijs: v })}
                    prefix="€"
                    dec
                  />
                  <span className={styles.zandUnitLbl}>per zak</span>
                </span>
              </div>
            </div>

            <div className={styles.zandCard}>
              <span className={styles.zandName}>Onkruidwerend</span>
              <div className={styles.controlRow}>
                <span className={styles.controlRowLabel}>Aantal zakken</span>
                <OStepper
                  value={data.voegzand_onkruidwerend_zakken}
                  onChange={(v) => setVoegzandOnkruid({ voegzand_onkruidwerend_zakken: v })}
                  suffix="zak"
                />
              </div>
              <div className={styles.zandLine}>
                <span className={styles.zandUnit}>
                  <ONumField
                    value={data.voegzand_onkruidwerend_m2}
                    onChange={(v) => setVoegzandOnkruid({ voegzand_onkruidwerend_m2: v })}
                  />
                  <span className={styles.zandUnitLbl}>m²</span>
                </span>
                <span className={styles.zandUnit}>
                  <ONumField
                    value={data.voegzand_onkruidwerend_prijs}
                    onChange={(v) => setVoegzandOnkruid({ voegzand_onkruidwerend_prijs: v })}
                    prefix="€"
                    dec
                  />
                  <span className={styles.zandUnitLbl}>per zak</span>
                </span>
              </div>
            </div>
          </div>
          {/* Kleur-pills, beide onafhankelijk selecteerbaar. */}
          <div className={`${styles.kleuren} ${styles.mt10}`}>
            <button
              type="button"
              className={styles.pill}
              data-on={data.kleur_naturel || undefined}
              aria-pressed={data.kleur_naturel}
              onClick={() => setField('kleur_naturel', !data.kleur_naturel)}
            >
              <span className={styles.dot} style={{ background: '#C6BBA1' }} aria-hidden="true" />
              Naturel
            </button>
            <button
              type="button"
              className={styles.pill}
              data-on={data.kleur_antraciet || undefined}
              aria-pressed={data.kleur_antraciet}
              onClick={() => setField('kleur_antraciet', !data.kleur_antraciet)}
            >
              <span className={styles.dot} style={{ background: '#3A3A3A' }} aria-hidden="true" />
              Antraciet
            </button>
          </div>

          <OClientNote
            value={voegzandNote}
            onChange={setVoegzandNote}
            placeholder="Bijv. keuze van voegzand toelichten…"
          />
        </div>

        {/* Toeslagen */}
        <div>
          <div className={styles.subHead}>Toeslagen</div>
          <div className={styles.subStackTight}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleRowText}>
                <span className={styles.toggleRowLabel}>Korstmos aanwezig</span>
                <span className={styles.toggleRowSub}>10% toeslag op diensten</span>
              </span>
              <OSwitch
                on={data.korstmos === 'ja'}
                accent={TONE_PRIMARY}
                label="Korstmos"
                onChange={(v) => setField('korstmos', v ? 'ja' : 'nee')}
              />
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleRowText}>
                <span className={styles.toggleRowLabel}>Planten afschermen</span>
              </span>
              <OSwitch
                on={data.planten_afschermen_actief}
                accent={TONE_PRIMARY}
                label="Planten afschermen"
                onChange={(v) => setField('planten_afschermen_actief', v)}
              />
            </div>
            {opm('planten', 'Planten afschermen')}
            {opmVast('conditie', 'Conditie van de bestrating')}
          </div>
        </div>

        {/* Extra diensten */}
        <div>
          <div className={styles.subHead}>Extra diensten</div>
          <div className={`${styles.checks} ${styles.mt8}`}>
            {([
              ['invegen', 'Invegen'],
              ['preventieve_onkruid', 'Preventieve onkruidbeheersing'],
              ['beschermlaag', 'Nieuwe beschermlaag'],
            ] as const).map(([k, label]) => {
              const on = data.sub.includes(k)
              const o = DIENST_OPM[k]
              return (
                <Fragment key={k}>
                  <button
                    type="button"
                    className={styles.check}
                    data-on={on || undefined}
                    aria-pressed={on}
                    onClick={() => toggleSub(k)}
                  >
                    <span className={styles.checkBox}>
                      {on ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
                    </span>
                    {label}
                  </button>
                  {on && o ? opmVast(o.key, o.label) : null}
                </Fragment>
              )
            })}
          </div>
          {opm('onderhoud', 'Onderhoud')}
        </div>
      </AccordionSection>

      {/* ── 3. Actiekorting (default DICHT) ── */}
      <AccordionSection
        icon={<Tag size={17} />}
        title="Actiekorting"
        summary={kortingSummary}
        open={openKorting}
        onToggle={() => setOpenKorting((o) => !o)}
      >
        <div className={styles.kortingSliderRow}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            className={styles.slider}
            value={Math.round(effectiveKortingPct)}
            onChange={(e) =>
              setData((s) => ({
                ...s,
                korting_percentage: Number(e.target.value),
                korting_bedrag: 0,
              }))
            }
            aria-label="Actiekorting percentage"
          />
          <div className={styles.kortingPctBadge}>
            <input
              type="number"
              min={0}
              max={100}
              inputMode="numeric"
              className={styles.kortingPctInput}
              value={Math.round(effectiveKortingPct)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                setData((s) => ({ ...s, korting_percentage: pct, korting_bedrag: 0 }))
              }}
              aria-label="Kortingspercentage"
            />
            <span className={styles.kortingPctSuffix}>%</span>
          </div>
        </div>
        <div className={styles.kortingPresets}>
          {[10, 20, 30, 50].map((p) => (
            <button
              key={p}
              type="button"
              className={styles.kortingPreset}
              data-on={
                data.korting_bedrag === 0 && Math.round(effectiveKortingPct) === p
                  ? true
                  : undefined
              }
              onClick={() =>
                setData((s) => ({ ...s, korting_percentage: p, korting_bedrag: 0 }))
              }
            >
              {p}%
            </button>
          ))}
        </div>

        <div className={styles.controlRow}>
          <span className={styles.controlRowLabel}>Vast bedrag</span>
          <ONumField
            value={data.korting_bedrag}
            onChange={(v) => setField('korting_bedrag', v || 0)}
            prefix="€"
            dec
            align="right"
          />
        </div>

        <div className={styles.controlRow}>
          <span className={styles.controlRowLabel}>Korting</span>
          <span className={styles.kortingEur}>− {formatEuro(totals.kortingBedrag)}</span>
        </div>

        {opmVast('korting', 'Actiekorting')}
      </AccordionSection>

      {/* ── 4. Geldigheid (default DICHT) ── */}
      <AccordionSection
        icon={<Calendar size={17} />}
        title="Geldigheid"
        summary={geldigSummary}
        open={openGeldig}
        onToggle={() => setOpenGeldig((o) => !o)}
      >
        <div className={styles.controlRow}>
          <span className={styles.controlRowLabel}>Aantal dagen</span>
          <OStepper
            value={geldigheidDagen}
            onChange={(v) => setGeldigheidDagen(Math.max(1, Math.round(v)))}
            min={1}
            suffix="dgn"
          />
        </div>
        <div className={styles.geldigQuick}>
          {[7, 14, 30, 60].map((d) => (
            <button
              key={d}
              type="button"
              className={styles.geldigQuickBtn}
              data-on={d === geldigheidDagen || undefined}
              onClick={() => setGeldigheidDagen(d)}
            >
              {d} dgn
            </button>
          ))}
        </div>
        <p className={styles.geldigDate}>
          Geldig t/m <strong>{formatDatumLang(vervalDatum)}</strong>
        </p>
      </AccordionSection>

      {/* ── Live prijsoverzicht (vast, onder de secties) ── */}
      <section className={styles.totals} aria-label="Live prijsoverzicht">
        <div className={styles.overviewHead}>
          <span className={styles.overviewTitle}>Live prijsoverzicht</span>
          <span className={styles.overviewUpdated} data-saved={savedTone}>
            {saveState === 'saving' ? 'Opslaan…' : 'Bijgewerkt'}
          </span>
        </div>

        <div className={styles.lineList}>
          {rules.length === 0 ? (
            <div className={styles.lineEmpty}>Nog geen diensten geselecteerd.</div>
          ) : (
            rules.map((r, i) => (
              <div className={styles.lineRow} key={`${r.desc}-${i}`}>
                <span className={styles.lineLabel}>{r.desc}</span>
                <span className={styles.lineRight}>
                  <span className={styles.lineMeta}>
                    {r.aantal} {r.eenheid} ×{' '}
                    {r.overrideKey && live ? (
                      <span className={styles.linePrijs}>
                        <ONumField
                          value={r.prijs}
                          onChange={(v) => setField(r.overrideKey!, v)}
                          prefix="€"
                          dec
                          align="right"
                        />
                        {r.overrideKey.endsWith('_override') &&
                        data[r.overrideKey] != null ? (
                          <button
                            type="button"
                            className={styles.linePrijsReset}
                            onClick={() => setField(r.overrideKey!, undefined)}
                            title="Terug naar de prijslijst"
                            aria-label="Prijs terug naar de prijslijst"
                          >
                            <RotateCcw size={12} strokeWidth={2.5} />
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      formatEuro(r.prijs)
                    )}
                  </span>
                  <span className={styles.lineTotal}>{formatEuro(r.totaal)}</span>
                </span>
              </div>
            ))
          )}
        </div>

        <div className={styles.div} />

        <div className={styles.totalsRows}>
          <div className={styles.totalsRow}>
            <span className={styles.totalsRowMuted}>Subtotaal diensten</span>
            <span className={styles.totalsValue}>{formatEuro(dienstenSubtotaal)}</span>
          </div>
          {totals.korstmosToeslag > 0 ? (
            <div className={styles.totalsRow}>
              <span className={styles.totalsRowMuted}>Korstmos-toeslag (10%)</span>
              <span className={styles.totalsValue}>{formatEuro(totals.korstmosToeslag)}</span>
            </div>
          ) : null}
          {totals.kortingBedrag > 0 ? (
            <div className={`${styles.totalsRow} ${styles.kortingRowLine}`}>
              <span>Actiekorting ({Math.round(effectiveKortingPct)}%)</span>
              <span className={styles.totalsValue}>− {formatEuro(totals.kortingBedrag)}</span>
            </div>
          ) : null}
          {reiskostenTotaal > 0 ? (
            <div className={styles.totalsRow}>
              <span className={styles.totalsRowMuted}>Reiskosten</span>
              <span className={styles.totalsValue}>{formatEuro(reiskostenTotaal)}</span>
            </div>
          ) : null}
          <div className={styles.totalsRow}>
            <span className={styles.totalsRowMuted}>Totaal excl. BTW</span>
            <span className={styles.totalsValue}>{formatEuro(totals.total)}</span>
          </div>
          <div className={styles.totalsRow}>
            <span className={styles.totalsRowMuted}>BTW (21%)</span>
            <span className={styles.totalsValue}>{formatEuro(totals.btw)}</span>
          </div>
        </div>

        <div className={styles.grandLine}>
          <span className={styles.grandLineL}>
            <span className={styles.grandLineTitle}>Totaal incl. BTW</span>
            <span className={styles.grandLineSub}>geldig t/m {formatDatumKort(vervalDatum)}</span>
          </span>
          <span className={styles.grandLineV}>{formatEuro(totals.total + totals.btw)}</span>
        </div>

        {fotosCount > 0 ? (
          <span className={styles.grandLineSub}>
            {fotosCount} {fotosCount === 1 ? 'foto' : "foto's"} bijgevoegd
          </span>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => {
              flushPending()
              setPdfOpen(true)
            }}
          >
            <FileText size={16} aria-hidden="true" /> Bekijk PDF
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
          >
            <Download size={16} aria-hidden="true" /> {pdfBusy ? 'Bezig…' : 'Download PDF'}
          </button>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSendClick}
            disabled={approving}
          >
            <MessageCircle size={16} aria-hidden="true" />{' '}
            {approving ? 'Versturen…' : 'Direct versturen naar klant'}
          </button>
        </div>

        <button type="button" className={styles.historieLink} onClick={() => setHistOpen(true)}>
          <Clock size={14} aria-hidden="true" /> Historie
        </button>

        {live ? (
          <button
            type="button"
            className={styles.historieLink}
            onClick={handleRevert}
            disabled={reverting}
          >
            <RotateCcw size={14} aria-hidden="true" />{' '}
            {reverting ? 'Terugzetten…' : 'Terug naar verstuurde versie'}
          </button>
        ) : null}
      </section>

      {/* ── Overlays ── */}
      <OffertePdfPreview open={pdfOpen} onClose={() => setPdfOpen(false)} data={pdfData} />
      <OfferteHistorie
        open={histOpen}
        onClose={() => setHistOpen(false)}
        huidigBedrag={totals.total + totals.btw}
        versies={versies}
      />
    </div>
  )
}
