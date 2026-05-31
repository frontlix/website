'use client'

// Echte tags + lead-counts uit getTagsWithCounts. Verwijderen is gewired aan
// deleteTag (alleen user-tags; systeem-tags worden bij refresh opnieuw
// aangemaakt en hebben dus geen X). Nieuwe tag via een inline createTag-form
// (naam-only; kleur/icoon kiezen blijft in v1 desktop-only).

import { useState, useTransition } from 'react'
import { X, Plus, Check, AlertTriangle } from 'lucide-react'
import { createTag, deleteTag } from '@/lib/dashboard/tags-actions'
import type { TagWithCount } from '@/lib/dashboard/tags-queries'
import { InstGroupCard, InstGhostBtn } from './InstAtoms'
import styles from './InstTags.module.css'

const NEUTRAL_TINT = '#6B7280'

/** Tags-detailscherm — lijst + verwijderen + nieuwe tag aanmaken. */
export function InstTags({ tags }: { tags: TagWithCount[] }) {
  const [rows, setRows] = useState<TagWithCount[]>(tags)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [naam, setNaam] = useState('')
  const [, startTransition] = useTransition()

  function handleDelete(tag: TagWithCount) {
    const prev = rows
    setRows((r) => r.filter((t) => t.id !== tag.id)) // optimistic
    setError(null)
    setDeletingId(tag.id)
    startTransition(async () => {
      const res = await deleteTag(tag.id)
      setDeletingId(null)
      if (!res.ok) {
        setRows(prev) // revert
        setError(res.error)
      }
    })
  }

  function handleCreate() {
    const trimmed = naam.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      const res = await createTag({ naam: trimmed })
      if (res.ok) {
        // Voeg de echte row (incl. uuid) toe — count 0, geen systeem-tag.
        setRows((r) => [
          ...r,
          {
            id: res.tag.id,
            naam: res.tag.naam,
            kleur: res.tag.kleur,
            icon: res.tag.icon,
            aangemaakt_op: res.tag.aangemaakt_op,
            count: 0,
            isSystem: false,
          },
        ])
        setNaam('')
        setAdding(false)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <InstGroupCard>
        {rows.map((tag, i) => (
          <div key={tag.id} className={styles.row} data-last={i === rows.length - 1}>
            {/* Tinted pill — --tint injected as CSS custom property */}
            <span
              className={styles.pill}
              style={{ '--tint': tag.kleur ?? NEUTRAL_TINT } as React.CSSProperties}
            >
              {tag.naam}
            </span>

            <span className={styles.count}>
              {tag.count > 0
                ? `${tag.count} ${tag.count === 1 ? 'lead' : 'leads'}`
                : 'ongebruikt'}
            </span>

            {tag.isSystem ? (
              /* System tag — not deletable (wordt automatisch hersteld) */
              <span className={styles.sysBadge}>SYS</span>
            ) : (
              /* User tag — deletable */
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleDelete(tag)}
                disabled={deletingId === tag.id}
                aria-label={`Verwijder tag ${tag.naam}`}
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className={styles.row} data-last="true">
            <span className={styles.count}>Nog geen tags.</span>
          </div>
        )}
      </InstGroupCard>

      {error && (
        <div className={styles.error} role="status">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.footer}>
        {adding ? (
          <div className={styles.addRow}>
            <input
              className={styles.addInput}
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') {
                  setAdding(false)
                  setNaam('')
                }
              }}
              placeholder="Naam van de tag"
              maxLength={32}
              autoFocus
              aria-label="Naam van de nieuwe tag"
            />
            <button
              type="button"
              className={styles.addConfirm}
              onClick={handleCreate}
              disabled={!naam.trim()}
              aria-label="Tag aanmaken"
            >
              <Check size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <InstGhostBtn onClick={() => setAdding(true)}>
            <Plus size={15} aria-hidden="true" />
            Nieuwe tag
          </InstGhostBtn>
        )}
      </div>
    </div>
  )
}
