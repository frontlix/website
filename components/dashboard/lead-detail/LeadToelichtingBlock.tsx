'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { updateLeadFields } from '@/lib/dashboard/lead-actions'
import styles from './LeadInfoTab.module.css'

/**
 * Bewerkbare toelichting-blok onderaan de info-tab. Read-mode: full-width
 * kaart met de tekst (of "Geen toelichting") + pencil-knop in de hoek.
 * Edit-mode: textarea + Opslaan/Annuleren.
 */
export function LeadToelichtingBlock({
  leadId,
  toelichting,
}: {
  leadId: string
  toelichting: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(toelichting ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus()
      // Cursor aan eind van bestaande tekst
      const len = taRef.current.value.length
      taRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  const enterEdit = () => {
    setDraft(toelichting ?? '')
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setError(null)
  }

  const save = () => {
    startTransition(async () => {
      const trimmed = draft.trim()
      const res = await updateLeadFields(leadId, { toelichting: trimmed === '' ? null : trimmed })
      if (res.ok) {
        setEditing(false)
        setError(null)
      } else {
        setError(res.error)
      }
    })
  }

  if (!editing) {
    return (
      <div className={styles.toelichting}>
        <div className={styles.toelichtingHead}>
          <div className={styles.toelichtingLabel}>Toelichting</div>
          <button
            type="button"
            onClick={enterEdit}
            className={styles.toelichtingPencil}
            aria-label="Toelichting bewerken"
            title="Toelichting bewerken"
          >
            <Pencil size={12} />
            <span>Bewerken</span>
          </button>
        </div>
        <p className={styles.toelichtingText}>
          {toelichting ?? <em className={styles.toelichtingEmpty}>Geen toelichting</em>}
        </p>
      </div>
    )
  }

  return (
    <div className={styles.toelichting}>
      <div className={styles.toelichtingHead}>
        <div className={styles.toelichtingLabel}>Toelichting</div>
      </div>
      <textarea
        ref={taRef}
        className={styles.toelichtingTextarea}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Aanvullende info over deze lead…"
        rows={4}
      />
      {error && <div className={styles.toelichtingError}>{error}</div>}
      <div className={styles.toelichtingButtons}>
        <button
          type="button"
          onClick={cancel}
          disabled={isPending}
          className={styles.toelichtingCancel}
        >
          <X size={13} />
          <span>Annuleren</span>
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className={styles.toelichtingSave}
        >
          {isPending ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
          <span>Opslaan</span>
        </button>
      </div>
    </div>
  )
}
