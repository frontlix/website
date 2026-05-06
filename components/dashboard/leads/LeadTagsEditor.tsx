'use client'

import { useState, useTransition } from 'react'
import type { Tag } from '@/lib/dashboard/database.types'
import { createTag, addTagToLead, removeTagFromLead } from '@/lib/dashboard/tag-actions'
import styles from './LeadTagsEditor.module.css'

export function LeadTagsEditor({
  leadId,
  leadTags,
  allTags,
}: {
  leadId: string
  leadTags: Tag[]
  allTags: Tag[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const leadTagIds = new Set(leadTags.map((t) => t.id))
  const availableTags = allTags.filter((t) => !leadTagIds.has(t.id))

  const handleRemove = (tagId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await removeTagFromLead(leadId, tagId)
      if (!result.ok) setError(result.error)
    })
  }

  const handleAdd = (tagId: string) => {
    setError(null)
    setOpen(false)
    startTransition(async () => {
      const result = await addTagToLead(leadId, tagId)
      if (!result.ok) setError(result.error)
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const naam = newTagName.trim()
    if (!naam) return
    setError(null)
    startTransition(async () => {
      const created = await createTag(naam)
      if (!created.ok) {
        setError(created.error)
        return
      }
      const linked = await addTagToLead(leadId, created.tagId)
      if (!linked.ok) {
        setError(linked.error)
        return
      }
      setNewTagName('')
      setOpen(false)
    })
  }

  return (
    <div className={styles.section}>
      <div className={styles.chips}>
        {leadTags.map((tag) => (
          <span key={tag.id} className={styles.chip}>
            {tag.naam}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => handleRemove(tag.id)}
              disabled={pending}
              aria-label={`Tag ${tag.naam} verwijderen`}
            >
              ×
            </button>
          </span>
        ))}

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
        >
          + Tag
        </button>
      </div>

      {open && (
        <div className={styles.dropdown}>
          {availableTags.length > 0 && (
            <ul className={styles.options}>
              {availableTags.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    className={styles.optionBtn}
                    onClick={() => handleAdd(tag.id)}
                  >
                    {tag.naam}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleCreate} className={styles.createForm}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nieuwe tag…"
              className={styles.createInput}
              disabled={pending}
            />
            <button
              type="submit"
              className={styles.createBtn}
              disabled={pending || !newTagName.trim()}
            >
              Aanmaken
            </button>
          </form>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
