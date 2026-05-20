'use client'

/**
 * KostprijzenModal — laat de eigenaar per dienst-categorie instellen welk
 * percentage van de omzet aan inkoop + arbeid opgaat. Live preview onderin
 * toont het effect op de huidige offerte. Persistentie via server-actions
 * (`saveKostprijzen` / `resetKostprijzen`) uit kostprijzen-actions.ts.
 *
 * Rendert `null` als `open=false`. ESC sluit de modal.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { formatEuro } from '@/lib/dashboard/format'
import {
  resetKostprijzen,
  saveKostprijzen,
  type Kostprijs,
} from '@/lib/dashboard/kostprijzen-actions'
import type { MargeRegel } from '@/lib/dashboard/marge-calc'
import styles from './KostprijzenModal.module.css'

type Props = {
  open: boolean
  onClose: () => void
  initialKostprijzen: Kostprijs[]
  /** Marge-regels in de huidige offerte — voor live preview. */
  margeRegels: MargeRegel[]
  /**
   * Wordt aangeroepen na succesvol opslaan; ouder kan dan opnieuw
   * berekenMarge() doen met de nieuwe waarden zonder een refetch.
   */
  onSaved: (nieuw: Kostprijs[]) => void
}

/**
 * Hulpsom per categorie op basis van rule_key:
 *  - count: hoeveel regels van dit type
 *  - omzet: totale omzet
 * Marge wordt apart berekend met huidige (draft) kost_pct.
 */
function regelStatsByKey(
  regels: MargeRegel[],
): Record<string, { count: number; omzet: number }> {
  const acc: Record<string, { count: number; omzet: number }> = {}
  for (const r of regels) {
    const key = r.rule_key ?? 'overig_handmatig'
    if (!acc[key]) acc[key] = { count: 0, omzet: 0 }
    acc[key].count += 1
    acc[key].omzet += r.omzet
  }
  return acc
}

export function KostprijzenModal({
  open,
  onClose,
  initialKostprijzen,
  margeRegels,
  onSaved,
}: Props) {
  // Lokale draft — sliders muteren deze, opslaan persist.
  const [draft, setDraft] = useState<Kostprijs[]>(initialKostprijzen)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Sync draft als initialKostprijzen verandert (bv. modal heropent na save in ouder).
  useEffect(() => {
    setDraft(initialKostprijzen)
  }, [initialKostprijzen])

  // ESC-handler — alleen actief als modal open is.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const statsByKey = useMemo(() => regelStatsByKey(margeRegels), [margeRegels])

  // Live preview: omzet/kosten/marge op basis van huidige draft-sliders.
  const preview = useMemo(() => {
    let omzet = 0
    let kosten = 0
    // Bouw look-up van draft-pct per rule_key.
    const pctMap = new Map<string, number>()
    for (const k of draft) pctMap.set(k.rule_key, k.kost_pct)

    for (const r of margeRegels) {
      const pct = pctMap.get(r.rule_key ?? 'overig_handmatig') ?? 0
      omzet += r.omzet
      kosten += r.omzet * (pct / 100)
    }
    const marge = omzet - kosten
    const margePct = omzet > 0 ? Math.round((marge / omzet) * 100) : 0
    return { omzet, kosten, marge, margePct }
  }, [draft, margeRegels])

  const updateSlider = useCallback((rule_key: string, kost_pct: number) => {
    setDraft((prev) =>
      prev.map((k) => (k.rule_key === rule_key ? { ...k, kost_pct } : k)),
    )
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Server-action accepteert alleen { rule_key, kost_pct } — we strippen
      // het label dat we lokaal voor de UI-rendering meedragen.
      const updates = draft.map((k) => ({
        rule_key: k.rule_key,
        kost_pct: k.kost_pct,
      }))
      const res = await saveKostprijzen(updates)
      if (res?.ok) {
        onSaved(draft)
        onClose()
      } else {
        // eslint-disable-next-line no-alert
        alert(`Opslaan mislukt: ${res?.error ?? 'onbekende fout'}`)
      }
    } finally {
      setSaving(false)
    }
  }, [draft, onSaved, onClose])

  const handleReset = useCallback(async () => {
    setResetting(true)
    try {
      const res = await resetKostprijzen()
      if (res?.ok && res.kostprijzen) {
        setDraft(res.kostprijzen)
      } else {
        // eslint-disable-next-line no-alert
        alert(`Terugzetten mislukt: ${res?.error ?? 'onbekende fout'}`)
      }
    } finally {
      setResetting(false)
    }
  }, [])

  if (!open) return null

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kostprijzen-modal-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ─── Header ─────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 id="kostprijzen-modal-title" className={styles.title}>
              Kostprijzen per dienst
            </h2>
            <p className={styles.sub}>
              Geef per dienst aan hoeveel procent van wat je vraagt op gaat aan
              inkoop + arbeid. Het marge-zicht rekent automatisch met deze
              waardes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Sluiten"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* ─── Body — sliders per categorie ───── */}
        <div className={styles.body}>
          {draft.map((k) => {
            const stats = statsByKey[k.rule_key]
            const margePctVoorRegel = 100 - k.kost_pct
            // Marge in euro's bij deze categorie (met huidige slider-waarde).
            const margeEuro = stats ? stats.omzet * (margePctVoorRegel / 100) : 0

            return (
              <div key={k.rule_key} className={styles.row}>
                <div className={styles.rowHeader}>
                  <div className={styles.rowLabels}>
                    <span className={styles.rowLabel}>{k.label}</span>
                    <span className={styles.rowMeta}>
                      {stats ? (
                        <>
                          in deze offerte: {stats.count}× · omzet{' '}
                          {formatEuro(stats.omzet)} · marge{' '}
                          {formatEuro(margeEuro)}
                        </>
                      ) : (
                        'niet in deze offerte'
                      )}
                    </span>
                  </div>
                  <span className={styles.rowPctValue}>{k.kost_pct}% kost</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={k.kost_pct}
                  onChange={(e) => updateSlider(k.rule_key, Number(e.target.value))}
                  className={styles.slider}
                  aria-label={`Kostprijs-percentage voor ${k.label}`}
                />

                <div className={styles.margeHint}>
                  → {margePctVoorRegel}% marge
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── Footer — preview + acties ──────── */}
        <div className={styles.preview}>
          <div className={styles.previewTitle}>Effect op deze offerte</div>
          <div className={styles.previewGrid}>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Omzet</span>
              <span className={styles.previewValue}>
                {formatEuro(preview.omzet)}
              </span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Geschatte kosten</span>
              <span className={styles.previewValue}>
                {formatEuro(preview.kosten)}
              </span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>Marge</span>
              <span className={styles.previewValue}>
                {formatEuro(preview.marge)}
              </span>
            </div>
            <div className={styles.previewItem}>
              <span className={styles.previewLabel}>% marge</span>
              <span className={styles.previewValueAccent}>
                {preview.margePct}%
              </span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleReset}
            className={styles.resetLink}
            disabled={resetting}
          >
            {resetting ? 'Bezig…' : 'Standaard-waarden terugzetten'}
          </button>
          <div className={styles.actionsRight}>
            <button
              type="button"
              onClick={onClose}
              className={styles.btnGhost}
              disabled={saving}
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={styles.btnPrimary}
              disabled={saving}
            >
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
