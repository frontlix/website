'use client'

// Echte reminder-dagen uit tenant_settings.reminder_dag_1/2/3. De stepper is
// gewired aan updateReminderDays (alleen scheduling — geen Meta-goedkeuring).
// Labels/subs zijn vast: de berichttekst zelf zit in de Surface-config en
// loopt via de aanvraag-flow (niet in dit mobiele v1-scherm).

import { useState, useTransition } from 'react'
import { Minus, Plus, Check, AlertTriangle } from 'lucide-react'
import { updateReminderDays } from '@/lib/dashboard/reminder-actions'
import styles from './InstReminders.module.css'

type ReminderNum = 1 | 2 | 3

const REMINDERS: Array<{ num: ReminderNum; label: string; sub: string; tone: string }> = [
  { num: 1, label: 'Eerste herinnering', tone: '#1A56FF', sub: 'Vriendelijk, zonder druk' },
  { num: 2, label: 'Tweede herinnering', tone: '#F59E0B', sub: 'Vraagt of klant nog interesse heeft' },
  { num: 3, label: 'Derde herinnering', tone: '#DC2626', sub: 'Laatste poging, optie tot afmelden' },
]

const MIN_DAYS = 1
const MAX_DAYS = 90

/** Reminders-detailscherm — per reminder een editable dag-stepper (echt persistent). */
export function InstReminders({ days }: { days: Record<ReminderNum, number> }) {
  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Surface stuurt deze berichten automatisch wanneer een klant niet op de
        offerte reageert.
      </p>

      {REMINDERS.map((r) => (
        <ReminderCard key={r.num} reminder={r} initialDays={days[r.num]} />
      ))}
    </div>
  )
}

function ReminderCard({
  reminder,
  initialDays,
}: {
  reminder: { num: ReminderNum; label: string; sub: string; tone: string }
  initialDays: number
}) {
  const [dagen, setDagen] = useState(initialDays)
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

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
      /* --tint is a per-item data value (hex color) — injected via style */
      style={{ '--tint': reminder.tone } as React.CSSProperties}
    >
      {/* Tinted number badge — bg via color-mix, fg via --tint */}
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

      {/* Editable dag-stepper */}
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
  )
}
