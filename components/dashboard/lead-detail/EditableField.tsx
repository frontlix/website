'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateLeadFields, type LeadEditPatch } from '@/lib/dashboard/lead-actions'
import styles from './EditableField.module.css'

// ── Editor-config ────────────────────────────────────────────────────
// `kind` bepaalt welke input gerenderd wordt in edit-mode. Voor "adres" en
// "sub_diensten" handelen we de save zelf (composite / array). Voor alle
// andere kinds is `field` de DB-kolom waar de patch op doelt.

export type SelectOption = { value: string; label: string }

export type EditorConfig =
  | { kind: 'text'; field: keyof LeadEditPatch; placeholder?: string; inputType?: 'text' | 'email' | 'tel' }
  | { kind: 'number'; field: 'afstand_km' | 'm2'; suffix?: string; placeholder?: string }
  | { kind: 'textarea'; field: 'toelichting'; placeholder?: string }
  | { kind: 'select'; field: keyof LeadEditPatch; options: SelectOption[]; allowEmpty?: boolean }
  | { kind: 'multiselect'; field: 'sub_diensten'; options: SelectOption[] }
  | { kind: 'adres' }

type Props = {
  leadId: string
  label: string
  display: string
  /** Subtext onder de waarde (read-only — bv. "Binnen gratis radius"). */
  sub?: string | null
  /** Initiële waarde(n) voor edit-mode (string voor text/number/select; string[] voor multiselect; AdresValues voor adres). */
  initial: string | string[] | AdresValues | null
  editor: EditorConfig
}

export type AdresValues = {
  straat: string
  huisnummer: string
  postcode: string
  plaats: string
}

/**
 * Eén rij in de lead-info tab. Toont read-only label + waarde, met een
 * pencil-icoon dat op hover verschijnt. Klik op pencil → rij switcht naar
 * input(s) + Opslaan/Annuleren. Save roept de generieke `updateLeadFields`
 * server-action aan met een minimale patch voor dit veld.
 */
export function EditableField(props: Props) {
  const { leadId, label, display, sub, initial, editor } = props
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string | string[] | AdresValues>(() => emptyToDraft(initial))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)

  // Focus eerste input zodra we naar edit-mode switchen
  useEffect(() => {
    if (editing && firstInputRef.current) {
      firstInputRef.current.focus()
      if ('select' in firstInputRef.current) {
        // alleen voor text-achtige inputs
        try {
          (firstInputRef.current as HTMLInputElement).select?.()
        } catch {
          /* select() is optional */
        }
      }
    }
  }, [editing])

  const enterEdit = () => {
    setDraft(emptyToDraft(initial))
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setError(null)
  }

  const save = () => {
    const patch = buildPatch(editor, draft)
    if (!patch) {
      setError('Ongeldige waarde')
      return
    }
    startTransition(async () => {
      const res = await updateLeadFields(leadId, patch)
      if (res.ok) {
        setEditing(false)
        setError(null)
      } else {
        setError(res.error)
      }
    })
  }

  // ── Read-mode ──────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className={styles.row}>
        <dt className={styles.label}>{label}</dt>
        <dd className={styles.value}>
          <div className={styles.valueWrap}>
            <span className={styles.valueText}>{display || '—'}</span>
            <button
              type="button"
              onClick={enterEdit}
              className={styles.pencilBtn}
              aria-label={`${label} bewerken`}
              title={`${label} bewerken`}
            >
              <Pencil size={12} />
            </button>
          </div>
          {sub && <span className={styles.sub}>{sub}</span>}
        </dd>
      </div>
    )
  }

  // ── Edit-mode ──────────────────────────────────────────────────────
  return (
    <div className={`${styles.row} ${styles.rowEditing}`}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>
        <div className={styles.editForm}>
          <Editor
            editor={editor}
            draft={draft}
            setDraft={setDraft}
            firstInputRef={firstInputRef}
            onEnterSubmit={save}
          />
          <div className={styles.editButtons}>
            <button
              type="button"
              onClick={cancel}
              disabled={isPending}
              className={styles.cancelBtn}
              aria-label="Annuleren"
              title="Annuleren"
            >
              <X size={13} />
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className={styles.saveBtn}
              aria-label="Opslaan"
              title="Opslaan"
            >
              {isPending ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
            </button>
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      </dd>
    </div>
  )
}

