'use client'

// ── OfferteEditAtoms ──────────────────────────────────────────────────────
// Domein-agnostische UI-atomen voor de mobiele offerte-editor.
// Port van de Q*-atomen uit de handoff (MobileOfferteEdit.jsx) naar de
// codebase-conventies: CSS Modules + tokens i.p.v. inline-styles; custom
// SVG-iconen → lucide-react; dynamische accent-tint via een --tone custom
// property + color-mix (geen alpha-hex). Geen afhankelijkheid van het
// offerte-model: alle atomen zijn getypt met primitives.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { Minus, Plus, Eye, StickyNote, Pencil } from 'lucide-react'
import styles from './OfferteEditAtoms.module.css'

// De SS-eenheden voor de vrije-regel UnitPicker. Bewust hier hardgecodeerd
// (en niet uit het model geïmporteerd) zodat dit bestand domein-loos blijft.
const UNIT_OPTIONS = ['m²', 'stuk', 'm', 'uur', 'post', 'zak', 'rol', 'km', 'minuut'] as const

// Komma → punt: NL-decimaalteken naar parse-baar formaat.
function parseNl(raw: string): number {
  return parseFloat(raw.replace(',', '.'))
}

// Tonen met komma als decimaalteken (spiegelbeeld van parseNl).
function toCommaStr(n: number): string {
  return String(n).replace('.', ',')
}

// ── OStepper ───────────────────────────────────────────────────────────────
// Tikbaar getal met ± knoppen. Tik op het getal → input; Enter/blur commit
// (komma als decimaal). De plus-knop draagt de accent-tint. size 'lg' maakt
// de knoppen 46×46 (radius 14) i.p.v. 34×34 (radius 10).
type OStepperProps = {
  value: number
  onChange: (n: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  size?: 'md' | 'lg'
  /** CSS-kleur-var, bv. var(--color-warning); default var(--color-primary). */
  accent?: string
}

export function OStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  suffix = '',
  size = 'md',
  accent,
}: OStepperProps) {
  const big = size === 'lg'
  const [edit, setEdit] = useState(false)
  const [tmp, setTmp] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  // Bij overgang naar edit: focus + selecteer de hele waarde.
  useEffect(() => {
    if (edit && ref.current) {
      ref.current.focus()
      ref.current.select()
    }
  }, [edit])

  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  // Afronden op 2 decimalen voorkomt drijvende-komma-ruis bij ± stappen.
  const round2 = (v: number) => +v.toFixed(2)

  const commit = () => {
    const v = parseNl(tmp === '' ? String(value) : tmp)
    if (!isNaN(v)) onChange(clamp(round2(v)))
    setEdit(false)
  }

  return (
    <div
      className={styles.stepper}
      data-size={size}
      style={accent ? ({ '--tone': accent } as React.CSSProperties) : undefined}
    >
      <button
        type="button"
        className={styles.stepBtn}
        onClick={() => onChange(clamp(round2(value - step)))}
        aria-label="Verlaag"
      >
        <Minus size={big ? 22 : 16} strokeWidth={2.6} aria-hidden="true" />
      </button>

      {edit ? (
        <input
          ref={ref}
          className={styles.stepInput}
          inputMode="decimal"
          defaultValue={toCommaStr(value)}
          onChange={(e) => setTmp(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
      ) : (
        <button
          type="button"
          className={styles.stepValueBtn}
          onClick={() => {
            setTmp('')
            setEdit(true)
          }}
        >
          {value}
          {suffix && <span className={styles.stepSuffix}> {suffix}</span>}
        </button>
      )}

      <button
        type="button"
        className={`${styles.stepBtn} ${styles.stepPlus}`}
        onClick={() => onChange(clamp(round2(value + step)))}
        aria-label="Verhoog"
      >
        <Plus size={big ? 22 : 16} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </div>
  )
}

// ── ONumField ────────────────────────────────────────────────────────────────
// Tikbaar getal (bv. tarief): tonen → klik → input; Enter/blur commit
// (komma als decimaal). dec=false rondt af op een heel getal.
type ONumFieldProps = {
  value: number
  onChange: (n: number) => void
  prefix?: string
  dec?: boolean
  align?: 'left' | 'right'
}

export function ONumField({ value, onChange, prefix = '', dec = false, align = 'left' }: ONumFieldProps) {
  const [edit, setEdit] = useState(false)
  const [tmp, setTmp] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (edit && ref.current) {
      ref.current.focus()
      ref.current.select()
    }
  }, [edit])

  // Weergave: 2 decimalen (nl-NL) bij dec, anders kaal getal.
  const show =
    prefix +
    (dec ? value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value)

  const commit = () => {
    const v = parseNl(tmp || String(value))
    if (!isNaN(v)) onChange(dec ? v : Math.round(v))
    setEdit(false)
  }

  if (edit) {
    return (
      <input
        ref={ref}
        className={styles.numInput}
        data-align={align}
        inputMode="decimal"
        defaultValue={toCommaStr(value)}
        onChange={(e) => setTmp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    )
  }

  return (
    <button
      type="button"
      className={styles.numShow}
      data-align={align}
      onClick={() => {
        setTmp('')
        setEdit(true)
      }}
    >
      {show}
    </button>
  )
}

// ── OSwitch ──────────────────────────────────────────────────────────────────
// iOS-switch 46×28, knop 24px. accent default groen (--color-success);
// consumenten geven var(--color-primary)/var(--color-warning) door via --tone.
// Off-state track is een vast systeem-grijs dat in light én dark werkt.
type OSwitchProps = {
  on: boolean
  onChange: (b: boolean) => void
  /** CSS-kleur-var voor de aan-stand; default var(--color-success). */
  accent?: string
  label?: string
}

export function OSwitch({ on, onChange, accent, label }: OSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={styles.switch}
      data-on={on}
      style={accent ? ({ '--tone': accent } as React.CSSProperties) : undefined}
      onClick={() => onChange(!on)}
    >
      <span className={styles.switchKnob} />
    </button>
  )
}

