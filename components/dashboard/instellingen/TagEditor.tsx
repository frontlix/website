'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { COLOR_OPTIONS, ICON_OPTIONS, type IconKey } from '@/lib/dashboard/tag-presets'
import { DEFAULT_TAG_ICON, ICON_REGISTRY } from './tag-icons'
import styles from './TagEditor.module.css'

/**
 * Modal voor het aanmaken of bewerken van een tag. Bevat naam-input, kleur-
 * swatches (10) en icon-grid (20). Toont onderaan een live preview van de
 * pill zoals 'ie in de overzicht-grid eruit komt te zien.
 *
 * Optimistic / async-save logica zit in de parent (TagsManager) — deze
 * component is puur form-state + onSubmit-callback.
 */

export type TagEditorValue = {
  naam: string
  kleur: string | null
  icon: IconKey | null
}

type Props = {
  mode: 'create' | 'edit'
  initial: Partial<TagEditorValue> | null
  onSave: (value: TagEditorValue) => Promise<void>
  onClose: () => void
  /** Foutmelding van de parent (server-zijde) om hier weer te geven. */
  externalError?: string | null
  /** True wanneer er een save bezig is — disabled state. */
  saving?: boolean
}

export function TagEditor({ mode, initial, onSave, onClose, externalError, saving }: Props) {
  const [naam, setNaam] = useState(initial?.naam ?? '')
  const [kleur, setKleur] = useState<string | null>(initial?.kleur ?? null)
  const [icon, setIcon] = useState<IconKey | null>(initial?.icon ?? null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // Esc om te sluiten.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, saving])

  const trimmed = naam.trim()
  const canSave = trimmed.length > 0 && !saving

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    void onSave({ naam: trimmed, kleur, icon })
  }

  const PreviewIcon = icon ? ICON_REGISTRY[icon] : DEFAULT_TAG_ICON
  const previewBg = kleur ? `${kleur}1a` : '#f1f5f9'
  const previewFg = kleur ?? '#334155'
  const previewBorder = kleur ? `${kleur}40` : '#e2e8f0'

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <form className={styles.modal} onSubmit={onSubmit}>
        <div className={styles.head}>
          <div className={styles.title}>
            {mode === 'create' ? 'Nieuwe tag' : 'Tag bewerken'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            disabled={saving}
            aria-label="Sluiten"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Naam */}
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Naam</span>
            <input
              ref={nameRef}
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="bv. VIP-klant"
              maxLength={32}
              disabled={saving}
              className={styles.input}
            />
          </label>

          {/* Kleur */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Kleur</span>
            <div className={styles.swatchRow}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setKleur(c)}
                  className={`${styles.swatch} ${kleur === c ? styles.swatchActive : ''}`}
                  style={{ background: c }}
                  disabled={saving}
                  aria-label={`Kies kleur ${c}`}
                  title={c}
                />
              ))}
              <button
                type="button"
                onClick={() => setKleur(null)}
                className={`${styles.swatchClear} ${kleur === null ? styles.swatchActive : ''}`}
                disabled={saving}
                title="Geen kleur"
              >
                <X size={11} />
              </button>
            </div>
          </div>

          {/* Icoon */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Icoon</span>
            <div className={styles.iconGrid}>
              {ICON_OPTIONS.map((key) => {
                const Icon = ICON_REGISTRY[key]
                const active = icon === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    className={`${styles.iconBtn} ${active ? styles.iconBtnActive : ''}`}
                    disabled={saving}
                    aria-label={key}
                    title={key}
                  >
                    <Icon size={15} />
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setIcon(null)}
                className={`${styles.iconBtn} ${icon === null ? styles.iconBtnActive : ''}`}
                disabled={saving}
                title="Geen icoon"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Preview</span>
            <div
              className={styles.preview}
              style={{
                background: previewBg,
                color: previewFg,
                borderColor: previewBorder,
              }}
            >
              <PreviewIcon size={11} />
              <span>{trimmed || 'Tag-naam'}</span>
            </div>
          </div>

          {externalError && <div className={styles.error}>{externalError}</div>}
        </div>

        <div className={styles.foot}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancel}
            disabled={saving}
          >
            Annuleer
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className={styles.save}
          >
            {saving ? '…' : mode === 'create' ? 'Aanmaken' : 'Opslaan'}
          </button>
        </div>
      </form>
    </div>
  )
}
