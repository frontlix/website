'use client'

import { useEffect, useState } from 'react'
import type { MobileLeadStage } from './lead-mappers'
import styles from './LeadsFilterSheet.module.css'

export type AdvFilter = {
  stages: Set<MobileLeadStage>
  bronnen: Set<'wa' | 'form'>
  urgentOnly: boolean
  sort: 'binnen' | 'prijs' | 'naam' | 'fase'
}

// ── Alle stages met label + tone ──────────────────────────────────────────────
const STAGES: { key: MobileLeadStage; label: string; tone: string }[] = [
  { key: 'gesprek', label: 'In gesprek',   tone: 'blue' },
  { key: 'review',  label: 'Owner-review', tone: 'amber' },
  { key: 'uit',     label: 'Offerte uit',  tone: 'violet' },
  { key: 'gepland', label: 'Ingepland',    tone: 'green' },
  { key: 'klaar',   label: 'Afgerond',     tone: 'gray' },
]

const ALL_STAGES = new Set<MobileLeadStage>(['gesprek', 'review', 'uit', 'gepland', 'klaar'])
const ALL_BRONNEN = new Set<'wa' | 'form'>(['wa', 'form'])

interface LeadsFilterSheetProps {
  open: boolean
  value: AdvFilter
  /** Huidig aantal leads dat matcht — getoond in footer */
  resultCount: number
  onApply: (f: AdvFilter) => void
  onClose: () => void
}

/**
 * LeadsFilterSheet — bottom-sheet met backdrop voor geavanceerde filters.
 *
 * Secties:
 *  - Fase (multi-select chips)
 *  - Bron (WA / Formulier, 2-col)
 *  - Urgent (toggle)
 *  - Sorteer op (4 opties, 2-col)
 *
 * Footer: Wis + "Toon X leads" primaire knop.
 *
 * Houd interne draft-state; past pas toe bij "Toon"-klik.
 */
export function LeadsFilterSheet({
  open,
  value,
  resultCount,
  onApply,
  onClose,
}: LeadsFilterSheetProps) {
  // Draft-state — alleen gesynct bij openen
  const [stages, setStages]       = useState<Set<MobileLeadStage>>(value.stages)
  const [bronnen, setBronnen]     = useState<Set<'wa' | 'form'>>(value.bronnen)
  const [urgentOnly, setUrgent]   = useState(value.urgentOnly)
  const [sort, setSort]           = useState<AdvFilter['sort']>(value.sort)

  // Sync draft wanneer sheet opent met nieuwe value
  useEffect(() => {
    if (open) {
      setStages(value.stages)
      setBronnen(value.bronnen)
      setUrgent(value.urgentOnly)
      setSort(value.sort)
    }
  }, [open]) // value niet in deps — alleen syncen bij open-event

  if (!open) return null

  // Toggle helper voor Set-state
  function toggle<T>(set: Set<T>, setSet: (s: Set<T>) => void, key: T) {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSet(next)
  }

  function wipe() {
    setStages(new Set(ALL_STAGES))
    setBronnen(new Set(ALL_BRONNEN))
    setUrgent(false)
    setSort('binnen')
  }

  function apply() {
    onApply({ stages, bronnen, urgentOnly, sort })
    onClose()
  }

  return (
    <div className={styles.overlay}>
      {/* Backdrop — klik = sluit */}
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={styles.sheet}
      >
        {/* Drag handle */}
        <div className={styles.handle} aria-hidden="true" />

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>
            Filters
          </span>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Sluit
          </button>
        </div>

        {/* ── Fase ───────────────────────────────────────────────────────────── */}
        <FilterSection title="Fase" sub="Tik om in/uit te schakelen — meerdere mogelijk">
          <div className={styles.chipRow}>
            {STAGES.map((s) => {
              const on = stages.has(s.key)
              return (
                <button
                  key={s.key}
                  type="button"
                  className={styles.faseChip}
                  data-on={on ? 'true' : undefined}
                  data-tone={s.tone}
                  onClick={() => toggle(stages, setStages, s.key)}
                >
                  {on && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {s.label}
                </button>
              )
            })}
          </div>
        </FilterSection>

        {/* ── Bron ────────────────────────────────────────────────────────────── */}
        <FilterSection title="Bron">
          <div className={styles.bronRow}>
            {(
              [
                { k: 'wa',   label: 'WhatsApp',  tone: 'wa' },
                { k: 'form', label: 'Formulier', tone: 'blue' },
              ] as const
            ).map((b) => {
              const on = bronnen.has(b.k)
              return (
                <button
                  key={b.k}
                  type="button"
                  className={styles.bronBtn}
                  data-on={on ? 'true' : undefined}
                  data-tone={b.tone}
                  onClick={() => toggle(bronnen, setBronnen, b.k)}
                >
                  {b.label}
                </button>
              )
            })}
          </div>
        </FilterSection>

        {/* ── Urgent ─────────────────────────────────────────────────────────── */}
        <FilterSection title="Snel filter">
          <button
            type="button"
            className={styles.urgentBtn}
            data-on={urgentOnly ? 'true' : undefined}
            onClick={() => setUrgent((v) => !v)}
          >
            <span className={styles.urgentLabel}>
              {/* Bolt icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Alleen urgent
            </span>
            {/* Toggle switch */}
            <span className={styles.toggle} data-on={urgentOnly ? 'true' : undefined} aria-hidden="true">
              <span className={styles.toggleKnob} data-on={urgentOnly ? 'true' : undefined} />
            </span>
          </button>
        </FilterSection>

        {/* ── Sorteer op ──────────────────────────────────────────────────────── */}
        <FilterSection title="Sorteer op">
          <div className={styles.sortGrid}>
            {(
              [
                { k: 'binnen', l: 'Binnengekomen' },
                { k: 'prijs',  l: 'Offerteprijs' },
                { k: 'naam',   l: 'Naam (A–Z)' },
                { k: 'fase',   l: 'Fase' },
              ] as const
            ).map((s) => {
              const on = sort === s.k
              return (
                <button
                  key={s.k}
                  type="button"
                  className={styles.sortBtn}
                  data-on={on ? 'true' : undefined}
                  onClick={() => setSort(s.k)}
                >
                  {s.l}
                </button>
              )
            })}
          </div>
        </FilterSection>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <button type="button" className={styles.footerWis} onClick={wipe}>
            Wis
          </button>
          <button type="button" className={styles.footerApply} onClick={apply}>
            Toon {resultCount} {resultCount === 1 ? 'lead' : 'leads'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper component ────────────────────────────────────────────────────────
function FilterSection({
  title,
  sub,
  children,
}: {
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {sub && <div className={styles.sectionSub}>{sub}</div>}
      {children}
    </div>
  )
}