// ── OSectionLabel ────────────────────────────────────────────────────────────
// Uppercase sectiekop (11.5/800 muted) met optioneel rechter-slot.
type OSectionLabelProps = {
  children: React.ReactNode
  right?: React.ReactNode
}

export function OSectionLabel({ children, right }: OSectionLabelProps) {
  return (
    <div className={styles.sectionLabel}>
      <span className={styles.sectionLabelText}>{children}</span>
      {right}
    </div>
  )
}

// ── OClientNote ──────────────────────────────────────────────────────────────
// Amber notitie-blok ('Zichtbaar voor klant'). Drie staten:
//  - leeg → ghost-knop 'Notitie voor klant'
//  - opgeslagen → cursieve preview met 'NOTITIE · KLANT ZIET DIT'
//  - open → textarea + Bewaar/Annuleer
// De amber-tint komt uit --color-warning (color-mix), nooit hardcoded hex.
type OClientNoteProps = {
  value: string
  onChange: (s: string) => void
  placeholder?: string
}

export function OClientNote({ value, onChange, placeholder }: OClientNoteProps) {
  const [open, setOpen] = useState(false)
  const [tmp, setTmp] = useState(value || '')
  const ref = useRef<HTMLTextAreaElement>(null)

  // Bij openen: focus de textarea (cursor aan het eind).
  useEffect(() => {
    if (open && ref.current) {
      ref.current.focus()
      const v = ref.current.value
      ref.current.value = ''
      ref.current.value = v
    }
  }, [open])

  const commit = () => {
    onChange(tmp.trim())
    setOpen(false)
  }

  // ── Open: bewerk-blok ──
  if (open) {
    return (
      <div className={styles.noteEdit}>
        <div className={styles.noteEyeHead}>
          <Eye size={13} aria-hidden="true" />
          <span className={styles.noteEyeLabel}>Zichtbaar voor klant</span>
        </div>
        <textarea
          ref={ref}
          className={styles.noteTextarea}
          defaultValue={tmp}
          rows={2}
          placeholder={placeholder}
          onChange={(e) => setTmp(e.target.value)}
        />
        <div className={styles.noteActions}>
          <button
            type="button"
            className={styles.noteCancel}
            onClick={() => {
              setTmp(value || '')
              setOpen(false)
            }}
          >
            Annuleer
          </button>
          <button type="button" className={styles.noteSave} onClick={commit}>
            Bewaar
          </button>
        </div>
      </div>
    )
  }

  // ── Opgeslagen: cursieve preview ──
  if (value) {
    return (
      <button
        type="button"
        className={styles.noteSaved}
        onClick={() => {
          setTmp(value)
          setOpen(true)
        }}
      >
        <StickyNote size={14} aria-hidden="true" />
        <span className={styles.noteSavedBody}>
          <span className={styles.noteSavedTag}>Notitie · klant ziet dit</span>
          <span className={styles.noteSavedText}>&ldquo;{value}&rdquo;</span>
        </span>
        <Pencil size={13} aria-hidden="true" />
      </button>
    )
  }

  // ── Leeg: ghost-knop ──
  return (
    <button
      type="button"
      className={styles.noteGhost}
      onClick={() => {
        setTmp('')
        setOpen(true)
      }}
    >
      <StickyNote size={14} aria-hidden="true" /> Notitie voor klant
    </button>
  )
}

