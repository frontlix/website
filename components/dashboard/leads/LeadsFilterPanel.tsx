'use client'

import { useState } from 'react'
import type { LeadsFilters, DateField } from '@/lib/dashboard/lead-filters'
import type {
  Tag,
  DashboardStatus,
  GesprekFase,
} from '@/lib/dashboard/database.types'
import styles from './LeadsFilterPanel.module.css'

export function LeadsFilterPanel({
  filters,
  allTags,
  onApply,
  onClose,
}: {
  filters: LeadsFilters
  allTags: Tag[]
  onApply: (next: LeadsFilters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<LeadsFilters>(filters)

  const setStatus = (status: DashboardStatus | '') =>
    setDraft((d) => ({ ...d, status: status || undefined }))

  const toggleTag = (tagId: string) => {
    const current = new Set(draft.tags ?? [])
    if (current.has(tagId)) current.delete(tagId)
    else current.add(tagId)
    setDraft((d) => ({
      ...d,
      tags: current.size > 0 ? [...current] : undefined,
    }))
  }

  const setDateField = (dateField: DateField) =>
    setDraft((d) => ({ ...d, dateField }))

  const setFrom = (from: string) =>
    setDraft((d) => ({ ...d, from: from || undefined }))
  const setTo = (to: string) =>
    setDraft((d) => ({ ...d, to: to || undefined }))
  const setFase = (fase: GesprekFase | '') =>
    setDraft((d) => ({ ...d, fase: fase || undefined }))

  const reset = () => setDraft({})
  const apply = () => onApply(draft)

  const dateFieldValue: DateField = draft.dateField ?? 'aangemaakt'

  return (
    <div className={styles.panel}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Dashboard-status</span>
          <select
            className={styles.input}
            value={draft.status ?? ''}
            onChange={(e) => setStatus(e.target.value as DashboardStatus | '')}
          >
            <option value="">Alle</option>
            <option value="open">Open</option>
            <option value="opgevolgd">Opgevolgd</option>
            <option value="afgehandeld">Afgehandeld</option>
            <option value="no_show">No-show</option>
            <option value="geen_interesse">Geen interesse</option>
            <option value="archief">Archief</option>
          </select>
        </label>

        <div className={styles.field}>
          <span className={styles.label}>Tags (alle moeten matchen)</span>
          {allTags.length === 0 ? (
            <p className={styles.empty}>Geen tags gemaakt.</p>
          ) : (
            <div className={styles.tagPicker}>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`${styles.tagToggle} ${
                    (draft.tags ?? []).includes(tag.id)
                      ? styles.tagToggleOn
                      : ''
                  }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.naam}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Datum</span>
          <div className={styles.dateRow}>
            <select
              className={styles.input}
              value={dateFieldValue}
              onChange={(e) => setDateField(e.target.value as DateField)}
              aria-label="Datum-kolom"
            >
              <option value="aangemaakt">Aangemaakt</option>
              <option value="bijgewerkt">Bijgewerkt</option>
            </select>
            <input
              type="date"
              className={styles.input}
              value={draft.from ?? ''}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Van datum"
            />
            <input
              type="date"
              className={styles.input}
              value={draft.to ?? ''}
              onChange={(e) => setTo(e.target.value)}
              aria-label="T/m datum"
            />
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Gesprek-fase</span>
          <select
            className={styles.input}
            value={draft.fase ?? ''}
            onChange={(e) => setFase(e.target.value as GesprekFase | '')}
          >
            <option value="">Alle</option>
            <option value="info_verzamelen">Info verzamelen</option>
            <option value="offerte_besproken">Offerte besproken</option>
            <option value="onderhandelen">Onderhandelen</option>
            <option value="datum_kiezen">Datum kiezen</option>
            <option value="afspraak_bevestigd">Afspraak bevestigd</option>
          </select>
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.reset}
          onClick={reset}
        >
          Wis filters
        </button>
        <div className={styles.applyGroup}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onClose}
          >
            Annuleren
          </button>
          <button
            type="button"
            className={styles.apply}
            onClick={apply}
          >
            Toepassen
          </button>
        </div>
      </div>
    </div>
  )
}
