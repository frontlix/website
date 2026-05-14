'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import { updatePricingRulesBatch } from '@/lib/dashboard/pricing-actions'
import { computeRevenueDelta } from '@/lib/dashboard/pricing-impact'
import styles from './PrijzenEditor.module.css'

type Rule = {
  rule_key: string
  label: string
  waarde: number
  eenheid: string | null
}

type ImpactBaseline = {
  leadCount: number
  periodStart: string | null
  periodEnd: string
  baselineRevenue: number
  baselineConversion: number
  volumes: Record<string, number>
}

/**
 * Prijzen-editor met "Wat als"-simulator.
 *
 * Model:
 *  - Lokaal worden wijzigingen verzameld in `pending` (rule_key → nieuwe waarde).
 *  - Pas bij klik op "Alles opslaan" gaat alles in één batch naar de server.
 *  - Daarvoor: sticky bottom-bar toont real-time omzet-effect op de laatste
 *    N leads, geschatte conversie (statisch — geen elasticity-model) en
 *    een heuristische "Beste actie".
 *
 * Waarom geen auto-save meer: de owner wil eerst de impact zien voordat
 * een wijziging live in de offerte-engine gaat. Dat is het hele punt van
 * de simulator.
 */
export function PrijzenEditor({
  rules,
  baseline,
}: {
  rules: Rule[]
  baseline: ImpactBaseline
}) {
  const router = useRouter()
  const [pending, setPending] = useState<Record<string, number>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Map huidige prijzen voor delta-berekening
  const currentPrices = useMemo<Record<string, number>>(
    () => Object.fromEntries(rules.map((r) => [r.rule_key, r.waarde])),
    [rules],
  )

  // Verwijder pending entries die gelijk zijn aan huidige waarde (cleanup).
  const cleanPending = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(pending)) {
      if (Math.abs(v - (currentPrices[k] ?? 0)) > 1e-9) out[k] = v
    }
    return out
  }, [pending, currentPrices])

  const hasPending = Object.keys(cleanPending).length > 0

  const revenueDelta = useMemo(
    () => computeRevenueDelta(baseline.volumes, currentPrices, cleanPending),
    [baseline.volumes, currentPrices, cleanPending],
  )

  const newRevenue = baseline.baselineRevenue + revenueDelta

  // Saved-flash verbergt zich na 2s.
  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 2000)
    return () => clearTimeout(t)
  }, [savedFlash])

  const handleSetPending = (ruleKey: string, value: number) => {
    setPending((prev) => ({ ...prev, [ruleKey]: value }))
    setSaveError(null)
  }
  const handleClearPending = (ruleKey: string) => {
    setPending((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [ruleKey]: _, ...rest } = prev
      return rest
    })
    setSaveError(null)
  }

  const handleSaveAll = () => {
    const changes = Object.entries(cleanPending).map(([rule_key, waarde]) => ({
      rule_key,
      waarde,
    }))
    if (changes.length === 0) return
    setSaveError(null)
    startTransition(async () => {
      const res = await updatePricingRulesBatch(changes)
      if (res.ok) {
        setPending({})
        setSavedFlash(true)
        router.refresh()
      } else {
        setSaveError(res.error)
      }
    })
  }

  return (
    <>
      <div className={styles.headerActions}>
        {hasPending && (
          <span className={styles.pendingCount}>
            {Object.keys(cleanPending).length} wijziging
            {Object.keys(cleanPending).length === 1 ? '' : 'en'} niet opgeslagen
          </span>
        )}
        {saveError && (
          <span className={styles.saveError}>
            <AlertCircle size={12} /> {saveError}
          </span>
        )}
        {savedFlash && !hasPending && (
          <span className={styles.savedFlash}>
            <Check size={12} /> Opgeslagen
          </span>
        )}
        <button
          type="button"
          className={styles.saveButton}
          disabled={!hasPending || isPending}
          onClick={handleSaveAll}
        >
          {isPending ? 'Bezig…' : 'Alles opslaan'}
        </button>
      </div>

      <div className={styles.pricingList}>
        {rules.map((rule) => {
          const pendingValue = cleanPending[rule.rule_key]
          const isChanged = pendingValue !== undefined
          const displayedValue = isChanged ? pendingValue : rule.waarde
          const pct =
            isChanged && rule.waarde > 0
              ? ((pendingValue - rule.waarde) / rule.waarde) * 100
              : 0
          return (
            <div key={rule.rule_key} className={styles.row}>
              <div className={styles.rowLabel}>
                <div className={styles.label}>{rule.label}</div>
                <div className={styles.ruleKey}>{rule.rule_key}</div>
              </div>
              <div className={styles.rowEditor}>
                <RuleInput
                  ruleKey={rule.rule_key}
                  originalValue={rule.waarde}
                  currentValue={displayedValue}
                  eenheid={rule.eenheid}
                  isChanged={isChanged}
                  onSetPending={handleSetPending}
                  onClearPending={handleClearPending}
                />
                {isChanged && (
                  <span
                    className={
                      pct >= 0 ? styles.pctPillUp : styles.pctPillDown
                    }
                  >
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {rules.length === 0 && (
          <div className={styles.empty}>Geen prijsregels gevonden.</div>
        )}
      </div>

      {hasPending && (
        <ImpactBar
          revenueDelta={revenueDelta}
          baselineRevenue={baseline.baselineRevenue}
          newRevenue={newRevenue}
          baselineConversion={baseline.baselineConversion}
          leadCount={baseline.leadCount}
          periodStart={baseline.periodStart}
        />
      )}
    </>
  )
}

/* ── Per-rule input (controlled) ──────────────────────── */

function RuleInput({
  ruleKey,
  originalValue,
  currentValue,
  eenheid,
  isChanged,
  onSetPending,
  onClearPending,
}: {
  ruleKey: string
  originalValue: number
  currentValue: number
  eenheid: string | null
  isChanged: boolean
  onSetPending: (key: string, value: number) => void
  onClearPending: (key: string) => void
}) {
  const [text, setText] = useState<string>(formatValue(currentValue))
  const [invalid, setInvalid] = useState(false)

  // Sync extern (bv. na succesvolle save reset) — alleen als niet focus en
  // niet gewijzigd door user.
  useEffect(() => {
    setText(formatValue(currentValue))
  }, [currentValue])

  const handleBlur = () => {
    const parsed = parseValue(text)
    if (parsed === null) {
      setInvalid(true)
      // Reset naar laatst geldige waarde (huidig of pending)
      setText(formatValue(currentValue))
      return
    }
    setInvalid(false)
    if (Math.abs(parsed - originalValue) < 1e-9) {
      // Gelijk aan origineel → niet pending
      onClearPending(ruleKey)
      setText(formatValue(originalValue))
      return
    }
    onSetPending(ruleKey, parsed)
    setText(formatValue(parsed))
  }

  const wrapClass = `${styles.inputWrap} ${isChanged ? styles.inputWrapChanged : ''} ${invalid ? styles.inputWrapInvalid : ''}`

  return (
    <div className={wrapClass}>
      <input
        type="text"
        inputMode="decimal"
        className={styles.input}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (invalid) setInvalid(false)
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            setText(formatValue(originalValue))
            onClearPending(ruleKey)
            setInvalid(false)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        aria-label={`Waarde voor ${ruleKey}`}
      />
      {eenheid && <span className={styles.eenheid}>{eenheid}</span>}
    </div>
  )
}

/* ── Sticky impact-bar onderaan ───────────────────────── */

function ImpactBar({
  revenueDelta,
  baselineRevenue,
  newRevenue,
  baselineConversion,
  leadCount,
  periodStart,
}: {
  revenueDelta: number
  baselineRevenue: number
  newRevenue: number
  baselineConversion: number
  leadCount: number
  periodStart: string | null
}) {
  const periodLabel = formatPeriod(periodStart)
  const isUp = revenueDelta > 0
  const isDown = revenueDelta < 0

  // Heuristiek "Beste actie" — puur op basis van %-verandering t.o.v. omzet.
  const pctOfRevenue =
    baselineRevenue > 0 ? (revenueDelta / baselineRevenue) * 100 : 0
  const absPct = Math.abs(pctOfRevenue)
  const bestActie =
    absPct < 1.5
      ? { label: 'Marginaal', sub: 'Kleine impact verwacht' }
      : absPct < 5
        ? { label: 'Substantieel', sub: 'Merkbare impact op omzet' }
        : { label: 'Aanzienlijk', sub: 'Grote impact — overweeg testen' }

  return (
    <div className={styles.impactBar}>
      <div className={styles.impactHeader}>
        <div className={styles.impactHeaderIcon}>
          <Sparkles size={16} />
        </div>
        <div>
          <div className={styles.impactTitle}>Wat-als simulator</div>
          <div className={styles.impactSub}>
            Op basis van je laatste{' '}
            <strong>
              {leadCount} {leadCount === 1 ? 'lead' : 'leads'}
            </strong>{' '}
            {periodLabel && <span>({periodLabel})</span>}
          </div>
        </div>
      </div>

      <div className={styles.impactGrid}>
        <ImpactTile
          label={`Omzet-effect (${leadCount} leads)`}
          value={
            <span
              className={
                isUp ? styles.valueUp : isDown ? styles.valueDown : ''
              }
            >
              {isUp ? '+' : isDown ? '−' : ''}€{' '}
              {Math.abs(revenueDelta).toLocaleString('nl-NL', {
                maximumFractionDigits: 0,
              })}
            </span>
          }
          sub={
            <>
              van €{baselineRevenue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}{' '}
              naar €{newRevenue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
            </>
          }
          icon={isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : null}
        />
        <ImpactTile
          label="Geschatte conversie"
          value={`${Math.round(baselineConversion * 100)}%`}
          sub={`huidige conversie op deze ${leadCount} leads`}
        />
        <ImpactTile
          label="Beste actie"
          value={bestActie.label}
          sub={bestActie.sub}
        />
      </div>
    </div>
  )
}

function ImpactTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: React.ReactNode
  sub: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>{label}</div>
      <div className={styles.tileValue}>
        {icon && <span className={styles.tileIcon}>{icon}</span>}
        {value}
      </div>
      <div className={styles.tileSub}>{sub}</div>
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────── */

function parseValue(s: string): number | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  const cleaned = trimmed.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function formatValue(n: number): string {
  return n.toLocaleString('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatPeriod(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const start = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return `${start} – nu`
}
