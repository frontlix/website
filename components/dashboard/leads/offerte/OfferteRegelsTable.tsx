'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Lock, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Prijsregel } from '@/lib/dashboard/database.types'
import { formatEuro } from '@/lib/dashboard/format'
import styles from './OfferteRegelsTable.module.css'

/**
 * Lokale UI-state per regel: alle numerieke velden als string voor input-binding.
 * `uid` dient als stabiele React-key (ook voor nog niet opgeslagen regels).
 * `id` ontbreekt zolang de regel nog niet aan de DB toegevoegd is.
 */
export type RegelEdit = {
  uid: string
  id?: string
  bron: 'auto_lead' | 'manual'
  omschrijving: string
  aantal: string
  eenheid: string
  stukprijs: string // excl BTW
}

type Props = {
  initialRegels: Prijsregel[]
  /** Notify parent bij elke wijziging (fase 1: voor live totalen-recalc in sidebar). */
  onChange?: (regels: RegelEdit[]) => void
}

/**
 * Random id-fallback voor omgevingen zonder crypto.randomUUID
 * (oudere browsers/SSR-context). Niet cryptografisch — alleen UI-keys.
 */
function makeUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/** Format een numerieke waarde naar string voor input-binding (lege string voor null/0-stukprijs blijft '0'). */
function numToInputString(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  // Nederlandse decimaalweergave (komma) voor visuele consistentie met formatEuro.
  return String(value).replace('.', ',')
}

/** Parse input-waarde (accepteert zowel komma als punt) naar number; lege/ongeldige -> 0. */
function parseDecimal(input: string): number {
  if (!input) return 0
  const normalized = input.replace(',', '.').trim()
  const n = Number.parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

/** Normaliseer bron uit DB-string naar onze union. */
function normalizeBron(bron: string | null | undefined): 'auto_lead' | 'manual' {
  return bron === 'auto_lead' ? 'auto_lead' : 'manual'
}

/** Map DB-prijsregel → RegelEdit (alle numerieke velden als string). */
function mapToEdit(regel: Prijsregel): RegelEdit {
  return {
    uid: regel.id ?? makeUid(),
    id: regel.id,
    bron: normalizeBron(regel.bron),
    omschrijving: regel.omschrijving ?? '',
    aantal: numToInputString(regel.aantal),
    eenheid: regel.eenheid ?? '',
    stukprijs: numToInputString(regel.stukprijs),
  }
}

/** Bereken regel-totaal vanuit string-velden (excl BTW). */
function regelTotaal(regel: RegelEdit): number {
  return parseDecimal(regel.aantal) * parseDecimal(regel.stukprijs)
}

export default function OfferteRegelsTable({ initialRegels, onChange }: Props) {
  const [regels, setRegels] = useState<RegelEdit[]>(() => initialRegels.map(mapToEdit))

  // Houd een ref naar onChange aan zodat we niet bij elke parent-re-render opnieuw triggeren.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Trigger onChange bij elke state-wijziging — parent rekent totalen direct mee.
  useEffect(() => {
    onChangeRef.current?.(regels)
  }, [regels])

  const updateRegel = useCallback((uid: string, patch: Partial<RegelEdit>) => {
    setRegels((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)))
  }, [])

  const removeRegel = useCallback((uid: string) => {
    setRegels((prev) => prev.filter((r) => r.uid !== uid))
  }, [])

  const addManualRegel = useCallback(() => {
    setRegels((prev) => [
      ...prev,
      {
        uid: makeUid(),
        bron: 'manual',
        omschrijving: '',
        aantal: '1',
        eenheid: 'stuk',
        stukprijs: '0',
      },
    ])
  }, [])

  // Splits per bron — auto-regels eerst, daarna manual.
  const { autoRegels, manualRegels } = useMemo(() => {
    return {
      autoRegels: regels.filter((r) => r.bron === 'auto_lead'),
      manualRegels: regels.filter((r) => r.bron === 'manual'),
    }
  }, [regels])

  return (
    <div className={styles.wrapper}>
      {/* ─── Groepskop: Auto uit lead-data ─── */}
      <div className={styles.groupHeader}>
        <Sparkles size={12} className={styles.groupHeaderIcon} aria-hidden="true" />
        <span>
          Auto uit lead-data · {autoRegels.length}{' '}
          {autoRegels.length === 1 ? 'regel' : 'regels'}
          <span className={styles.groupHeaderHint}>
            {' '}
            — recalculatie volgt bronwijzigingen
          </span>
        </span>
      </div>

      {/* Kolomnamen-rij (gedeeld voor beide secties — eenmalig direct onder de eerste groepskop). */}
      <div className={styles.columnHeader} role="row">
        <div role="columnheader">Omschrijving</div>
        <div role="columnheader" className={styles.colNumeric}>
          Aantal
        </div>
        <div role="columnheader">Eenheid</div>
        <div role="columnheader" className={styles.colNumeric}>
          Prijs / eenh.
        </div>
        <div role="columnheader" className={styles.colNumeric}>
          Totaal
        </div>
        <div role="columnheader" aria-label="Acties" />
      </div>

      {/* Auto-regels */}
      {autoRegels.length === 0 ? (
        <div className={styles.emptyAuto}>
          Geen automatische regels — vul de Info-tab aan om regels te laten genereren.
        </div>
      ) : (
        autoRegels.map((regel) => (
          <RegelRow
            key={regel.uid}
            regel={regel}
            disabled
            onUpdate={updateRegel}
            onRemove={removeRegel}
          />
        ))
      )}

      {/* ─── Groepskop: Handmatige regels ─── */}
      <div className={styles.groupHeader}>
        <span>
          Handmatige regels · {manualRegels.length}{' '}
          {manualRegels.length === 1 ? 'regel' : 'regels'}
        </span>
      </div>

      {manualRegels.length === 0 ? (
        <div className={styles.emptyManual}>
          Voeg extra regels toe — bijv. meerwerk, voorrijden, korting op specifieke post.
        </div>
      ) : (
        manualRegels.map((regel) => (
          <RegelRow
            key={regel.uid}
            regel={regel}
            disabled={false}
            onUpdate={updateRegel}
            onRemove={removeRegel}
          />
        ))
      )}

      <div className={styles.actionsBar}>
        <button type="button" className={styles.addButton} onClick={addManualRegel}>
          <Plus size={14} aria-hidden="true" />
          <span>Regel toevoegen</span>
        </button>
      </div>
    </div>
  )
}

