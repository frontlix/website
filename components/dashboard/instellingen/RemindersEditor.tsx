'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { requestTemplateChange } from '@/lib/dashboard/template-actions'
import { updateReminderDays } from '@/lib/dashboard/reminder-actions'
import type { TemplateAanvraag } from '@/lib/dashboard/template-queries'
import styles from './RemindersEditor.module.css'

/**
 * Reminders-editor in /instellingen?section=reminders. Per reminder:
 *  - editable "Na X dagen" → direct save (geen Meta-approval; alleen scheduling)
 *  - editable berichttekst → aanvraag-flow (Meta-approval vereist, Slack-melding)
 *  - live preview met variabele-substitutie
 *  - tekens/woorden counter + per-reminder aanvragen-historie
 *
 * Defaults zijn hardcoded omdat de source-of-truth in de Surface-config
 * (Python service) zit — bij goedkeuring werkt Frontlix die config bij,
 * waarna de defaults hier ook geüpdatet worden.
 */

const REMINDERS = [
  {
    key: 'reminder_1',
    num: 1,
    label: 'Eerste herinnering',
    sub: 'Vriendelijk, zonder druk',
    accent: '#3b82f6',
    default:
      "Ik heb gisteren de offerte van € {totaal} doorgestuurd. Heb je 'm kunnen bekijken? Even tikje sturen als je nog vragen hebt, dan denk ik graag met je mee.\n\nGroet,\n{bot_naam} namens {bedrijf}",
  },
  {
    key: 'reminder_2',
    num: 2,
    label: 'Tweede herinnering',
    sub: 'Vraagt expliciet of klant nog interesse heeft',
    accent: '#3b82f6',
    default:
      "Hoi {voornaam},\n\nNog even een check: is de offerte voor het {dienst} duidelijk? Geen druk hoor — gewoon laten weten of je 'm in beraad houdt of liever afmeldt. Beide is prima.\n\nDe offerte is nog geldig tot {geldig_tot}.",
  },
  {
    key: 'reminder_3',
    num: 3,
    label: 'Derde herinnering',
    sub: 'Laatste poging, met optie tot afmelden',
    accent: '#ef4444',
    default:
      "Hoi {voornaam},\n\nLaatste tikje — als ik over een paar dagen niks hoor sluit ik de offerte automatisch af. Geen probleem als het niet doorgaat; wel fijn als je het even bevestigt.\n\nWil je 'm toch nog gebruiken? Reageer dan vóór {geldig_tot}.",
  },
] as const

const VARIABLES = [
  '{voornaam}',
  '{naam}',
  '{bedrijf}',
  '{bot_naam}',
  '{totaal}',
  '{dienst}',
  '{geldig_tot}',
] as const

const MAX_LEN = 1024

export function RemindersEditor({
  bedrijfsnaam,
  chatbotNaam,
  initialDays,
  aanvragen,
}: {
  bedrijfsnaam: string
  chatbotNaam: string
  initialDays: { 1: number; 2: number; 3: number }
  aanvragen: TemplateAanvraag[]
}) {
  return (
    <div className={styles.list}>
      {REMINDERS.map((r) => (
        <ReminderCard
          key={r.key}
          reminder={r}
          initialDays={initialDays[r.num as 1 | 2 | 3]}
          bedrijfsnaam={bedrijfsnaam}
          chatbotNaam={chatbotNaam}
          aanvragen={aanvragen.filter((a) => a.template_naam === r.key)}
        />
      ))}
    </div>
  )
}