// ── OAddrInput ───────────────────────────────────────────────────────────────
// Onderlijnd tekstveld voor het afwijkende factuuradres.
type OAddrInputProps = {
  value: string
  onChange: (s: string) => void
  placeholder?: string
}

export function OAddrInput({ value, onChange, placeholder }: OAddrInputProps) {
  return (
    <input
      className={styles.addrInput}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// ── OUnitPicker ──────────────────────────────────────────────────────────────
// Native <select> voor de eenheid van een vrije regel; accent-getint.
// Toont elke optie als '/ <eenheid>'.
type OUnitPickerProps = {
  value: string
  onChange: (s: string) => void
}

export function OUnitPicker({ value, onChange }: OUnitPickerProps) {
  return (
    <select className={styles.unitPicker} value={value} onChange={(e) => onChange(e.target.value)}>
      {UNIT_OPTIONS.map((u) => (
        <option key={u} value={u}>
          / {u}
        </option>
      ))}
    </select>
  )
}

// ── OSegmented ───────────────────────────────────────────────────────────────
// Pill segmented control: track-achtergrond, actief segment verhoogd.
// Generiek; ingezet voor de BTW-keuze.
type OSegmentedProps = {
  value: string
  options: { key: string; kort: string }[]
  onChange: (k: string) => void
}

export function OSegmented({ value, options, onChange }: OSegmentedProps) {
  return (
    <div className={styles.segmented} role="group">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={styles.segment}
          data-on={o.key === value}
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
        >
          {o.kort}
        </button>
      ))}
    </div>
  )
}

// ── OFullSheet ───────────────────────────────────────────────────────────────
// Full-screen slide-up overlay (PDF-preview / historie). Schuift van onder in
// beeld (translateY, --ease-ios ~.32s); backdrop dimt via --color-backdrop
// (~.22s). Header met 'Sluit' + gecentreerde titel, scrollbare body, optionele
// sticky voet. Respecteert env(safe-area-inset-*). z-index boven de bottom nav.
type OFullSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  foot?: React.ReactNode
}

export function OFullSheet({ open, onClose, title, children, foot }: OFullSheetProps) {
  return (
    <>
      <div
        className={styles.sheetBackdrop}
        data-open={open}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={styles.sheet} data-open={open} role="dialog" aria-modal={open} aria-label={title} aria-hidden={!open}>
        <div className={styles.sheetHeader}>
          <button type="button" className={styles.sheetClose} onClick={onClose}>
            Sluit
          </button>
          <div className={styles.sheetTitle}>{title}</div>
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {foot && <div className={styles.sheetFoot}>{foot}</div>}
      </div>
    </>
  )
}
