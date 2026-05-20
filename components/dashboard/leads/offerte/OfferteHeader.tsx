'use client'

/**
 * OfferteHeader — top-bar van de Offerte-tab.
 *
 * Toont:
 *  - Versie-badge in gradient-pill (vN)
 *  - Status-tekst (concept / verstuurd-op datum)
 *  - "Auto uit lead-data" pill (alleen bij hasAutoRegels)
 *  - Save-indicator (idle / saving / saved) — gestuurd door parent
 *  - Knop "Bekijk verzonden offerte" (alleen bij verstuurd + pdf_url)
 *  - Knop "Preview huidige versie"
 *
 * Component is volledig presentational — alle state komt via props.
 */

import { Sparkles, ExternalLink, Eye, Undo2 } from 'lucide-react'
import { formatDateNL } from '@/lib/dashboard/format'
import styles from './OfferteHeader.module.css'

export type OfferteHeaderProps = {
  /** Versienummer (bv 1, 2, 3) — getoond als `v{n}`. */
  versie: number
  /** Of de offerte verstuurd is (`leads.offerte_verstuurd`). */
  verstuurd: boolean
  /** ISO date string wanneer verstuurd is; null als nog niet verstuurd. */
  verstuurdOp: string | null
  /** Toont de "Auto uit lead-data" pill wanneer true. */
  hasAutoRegels: boolean
  /** Save-state voor de indicator. Fase 1: meestal `'idle'`. */
  saveState?: 'idle' | 'saving' | 'saved'
  /** ISO timestamp van laatste succesvolle save — toont "zojuist bewaard". */
  lastSavedAt?: string | null
  /** Huidige `offerte.pdf_url` — opent in nieuw tabblad bij click. */
  verzondenPdfUrl?: string | null
  /** Callback voor "Preview huidige versie". Fase 1: meestal stub. */
  onPreviewClick?: () => void
  /**
   * Callback voor "Terug naar verzonden versie".
   * Alleen relevant als `canRevert === true`; anders wordt de knop verborgen.
   */
  onRevertClick?: () => void
  /**
   * Toont de "Terug naar verzonden versie"-knop alleen wanneer er
   * tegelijk een concept én een verzonden versie bestaat.
   */
  canRevert?: boolean
}

export function OfferteHeader({
  versie,
  verstuurd,
  verstuurdOp,
  hasAutoRegels,
  saveState = 'idle',
  lastSavedAt: _lastSavedAt,
  verzondenPdfUrl,
  onPreviewClick,
  onRevertClick,
  canRevert = false,
}: OfferteHeaderProps) {
  // Status-tekst links naast de versie-badge
  const statusText = verstuurd
    ? `Verstuurd op ${formatDateNL(verstuurdOp)}`
    : 'Concept · niet verstuurd'

  // Save-indicator tekst — leeg bij idle zodat er geen lege ruimte ontstaat
  let saveLabel = ''
  if (saveState === 'saving') saveLabel = 'Opslaan…'
  else if (saveState === 'saved') saveLabel = 'Zojuist bewaard'

  const showVerzondenLink = Boolean(verstuurd && verzondenPdfUrl)

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.versieBadge}>v{versie}</span>
        <span className={styles.statusText}>{statusText}</span>
        {hasAutoRegels ? (
          <span className={styles.autoPill}>
            <Sparkles size={11} aria-hidden="true" />
            Auto uit lead-data
          </span>
        ) : null}
      </div>

      <div className={styles.right}>
        {saveLabel ? <span className={styles.saveIndicator}>{saveLabel}</span> : null}

        {/*
         * "Terug naar verzonden versie" — alleen zichtbaar als er
         * tegelijk een concept én een verzonden versie bestaat. Klik
         * triggert in parent een confirm + revertConcept() server-action.
         */}
        {canRevert ? (
          <button
            type="button"
            className={styles.outlineBtn}
            onClick={() => onRevertClick?.()}
          >
            <Undo2 size={14} aria-hidden="true" />
            Terug naar verzonden versie
          </button>
        ) : null}

        {showVerzondenLink ? (
          <a
            href={verzondenPdfUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.outlineBtn}
          >
            <ExternalLink size={14} aria-hidden="true" />
            Bekijk verzonden offerte
          </a>
        ) : null}

        <button
          type="button"
          className={styles.outlineBtn}
          onClick={() => onPreviewClick?.()}
        >
          <Eye size={14} aria-hidden="true" />
          Preview huidige versie
        </button>
      </div>
    </header>
  )
}
