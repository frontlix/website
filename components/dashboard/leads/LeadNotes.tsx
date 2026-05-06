'use client'

import { useState, useTransition } from 'react'
import type { LeadNote } from '@/lib/dashboard/database.types'
import { formatRelative } from '@/lib/dashboard/format'
import { addNote, deleteNote } from '@/lib/dashboard/note-actions'
import styles from './LeadNotes.module.css'

export function LeadNotes({
  leadId,
  notes,
  currentUserId,
}: {
  leadId: string
  notes: LeadNote[]
  currentUserId: string
}) {
  const [tekst, setTekst] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = tekst.trim()
    if (!value) return
    setError(null)
    startTransition(async () => {
      const result = await addNote(leadId, value)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTekst('')
    })
  }

  const onDelete = (noteId: string) => {
    if (!confirm('Notitie verwijderen?')) return
    startTransition(async () => {
      const result = await deleteNote(noteId, leadId)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Notities</h3>

      <form onSubmit={submit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Voeg een interne notitie toe…"
          rows={3}
          disabled={pending}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={styles.submit}
          disabled={pending || !tekst.trim()}
        >
          {pending ? 'Bezig…' : 'Notitie toevoegen'}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className={styles.empty}>Nog geen notities.</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((n) => (
            <li key={n.id} className={styles.note}>
              <p className={styles.tekst}>{n.tekst}</p>
              <div className={styles.metaRow}>
                <span className={styles.meta}>
                  {n.auteur ? 'Medewerker' : 'Onbekend'} · {formatRelative(n.aangemaakt_op)}
                </span>
                {n.auteur === currentUserId && (
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => onDelete(n.id)}
                    disabled={pending}
                    aria-label="Notitie verwijderen"
                  >
                    Verwijder
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
