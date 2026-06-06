'use client'

/**
 * LeadOfferteForm — form-stijl variant van de Offerte-tab.
 *
 * Geport van het QuoteTabForm-prototype (Babel/plain-JS, niet in deze repo).
 * We nemen het visuele ontwerp + de sectie-structuur over, maar gebruiken het
 * echte data-model (`ManualOfferteData`) en de repo-helpers:
 *  - mapLeadToFormData(lead)          → init-state uit de lead
 *  - computeRules / computeTotals     → live prijsafleiding (geen herimplementatie)
 *  - saveOfferteForm(...)             → debounced server-persist
 *  - formatEuro(...)                  → geldweergave
 *
 * Auto-save spiegelt LeadOfferte.tsx: 600ms-debounce over een fingerprint van
 * data + geldigheidDagen, skip-first-render, saveState 'idle'|'saving'|'saved',
 * reset naar idle na 2s, alert + fingerprint-reset bij fout.
 *
 * Bewust NIET geport uit het prototype:
 *  - Inline PDF-modal (QFPdf): we hergebruiken de /offerte-preview route.
 *  - "Vaste prijs" voor extra arbeid: het gedeelde pricing-model is
 *    minuten-gebaseerd (min × personen × tarief), een vaste prijs kan niet
 *    via computeRules gepersisteerd worden, dus weggelaten.
 *  - "Planten in de buurt" ja/nee: het model kent geen los veld hiervoor
 *    (alleen planten_afschermen_actief), dus lokale display-state.
 *  - Per-sectie "Toelichting voor klant": het schema heeft geen kolom, dus
 *    lokale display-only state (niet gepersisteerd).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, Check, MessageCircle, FileText } from 'lucide-react'
import type { Lead, Offerte, Prijsregel } from '@/lib/dashboard/database.types'
import type { ManualOfferteData } from '@/lib/dashboard/manual-offerte-types'
import { computeRules, computeTotals } from '@/lib/dashboard/manual-offerte-rules'
import type { ManualOffertePricing } from '@/lib/dashboard/pricing-types'
import { formatEuro } from '@/lib/dashboard/format'
import { mapLeadToFormData } from '@/lib/dashboard/offerte-form-mapping'
import { saveOfferteForm } from '@/lib/dashboard/offerte-form-actions'
import styles from './LeadOfferteForm.module.css'

type Props = {
  leadId: string
  lead: Lead
  /** Geaccepteerd voor pariteit met LeadOfferte; hier niet strikt nodig. */
  prijsregels: Prijsregel[]
  /** Geaccepteerd voor pariteit (bv. aangemaakt_op als geldig-tot basis). */
  offertes: Offerte[]
  fotosCount?: number
  pricing: ManualOffertePricing
  /**
   * Embedded in de mobiele dossier-shell: verbergt de eigen actieknoppen
   * (de dossier-actiebalk levert de CTA) en gebruikt geen eigen horizontale
   * padding (de .tabBody van het dossier doet dat al). Default false (desktop).
   */
  embedded?: boolean
}

/** Display-only toelichtingen, gekeyed op sectie. Niet gepersisteerd. */
type NotesState = {
  werk: string
  diensten: string
  voegzand: string
  korting: string
}

/** Nederlandse maand-namen voor de "geldig t/m"-datumweergave. */
const MAANDEN_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/** "19 juni 2026" voor een gegeven Date. */
function formatDatumLang(d: Date): string {
  return `${d.getDate()} ${MAANDEN_NL[d.getMonth()]} ${d.getFullYear()}`
}

