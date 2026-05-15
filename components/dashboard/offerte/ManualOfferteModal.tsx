'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  ChevronRight,
  Edit3,
  Check,
  FileText,
  MessageCircle,
} from 'lucide-react'
import {
  DEFAULTS,
  type ManualOfferteData,
} from '@/lib/dashboard/manual-offerte-types'
import { computeRules, computeTotals } from '@/lib/dashboard/manual-offerte-rules'
import { createManualLeadEnOfferte } from '@/lib/dashboard/manual-offerte-actions'
import { getAutoAfstandKm } from '@/lib/dashboard/afstand-actions'
import { getPricingForOffertePreview } from '@/lib/dashboard/pricing-actions'
import { FALLBACK_PRICING, type ManualOffertePricing } from '@/lib/dashboard/pricing-types'
import { StepKlant } from './StepKlant'
import { StepWerk } from './StepWerk'
import { StepOfferte } from './StepOfferte'
import { StepVersturen } from './StepVersturen'
import styles from './ManualOfferteModal.module.css'

const STEPS = [
  { n: 1, l: 'Klant' },
  { n: 2, l: 'Werk' },
  { n: 3, l: 'Offerte' },
  { n: 4, l: 'Versturen' },
] as const

export function ManualOfferteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [data, setData] = useState<ManualOfferteData>(DEFAULTS)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Pricing-snapshot uit pricing_rules. Initieel FALLBACK zodat de wizard
  // direct werkt; na fetch wordt deze vervangen door de live waardes.
  const [pricing, setPricing] = useState<ManualOffertePricing>(FALLBACK_PRICING)

  // Lock scroll while modal open
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

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
    if (!pc || !hn) return
    const t = setTimeout(() => {
      getAutoAfstandKm(pc, hn).then((res) => {
        if (!res.ok) return
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

  // Auto-suggest zakken o.b.v. m². Dekkingsfactor komt uit pricing
  // (voegzand_m2_per_zak), met 5 als laatste vangnet.
  useEffect(() => {
    const dekking = pricing.voegzand_m2_per_zak > 0 ? pricing.voegzand_m2_per_zak : 5
    const suggested = Math.ceil((Number(data.m2) || 0) / dekking)
    setData((prev) => {
      if (prev.voegzand_normaal_actief && !prev.voegzand_onkruidwerend_actief) {
        return { ...prev, voegzand_normaal_zakken: suggested, voegzand_onkruidwerend_zakken: 0 }
      }
      if (!prev.voegzand_normaal_actief && prev.voegzand_onkruidwerend_actief) {
        return { ...prev, voegzand_normaal_zakken: 0, voegzand_onkruidwerend_zakken: suggested }
      }
      if (prev.voegzand_normaal_actief && prev.voegzand_onkruidwerend_actief) {
        const half = Math.ceil(suggested / 2)
        return { ...prev, voegzand_normaal_zakken: half, voegzand_onkruidwerend_zakken: suggested - half }
      }
      return prev
    })
  }, [data.m2, data.voegzand_normaal_actief, data.voegzand_onkruidwerend_actief, pricing.voegzand_m2_per_zak])

  const set: <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void = (k, v) =>
    setData((d) => ({ ...d, [k]: v }))

  const rules = useMemo(() => computeRules(data, pricing), [data, pricing])
  const totals = useMemo(() => computeTotals(rules, data), [rules, data])

  const valid: Record<1 | 2 | 3, boolean> = {
    // Telefoon + e-mail zijn beide verplicht (alleen aanwezigheid — een
    // ongeldig-maar-bewust-gebruikt nummer/adres blokkeren we niet, dat
    // is alleen een soft warning onder het veld in StepKlant).
    1:
      Boolean(data.naam.trim()) &&
      Boolean(data.telefoon.trim()) &&
      Boolean(data.email.trim()),
    2: data.sub.length > 0 && Number(data.m2) > 0,
    3: rules.length > 0 && totals.total > 0,
  }
  const canNext = step <= 3 ? valid[step as 1 | 2 | 3] : true

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createManualLeadEnOfferte(data)
      if (result.ok) {
        // Voor "alleen download" sturen we de owner naar de net-aangemaakte lead;
        // andere kanalen idem (de feitelijke verzending loopt via de bot).
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
  const SubmitIcon = data.kanaal === 'manual' ? FileText : MessageCircle

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.shell} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.titleBlock}>
              <div className={styles.titleIcon}><Edit3 size={16} /></div>
              <div>
                <div className={styles.title}>Handmatige offerte opstellen</div>
                <div className={styles.subtitle}>
                  Bv. voor een klant die je telefonisch hebt gesproken — Surface stuurt &lsquo;m daarna direct via WhatsApp of mail
                </div>
              </div>
            </div>
            <button onClick={onClose} className={styles.closeBtn} type="button" aria-label="Sluiten">
              <X size={16} />
            </button>
          </div>

          {/* Stepper */}
          <div className={styles.stepper}>
            {STEPS.map((s, i) => {
              const active = step === s.n
              const done = step > s.n
              const cls = `${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`
              const numCls = `${styles.stepNum} ${active ? styles.stepNumActive : ''} ${done ? styles.stepNumDone : ''}`
              return (
                <span key={s.n} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => (done || active) && setStep(s.n as 1 | 2 | 3 | 4)}
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
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.bodyStack}>
            {step === 1 && <StepKlant data={data} set={set} />}
            {step === 2 && <StepWerk data={data} set={set} />}
            {step === 3 && <StepOfferte data={data} set={set} rules={rules} totals={totals} />}
            {step === 4 && <StepVersturen data={data} set={set} rules={rules} totals={totals} />}
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.btnGhost} type="button">Annuleren</button>
          <div className={styles.footerRight}>
            {step >= 3 && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => alert('PDF-generator wordt later gekoppeld aan de bot — voor nu kun je de offerte alvast opslaan via "Offerte versturen".')}
              >
                <FileText size={13} /> Download PDF
              </button>
            )}
            {step > 1 && (
              <button type="button" className={styles.btnSecondary} onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}>
                ← Vorige
              </button>
            )}
            {!isSendStep && (
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={!canNext}
                onClick={() => canNext && setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
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
      </div>
    </div>
  )
}
