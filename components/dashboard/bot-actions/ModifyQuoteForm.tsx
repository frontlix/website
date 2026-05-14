'use client'

import { useState } from 'react'
import { Edit3 } from 'lucide-react'
import { useBotAction } from './use-bot-action'
import type { Lead } from '@/lib/dashboard/database.types'
import styles from './BotActions.module.css'

type Fields = {
  m2: number
  korting_percentage: number
  extra_arbeid_minuten: number
  extra_arbeid_personen: number
  voegzand_zakken: number
  send_to_customer: boolean
}

/**
 * Inline form om offerte-parameters aan te passen en Surface een nieuwe
 * versie te laten genereren + versturen. Default zijn alle velden gevuld
 * met de huidige lead-waarden zodat owner alleen aanpast wat verandert.
 */
export function ModifyQuoteForm({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState<Fields>({
    m2: lead.m2 ?? 0,
    korting_percentage: lead.korting_percentage ?? 0,
    extra_arbeid_minuten: lead.extra_arbeid_minuten ?? 0,
    extra_arbeid_personen: lead.extra_arbeid_personen ?? 0,
    voegzand_zakken: lead.voegzand_zakken ?? 0,
    send_to_customer: true,
  })

  const { run, pending, error, success } = useBotAction(
    `/api/dashboard/lead/${lead.lead_id}/modify-quote`,
  )

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { send_to_customer, ...patch } = fields
    run({ ...patch, send_to_customer }, () => setOpen(false))
  }

  const update = <K extends keyof Fields>(k: K, v: Fields[K]) =>
    setFields((s) => ({ ...s, [k]: v }))

  if (!open) {
    return (
      <button
        type="button"
        className={styles.actionBtn}
        onClick={() => setOpen(true)}
      >
        <Edit3 size={13} />
        Aanpassen + sturen
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          m² oppervlakte
          <input
            type="number"
            min={0}
            value={fields.m2}
            onChange={(e) => update('m2', Number(e.target.value))}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Korting (%)
          <input
            type="number"
            min={0}
            max={100}
            value={fields.korting_percentage}
            onChange={(e) =>
              update('korting_percentage', Number(e.target.value))
            }
            className={styles.input}
          />
        </label>
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.field}>
          Extra arbeid (min)
          <input
            type="number"
            min={0}
            value={fields.extra_arbeid_minuten}
            onChange={(e) =>
              update('extra_arbeid_minuten', Number(e.target.value))
            }
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          Extra personen
          <input
            type="number"
            min={0}
            value={fields.extra_arbeid_personen}
            onChange={(e) =>
              update('extra_arbeid_personen', Number(e.target.value))
            }
            className={styles.input}
          />
        </label>
      </div>
      <label className={styles.field}>
        Voegzand (zakken)
        <input
          type="number"
          min={0}
          value={fields.voegzand_zakken}
          onChange={(e) => update('voegzand_zakken', Number(e.target.value))}
          className={styles.input}
        />
      </label>
      <label
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          fontSize: 'var(--text-xs)',
        }}
      >
        <input
          type="checkbox"
          checked={fields.send_to_customer}
          onChange={(e) => update('send_to_customer', e.target.checked)}
        />
        Direct naar klant sturen (uit = alleen owner-mail ter goedkeuring)
      </label>
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
          {pending ? 'Bezig…' : 'Aanpassen + sturen'}
        </button>
      </div>
    </form>
  )
}