/** "dd-mm-yyyy" voor het geldig-t/m-label in de gradient-balk. */
function formatDatumKort(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

/** Stabiele fingerprint voor change-detection (vermijdt dubbele saves). */
function dataFingerprint(data: ManualOfferteData, geldigheidDagen: number): string {
  return JSON.stringify(data) + `|${geldigheidDagen}`
}

export function LeadOfferteForm({
  leadId,
  lead,
  fotosCount = 0,
  pricing,
  embedded = false,
}: Props) {
  // ─── Enige bron van waarheid ───────────────────────────────
  const [data, setData] = useState<ManualOfferteData>(() => mapLeadToFormData(lead))
  const [geldigheidDagen, setGeldigheidDagen] = useState<number>(
    lead.offerte_geldigheid_dagen ?? 14,
  )

  /** Helper om één veld te updaten zonder de rest aan te raken. */
  const setField = useCallback(
    <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => {
      setData((s) => ({ ...s, [k]: v }))
    },
    [],
  )

  // ─── Lokale display-only state (niet in het model/schema) ──
  // "Planten in de buurt" heeft geen eigen veld; alleen UI-pariteit.
  const [plantenBuurt, setPlantenBuurt] = useState<'ja' | 'nee'>('nee')
  // Per-sectie toelichtingen; worden (nog) nergens opgeslagen.
  const [notes, setNotes] = useState<NotesState>({
    werk: '', diensten: '', voegzand: '', korting: '',
  })
  const setNote = useCallback((k: keyof NotesState, v: string) => {
    setNotes((s) => ({ ...s, [k]: v }))
  }, [])

  // ─── Save-state ────────────────────────────────────────────
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [toast, setToast] = useState<string | null>(null)

  // ─── Debounce-machinerie (spiegelt LeadOfferte) ────────────
  const isFirstRenderRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFingerprintRef = useRef<string | null>(null)

  /** Voert de server-call uit; manages saveState. */
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
        // Fingerprint resetten zodat een retry niet als "no-op" geldt.
        lastFingerprintRef.current = null
        // eslint-disable-next-line no-alert
        alert(`Opslaan mislukt: ${res.error}`)
      }
    },
    [leadId],
  )

  // ─── Debounced auto-save effect (600ms) ────────────────────
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      lastFingerprintRef.current = dataFingerprint(data, geldigheidDagen)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

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

  // Cleanup open timers bij unmount (StrictMode-veilig).
  useEffect(() => {
    return () => {
      if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  // ─── Live afleiding ────────────────────────────────────────
  const rules = useMemo(() => computeRules(data, pricing), [data, pricing])
  const totals = useMemo(() => computeTotals(rules, data), [rules, data])

  // Reiskosten apart tonen: die zijn niet kortbaar, dus los van het
  // diensten-subtotaal in het live prijsoverzicht.
  const reiskostenTotaal = useMemo(
    () => rules.filter((r) => r.eenheid === 'km').reduce((s, r) => s + r.totaal, 0),
    [rules],
  )
  const dienstenSubtotaal = totals.subtotal - reiskostenTotaal

  // Kortbare grondslag: diensten + korstmos-toeslag (nooit reiskosten). Hierover
  // wordt de actiekorting berekend, dus ook de omrekening vast-bedrag → percentage.
  const kortbareGrondslag = dienstenSubtotaal + totals.korstmosToeslag

  // "Vast bedrag"-invoer voor de actiekorting. Het systeem werkt onderwater met
  // een percentage (korting_percentage); een vast euro-bedrag rekenen we om naar
  // het equivalente percentage. Lokale tekst-state zodat typen soepel blijft.
  const [kortingEuro, setKortingEuro] = useState<string>(() => {
    const euro = (kortbareGrondslag * (Number(data.korting_percentage) || 0)) / 100
    return euro > 0 ? euro.toFixed(2) : ''
  })

  /** Zet de korting via percentage (slider) en sync het vast-bedrag-veld. */
  const setKortingPct = useCallback(
    (pct: number) => {
      const clamped = Math.max(0, Math.min(100, pct))
      setField('korting_percentage', clamped)
      const euro = (kortbareGrondslag * clamped) / 100
      setKortingEuro(euro > 0 ? euro.toFixed(2) : '')
    },
    [setField, kortbareGrondslag],
  )

  /** Zet de korting via een vast euro-bedrag, omgerekend naar percentage. */
  const setKortingVastBedrag = useCallback(
    (text: string) => {
      setKortingEuro(text)
      const amt = Number(text.replace(',', '.')) || 0
      const pct = kortbareGrondslag > 0 ? Math.min(100, (amt / kortbareGrondslag) * 100) : 0
      setField('korting_percentage', pct)
    },
    [setField, kortbareGrondslag],
  )

  // Vervaldatum = vandaag + N dagen.
  const vervalDatum = useMemo(
    () => new Date(Date.now() + geldigheidDagen * 86400000),
    [geldigheidDagen],
  )

  // Live extra-arbeid totaal (min × personen × tarief).
  const arbeidTotaal =
    (Number(data.extra_arbeid_minuten) || 0) *
    (Number(data.extra_arbeid_personen) || 0) *
    pricing.extra_arbeid_per_min

  // ─── Sub-dienst toggle (behoudt overige sub-waarden) ───────
  const toggleSub = useCallback(
    (k: ManualOfferteData['sub'][number]) => {
      setData((s) => {
        const has = s.sub.includes(k)
        return {
          ...s,
          sub: has ? s.sub.filter((x) => x !== k) : [...s.sub, k],
        }
      })
    },
    [],
  )

  // ─── Factuuradres: editen zet factuur_zelfde=false ─────────
  const setFactuurField = useCallback(
    <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => {
      setData((s) => ({ ...s, [k]: v, factuur_zelfde: false }))
    },
    [],
  )

  // ─── Voegzand: actief zodra zakken of m² > 0 ───────────────
  // computeRules leest voegzand_*_actief; we houden die in sync met de
  // ingevoerde waarden zodat regels meteen verschijnen.
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

  // ─── Handlers (spiegelen LeadOfferte) ──────────────────────
  const handlePdfClick = useCallback(() => {
    // Pending debounce flushen zodat de preview de laatste edits toont.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      const fp = dataFingerprint(data, geldigheidDagen)
      if (fp !== lastFingerprintRef.current) {
        lastFingerprintRef.current = fp
        void flushSave(data, geldigheidDagen)
      }
    }
    window.open(`/offerte-preview/${leadId}`, '_blank', 'noopener,noreferrer')
  }, [data, geldigheidDagen, flushSave, leadId])

  const handleSendClick = useCallback(() => {
    // Stub zoals LeadOfferte.handleSendClick; verzending wordt later gekoppeld.
    // eslint-disable-next-line no-alert
    alert(
      'Versturen via WhatsApp wordt binnenkort gekoppeld.\n\n(stub, geen verzonden-promotie)',
    )
    setToast('Offerte verstuurd')
    window.setTimeout(() => setToast(null), 2500)
  }, [])

  const saveLabel =
    saveState === 'saving' ? 'Opslaan…' : saveState === 'saved' ? 'Opgeslagen' : ''

  return (
    <div className={`${styles.qf} ${embedded ? styles.embedded : ''}`}>
      {/* ─── 1. Status-strip ─── */}
      <div className={styles.status}>
        <div className={styles.version}>v3</div>
        <div className={styles.statusText}>
          <span className={styles.statusTitle}>Concept</span>
          <span className={styles.statusSub}>niet verstuurd</span>
        </div>
        <div className={styles.statusSpacer} />
        {fotosCount > 0 ? (
          <span className={styles.statusSub}>
            {fotosCount} {fotosCount === 1 ? "foto" : "foto's"}
          </span>
        ) : null}
        {saveLabel ? (
          <span
            className={`${styles.statusSave} ${
              saveState === 'saved' ? styles.statusSaved : ''
            }`}
          >
            {saveLabel}
          </span>
        ) : null}
        <button type="button" className={styles.statusPdf} onClick={handlePdfClick}>
          <Eye size={15} aria-hidden /> PDF-voorbeeld
        </button>
      </div>

      {/* ─── 2. Eyebrow ─── */}
      <div className={styles.eyebrow}>
        <span>Gegevens aanpassen</span>
        <i />
      </div>

      {/* ─── 3. Klantgegevens op offerte ─── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Klantgegevens op offerte</span>
        </div>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Naam</span>
            <input
              className={styles.input}
              value={data.naam}
              onChange={(e) => setField('naam', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Bedrijfsnaam <span className={styles.labelHint}>(optioneel)</span>
            </span>
            <input
              className={styles.input}
              value={data.bedrijf}
              onChange={(e) => setField('bedrijf', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>E-mail</span>
            <input
              type="email"
              className={styles.input}
              value={data.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Telefoon op offerte</span>
            <input
              type="tel"
              className={styles.input}
              value={data.telefoon}
              onChange={(e) => setField('telefoon', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Postcode</span>
            <input
              className={styles.input}
              value={data.postcode}
              onChange={(e) => setField('postcode', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Huisnummer</span>
            <input
              className={styles.input}
              value={data.huisnummer}
              onChange={(e) => setField('huisnummer', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Straat</span>
            <input
              className={styles.input}
              value={data.straat}
              onChange={(e) => setField('straat', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Plaats</span>
            <input
              className={styles.input}
              value={data.plaats}
              onChange={(e) => setField('plaats', e.target.value)}
            />
          </label>
        </div>

        <p className={styles.subRule}>
          Factuuradres{' '}
          <span>(alleen invullen als afwijkt van werk-adres)</span>
        </p>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Factuur-postcode</span>
            <input
              className={styles.input}
              value={data.factuur_postcode}
              onChange={(e) => setFactuurField('factuur_postcode', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Factuur-huisnummer</span>
            <input
              className={styles.input}
              value={data.factuur_huisnummer}
              onChange={(e) => setFactuurField('factuur_huisnummer', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Factuur-straat</span>
            <input
              className={styles.input}
              value={data.factuur_straat}
              onChange={(e) => setFactuurField('factuur_straat', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Factuur-plaats</span>
            <input
              className={styles.input}
              value={data.factuur_plaats}
              onChange={(e) => setFactuurField('factuur_plaats', e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* ─── 4. Werk & oppervlakte ─── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Werk &amp; oppervlakte</span>
        </div>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Oppervlakte m²</span>
            <div className={styles.numBox}>
              <input
                type="number"
                min={0}
                className={styles.numInput}
                value={data.m2}
                onChange={(e) => setField('m2', Number(e.target.value))}
              />
              <span className={styles.numAffix}>m²</span>
            </div>
          </label>
          <label className={styles.field}>
            {/* Display-only: het model kent geen los "planten in de buurt"-veld. */}
            <span className={styles.label}>Planten in de buurt</span>
            <select
              className={styles.select}
              value={plantenBuurt}
              onChange={(e) => setPlantenBuurt(e.target.value as 'ja' | 'nee')}
            >
              <option value="nee">Nee</option>
              <option value="ja">Ja</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Groene aanslag</span>
            <select
              className={styles.select}
              value={data.groene_aanslag}
              onChange={(e) => setField('groene_aanslag', e.target.value as 'ja' | 'nee')}
            >
              <option value="nee">Nee</option>
              <option value="ja">Ja</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Korstmos aanwezig (10% toeslag)</span>
            <select
              className={styles.select}
              value={data.korstmos}
              onChange={(e) => setField('korstmos', e.target.value as 'ja' | 'nee')}
            >
              <option value="nee">Nee</option>
              <option value="ja">Ja</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Planten afschermen</span>
            <select
              className={styles.select}
              value={data.planten_afschermen_actief ? 'ja' : 'nee'}
              onChange={(e) =>
                setField('planten_afschermen_actief', e.target.value === 'ja')
              }
            >
              <option value="nee">Nee</option>
              <option value="ja">Ja</option>
            </select>
          </label>
        </div>
        <div className={styles.note}>
          <span className={styles.noteLabel}>Toelichting voor klant (optioneel)</span>
          <textarea
            className={styles.noteArea}
            placeholder="Bijvoorbeeld, extra uitleg over het werk…"
            value={notes.werk}
            onChange={(e) => setNote('werk', e.target.value)}
          />
        </div>
      </section>

      {/* ─── 5. Extra diensten ─── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Extra diensten</span>
        </div>
        <div className={styles.checks}>
          {([
            ['invegen', 'Invegen'],
            ['preventieve_onkruid', 'Preventieve onkruidbeheersing'],
            ['beschermlaag', 'Nieuwe beschermlaag'],
          ] as const).map(([k, label]) => {
            const on = data.sub.includes(k)
            return (
              <button
                key={k}
                type="button"
                className={`${styles.check} ${on ? styles.on : ''}`}
                aria-pressed={on}
                onClick={() => toggleSub(k)}
              >
                <span className={styles.checkBox}>
                  {on ? <Check size={14} aria-hidden /> : null}
                </span>
                <span className={styles.checkL}>{label}</span>
              </button>
            )
          })}
        </div>
        <div className={styles.note}>
          <span className={styles.noteLabel}>Toelichting voor klant (optioneel)</span>
          <textarea
            className={styles.noteArea}
            placeholder="Bijvoorbeeld, wat de extra diensten inhouden…"
            value={notes.diensten}
            onChange={(e) => setNote('diensten', e.target.value)}
          />
        </div>
      </section>

      {/* ─── 6. Extra arbeid ─── */}
      {/* Vaste-prijs-veld weggelaten: het gedeelde pricing-model is
          minuten-gebaseerd (min × personen × tarief). */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Extra arbeid</span>
        </div>
        <div className={styles.arbeid}>
          <label className={styles.field}>
            <span className={styles.numLabel}>Minuten</span>
            <div className={styles.numBox}>
              <input
                type="number"
                min={0}
                className={styles.numInput}
                value={data.extra_arbeid_minuten}
                onChange={(e) => setField('extra_arbeid_minuten', Number(e.target.value))}
              />
            </div>
          </label>
          <label className={styles.field}>
            <span className={styles.numLabel}>Personen</span>
            <div className={styles.numBox}>
              <input
                type="number"
                min={0}
                className={styles.numInput}
                value={data.extra_arbeid_personen}
                onChange={(e) => setField('extra_arbeid_personen', Number(e.target.value))}
              />
            </div>
          </label>
          <div className={styles.field}>
            <span className={styles.numLabel}>Totaal</span>
            <span className={styles.arbeidBedrag}>{formatEuro(arbeidTotaal)}</span>
          </div>
        </div>
      </section>

      {/* ─── 7. Voegzand (alleen bij invegen) ─── */}
      {data.sub.includes('invegen') ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Voegzand</span>
          </div>

          <div className={styles.zandRow}>
            <span className={styles.zandName}>Normaal</span>
            <label className={styles.field}>
              <span className={styles.numLabel}>Aantal zakken</span>
              <div className={styles.numBox}>
                <input
                  type="number"
                  min={0}
                  className={styles.numInput}
                  value={data.voegzand_normaal_zakken}
                  onChange={(e) =>
                    setVoegzandNormaal({ voegzand_normaal_zakken: Number(e.target.value) })
                  }
                />
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>Invegen-m²</span>
              <div className={styles.numBox}>
                <input
                  type="number"
                  min={0}
                  className={styles.numInput}
                  value={data.voegzand_normaal_m2}
                  onChange={(e) =>
                    setVoegzandNormaal({ voegzand_normaal_m2: Number(e.target.value) })
                  }
                />
                <span className={styles.numAffix}>m²</span>
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>€ per zak</span>
              <div className={styles.numBox}>
                <span className={styles.numAffix}>€</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={styles.numInput}
                  value={data.voegzand_normaal_prijs}
                  onChange={(e) =>
                    setVoegzandNormaal({ voegzand_normaal_prijs: Number(e.target.value) })
                  }
                />
              </div>
            </label>
          </div>

          <div className={styles.zandRow}>
            <span className={styles.zandName}>Onkruidwerend</span>
            <label className={styles.field}>
              <span className={styles.numLabel}>Aantal zakken</span>
              <div className={styles.numBox}>
                <input
                  type="number"
                  min={0}
                  className={styles.numInput}
                  value={data.voegzand_onkruidwerend_zakken}
                  onChange={(e) =>
                    setVoegzandOnkruid({ voegzand_onkruidwerend_zakken: Number(e.target.value) })
                  }
                />
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>Invegen-m²</span>
              <div className={styles.numBox}>
                <input
                  type="number"
                  min={0}
                  className={styles.numInput}
                  value={data.voegzand_onkruidwerend_m2}
                  onChange={(e) =>
                    setVoegzandOnkruid({ voegzand_onkruidwerend_m2: Number(e.target.value) })
                  }
                />
                <span className={styles.numAffix}>m²</span>
              </div>
            </label>
            <label className={styles.field}>
              <span className={styles.numLabel}>€ per zak</span>
              <div className={styles.numBox}>
                <span className={styles.numAffix}>€</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={styles.numInput}
                  value={data.voegzand_onkruidwerend_prijs}
                  onChange={(e) =>
                    setVoegzandOnkruid({ voegzand_onkruidwerend_prijs: Number(e.target.value) })
                  }
                />
              </div>
            </label>
          </div>

          <div className={styles.kleuren}>
            <button
              type="button"
              className={`${styles.check} ${styles.checkInline} ${
                data.kleur_naturel ? styles.on : ''
              }`}
              aria-pressed={data.kleur_naturel}
              onClick={() => setField('kleur_naturel', !data.kleur_naturel)}
            >
              <span className={styles.swatch} style={{ background: '#C6BBA1' }} />
              <span className={styles.checkL}>Naturel</span>
            </button>
            <button
              type="button"
              className={`${styles.check} ${styles.checkInline} ${
                data.kleur_antraciet ? styles.on : ''
              }`}
              aria-pressed={data.kleur_antraciet}
              onClick={() => setField('kleur_antraciet', !data.kleur_antraciet)}
            >
              <span className={styles.swatch} style={{ background: '#3A3A3A' }} />
              <span className={styles.checkL}>Antraciet</span>
            </button>
          </div>

          <div className={styles.note}>
            <span className={styles.noteLabel}>Toelichting voor klant (optioneel)</span>
            <textarea
              className={styles.noteArea}
              placeholder="Bijvoorbeeld, keuze van voegzand toelichten…"
              value={notes.voegzand}
              onChange={(e) => setNote('voegzand', e.target.value)}
            />
          </div>
        </section>
      ) : null}

      {/* ─── 8. Actiekorting ─── */}
      <section className={`${styles.card} ${styles.cardAccent}`}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Actiekorting</span>
          <span className={styles.cardHint}>Alleen op diensten, niet op reiskosten</span>
        </div>
        <div className={styles.korting}>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            className={styles.slider}
            value={Math.round(data.korting_percentage)}
            onChange={(e) => setKortingPct(Number(e.target.value))}
            aria-label="Actiekorting percentage"
          />
          <span className={styles.kortingPct}>{Math.round(data.korting_percentage)}%</span>
          <span className={styles.kortingEur}>{formatEuro(totals.kortingBedrag)}</span>
        </div>
        <div className={styles.kortingVast}>
          <span className={styles.kortingVastLabel}>Of vast bedrag</span>
          <div className={styles.numBox}>
            <span className={styles.numAffix}>€</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className={styles.numInput}
              value={kortingEuro}
              placeholder="0,00"
              onChange={(e) => setKortingVastBedrag(e.target.value)}
              aria-label="Vast kortingsbedrag in euro"
            />
          </div>
        </div>
        <div className={styles.note}>
          <span className={styles.noteLabel}>Toelichting voor klant (optioneel)</span>
          <textarea
            className={styles.noteArea}
            placeholder="Bijvoorbeeld, reden van de actiekorting…"
            value={notes.korting}
            onChange={(e) => setNote('korting', e.target.value)}
          />
        </div>
      </section>

      {/* ─── 9. Geldigheid offerte ─── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Geldigheid offerte</span>
        </div>
        <div className={styles.geldig}>
          <span className={styles.geldigL}>Aantal dagen geldig vanaf vandaag</span>
          <input
            type="number"
            min={1}
            className={styles.geldigInput}
            value={geldigheidDagen}
            onChange={(e) => setGeldigheidDagen(Math.max(1, Number(e.target.value) || 1))}
          />
          <span className={styles.geldigSuffix}>dagen</span>
        </div>
        <p className={styles.geldigHint}>
          De vervaldatum wordt berekend als vandaag + dit aantal dagen:{' '}
          <strong>{formatDatumLang(vervalDatum)}</strong>
        </p>
      </section>

      {/* ─── 10. Live prijsoverzicht ─── */}
      <section className={styles.totals}>
        <div className={styles.overviewHead}>
          <span className={styles.overviewTitle}>Live prijsoverzicht</span>
          <span className={styles.overviewUpdated}>
            {saveState === 'saving' ? 'Opslaan…' : 'Bijgewerkt'}
          </span>
        </div>

        {/* Afgeleide prijsregels, uitgesplitst */}
        <div className={styles.lineList}>
          {rules.length === 0 ? (
            <div className={styles.lineEmpty}>Nog geen diensten geselecteerd.</div>
          ) : (
            rules.map((r, i) => (
              <div className={styles.lineRow} key={`${r.desc}-${i}`}>
                <span className={styles.lineLabel}>{r.desc}</span>
                <span className={styles.lineRight}>
                  <span className={styles.lineMeta}>
                    {r.aantal} {r.eenheid} × {formatEuro(r.prijs)}
                  </span>
                  <span className={styles.lineTotal}>{formatEuro(r.totaal)}</span>
                </span>
              </div>
            ))
          )}
        </div>

        <div className={styles.totalsDiv} />

        {/* Samenvatting: diensten, korting (groen), reiskosten apart, BTW */}
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
            <div className={`${styles.totalsRow} ${styles.kortingRow}`}>
              <span>Actiekorting ({totals.discount}%)</span>
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

        {/* Eind-totaal: foto-2 layout, eigen brand-kleur */}
        <div className={styles.grandLine}>
          <div className={styles.grandLineL}>
            <span className={styles.grandLineTitle}>Totaal incl. BTW</span>
            <span className={styles.grandLineSub}>
              geldig t/m {formatDatumKort(vervalDatum)}
            </span>
          </div>
          <span className={styles.grandLineV}>{formatEuro(totals.total + totals.btw)}</span>
        </div>

        {/* In de mobiele dossier-shell leveren we de CTA via de sticky
            actiebalk; daar verbergen we de eigen knoppen. */}
        {!embedded ? (
          <div className={styles.actions}>
            <button type="button" className={styles.btnSecondary} onClick={handlePdfClick}>
              <FileText size={15} aria-hidden /> PDF
            </button>
            <button type="button" className={styles.btnPrimary} onClick={handleSendClick}>
              <MessageCircle size={15} aria-hidden /> Versturen via WhatsApp
            </button>
          </div>
        ) : null}
      </section>

      {toast ? (
        <div className={styles.toast} role="status">
          <Check size={15} aria-hidden /> {toast}
        </div>
      ) : null}
    </div>
  )
}