// ─── Sub-component: één regelrij ──────────────────────────────────────────

type RegelRowProps = {
  regel: RegelEdit
  /** true = auto-regel: cellen blijven editable in DOM-zin maar tonen lock-icoon i.p.v. delete (zie spec). */
  disabled: boolean
  onUpdate: (uid: string, patch: Partial<RegelEdit>) => void
  onRemove: (uid: string) => void
}

function RegelRow({ regel, disabled, onUpdate, onRemove }: RegelRowProps) {
  const totaal = regelTotaal(regel)

  return (
    <div className={styles.row} role="row">
      <input
        type="text"
        value={regel.omschrijving}
        onChange={(e) => onUpdate(regel.uid, { omschrijving: e.target.value })}
        className={styles.cellInput}
        placeholder="Omschrijving"
        aria-label="Omschrijving"
      />
      <input
        type="text"
        inputMode="decimal"
        value={regel.aantal}
        onChange={(e) => onUpdate(regel.uid, { aantal: e.target.value })}
        className={`${styles.cellInput} ${styles.cellInputNumeric}`}
        placeholder="0"
        aria-label="Aantal"
      />
      <input
        type="text"
        value={regel.eenheid}
        onChange={(e) => onUpdate(regel.uid, { eenheid: e.target.value })}
        className={styles.cellInput}
        placeholder="stuk"
        aria-label="Eenheid"
      />
      <input
        type="text"
        inputMode="decimal"
        value={regel.stukprijs}
        onChange={(e) => onUpdate(regel.uid, { stukprijs: e.target.value })}
        className={`${styles.cellInput} ${styles.cellInputNumeric}`}
        placeholder="0,00"
        aria-label="Stukprijs (excl BTW)"
      />
      <div
        className={`${styles.cellComputed} ${styles.colNumeric}`}
        role="cell"
        aria-label="Totaal"
      >
        {formatEuro(totaal)}
      </div>
      <div className={styles.cellActions} role="cell">
        {disabled ? (
          <span
            className={styles.lockIcon}
            title="Wijzig in Info-tab"
            aria-label="Wijzig in Info-tab"
          >
            <Lock size={12} aria-hidden="true" />
          </span>
        ) : (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => onRemove(regel.uid)}
            aria-label="Verwijder regel"
            title="Verwijder regel"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
