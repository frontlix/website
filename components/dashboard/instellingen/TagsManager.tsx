'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, MapPin, Star, Plus, X, Sparkles } from 'lucide-react'
import { createTag, deleteTag } from '@/lib/dashboard/tags-actions'
import type { TagWithCount } from '@/lib/dashboard/tags-queries'
import styles from './TagsManager.module.css'

/**
 * Grid-overzicht van alle tags met:
 *  - usage-count per tag ("14 leads" / "nog niet gebruikt")
 *  - SYS-badge voor systeem-tags (read-only)
 *  - X-knop voor user-tags (verwijderen)
 *  - "+ Nieuwe tag" knop bovenin
 *
 * Optimistic UI: created/deleted state flipt direct, server response
 * komt erna; bij failure rollt de UI terug en toont de fout.
 */

type TagPalette = {
  bg: string
  fg: string
  border: string
  icon?: React.ComponentType<{ size?: number }>
}

const NAME_DEFAULTS: Record<string, TagPalette> = {
  Particulier: { bg: '#e0f2fe', fg: '#075985', border: '#bae6fd' },
  Zakelijk: { bg: '#dbeafe', fg: '#1e3a8a', border: '#bfdbfe' },
  Repeat: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
  Korting: {
    bg: '#fef3c7',
    fg: '#92400e',
    border: '#fde68a',
    icon: AlertTriangle,
  },
  'Buiten radius': {
    bg: '#fee2e2',
    fg: '#991b1b',
    border: '#fecaca',
    icon: MapPin,
  },
  Review: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0', icon: Star },
  'VIP-klant': { bg: '#ccfbf1', fg: '#115e59', border: '#99f6e4' },
}

const FALLBACK_PALETTE: TagPalette = {
  bg: '#f1f5f9',
  fg: '#334155',
  border: '#e2e8f0',
}

function paletteForTag(tag: TagWithCount): TagPalette {
  // Hex-kleur uit DB heeft voorrang (bv. owner heeft 'm hernoemd of kleur veranderd).
  if (tag.kleur && /^#[0-9a-f]{6}$/i.test(tag.kleur)) {
    return {
      bg: `${tag.kleur}1a`, // ~10% opacity achtergrond
      fg: tag.kleur,
      border: `${tag.kleur}40`,
    }
  }
  return NAME_DEFAULTS[tag.naam] ?? FALLBACK_PALETTE
}

export function TagsManager({ initialTags }: { initialTags: TagWithCount[] }) {
  const [tags, setTags] = useState<TagWithCount[]>(initialTags)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onCreate = () => {
    const naam = newName.trim()
    if (!naam) return
    setError(null)
    startTransition(async () => {
      const result = await createTag({ naam })
      if (!result.ok) {
        setError(result.error)
        return
      }
      // Optimistic: voeg toe met tijdelijke id (server-refresh haalt de
      // echte data binnen via revalidatePath).
      setTags((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          naam,
          kleur: null,
          aangemaakt_op: new Date().toISOString(),
          count: 0,
          isSystem: false,
        },
      ])
      setNewName('')
      setShowForm(false)
    })
  }

  const onDelete = (tag: TagWithCount) => {
    if (tag.isSystem) return
    if (
      tag.count > 0 &&
      !window.confirm(
        `Tag "${tag.naam}" wordt op ${tag.count} lead${tag.count === 1 ? '' : 's'} gebruikt. Toch verwijderen?`,
      )
    ) {
      return
    }
    setError(null)
    // Optimistic
    const prevTags = tags
    setTags((curr) => curr.filter((t) => t.id !== tag.id))
    startTransition(async () => {
      const result = await deleteTag(tag.id)
      if (!result.ok) {
        setTags(prevTags) // rollback
        setError(result.error)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          {error && <div className={styles.errorInline}>{error}</div>}
        </div>
        {!showForm ? (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => {
              setError(null)
              setShowForm(true)
            }}
          >
            <Plus size={13} />
            Nieuwe tag
          </button>
        ) : (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault()
              onCreate()
            }}
          >
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="bv. VIP-klant"
              maxLength={32}
              className={styles.formInput}
              disabled={pending}
            />
            <button
              type="submit"
              className={styles.formSave}
              disabled={pending || !newName.trim()}
            >
              {pending ? '…' : 'Opslaan'}
            </button>
            <button
              type="button"
              className={styles.formCancel}
              onClick={() => {
                setShowForm(false)
                setNewName('')
                setError(null)
              }}
              disabled={pending}
            >
              Annuleer
            </button>
          </form>
        )}
      </div>

      <div className={styles.grid}>
        {tags.length === 0 && (
          <div className={styles.empty}>Nog geen tags aangemaakt.</div>
        )}
        {tags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            onDelete={() => onDelete(tag)}
            disabled={pending}
          />
        ))}
      </div>

      <div className={styles.info}>
        <Sparkles size={13} className={styles.infoIcon} />
        <span>
          <strong>Systeem-tags</strong> ({renderSystemList()}) worden
          automatisch door Surface gezet op basis van bot-detectie en kunnen
          niet verwijderd worden — wel hernoemen of kleur aanpassen.
        </span>
      </div>
    </div>
  )
}

function renderSystemList(): React.ReactNode {
  const items: Array<{ name: string; Icon: React.ComponentType<{ size?: number }> | null }> = [
    { name: 'Korting', Icon: AlertTriangle },
    { name: 'Buiten radius', Icon: MapPin },
    { name: 'Review', Icon: Star },
  ]
  return items.map((it, idx) => (
    <span key={it.name} className={styles.infoTag}>
      {it.Icon && <it.Icon size={11} />}
      {it.name}
      {idx < items.length - 1 ? ', ' : ''}
    </span>
  ))
}

function TagCard({
  tag,
  onDelete,
  disabled,
}: {
  tag: TagWithCount
  onDelete: () => void
  disabled: boolean
}) {
  const p = paletteForTag(tag)
  const Icon = NAME_DEFAULTS[tag.naam]?.icon
  return (
    <div className={styles.card}>
      <div
        className={styles.pill}
        style={{
          background: p.bg,
          color: p.fg,
          borderColor: p.border,
        }}
      >
        {Icon && <Icon size={11} />}
        <span>{tag.naam}</span>
      </div>
      <div className={styles.count}>
        {tag.count === 0
          ? 'nog niet gebruikt'
          : `${tag.count} lead${tag.count === 1 ? '' : 's'}`}
      </div>
      {tag.isSystem ? (
        <span className={styles.sysBadge}>SYS</span>
      ) : (
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Verwijder tag ${tag.naam}`}
          title="Verwijderen"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
