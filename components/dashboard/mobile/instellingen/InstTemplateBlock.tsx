'use client'

// Herbruikbaar mobiel template-editor-blok, gedeeld door Openingsbericht
// (InstOpening) en Reminders (InstReminders). Geeft pariteit met de desktop-
// editors: tekst bewerken → variabelen invoegen → live WhatsApp-preview →
// "Aanvraag indienen" (requestTemplateChange + Slack-flow) → status-historie
// met "In behandeling"/"Goedgekeurd"/… + notitie van Frontlix + annuleren.
//
// De tekst is CONTROLLED (value + onChange) zodat de parent de draft kan
// bewaren (bv. per tab in Opening, per reminder in Reminders). Submit/flash/
// historie zit hier omdat dat niet hoeft te overleven tussen tabs.

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send,
  RotateCcw,
  Check,
  AlertCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronDown,
  Eye,
  Trash2,
} from 'lucide-react'
import {
  requestTemplateChange,
  cancelTemplateAanvraag,
} from '@/lib/dashboard/template-actions'
import type { TemplateAanvraag } from '@/lib/dashboard/template-queries'
import styles from './InstTemplateBlock.module.css'

const MAX_LEN = 1024

type Props = {
  /** Server-side template-key (lead_intake_oprit | reminder_1 | …). */
  templateKey: string
  /** Huidige draft-tekst (controlled). */
  value: string
  /** Default-tekst, basis voor "gewijzigd?" + herstellen. */
  defaultText: string
  /** Draft-mutatie naar de parent. */
  onChange: (next: string) => void
  /** Beschikbare variabelen-chips (klik = invoegen op cursor). */
  variables: readonly string[]
  /** Vult de variabelen in voor de WA-preview (puur visueel). */
  makePreview: (text: string) => string
  /** Aanvragen-historie, al gefilterd op deze templateKey. */
  aanvragen: TemplateAanvraag[]
  /** Veld-label boven de textarea. Default "Berichttekst". */
  label?: string
}

