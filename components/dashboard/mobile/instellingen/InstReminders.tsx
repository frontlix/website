'use client'

// Reminders, mobiel. Twee lagen per reminder:
//  1) dag-stepper → direct persistent via updateReminderDays (alleen scheduling,
//     geen Meta-goedkeuring).
//  2) inklapbaar "Bericht bewerken" → de berichttekst zelf, via de aanvraag-flow
//     (Meta-goedkeuring + Slack-melding) in het gedeelde InstTemplateBlock.
// Defaults zijn 1-op-1 overgenomen van de desktop RemindersEditor.

import { useState, useTransition } from 'react'
import { Minus, Plus, Check, AlertTriangle, ChevronDown, Pencil } from 'lucide-react'
import { updateReminderDays } from '@/lib/dashboard/reminder-actions'
import type { TemplateAanvraag } from '@/lib/dashboard/template-queries'
import { InstTemplateBlock } from './InstTemplateBlock'
import styles from './InstReminders.module.css'

type ReminderNum = 1 | 2 | 3

const REMINDERS: Array<{
  num: ReminderNum
  label: string
  sub: string
  tone: string
  default: string
}> = [
  {
    num: 1,
    label: 'Eerste herinnering',
    tone: '#1A56FF',
    sub: 'Vriendelijk, zonder druk',
    default:
      'Hoi {voornaam}, ik wilde even checken of je de offerte goed hebt ontvangen.\n\nMocht je vragen hebben of ergens over twijfelen, stuur gerust een berichtje. Ik denk graag met je mee.',
  },
  {
    num: 2,
    label: 'Tweede herinnering',
    tone: '#F59E0B',
    sub: 'Vraagt of klant nog interesse heeft',
    default:
      'Hi {voornaam},\n\nEven een berichtje naar aanleiding van de offerte die we je hebben gestuurd.\n\nMocht je nog vragen hebben, iets aangepast willen zien of de offerte samen willen bespreken, dan horen we het graag. We denken graag met je mee.\n\nGroetjes,\nSurface',
  },
  {
    num: 3,
    label: 'Derde herinnering',
    tone: '#DC2626',
    sub: 'Laatste poging, optie tot afmelden',
    default:
      'Hoi {voornaam},\n\nMochten we deze week niets meer van je horen, dan gaan we ervan uit dat je er op dit moment geen gebruik van wilt maken en sluiten we de offerte voor nu af.\n\nUiteraard kun je op elk moment vrijblijvend opnieuw contact opnemen voor een nieuwe offerte.\n\nNogmaals dank voor je tijd.\n\nGroetjes,\nSurface',
  },
]

const VARIABLES = [
  '{voornaam}',
  '{naam}',
  '{bedrijf}',
  '{bot_naam}',
  '{totaal}',
  '{dienst}',
  '{geldig_tot}',
] as const

const MIN_DAYS = 1
const MAX_DAYS = 90

// Preview-substitutie voor reminder-templates (puur visueel, zegt niets over
// of de bot de variabelen daadwerkelijk doorgeeft).
function makeReminderPreview(text: string): string {
  const geldigTotDate = new Date()
  geldigTotDate.setDate(geldigTotDate.getDate() + 14)
  const geldigTot = geldigTotDate.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })
  return text
    .replaceAll('{voornaam}', 'Jeroen')
    .replaceAll('{naam}', 'Jeroen de Vries')
    .replaceAll('{bedrijf}', 'Schoon Straatje')
    .replaceAll('{bot_naam}', 'Surface')
    .replaceAll('{totaal}', '1.659,85')
    .replaceAll('{dienst}', 'oprit')
    .replaceAll('{geldig_tot}', geldigTot)
}

/** Reminders-detailscherm, per reminder dag-stepper + inklapbare tekst-editor. */
export function InstReminders({
  days,
  aanvragen,
}: {
  days: Record<ReminderNum, number>
  aanvragen: TemplateAanvraag[]
}) {
  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Surface stuurt deze berichten automatisch wanneer een klant niet op de
        offerte reageert. De dagen pas je direct aan; de berichttekst loopt via
        Meta-goedkeuring.
      </p>

      {REMINDERS.map((r) => (
        <ReminderCard
          key={r.num}
          reminder={r}
          initialDays={days[r.num]}
          aanvragen={aanvragen.filter((a) => a.template_naam === `reminder_${r.num}`)}
        />
      ))}
    </div>
  )
}

function ReminderCard({
  reminder,
  initialDays,
  aanvragen,
}: {
  reminder: { num: ReminderNum; label: string; sub: string; tone: string; default: string }
  initialDays: number
  aanvragen: TemplateAanvraag[]
}) {
  const [dagen, setDagen] = useState(initialDays)
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Berichttekst-editor: inklapbaar + eigen draft.
  const [open, setOpen] = useState(false)
  const [tekst, setTekst] = useState(reminder.default)

  function save(next: number) {
    const clamped = Math.min(MAX_DAYS, Math.max(MIN_DAYS, next))
    if (clamped === dagen) return
    const prev = dagen
    setDagen(clamped) // optimistic
    setStatus('idle')
    startTransition(async () => {
      const res = await updateReminderDays(reminder.num, clamped)
      if (res.ok) {
        setStatus('ok')
        setTimeout(() => setStatus('idle'), 1500)
      } else {
        setDagen(prev) // revert
        setStatus('err')
        setErrMsg(res.error)
      }
    })
  }

  return (
    <div
      className={styles.card}
      /* --tint is a per-item data value (hex color), injected via style */
      style={{ '--tint': reminder.tone } as React.CSSProperties}
    >
      {/* Bovenste rij: badge + info + dag-stepper */}
      <div className={styles.topRow}>
        <div className={styles.badge}>{reminder.num}</div>

        <div className={styles.info}>
          <div className={styles.label}>{reminder.label}</div>
          <div className={styles.sub}>{reminder.sub}</div>
          {status === 'ok' && (
            <div className={styles.savedFlash}>
              <Check size={11} aria-hidden="true" /> Opgeslagen
            </div>
          )}
          {status === 'err' && (
            <div className={styles.errFlash}>
              <AlertTriangle size={11} aria-hidden="true" /> {errMsg ?? 'Opslaan mislukt'}
            </div>
          )}
        </div>

        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => save(dagen - 1)}
            disabled={dagen <= MIN_DAYS}
            aria-label={`Verlaag dagen voor ${reminder.label}`}
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <div className={styles.dayCol}>
            <div className={styles.dayValue}>{dagen}d</div>
            <div className={styles.dayMeta}>na offerte</div>
          </div>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => save(dagen + 1)}
            disabled={dagen >= MAX_DAYS}
            aria-label={`Verhoog dagen voor ${reminder.label}`}
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Inklapbare berichttekst-editor */}
      <button
        type="button"
        className={styles.editToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Pencil size={13} aria-hidden="true" />
        Bericht bewerken
        {aanvragen.length > 0 && (
          <span className={styles.aanvraagDot} aria-label={`${aanvragen.length} aanvraag/aanvragen`}>
            {aanvragen.length}
          </span>
        )}
        <ChevronDown
          size={15}
          className={open ? styles.chevronOpen : styles.chevron}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className={styles.editBody}>
          <InstTemplateBlock
            templateKey={`reminder_${reminder.num}`}
            value={tekst}
            defaultText={reminder.default}
            onChange={setTekst}
            variables={VARIABLES}
            makePreview={makeReminderPreview}
            aanvragen={aanvragen}
          />
        </div>
      )}
    </div>
  )
}
