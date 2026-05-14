'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, RotateCcw, Send, Sparkles, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { requestTemplateChange } from '@/lib/dashboard/template-actions'
import type { TemplateAanvraag } from '@/lib/dashboard/template-queries'
import styles from './OpeningTemplateEditor.module.css'

/**
 * Tab-definities + default-teksten zoals overgenomen uit het design. Bij
 * goedkeuring werken jullie de Surface-config (Python) handmatig bij — deze
 * defaults blijven dan synchroon. Long-term: source-of-truth naar Supabase.
 */
const TEMPLATES = [
  {
    key: 'lead_intake_oprit',
    tabLabel: 'Oprit / Terras',
    hoofddienst: 'oprit',
    default: `Hoi {voornaam}👋

Bedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, jullie online assistent. Ik help je in een paar berichten aan een offerte op maat voor het reinigen en opnieuw invegen van je {hoofddienst}.

Klopt het dat het gaat om ongeveer {m2} m²?`,
  },
  {
    key: 'lead_intake_onkruid',
    tabLabel: 'Onkruidbeheersing',
    hoofddienst: 'onkruidbeheersing',
    default: `Hoi {voornaam}👋

Bedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam} — ik help je snel aan een passende offerte voor onkruidbeheersing op jullie locatie.

Klopt het dat het gaat om ongeveer {m2} m²?`,
  },
] as const

type TemplateKey = (typeof TEMPLATES)[number]['key']

const VARIABLES = [
  '{voornaam}',
  '{naam}',
  '{bedrijf}',
  '{bot_naam}',
  '{m2}',
  '{hoofddienst}',
  '{plaats}',
] as const

const MAX_LEN = 1024

