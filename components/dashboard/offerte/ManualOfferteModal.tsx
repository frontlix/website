'use client'

import { useState, useMemo, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Check,
  FileText,
  Mail,
  Eye,
  StickyNote,
} from 'lucide-react'
import {
  DEFAULTS,
  type ManualOfferteData,
} from '@/lib/dashboard/manual-offerte-types'
import { computeRules, computeTotals } from '@/lib/dashboard/manual-offerte-rules'
import { formatEuro } from '@/lib/dashboard/format'
import { createManualLeadEnOfferte } from '@/lib/dashboard/manual-offerte-actions'
import { getAutoAfstandKm } from '@/lib/dashboard/afstand-actions'
import { getPricingForOffertePreview } from '@/lib/dashboard/pricing-actions'
import { FALLBACK_PRICING, type ManualOffertePricing } from '@/lib/dashboard/pricing-types'
import { StepStart } from './StepStart'
import { StepKlant, isValidEmail } from './StepKlant'
import { StepWerk } from './StepWerk'
import { StepOfferte } from './StepOfferte'
import { StepVersturen } from './StepVersturen'
import { OffertePdfDocument } from './OffertePdf'
import styles from './ManualOfferteModal.module.css'

const STEPS = [
  { n: 1, l: 'Klant' },
  { n: 2, l: 'Werk' },
  { n: 3, l: 'Offerte' },
  { n: 4, l: 'Versturen' },
] as const

// localStorage-sleutels — V1 was één draft, V2 is een array zodat meerdere
// concepten naast elkaar kunnen leven. Migratie van V1 → V2 gebeurt
// éénmalig bij modal-open.
const DRAFT_KEY_V1 = 'frontlix-handmatige-offerte-draft-v1'
const DRAFTS_KEY_V2 = 'frontlix-handmatige-offerte-drafts-v2'
const DRAFT_DEBOUNCE_MS = 600
const MAX_DRAFTS = 10

type DraftEntry = {
  id: string
  savedAt: string
  klantNaam: string
  data: ManualOfferteData
}

function makeDraftId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function deriveKlantNaam(data: ManualOfferteData): string {
  return data.naam.trim() || 'Onbekende klant'
}

/**
 * Vergelijkt de huidige data met DEFAULTS via JSON-stringify. Goedkoop
 * genoeg voor één state-object en vermijdt een dependency op deep-equal.
 */
function isDefaultsData(data: ManualOfferteData): boolean {
  return JSON.stringify(data) === JSON.stringify(DEFAULTS)
}

/**
 * Formatteert een ISO-datum als korte Nederlandse "16 mei, 11:08" string.
 */
function formatDraftSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function ManualOfferteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(1)
  const [data, setData] = useState<ManualOfferteData>(DEFAULTS)
  // Viewport-detectie voor mobile-only Step 0 + alternatieve header/footer.
  // Default `false` matcht SSR/desktop; effect onder corrigeert dat na mount.
  const [isMobile, setIsMobile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Pricing-snapshot uit pricing_rules. Initieel FALLBACK zodat de wizard
  // direct werkt; na fetch wordt deze vervangen door de live waardes.
  const [pricing, setPricing] = useState<ManualOffertePricing>(FALLBACK_PRICING)
  // Geocoding-status per adres — `true` betekent: postcode + huisnummer
  // ingevuld maar postcode.tech kon 'm niet vinden. UI toont dan een
  // waarschuwing zodat de user weet dat 'ie 't handmatig moet aanvullen.
  const [werkAdresNotFound, setWerkAdresNotFound] = useState(false)
  const [factuurAdresNotFound, setFactuurAdresNotFound] = useState(false)

  // Lock scroll while modal open — restore naar lege string i.p.v.
  // gecapteerde prev-value zodat overlay-stacking nooit een permanente
  // body-lock achterlaat.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // matchMedia-luistraar voor mobile-viewport. Triggert ook bij rotate
  // of resize tijdens een open modal — header/footer/progress passen
  // zich automatisch aan.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Eénmalige flag — voorkomt dat we de user terugkatapulteren naar
  // Step 0 als 'ie al naar Step 1+ is doorgeklikt en vervolgens iets
  // van viewport-breedte verandert (rotatie, devtools, dubbele HMR).
  const initialMobileStepDecided = useRef(false)

  // Bij eerste mobile-detectie:
  //  - spring naar Step 0 (entry-scherm) mits de user nog op Step 1 staat
  //  - verberg de drafts-banners by default; op mobile alleen tonen
  //    wanneer de user expliciet op het note-icoon rechtsboven tikt
  //    (toggle setBannersDismissed in de header).
  useEffect(() => {
    if (initialMobileStepDecided.current) return
    if (!isMobile) return
    initialMobileStepDecided.current = true
    if (step === 1) {
      setStep(0)
    }
    setBannersDismissed(true)
  }, [isMobile, step])

  // Haal actuele pricing op en pre-fill voegzand/planten-prijzen mét de
  // live waardes. We overschrijven alleen velden die nog op de hardcoded
  // default staan — als de user al wat heeft ingetypt, raken we dat niet.
  useEffect(() => {
    let cancelled = false
    getPricingForOffertePreview().then((p) => {
      if (cancelled) return
      setPricing(p)
      setData((prev) => {
        const next = { ...prev }
        if (prev.voegzand_normaal_prijs === DEFAULTS.voegzand_normaal_prijs) {
          next.voegzand_normaal_prijs = p.voegzand_normaal_per_zak
        }
        if (prev.voegzand_onkruidwerend_prijs === DEFAULTS.voegzand_onkruidwerend_prijs) {
          next.voegzand_onkruidwerend_prijs = p.voegzand_onkruidwerend_per_zak
        }
        if (prev.planten_afschermen_prijs === DEFAULTS.planten_afschermen_prijs) {
          next.planten_afschermen_prijs = p.plantenafscherming_per_rol
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-vul Afstand, Straat en Plaats zodra postcode + huisnummer
  // geldig zijn. 400ms debounce zodat we postcode.tech niet hameren
  // terwijl de user nog typt. Straat/Plaats vullen we alleen wanneer
  // het veld nog leeg is — een handmatige aanpassing wordt nooit
  // overschreven. Afstand wordt altijd ververst (read-only veld).
  useEffect(() => {
    const pc = data.postcode.trim()
    const hn = data.huisnummer.trim()
    if (!pc || !hn) {
      // Bij leegmaken/wijzigen wist de waarschuwing direct, anders blijft
      // 'ie hangen na het corrigeren van een foute postcode.
      setWerkAdresNotFound(false)
      return
    }
    const t = setTimeout(() => {
      getAutoAfstandKm(pc, hn).then((res) => {
        if (!res.ok) {
          // 'input' = postcode-regex matcht nog niet (user is aan't typen),
          // niet behandelen als echte fout. 'geocode' = postcode.tech vond
          // niks — dat is de mismatch die we willen flaggen.
          setWerkAdresNotFound(res.reason === 'geocode')
          return
        }
        setWerkAdresNotFound(false)
        setData((prev) => ({
          ...prev,
          afstand_km: res.km,
          straat: prev.straat.trim() === '' && res.street ? res.street : prev.straat,
          plaats: prev.plaats.trim() === '' && res.city ? res.city : prev.plaats,
        }))
      })
    }, 400)
    return () => clearTimeout(t)
  }, [data.postcode, data.huisnummer])

  // Zusje van het werk-adres effect, maar voor factuur-adres. Hier
  // gebruiken we het km-resultaat niet (afstand hoort bij werk). Alleen
  // straat + plaats vullen als ze leeg zijn. Triggert ook wanneer de
  // user 'factuur is gelijk aan werk' uitvinkt en daarna gaat typen.
  useEffect(() => {
    if (data.factuur_zelfde) {
      setFactuurAdresNotFound(false)
      return
    }
    const pc = data.factuur_postcode.trim()
    const hn = data.factuur_huisnummer.trim()
    if (!pc || !hn) {
      setFactuurAdresNotFound(false)
      return
    }
    const t = setTimeout(() => {
      getAutoAfstandKm(pc, hn).then((res) => {
        if (!res.ok) {
          setFactuurAdresNotFound(res.reason === 'geocode')
          return
        }
        setFactuurAdresNotFound(false)
        setData((prev) => ({
          ...prev,
          factuur_straat:
            prev.factuur_straat.trim() === '' && res.street ? res.street : prev.factuur_straat,
          factuur_plaats:
            prev.factuur_plaats.trim() === '' && res.city ? res.city : prev.factuur_plaats,
        }))
      })
    }, 400)
    return () => clearTimeout(t)
  }, [data.factuur_zelfde, data.factuur_postcode, data.factuur_huisnummer])

  // Wordt op `true` gezet door StepKlant net vóór een AI-fill. Het
  // auto-zakken-effect skipt dan één run, zodat een door de AI
  // geëxtraheerd zakken-aantal (bv. "7 zakken onkruidwerend") niet
  // direct overschreven wordt door de m²-suggestie.
  const aiJustFilledZakken = useRef(false)
  const suppressNextZakkenAuto = () => {
    aiJustFilledZakken.current = true
  }

  // Auto-defaults voor per-type voegzand-m² zodra toggle of total-m² wijzigt:
  //  - alleen normaal actief    → normaal_m2 = total m², onkruidwerend_m2 = 0
  //  - alleen onkruidwerend     → onkruidwerend_m2 = total m², normaal_m2 = 0
  //  - beide actief             → 50/50 split (handmatig aanpasbaar in StepWerk)
  //  - geen van beide           → beide 0
  // Net als bij zakken-auto-suggest: user-edits worden bij volgende dependency-
  // wijziging overschreven (acceptable trade-off, zelfde pattern als zakken).
  useEffect(() => {
    setData((prev) => {
      const total = Number(prev.m2) || 0
      const onlyNormaal = prev.voegzand_normaal_actief && !prev.voegzand_onkruidwerend_actief
      const onlyOnkruidwerend = !prev.voegzand_normaal_actief && prev.voegzand_onkruidwerend_actief
      const both = prev.voegzand_normaal_actief && prev.voegzand_onkruidwerend_actief
      if (onlyNormaal) {
        return { ...prev, voegzand_normaal_m2: total, voegzand_onkruidwerend_m2: 0 }
      }
      if (onlyOnkruidwerend) {
        return { ...prev, voegzand_normaal_m2: 0, voegzand_onkruidwerend_m2: total }
      }
      if (both) {
        const half = Math.round(total / 2)
        return {
          ...prev,
          voegzand_normaal_m2: half,
          voegzand_onkruidwerend_m2: total - half,
        }
      }
      return { ...prev, voegzand_normaal_m2: 0, voegzand_onkruidwerend_m2: 0 }
    })
  }, [data.m2, data.voegzand_normaal_actief, data.voegzand_onkruidwerend_actief])

  // Auto-suggest zakken op basis van per-type m² ÷ dekking-factor. Vangnet
  // is 5 m²/zak. AI-fill skip-vlag voorkomt dat een geëxtraheerd zakken-
  // aantal direct wordt overschreven.
  useEffect(() => {
    if (aiJustFilledZakken.current) {
      aiJustFilledZakken.current = false
      return
    }
    const dekking = pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5
    setData((prev) => {
      const next = { ...prev }
      if (prev.voegzand_normaal_actief) {
        next.voegzand_normaal_zakken = Math.ceil(
          (Number(prev.voegzand_normaal_m2) || 0) / dekking,
        )
      } else {
        next.voegzand_normaal_zakken = 0
      }
      if (prev.voegzand_onkruidwerend_actief) {
        next.voegzand_onkruidwerend_zakken = Math.ceil(
          (Number(prev.voegzand_onkruidwerend_m2) || 0) / dekking,
        )
      } else {
        next.voegzand_onkruidwerend_zakken = 0
      }
      return next
    })
  }, [
    data.voegzand_normaal_m2,
    data.voegzand_onkruidwerend_m2,
    data.voegzand_normaal_actief,
    data.voegzand_onkruidwerend_actief,
    pricing.voegzand_m2_per_zak,
  ])

  // ── Multi-draft auto-save ──────────────────────────────────────────
  // Concepten leven als array in localStorage. Bij modal-open: laad alle
  // drafts en toon ze als banners (sorted oudste-eerst). Auto-save schrijft
  // naar het draft met `currentDraftId`; bestaat die nog niet, dan maakt
  // de eerste save 'm aan zodat de UI nooit "leeg" raakt.
  //
  // Migratie: één keer V1 (single draft) → V2 (array) op modal-open.
  const [drafts, setDrafts] = useState<DraftEntry[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [bannersDismissed, setBannersDismissed] = useState(false)
  const [draftSavedFlash, setDraftSavedFlash] = useState(false)
  // `true` zodra de user/AI iets in het formulier heeft aangeraakt.
  // Voorkomt dat init-effects (zoals de pricing-fetch die voegzand-
  // prijzen op live-waardes zet) de auto-save triggeren en zo de
  // drafts-banner laten flashen bij modal-open.
  const userHasEditedRef = useRef(false)

  // Mount: migrate V1 → V2 (1×) en load drafts-array
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const v1 = window.localStorage.getItem(DRAFT_KEY_V1)
      if (v1) {
        try {
          const parsedV1 = JSON.parse(v1) as { data?: ManualOfferteData; savedAt?: string }
          if (parsedV1?.data && typeof parsedV1.savedAt === 'string') {
            const migrated: DraftEntry = {
              id: makeDraftId(),
              savedAt: parsedV1.savedAt,
              klantNaam: deriveKlantNaam(parsedV1.data),
              data: parsedV1.data,
            }
            // Schrijf migrated naar V2 (prepend), houdt MAX_DRAFTS aan.
            const existingV2 = window.localStorage.getItem(DRAFTS_KEY_V2)
            const v2List: DraftEntry[] = existingV2 ? JSON.parse(existingV2) : []
            const merged = [migrated, ...v2List].slice(0, MAX_DRAFTS)
            window.localStorage.setItem(DRAFTS_KEY_V2, JSON.stringify(merged))
          }
        } catch {
          // V1-payload corrupt — gewoon negeren bij migratie.
        }
        window.localStorage.removeItem(DRAFT_KEY_V1)
      }

      const raw = window.localStorage.getItem(DRAFTS_KEY_V2)
      if (!raw) return
      const list = JSON.parse(raw) as DraftEntry[]
      if (Array.isArray(list)) {
        setDrafts(list.slice(0, MAX_DRAFTS))
      }
    } catch (e) {
      console.error('[ManualOfferteModal] draft load failed:', e)
    }
  }, [])

  // Auto-save: schrijft current data naar een draft-entry (debounced).
  // Skip wanneer data nog default is — vermijdt lege "Onbekende klant"-
  // drafts bij elke modal-open. Skip ook zolang user/AI niets heeft
  // aangeraakt; pricing-init en dergelijke muteren `data` maar dat
  // mag de drafts-banner niet wegklappen.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!userHasEditedRef.current) return
    if (isDefaultsData(data)) return
    const t = setTimeout(() => {
      try {
        const id = currentDraftId ?? makeDraftId()
        const entry: DraftEntry = {
          id,
          savedAt: new Date().toISOString(),
          klantNaam: deriveKlantNaam(data),
          data,
        }
        setDrafts((prev) => {
          const existingIdx = prev.findIndex((d) => d.id === id)
          const next =
            existingIdx >= 0
              ? prev.map((d, i) => (i === existingIdx ? entry : d))
              : [entry, ...prev]
          const trimmed = next.slice(0, MAX_DRAFTS)
          window.localStorage.setItem(DRAFTS_KEY_V2, JSON.stringify(trimmed))
          return trimmed
        })
        if (!currentDraftId) setCurrentDraftId(id)
        setDraftSavedFlash(true)
      } catch {
        // localStorage vol of disabled — silently fail.
      }
    }, DRAFT_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [data, currentDraftId])

  useEffect(() => {
    if (!draftSavedFlash) return
    const t = setTimeout(() => setDraftSavedFlash(false), 1400)
    return () => clearTimeout(t)
  }, [draftSavedFlash])

  const hervatDraft = (id: string) => {
    const draft = drafts.find((d) => d.id === id)
    if (!draft) return
    userHasEditedRef.current = true
    setData({ ...DEFAULTS, ...draft.data })
    setCurrentDraftId(id)
    setBannersDismissed(true)
    // Sla op mobile het Step 0-entry-scherm over; user heeft al een
    // klant in dit draft, geen reden om opnieuw via de menu-tegels
    // te starten.
    setStep(1)
  }

  const verwijderDraft = (id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id)
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(DRAFTS_KEY_V2, JSON.stringify(next))
        }
      } catch {
        // Niets te doen — localStorage is mogelijk niet beschikbaar.
      }
      return next
    })
    // Als de user dit draft nét aan't bewerken was, reset id zodat de
    // volgende auto-save een nieuw draft begint.
    if (currentDraftId === id) setCurrentDraftId(null)
  }

  // Banners verbergen we zodra de user iets begint te typen (currentDraftId
  // krijgt dan een waarde) of expliciet op een banner heeft geklikt.
  const bannersVisible = !bannersDismissed && drafts.length > 0 && currentDraftId === null
  const currentDraft = currentDraftId ? drafts.find((d) => d.id === currentDraftId) ?? null : null

  const set: <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void = (k, v) => {
    userHasEditedRef.current = true
    setData((d) => ({ ...d, [k]: v }))
  }

  const rules = useMemo(() => computeRules(data, pricing), [data, pricing])
  const totals = useMemo(() => computeTotals(rules, data), [rules, data])

  const valid: Record<1 | 2 | 3, boolean> = {
    // Naam + telefoon (aanwezigheid) + e-mail (format-geldig). E-mail
    // is harder dan telefoon omdat we 'm voor de PDF-verzending nodig
    // hebben — een typo verspilt een offerte. Telefoon blijft soft
    // (vaste lijn / buitenlands nummer mag).
    1:
      Boolean(data.naam.trim()) &&
      Boolean(data.telefoon.trim()) &&
      isValidEmail(data.email),
    2: data.hoofdcategorie.length > 0 && data.sub.length > 0 && Number(data.m2) > 0,
    3: rules.length > 0 && totals.total > 0,
  }
  // Step 0 (mobile entry-scherm) heeft geen formulier-validatie nodig —
  // advancen gebeurt via een tegel of de "Nieuwe klant"-knop in StepStart.
  const canNext =
    step === 0 ? true : step <= 3 ? valid[step as 1 | 2 | 3] : true

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createManualLeadEnOfferte(data)
      if (result.ok) {
        // Draft opruimen — offerte is succesvol aangemaakt, niets meer
        // om te herstellen bij volgend bezoek. Alleen het current draft
        // verwijderen; andere drafts (van andere klanten) blijven staan.
        if (currentDraftId) verwijderDraft(currentDraftId)
        // Als de mail-verzending zelf faalde (offerte staat wel in DB),
        // tonen we de error en blijven we in de modal — user kan dan
        // beslissen om opnieuw te proberen of naar de lead te navigeren.
        if (result.mailError) {
          setError(
            `Offerte is opgeslagen, maar verzenden via e-mail mislukte: ${result.mailError}`,
          )
          return
        }
        router.push(`/leads/${result.leadId}?tab=offerte`)
        router.refresh()
        onClose()
      } else {
        setError(result.error)
      }
    })
  }

  const isSendStep = step === 4
  const submitLabel = data.kanaal === 'manual' ? 'PDF aanmaken' : 'Offerte versturen'
  const SubmitIcon = data.kanaal === 'manual' ? FileText : Mail

  // PDF-download — genereert client-side via @react-pdf/renderer en
  // triggert een browser-download. Geen server-roundtrip; geen lead
  // wordt aangemaakt. Voor "echt versturen" gebruikt de owner de
  // submit-knop.
  const [pdfBusy, setPdfBusy] = useState(false)
  const downloadPdf = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      // Tijdelijk offerte-nummer — placeholder tot de DB er één aanmaakt.
      // Format: OFF-YYYYMMDD-HHMM
      const now = new Date()
      const stamp =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        '-' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0')
      const offerteNummer = `OFF-${stamp}`

      const blob = await pdf(
        <OffertePdfDocument
          data={data}
          rules={rules}
          totals={totals}
          offerteNummer={offerteNummer}
          origin={typeof window !== 'undefined' ? window.location.origin : undefined}
        />,
      ).toBlob()

      const naamSlug = (data.naam || 'klant')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const fileName = `offerte-${naamSlug}-${stamp}.pdf`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[ManualOfferteModal] PDF generation failed:', e)
      setError('PDF genereren mislukt — check console voor details.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.shell} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          {isMobile ? (
            <div className={styles.headerMobileTop}>
              <button
                type="button"
                className={styles.headerMobileBtn}
                onClick={() =>
                  step === 0
                    ? onClose()
                    : setStep((s) => Math.max(0, s - 1) as 0 | 1 | 2 | 3 | 4)
                }
                aria-label={step === 0 ? 'Sluiten' : 'Vorige stap'}
              >
                {step === 0 ? <X size={16} /> : <ChevronLeft size={18} />}
              </button>
              <div className={styles.headerMobileTitleBlock}>
                {step === 0 ? (
                  <span className={styles.headerMobileTitle}>Nieuwe offerte</span>
                ) : (
                  <>
                    <span className={styles.headerMobileTitle}>Handmatige offerte</span>
                    <span className={styles.headerMobileSubtitle}>
                      Stap {step} van 4 · {STEPS[step - 1].l}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                className={styles.headerMobileBtn}
                onClick={() => setBannersDismissed((prev) => !prev)}
                aria-label="Concepten"
                title="Concepten"
              >
                <StickyNote size={16} />
              </button>
            </div>
          ) : (
            <div className={styles.titleRow}>
              <div className={styles.titleBlock}>
                <div className={styles.titleIcon}><Edit3 size={16} /></div>
                <div>
                  <div className={styles.title}>
                    <span className={styles.titleFull}>Handmatige offerte opstellen</span>
                    <span className={styles.titleShort}>Offerte opstellen</span>
                    {currentDraft && (
                      <span className={styles.draftBadge}>
                        {draftSavedFlash ? (
                          <>
                            <Check size={11} /> Opgeslagen
                          </>
                        ) : (
                          <>Auto-saved</>
                        )}
                      </span>
                    )}
                  </div>
                  <div className={styles.subtitle}>
                    Bv. voor een klant die je telefonisch hebt gesproken — Surface stuurt &lsquo;m daarna direct via WhatsApp of mail
                  </div>
                </div>
              </div>
              <button onClick={onClose} className={styles.closeBtn} type="button" aria-label="Sluiten">
                <X size={16} />
              </button>
            </div>
          )}

          {isMobile && step > 0 && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          )}

          {bannersVisible && (
            <div className={styles.draftBannerList}>
              <div className={styles.draftBannerListHead}>
                <span>
                  {drafts.length === 1
                    ? '1 concept bewaard'
                    : `${drafts.length} concepten bewaard`}
                </span>
                <button
                  type="button"
                  onClick={() => setBannersDismissed(true)}
                  className={styles.draftBannerHideAll}
                >
                  Verbergen
                </button>
              </div>
              {drafts.map((d) => (
                <div key={d.id} className={styles.draftBanner} role="status">
                  <div className={styles.draftBannerBody}>
                    <div className={styles.draftBannerTitle}>{d.klantNaam}</div>
                    <div className={styles.draftBannerMeta}>
                      opgeslagen {formatDraftSavedAt(d.savedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => hervatDraft(d.id)}
                    className={styles.draftBannerResume}
                  >
                    Hervatten
                  </button>
                  <button
                    type="button"
                    onClick={() => verwijderDraft(d.id)}
                    className={styles.draftBannerDismiss}
                    aria-label={`Concept van ${d.klantNaam} verwijderen`}
                    title="Concept verwijderen"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Stepper (desktop-only — op mobile gebruiken we de progress bar boven) */}
          {!isMobile && <div className={styles.stepper}>
            {STEPS.map((s, i) => {
              const active = step === s.n
              const done = step > s.n
              const cls = `${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`
              const numCls = `${styles.stepNum} ${active ? styles.stepNumActive : ''} ${done ? styles.stepNumDone : ''}`
              return (
                <span key={s.n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => (done || active) && setStep(s.n as 0 | 1 | 2 | 3 | 4)}
                    className={cls}
                  >
                    <span className={numCls}>
                      {done ? <Check size={12} strokeWidth={3} /> : s.n}
                    </span>
                    {s.l}
                  </button>
                  {i < STEPS.length - 1 && (
                    <span className={styles.stepChevron}><ChevronRight size={14} /></span>
                  )}
                </span>
              )
            })}
          </div>}
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.bodyStack}>
            {step === 0 && (
              <StepStart
                data={data}
                set={set}
                onAdvance={() => setStep(1)}
                onBeforeAiFill={suppressNextZakkenAuto}
              />
            )}
            {step === 1 && (
              <StepKlant
                data={data}
                set={set}
                onBeforeAiFill={suppressNextZakkenAuto}
                werkAdresNotFound={werkAdresNotFound}
                factuurAdresNotFound={factuurAdresNotFound}
              />
            )}
            {step === 2 && <StepWerk data={data} set={set} />}
            {step === 3 && <StepOfferte data={data} set={set} rules={rules} totals={totals} />}
            {step === 4 && <StepVersturen data={data} set={set} rules={rules} totals={totals} />}
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
        </div>

        {/* Footer — desktop versie (heel andere structuur op mobile, zie onder) */}
        {!isMobile && (
          <div className={styles.footer}>
            <button onClick={onClose} className={styles.btnGhost} type="button">Annuleren</button>
            <div className={styles.footerRight}>
              {step >= 3 && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={downloadPdf}
                  disabled={pdfBusy || rules.length === 0}
                  title={
                    rules.length === 0
                      ? 'Vul eerst klant- en werk-gegevens in'
                      : 'Download de offerte als PDF'
                  }
                >
                  <FileText size={13} /> {pdfBusy ? 'PDF maken…' : 'Download PDF'}
                </button>
              )}
              {step > 1 && (
                <button type="button" className={styles.btnSecondary} onClick={() => setStep((s) => Math.max(1, s - 1) as 0 | 1 | 2 | 3 | 4)}>
                  ← Vorige
                </button>
              )}
              {!isSendStep && (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={!canNext}
                  onClick={() => canNext && setStep((s) => Math.min(4, s + 1) as 0 | 1 | 2 | 3 | 4)}
                >
                  Volgende <ChevronRight size={13} />
                </button>
              )}
              {isSendStep && (
                <button type="button" className={styles.btnPrimary} disabled={pending} onClick={submit}>
                  <SubmitIcon size={13} />
                  {pending ? 'Opslaan…' : submitLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile footer — sticky bottom met totaal-bar + primaire CTA.
            Niet getoond op Step 0 (entry-scherm) — daar advancen tegels. */}
        {isMobile && step > 0 && (
          <div className={styles.footerMobile}>
            <div className={styles.mobileTotaalRow}>
              <div className={styles.mobileTotaalText}>
                <span className={styles.mobileTotaalLabel}>TOTAAL INCL. BTW</span>
                <span className={styles.mobileTotaalValue}>
                  {formatEuro(totals.total + totals.btw)}
                </span>
              </div>
              <button
                type="button"
                className={styles.btnPreview}
                onClick={downloadPdf}
                disabled={pdfBusy || rules.length === 0}
                aria-label="Preview"
              >
                <Eye size={14} /> Preview
              </button>
            </div>
            {!isSendStep && (
              <button
                type="button"
                className={styles.btnPrimaryFull}
                disabled={!canNext}
                onClick={() => canNext && setStep((s) => Math.min(4, s + 1) as 0 | 1 | 2 | 3 | 4)}
              >
                {step === 1 && <>Verder naar werk <ChevronRight size={16} /></>}
                {step === 2 && <>Verder naar regels <ChevronRight size={16} /></>}
                {step === 3 && <>Verder naar versturen <ChevronRight size={16} /></>}
              </button>
            )}
            {isSendStep && (
              <button
                type="button"
                className={styles.btnPrimaryFull}
                disabled={pending}
                onClick={submit}
              >
                <SubmitIcon size={16} />
                {pending ? 'Opslaan…' : submitLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