/* ── Per-reminder card ───────────────────────────────── */
function ReminderCard({
  reminder,
  initialDays,
  bedrijfsnaam,
  chatbotNaam,
  aanvragen,
}: {
  reminder: (typeof REMINDERS)[number]
  initialDays: number
  bedrijfsnaam: string
  chatbotNaam: string
  aanvragen: TemplateAanvraag[]
}) {
  const router = useRouter()
  const [tekst, setTekst] = useState<string>(reminder.default)
  const [days, setDays] = useState(initialDays)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [daysFlash, setDaysFlash] = useState(false)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 2500)
    return () => clearTimeout(t)
  }, [savedFlash])

  useEffect(() => {
    if (!daysFlash) return
    const t = setTimeout(() => setDaysFlash(false), 1800)
    return () => clearTimeout(t)
  }, [daysFlash])

  const isChanged = tekst !== reminder.default

  const insertVariable = (v: string) => {
    const ta = textareaRef.current
    if (!ta) {
      setTekst(tekst + v)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = tekst.slice(0, start) + v + tekst.slice(end)
    setTekst(next)
    queueMicrotask(() => {
      ta.focus()
      const pos = start + v.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const reset = () => {
    setTekst(reminder.default)
    setError(null)
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const res = await requestTemplateChange(reminder.key, tekst)
      if (res.ok) {
        setSavedFlash(true)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  const onDaysBlur = () => {
    if (days === initialDays) return
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      setDays(initialDays)
      return
    }
    startTransition(async () => {
      const res = await updateReminderDays(reminder.num as 1 | 2 | 3, days)
      if (res.ok) {
        setDaysFlash(true)
        router.refresh()
      } else {
        setError(res.error)
        setDays(initialDays)
      }
    })
  }

  const woorden = useMemo(
    () => tekst.trim().split(/\s+/).filter(Boolean).length,
    [tekst],
  )

  // Preview: vervang variabelen met voorbeeldwaardes
  const preview = useMemo(() => {
    const geldigTotDate = new Date()
    geldigTotDate.setDate(geldigTotDate.getDate() + 14)
    const geldigTot = geldigTotDate.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
    })
    return tekst
      .replaceAll('{voornaam}', 'Jeroen')
      .replaceAll('{naam}', 'Jeroen de Vries')
      .replaceAll('{bedrijf}', bedrijfsnaam || 'Schoon Straatje')
      .replaceAll('{bot_naam}', chatbotNaam || 'Surface')
      .replaceAll('{totaal}', '1.659,85')
      .replaceAll('{dienst}', 'oprit')
      .replaceAll('{geldig_tot}', geldigTot)
  }, [tekst, bedrijfsnaam, chatbotNaam])

  return (
    <div className={styles.card}>
      {/* Header: num + label + editable days */}
      <div className={styles.head}>
        <div className={styles.numBadge} style={{ background: reminder.accent }}>
          {reminder.num}
        </div>
        <div className={styles.headBody}>
          <div className={styles.headTitle}>{reminder.label}</div>
          <div className={styles.headSub}>{reminder.sub}</div>
        </div>
        <div className={styles.daysControl}>
          <span>Na</span>
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value || '0', 10))}
            onBlur={onDaysBlur}
            disabled={isPending}
            className={styles.daysInput}
            aria-label="Aantal dagen"
          />
          <span>dagen</span>
          {daysFlash && (
            <Check size={12} className={styles.daysFlash} aria-label="Opgeslagen" />
          )}
        </div>
      </div>

      {/* Editor + preview kolommen */}
      <div className={styles.editorGrid}>
        <div className={styles.editorCol}>
          <div className={styles.colLabel}>Berichttekst</div>
          <textarea
            ref={textareaRef}
            value={tekst}
            onChange={(e) => {
              setTekst(e.target.value)
              if (error) setError(null)
            }}
            maxLength={MAX_LEN}
            rows={6}
            className={styles.textarea}
          />
          <div className={styles.metaRow}>
            <span className={styles.counter}>
              {tekst.length} tekens · {woorden} woorden
            </span>
            <span className={styles.suggestieBadge}>
              <Sparkles size={11} /> Surface-suggestie
            </span>
          </div>

          <div className={styles.variablesBox}>
            <div className={styles.variablesLabel}>
              <Sparkles size={11} /> Variabelen
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

        <div className={styles.previewCol}>
          <div className={styles.colLabel}>Voorbeeld</div>
          <div className={styles.previewFrame}>
            <div className={styles.previewBubble}>
              {preview.split('\n').map((line, i) => (
                <p key={i} className={styles.previewLine}>
                  {line || ' '}
                </p>
              ))}
              <div className={styles.previewTime}>
                {new Date().toLocaleTimeString('nl-NL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                <Check size={10} className={styles.previewTick} />
                <Check size={10} className={styles.previewTick} />
              </div>
            </div>
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
        {isChanged && !savedFlash && !error && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={reset}
            disabled={isPending}
          >
            <RotateCcw size={11} /> Herstellen naar standaard
          </button>
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
              <Send size={12} /> Aanvraag indienen
            </>
          )}
        </button>
      </div>

      {/* Aanvragen-historie voor deze reminder */}
      {aanvragen.length > 0 && (
        <div className={styles.aanvragenBox}>
          <div className={styles.aanvragenTitle}>Aanvragen voor deze reminder</div>
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

/* ── Aanvraag-historie row ───────────────────────────── */
function AanvraagRow({ aanvraag }: { aanvraag: TemplateAanvraag }) {
  const tone = statusTone(aanvraag.status)
  return (
    <div className={styles.aanvraagRow}>
      <div className={styles.aanvraagDate}>
        {new Date(aanvraag.aangemaakt_op).toLocaleString('nl-NL', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
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
  if (s === 'pending') return <Clock size={11} />
  if (s === 'forwarded') return <Clock size={11} />
  if (s === 'approved') return <CheckCircle2 size={11} />
  if (s === 'applied') return <CheckCircle2 size={11} />
  if (s === 'rejected') return <XCircle size={11} />
  return null
}

function statusTone(s: TemplateAanvraag['status']): 'amber' | 'blue' | 'green' | 'red' {
  if (s === 'pending') return 'amber'
  if (s === 'forwarded') return 'blue'
  if (s === 'approved') return 'green'
  if (s === 'applied') return 'green'
  return 'red'
}