export function OpeningTemplateEditor({
  bedrijfsnaam,
  chatbotNaam,
  aanvragen,
}: {
  bedrijfsnaam: string
  chatbotNaam: string
  aanvragen: TemplateAanvraag[]
}) {
  const router = useRouter()
  const [activeKey, setActiveKey] = useState<TemplateKey>(TEMPLATES[0].key)
  const active = useMemo(
    () => TEMPLATES.find((t) => t.key === activeKey)!,
    [activeKey],
  )

  // Per-tab onthouden van de bewerkte tekst, zodat tabwissel niet wist.
  const [drafts, setDrafts] = useState<Record<TemplateKey, string>>(() => ({
    lead_intake_oprit: TEMPLATES[0].default,
    lead_intake_onkruid: TEMPLATES[1].default,
  }))
  const text = drafts[activeKey]
  const isChanged = text !== active.default

  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 2500)
    return () => clearTimeout(t)
  }, [savedFlash])

  const setText = (next: string) => {
    setDrafts((prev) => ({ ...prev, [activeKey]: next }))
    if (error) setError(null)
  }

  const insertVariable = (v: string) => {
    const ta = textareaRef.current
    if (!ta) {
      setText(text + v)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = text.slice(0, start) + v + text.slice(end)
    setText(next)
    // Focus blijft, cursor achter de ingevoegde tekst
    queueMicrotask(() => {
      ta.focus()
      const pos = start + v.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const reset = () => {
    setText(active.default)
    setError(null)
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const res = await requestTemplateChange(active.key, text)
      if (res.ok) {
        setSavedFlash(true)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const woorden = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text],
  )

  // Preview: vervang variabelen met voorbeeldwaardes
  const preview = useMemo(() => {
    return text
      .replaceAll('{voornaam}', 'Jeroen')
      .replaceAll('{naam}', 'Jeroen de Vries')
      .replaceAll('{bedrijf}', bedrijfsnaam || 'Schoon Straatje')
      .replaceAll('{bot_naam}', chatbotNaam || 'Surface')
      .replaceAll('{m2}', '145')
      .replaceAll('{hoofddienst}', active.hoofddienst)
      .replaceAll('{plaats}', 'Almere')
  }, [text, bedrijfsnaam, chatbotNaam, active.hoofddienst])

  return (
    <div className={styles.wrap}>
      {/* Tab-strip */}
      <div className={styles.tabs} role="tablist">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === activeKey}
            className={`${styles.tab} ${t.key === activeKey ? styles.tabActive : ''}`}
            onClick={() => setActiveKey(t.key)}
          >
            {t.tabLabel}
          </button>
        ))}
      </div>

      {/* Editor + preview kolom-layout */}
      <div className={styles.editorGrid}>
        {/* Linker kolom — editor */}
        <div className={styles.editorCol}>
          <div className={styles.colLabel}>Template-tekst</div>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_LEN}
            rows={8}
          />
          <div className={styles.metaRow}>
            <span className={styles.counter}>
              {text.length}/{MAX_LEN} tekens · {woorden} woorden
            </span>
            {isChanged && (
              <button type="button" className={styles.resetBtn} onClick={reset}>
                <RotateCcw size={12} /> Herstellen naar standaard
              </button>
            )}
          </div>

          <div className={styles.variablesBox}>
            <div className={styles.variablesLabel}>
              <Sparkles size={12} /> Beschikbare variabelen
              <span className={styles.variablesHint}>(klik om in te voegen)</span>
            </div>
            <div className={styles.variablesList}>
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={styles.variablePill}
                  onClick={() => insertVariable(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rechter kolom — preview */}
        <div className={styles.previewCol}>
          <div className={styles.colLabel}>Voorbeeld</div>
          <div className={styles.previewFrame}>
            <div className={styles.previewDateChip}>Vandaag</div>
            <div className={styles.previewBubble}>
              {preview.split('\n').map((line, i) => (
                <p key={i} className={styles.previewLine}>{line || ' '}</p>
              ))}
              <div className={styles.previewTime}>
                {new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                <Check size={11} className={styles.previewTick} />
                <Check size={11} className={styles.previewTick} />
              </div>
            </div>
          </div>
          <div className={styles.previewNote}>
            Surface stuurt dit bericht binnen 60 sec. na een nieuwe lead.
          </div>
        </div>
      </div>

      {/* Submit-rij */}
      <div className={styles.submitRow}>
        {error && (
          <span className={styles.error}>
            <AlertCircle size={12} /> {error}
          </span>
        )}
        {savedFlash && !error && (
          <span className={styles.flashOk}>
            <Check size={12} /> Aanvraag verstuurd
          </span>
        )}
        <button
          type="button"
          className={styles.submitBtn}
          disabled={!isChanged || isPending}
          onClick={submit}
        >
          {isPending ? 'Bezig…' : (
            <>
              <Send size={13} /> Aanvraag indienen
            </>
          )}
        </button>
      </div>

      {/* Aanvragen-lijst */}
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

function AanvraagRow({ aanvraag }: { aanvraag: TemplateAanvraag }) {
  const tone = statusTone(aanvraag.status)
  return (
    <div className={styles.aanvraagRow}>
      <div className={styles.aanvraagBody}>
        <div className={styles.aanvraagNaam}>{aanvraag.template_naam}</div>
        <div className={styles.aanvraagDate}>
          {new Date(aanvraag.aangemaakt_op).toLocaleString('nl-NL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
      <span className={`${styles.statusPill} ${styles[`status_${tone}`]}`}>
        {statusIcon(aanvraag.status)}
        {statusLabel(aanvraag.status)}
      </span>
    </div>
  )
}

function statusLabel(s: TemplateAanvraag['status']): string {
  switch (s) {
    case 'pending':   return 'In behandeling'
    case 'forwarded': return 'Verzonden naar Meta'
    case 'approved':  return 'Goedgekeurd'
    case 'applied':   return 'Live'
    case 'rejected':  return 'Afgewezen'
  }
}

function statusIcon(s: TemplateAanvraag['status']) {
  if (s === 'pending')   return <Clock size={11} />
  if (s === 'forwarded') return <Clock size={11} />
  if (s === 'approved')  return <CheckCircle2 size={11} />
  if (s === 'applied')   return <CheckCircle2 size={11} />
  if (s === 'rejected')  return <XCircle size={11} />
  return null
}

function statusTone(s: TemplateAanvraag['status']): 'amber' | 'blue' | 'green' | 'red' {
  if (s === 'pending')   return 'amber'
  if (s === 'forwarded') return 'blue'
  if (s === 'approved')  return 'green'
  if (s === 'applied')   return 'green'
  return 'red'
}
