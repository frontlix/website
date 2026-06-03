'use client'

import { useState } from 'react'
import { Calendar, CalendarClock } from 'lucide-react'
import { useBotAction } from './use-bot-action'
import styles from './BotActions.module.css'

const STARTTIJDEN = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00']

/**
 * Form voor zowel het inplannen van een nieuwe afspraak (`mode='book'`) als
 * het verplaatsen van een bestaande (`mode='reschedule'`). De bot-endpoints
 * verschillen alleen in pad, payload + UX is identiek.
 *
 * `mode='reschedule'` overslaat bewust de 48u-cutoff die in de WhatsApp-flow
 * geldt; eigenaar mag in dashboard tot vlak voor de afspraak verplaatsen.
 */
export function AppointmentForm({
  leadId,
  mode,
  initialDate,
  initialTime,
}: {
  leadId: string
  mode: 'book' | 'reschedule'
  initialDate?: string | null
  initialTime?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [datum, setDatum] = useState(initialDate ?? '')
  const [starttijd, setStarttijd] = useState(initialTime ?? STARTTIJDEN[0])

  const path =
    mode === 'book'
      ? `/api/dashboard/lead/${leadId}/book-appointment`
      : `/api/dashboard/lead/${leadId}/reschedule`

  const { run, pending, error, success } = useBotAction(path)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!datum || !starttijd) return
    run({ datum, starttijd }, () => setOpen(false))
  }

  const label = mode === 'book' ? 'Plan afspraak' : 'Verplaats afspraak'
  const Icon = mode === 'book' ? Calendar : CalendarClock

  if (!open) {
    return (
      <button
        type="button"
        className={styles.actionBtn}
        onClick={() => setOpen(true)}
      >
        <Icon size={13} />
        {label}
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          Datum
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            required
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Starttijd
          <select
            value={starttijd}
            onChange={(e) => setStarttijd(e.target.value)}
            className={styles.input}
          >
            {STARTTIJDEN.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      {mode === 'reschedule' && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          Surface stuurt een verplaats-bericht via WhatsApp + e-mail. Geen
          48u-grens vanuit dashboard.
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Annuleer
        </button>
        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={pending}
        >
          {pending ? 'Bezig…' : label}
        </button>
      </div>
    </form>
  )
}
