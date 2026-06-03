'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import styles from './WatAlsSimulator.module.css'

type Rule = {
  rule_key: string
  label: string
  waarde: number
  eenheid: string | null
}

/**
 * "Wat als"-simulator: kies een prijsregel, type een hypothetische prijs,
 * zie meteen het procentuele én absolute verschil t.o.v. de huidige waarde.
 *
 * Bewust client-only en zonder backend-calls: dit is een snelle
 * rekenmachine vóór je écht een regel aanpast. Voor diepere "impact op
 * recente offertes"-berekening hebben we offerte-totalen per lead nodig
 * (komt in een aparte iteratie). Voor nu: directe %-vergelijking, eerlijk
 * over wat het wel/niet doet.
 *
 * Input accepteert komma én punt (nl-NL conventie).
 */
export function WatAlsSimulator({ rules }: { rules: Rule[] }) {
  const [ruleKey, setRuleKey] = useState<string>(rules[0]?.rule_key ?? '')
  const [input, setInput] = useState<string>('')

  const selected = useMemo(
    () => rules.find((r) => r.rule_key === ruleKey) ?? null,
    [rules, ruleKey],
  )

  const hypoValue = parseValue(input)
  const current = selected?.waarde ?? 0
  const delta = hypoValue !== null ? hypoValue - current : 0
  const pct = hypoValue !== null && current > 0 ? (delta / current) * 100 : 0

  const direction: 'up' | 'down' | 'flat' =
    hypoValue === null || Math.abs(delta) < 1e-9
      ? 'flat'
      : delta > 0
        ? 'up'
        : 'down'

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        Vergelijk een hypothetische prijs met de huidige waarde, handig om
        een wijziging eerst te verkennen voordat je hem opslaat hierboven.
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Prijsregel</span>
          <select
            className={styles.select}
            value={ruleKey}
            onChange={(e) => {
              setRuleKey(e.target.value)
              setInput('')
            }}
          >
            {rules.map((r) => (
              <option key={r.rule_key} value={r.rule_key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Huidige waarde</span>
          <div className={styles.currentBox}>
            <span className={styles.currentValue}>
              {selected ? formatValue(selected.waarde) : '—'}
            </span>
            {selected?.eenheid && (
              <span className={styles.eenheid}>{selected.eenheid}</span>
            )}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Wat als…</span>
          <div className={styles.inputBox}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="bv. 4,50"
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {selected?.eenheid && (
              <span className={styles.eenheid}>{selected.eenheid}</span>
            )}
          </div>
        </label>
      </div>

      <div className={`${styles.result} ${styles[`result_${direction}`]}`}>
        <div className={styles.resultLeft}>
          <span className={styles.resultLabel}>Verschil</span>
          <div className={styles.resultValue}>
            {direction === 'flat' && <Minus size={14} />}
            {direction === 'up' && <TrendingUp size={14} />}
            {direction === 'down' && <TrendingDown size={14} />}
            <span>
              {hypoValue === null
                ? '—'
                : `${delta >= 0 ? '+' : ''}${formatValue(delta)}${selected?.eenheid ? ' ' + selected.eenheid : ''}`}
            </span>
          </div>
        </div>
        <ArrowRight size={14} className={styles.arrow} />
        <div className={styles.resultRight}>
          <span className={styles.resultLabel}>Procentueel</span>
          <div className={styles.resultPct}>
            {hypoValue === null || current === 0
              ? '—'
              : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
          </div>
        </div>
      </div>
    </div>
  )
}

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
