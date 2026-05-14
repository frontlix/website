'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useBotAction } from './use-bot-action'
import styles from './BotActions.module.css'

/**
 * AVG verwijder-knop. Type-to-confirm met "VERWIJDER" voorkomt accidentele
 * clicks. Bot wist lead + alle berichten/foto's/offertes/notes/tags permanent.
 * Na succes redirect naar /leads omdat de huidige lead-detail pagina niet
 * meer bestaat.
 */
export function AvgDeleteButton({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [bevestiging, setBevestiging] = useState('')

  const { run, pending, error } = useBotAction(
    `/api/dashboard/lead/${leadId}/delete`,
  )

  const canSubmit = bevestiging.trim().toUpperCase() === 'VERWIJDER'

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    run(undefined, () => {
      router.push('/leads')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        className={styles.dangerBtn}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={13} />
        Permanent verwijderen (AVG)
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
        }}
      >
        Onomkeerbaar. Alle berichten, foto&apos;s, offertes, notities, tags en
        statusgeschiedenis voor deze lead worden permanent verwijderd. Surface
        ruimt ook eventuele Google Calendar afspraken op.
      </p>
      <label className={styles.field}>
        Typ &ldquo;VERWIJDER&rdquo; om te bevestigen
        <input
          type="text"
          value={bevestiging}
          onChange={(e) => setBevestiging(e.target.value)}
          autoFocus
          className={styles.input}
          placeholder="VERWIJDER"
        />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => {
            setOpen(false)
            setBevestiging('')
          }}
          disabled={pending}
        >
          Annuleer
        </button>
        <button
          type="submit"
          className={styles.dangerBtn}
          style={{ width: 'auto' }}
          disabled={pending || !canSubmit}
        >
          {pending ? 'Verwijderen…' : 'Permanent verwijderen'}
        </button>
      </div>
    </form>
  )
}
