'use client'

// Echte prijsregels uit pricing_rules (rule_key/label/waarde/eenheid). De
// stepper past de waarde aan; "Tarieven opslaan" stuurt de gewijzigde regels in
// één batch naar updatePricingRulesBatch — de rule_keys komen rechtstreeks uit
// de DB, dus de mapping is betrouwbaar.
//
// De wat-als-simulator toont GEEN verzonnen omzet/conversie-cijfers: de
// impact-baseline wordt op mobiel niet opgehaald, dus we laten een neutrale
// notitie zien i.p.v. placeholder-getallen (zie UITGESTELD in de PR-notitie).

import { useState, useTransition } from 'react'
import { Sparkles, Minus, Plus, Check, AlertTriangle } from 'lucide-react'
import { updatePricingRulesBatch } from '@/lib/dashboard/pricing-actions'
import type { PricingRule } from '@/components/dashboard/instellingen/SettingSections'
import { InstGroupCard, InstPrimaryBtn } from './InstAtoms'
import { deltaPct } from './inst-helpers'
import styles from './InstPrijzen.module.css'

/**
 * Stap-grootte afgeleid van de huidige waarde. Kleine bedragen (tarieven per
 * m²/km/minuut, doorgaans < €10) stappen fijn met 0,05; grotere waarden
 * (prijs per zak, verhoudingen, drempel-km) stappen met 1 zodat de stepper
 * voor elk rule-type bruikbaar blijft zonder eindeloos tikken.
 */
function stepFor(waarde: number): number {
  return waarde < 10 ? 0.05 : 1
}

/** Waarde ±step, gesnapt op 2 decimalen, niet onder 0. */
function stepValue(current: number, step: number, dir: 1 | -1): number {
  return Math.max(0, +(current + dir * step).toFixed(2))
}

/** Prijzen-detailscherm met steppers + echte batch-save. */
export function InstPrijzen({ rules }: { rules: PricingRule[] }) {
  // Lokale prijs-state: { [rule_key]: number }, geseed uit de echte regels.
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(rules.map((r) => [r.rule_key, r.waarde])),
  )
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Basisprijzen blijven constant — vergelijkingsbron voor delta + "changed".
  const base = Object.fromEntries(rules.map((r) => [r.rule_key, r.waarde]))
  const changedKeys = rules
    .filter((r) => vals[r.rule_key].toFixed(2) !== r.waarde.toFixed(2))
    .map((r) => r.rule_key)
  const changed = changedKeys.length > 0

  const step = (key: string, dir: 1 | -1) => {
    setVals((v) => ({ ...v, [key]: stepValue(v[key], stepFor(v[key]), dir) }))
    setError(null)
    setSavedFlash(false)
  }

  const handleSave = () => {
    if (!changed) return
    const changes = changedKeys.map((rule_key) => ({ rule_key, waarde: vals[rule_key] }))
    setError(null)
    startTransition(async () => {
      const res = await updatePricingRulesBatch(changes)
      if (res.ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 2000)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Deze tarieven gebruikt Surface om automatisch offertes te berekenen.
      </p>

      <InstGroupCard>
        {rules.map((r, i) => {
          const pct = deltaPct(vals[r.rule_key], base[r.rule_key])
          return (
            <div
              key={r.rule_key}
              className={styles.row}
              data-last={i === rules.length - 1 || undefined}
            >
              <div className={styles.rowText}>
                <div className={styles.rowLabel}>{r.label}</div>
                {pct !== 0 && (
                  <div className={styles.delta} data-dir={pct > 0 ? 'up' : 'down'}>
                    {pct > 0 ? '+' : ''}
                    {pct}% vs nu
                  </div>
                )}
              </div>

              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => step(r.rule_key, -1)}
                  aria-label={`Verlaag ${r.label}`}
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <div className={styles.value}>
                  {vals[r.rule_key].toFixed(2)}
                  {r.eenheid && <span className={styles.unit}> {r.eenheid}</span>}
                </div>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => step(r.rule_key, 1)}
                  aria-label={`Verhoog ${r.label}`}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )
        })}
        {rules.length === 0 && (
          <div className={styles.row} data-last>
            <div className={styles.rowText}>
              <div className={styles.rowLabel}>Geen prijsregels gevonden.</div>
            </div>
          </div>
        )}
      </InstGroupCard>

      {/* Neutrale notitie i.p.v. verzonnen simulator-getallen. */}
      <div className={styles.sim}>
        <div className={styles.simHead}>
          <div className={styles.simIcon}>
            <Sparkles size={16} aria-hidden="true" />
          </div>
          <div className={styles.simHeadText}>
            <div className={styles.simTitle}>Wat-als simulator</div>
            <div className={styles.simSub}>
              {changed
                ? `${changedKeys.length} tarief${changedKeys.length === 1 ? '' : 'fen'} aangepast — bekijk het omzet-effect in het dashboard op desktop`
                : 'Het geschatte omzet-effect zie je in het dashboard op desktop'}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="status">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {savedFlash && !error && (
        <div className={styles.savedFlash}>
          <Check size={13} aria-hidden="true" /> Opgeslagen
        </div>
      )}

      <InstPrimaryBtn disabled={!changed || isPending} onClick={handleSave}>
        {isPending ? 'Opslaan…' : 'Tarieven opslaan'}
      </InstPrimaryBtn>
    </div>
  )
}