// ── Editor: kiest de juiste input op basis van EditorConfig ──────────
function Editor({
  editor,
  draft,
  setDraft,
  firstInputRef,
  onEnterSubmit,
}: {
  editor: EditorConfig
  draft: string | string[] | AdresValues
  setDraft: (v: string | string[] | AdresValues) => void
  firstInputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>
  onEnterSubmit: () => void
}) {
  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onEnterSubmit()
    }
  }

  if (editor.kind === 'text') {
    return (
      <input
        ref={firstInputRef as React.MutableRefObject<HTMLInputElement | null>}
        type={editor.inputType ?? 'text'}
        className={styles.input}
        value={typeof draft === 'string' ? draft : ''}
        placeholder={editor.placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleEnter}
      />
    )
  }

  if (editor.kind === 'number') {
    return (
      <div className={styles.numWrap}>
        <input
          ref={firstInputRef as React.MutableRefObject<HTMLInputElement | null>}
          type="number"
          step="any"
          min="0"
          className={styles.input}
          value={typeof draft === 'string' ? draft : ''}
          placeholder={editor.placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleEnter}
        />
        {editor.suffix && <span className={styles.suffix}>{editor.suffix}</span>}
      </div>
    )
  }

  if (editor.kind === 'textarea') {
    return (
      <textarea
        ref={firstInputRef as React.MutableRefObject<HTMLTextAreaElement | null>}
        className={`${styles.input} ${styles.textarea}`}
        value={typeof draft === 'string' ? draft : ''}
        placeholder={editor.placeholder}
        rows={4}
        onChange={(e) => setDraft(e.target.value)}
      />
    )
  }

  if (editor.kind === 'select') {
    return (
      <select
        ref={firstInputRef as React.MutableRefObject<HTMLSelectElement | null>}
        className={styles.input}
        value={typeof draft === 'string' ? draft : ''}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleEnter}
      >
        {editor.allowEmpty && <option value="">— Leeg —</option>}
        {editor.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  if (editor.kind === 'multiselect') {
    const selected = Array.isArray(draft) ? draft : []
    const toggle = (val: string) => {
      if (selected.includes(val)) setDraft(selected.filter((s) => s !== val))
      else setDraft([...selected, val])
    }
    return (
      <div className={styles.checkboxGroup}>
        {editor.options.map((o) => {
          const checked = selected.includes(o.value)
          return (
            <label key={o.value} className={`${styles.checkboxRow} ${checked ? styles.checkboxRowActive : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(o.value)}
                className={styles.checkbox}
              />
              <span>{o.label}</span>
            </label>
          )
        })}
      </div>
    )
  }

  // editor.kind === 'adres'
  const adres = isAdres(draft) ? draft : { straat: '', huisnummer: '', postcode: '', plaats: '' }
  const setAdres = (patch: Partial<AdresValues>) => setDraft({ ...adres, ...patch })
  return (
    <div className={styles.adresGrid}>
      <input
        ref={firstInputRef as React.MutableRefObject<HTMLInputElement | null>}
        type="text"
        className={styles.input}
        placeholder="Straat"
        value={adres.straat}
        onChange={(e) => setAdres({ straat: e.target.value })}
        onKeyDown={handleEnter}
      />
      <input
        type="text"
        className={`${styles.input} ${styles.inputSm}`}
        placeholder="Nr."
        value={adres.huisnummer}
        onChange={(e) => setAdres({ huisnummer: e.target.value })}
        onKeyDown={handleEnter}
      />
      <input
        type="text"
        className={`${styles.input} ${styles.inputSm}`}
        placeholder="1234 AB"
        value={adres.postcode}
        onChange={(e) => setAdres({ postcode: e.target.value })}
        onKeyDown={handleEnter}
      />
      <input
        type="text"
        className={styles.input}
        placeholder="Plaats"
        value={adres.plaats}
        onChange={(e) => setAdres({ plaats: e.target.value })}
        onKeyDown={handleEnter}
      />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function isAdres(v: unknown): v is AdresValues {
  return (
    typeof v === 'object' &&
    v !== null &&
    'straat' in v &&
    'huisnummer' in v &&
    'postcode' in v &&
    'plaats' in v
  )
}

function emptyToDraft(initial: string | string[] | AdresValues | null): string | string[] | AdresValues {
  if (initial === null || initial === undefined) return ''
  return initial
}

/**
 * Vertaalt draft + editor-kind naar een patch voor `updateLeadFields`.
 * Voor adres geven we 4 keys terug; voor multiselect een array; anders 1 key.
 * Return `null` als de draft niet valideerbaar is (bv. NaN bij number).
 */
function buildPatch(editor: EditorConfig, draft: string | string[] | AdresValues): LeadEditPatch | null {
  if (editor.kind === 'adres') {
    if (!isAdres(draft)) return null
    return {
      straat: draft.straat,
      huisnummer: draft.huisnummer,
      postcode: draft.postcode,
      plaats: draft.plaats,
    }
  }
  if (editor.kind === 'multiselect') {
    if (!Array.isArray(draft)) return null
    return { [editor.field]: draft.length > 0 ? draft : null } as LeadEditPatch
  }
  if (editor.kind === 'number') {
    if (typeof draft !== 'string') return null
    const trimmed = draft.trim()
    if (trimmed === '') return { [editor.field]: null } as LeadEditPatch
    const num = Number(trimmed)
    if (!Number.isFinite(num) || num < 0) return null
    return { [editor.field]: num } as LeadEditPatch
  }
  // text / textarea / select — allemaal string-velden
  if (typeof draft !== 'string') return null
  return { [editor.field]: draft } as LeadEditPatch
}