export function InstTemplateBlock({
  templateKey,
  value,
  defaultText,
  onChange,
  variables,
  makePreview,
  aanvragen,
  label = 'Berichttekst',
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const isChanged = value !== defaultText
  const woorden = useMemo(
    () => value.trim().split(/\s+/).filter(Boolean).length,
    [value],
  )
  const preview = makePreview(value)

  const setText = (next: string) => {
    onChange(next)
    if (error) setError(null)
    if (savedFlash) setSavedFlash(false)
  }

  // Variabele invoegen op de cursorpositie (valt terug op append zonder ref).
  const insertVariable = (v: string) => {
    const ta = textareaRef.current
    if (!ta) {
      setText(value + v)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = value.slice(0, start) + v + value.slice(end)
    setText(next)
    queueMicrotask(() => {
      ta.focus()
      const pos = start + v.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const reset = () => {
    onChange(defaultText)
    setError(null)
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const res = await requestTemplateChange(templateKey, value)
      if (res.ok) {
        setSavedFlash(true)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.block}>
      <div className={styles.fieldLabel}>{label}</div>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_LEN}
        rows={7}
      />

      <div className={styles.metaRow}>
        <span className={styles.counter}>
          {value.length}/{MAX_LEN} tekens · {woorden} woorden
        </span>
        {isChanged && (
          <button type="button" className={styles.resetBtn} onClick={reset}>
            <RotateCcw size={11} aria-hidden="true" /> Herstellen
          </button>
        )}
      </div>

      {/* Variabelen, tik om in te voegen op de cursorpositie */}
      <div className={styles.varsLabel}>
        <Sparkles size={11} aria-hidden="true" /> Variabelen
        <span className={styles.varsHint}>(tik om in te voegen)</span>
      </div>
      <div className={styles.pills}>
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            className={styles.pill}
            onClick={() => insertVariable(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Live WhatsApp-preview */}
      <div className={styles.fieldLabel}>Voorbeeld</div>
      <div className={styles.chat}>
        <div className={styles.datePill}>Vandaag</div>
        <div className={styles.outBubble}>
          {preview}
          <div className={styles.bubbleMeta}>
            09:14 <span className={styles.tick}>✓✓</span>
          </div>
        </div>
      </div>

      {/* Submit-rij */}
      <div className={styles.submitRow}>
        {error && (
          <span className={styles.error}>
            <AlertCircle size={12} aria-hidden="true" /> {error}
          </span>
        )}
        {savedFlash && !error && (
          <span className={styles.flashOk}>
            <Check size={12} aria-hidden="true" /> Aanvraag verstuurd
          </span>
        )}
        <button
          type="button"
          className={styles.submitBtn}
          disabled={!isChanged || isPending}
          onClick={submit}
        >
          {isPending ? (
            'Bezig…'
          ) : (
            <>
              <Send size={13} aria-hidden="true" /> Aanvraag indienen
            </>
          )}
        </button>
      </div>

      {/* Aanvragen-historie voor deze template */}
      {aanvragen.length > 0 && (
        <div className={styles.aanvragenBox}>
          <div className={styles.aanvragenTitle}>Jouw aanvragen</div>
          <div className={styles.aanvragenList}>
            {aanvragen.map((a) => (
              <AanvraagRow key={a.id} aanvraag={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Aanvraag-historie row (inklapbaar, met annuleren bij pending) ───────── */
function AanvraagRow({ aanvraag }: { aanvraag: TemplateAanvraag }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const tone = statusTone(aanvraag.status)
  const canCancel = aanvraag.status === 'pending'
  const heeftNotitie = aanvraag.notitie && aanvraag.notitie.trim().length > 0

  const onCancel = () => {
    if (!window.confirm('Weet je zeker dat je deze aanvraag wil annuleren?')) {
      return
    }
    setCancelError(null)
    startTransition(async () => {
      const res = await cancelTemplateAanvraag(aanvraag.id)
      if (res.ok) router.refresh()
      else setCancelError(res.error)
    })
  }

  return (
    <div className={styles.aanvraagBlock}>
      <button
        type="button"
        className={styles.aanvraagHead}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.aanvraagDate}>
          {new Date(aanvraag.aangemaakt_op).toLocaleString('nl-NL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span className={`${styles.statusPill} ${styles[`status_${tone}`]}`}>
          {statusIcon(aanvraag.status)}
          {statusLabel(aanvraag.status)}
        </span>
        <span className={styles.aanvraagToggle}>
          <Eye size={11} aria-hidden="true" />
          <ChevronDown
            size={12}
            className={expanded ? styles.chevronOpen : styles.chevron}
            aria-hidden="true"
          />
        </span>
      </button>

      {heeftNotitie && (
        <div className={`${styles.aanvraagNotitie} ${styles[`notitie_${tone}`]}`}>
          <MessageSquare size={11} className={styles.notitieIcon} aria-hidden="true" />
          <div className={styles.notitieText}>
            <span className={styles.notitieLabel}>Notitie van Frontlix</span>
            {aanvraag.notitie}
          </div>
        </div>
      )}

      {expanded && (
        <div className={styles.aanvraagBody}>
          <pre className={styles.aanvraagText}>{aanvraag.voorgestelde_tekst}</pre>
          <div className={styles.aanvraagActions}>
            {cancelError && (
              <span className={styles.error}>
                <AlertCircle size={11} aria-hidden="true" /> {cancelError}
              </span>
            )}
            {canCancel ? (
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onCancel}
                disabled={isPending}
              >
                <Trash2 size={11} aria-hidden="true" />
                {isPending ? 'Bezig…' : 'Annuleren'}
              </button>
            ) : (
              <span className={styles.cancelHint}>
                Alleen &quot;in behandeling&quot; kun je annuleren.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Status-helpers (gelijk aan desktop) ─────────────────────────────────── */
function statusLabel(s: TemplateAanvraag['status']): string {
  switch (s) {
    case 'pending':
      return 'In behandeling'
    case 'forwarded':
      return 'Verzonden naar Meta'
    case 'approved':
      return 'Goedgekeurd'
    case 'applied':
      return 'Live'
    case 'rejected':
      return 'Afgewezen'
  }
}

function statusIcon(s: TemplateAanvraag['status']) {
  if (s === 'pending') return <Clock size={11} aria-hidden="true" />
  if (s === 'forwarded') return <Clock size={11} aria-hidden="true" />
  if (s === 'approved') return <CheckCircle2 size={11} aria-hidden="true" />
  if (s === 'applied') return <CheckCircle2 size={11} aria-hidden="true" />
  if (s === 'rejected') return <XCircle size={11} aria-hidden="true" />
  return null
}

function statusTone(s: TemplateAanvraag['status']): 'amber' | 'blue' | 'green' | 'red' {
  if (s === 'pending') return 'amber'
  if (s === 'forwarded') return 'blue'
  if (s === 'approved') return 'green'
  if (s === 'applied') return 'green'
  return 'red'
}
