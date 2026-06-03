'use client'

// Echte tags + lead-counts uit getTagsWithCounts. Verwijderen via deleteTag
// (alleen user-tags; systeem-tags worden bij refresh hersteld → geen X).
// Nieuwe tag via een inline form MET kleur- en icoonkiezer, pariteit met de
// desktop TagEditor: naam + kleur-swatches + icoon-grid + live preview.
// Presets/registry worden gedeeld met desktop (één bron van waarheid).

import { useState, useTransition } from 'react'
import { X, Plus, AlertTriangle } from 'lucide-react'
import { createTag, deleteTag } from '@/lib/dashboard/tags-actions'
import type { TagWithCount } from '@/lib/dashboard/tags-queries'
import {
  COLOR_OPTIONS,
  ICON_OPTIONS,
  isValidIcon,
  type IconKey,
} from '@/lib/dashboard/tag-presets'
import {
  ICON_REGISTRY,
  DEFAULT_TAG_ICON,
} from '@/components/dashboard/instellingen/tag-icons'
import { InstGroupCard, InstGhostBtn } from './InstAtoms'
import styles from './InstTags.module.css'

const NEUTRAL_TINT = '#6B7280'

/** Tags-detailscherm, lijst + verwijderen + nieuwe tag (kleur + icoon). */
export function InstTags({ tags }: { tags: TagWithCount[] }) {
  const [rows, setRows] = useState<TagWithCount[]>(tags)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [naam, setNaam] = useState('')
  const [kleur, setKleur] = useState<string | null>(null)
  const [icon, setIcon] = useState<IconKey | null>(null)
  const [pending, startTransition] = useTransition()

  function resetForm() {
    setAdding(false)
    setNaam('')
    setKleur(null)
    setIcon(null)
  }

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
      const res = await createTag({ naam: trimmed, kleur, icon })
      if (res.ok) {
        // Voeg de echte row (incl. uuid) toe, count 0, geen systeem-tag.
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
        resetForm()
      } else {
        setError(res.error)
      }
    })
  }

  // Preview-icoon: gekozen icoon, anders het default Tag-icoon (als desktop).
  const PreviewIcon = icon ? ICON_REGISTRY[icon] : DEFAULT_TAG_ICON

  return (
    <div className={styles.wrap}>
      <InstGroupCard>
        {rows.map((tag, i) => {
          // Altijd een icoon tonen, gekozen icoon of het default Tag-icoon
          // (zelfde fallback als de desktop-lijst).
          const TagIcon = isValidIcon(tag.icon)
            ? ICON_REGISTRY[tag.icon as IconKey]
            : DEFAULT_TAG_ICON
          return (
            <div key={tag.id} className={styles.row} data-last={i === rows.length - 1}>
              {/* Tinted pill, --tint injected as CSS custom property */}
              <span
                className={styles.pill}
                style={{ '--tint': tag.kleur ?? NEUTRAL_TINT } as React.CSSProperties}
              >
                <TagIcon size={12} aria-hidden="true" />
                {tag.naam}
              </span>

              <span className={styles.count}>
                {tag.count > 0
                  ? `${tag.count} ${tag.count === 1 ? 'lead' : 'leads'}`
                  : 'ongebruikt'}
              </span>

              {tag.isSystem ? (
                /* System tag, not deletable (wordt automatisch hersteld) */
                <span className={styles.sysBadge}>SYS</span>
              ) : (
                /* User tag, deletable */
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
          )
        })}
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
          <div className={styles.addCard}>
            <input
              className={styles.addInput}
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') resetForm()
              }}
              placeholder="Naam van de tag"
              maxLength={32}
              autoFocus
              aria-label="Naam van de nieuwe tag"
            />

            {/* Kleur-swatches (+ "geen kleur") */}
            <div className={styles.pickerLabel}>Kleur</div>
            <div className={styles.swatchRow}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setKleur(c)}
                  className={`${styles.swatch} ${kleur === c ? styles.swatchActive : ''}`}
                  style={{ background: c }}
                  aria-label={`Kies kleur ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={() => setKleur(null)}
                className={`${styles.swatchClear} ${kleur === null ? styles.swatchActive : ''}`}
                aria-label="Geen kleur"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>

            {/* Icoon-grid (+ "geen icoon") */}
            <div className={styles.pickerLabel}>Icoon</div>
            <div className={styles.iconGrid}>
              {ICON_OPTIONS.map((key) => {
                const Icon = ICON_REGISTRY[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`${styles.iconBtn} ${icon === key ? styles.iconBtnActive : ''}`}
                    aria-label={key}
                  >
                    <Icon size={17} aria-hidden="true" />
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setIcon(null)}
                className={`${styles.iconBtn} ${icon === null ? styles.iconBtnActive : ''}`}
                aria-label="Geen icoon"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            {/* Live preview */}
            <div className={styles.pickerLabel}>Voorbeeld</div>
            <span
              className={styles.pill}
              style={{ '--tint': kleur ?? NEUTRAL_TINT } as React.CSSProperties}
            >
              <PreviewIcon size={12} aria-hidden="true" />
              {naam.trim() || 'Voorbeeld'}
            </span>

            <div className={styles.addActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={resetForm}
                disabled={pending}
              >
                Annuleren
              </button>
              <button
                type="button"
                className={styles.createBtn}
                onClick={handleCreate}
                disabled={!naam.trim() || pending}
              >
                {pending ? 'Bezig…' : 'Tag aanmaken'}
              </button>
            </div>
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
