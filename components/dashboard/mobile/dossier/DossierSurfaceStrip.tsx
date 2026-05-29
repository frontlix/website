'use client'

import { Sparkles, Pause } from 'lucide-react'
import styles from './DossierSurfaceStrip.module.css'

interface DossierSurfaceStripProps {
  /** Fase-label, bv. 'Info verzamelen' — toont als "SURFACE · {fase}". */
  fase: string
  /** Surface-bericht onder de fase-regel. */
  message: string
}

/**
 * DossierSurfaceStrip — gradient-card met een gradient Sparkles-bubble,
 * "SURFACE · {fase}" (primary uppercase) + bericht, en een ghost "Pauze"-knop.
 * Pauze is visueel-only in v1.
 */
export function DossierSurfaceStrip({ fase, message }: DossierSurfaceStripProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.bubble} aria-hidden="true">
          <Sparkles size={15} aria-hidden="true" />
        </div>
        <div className={styles.body}>
          <div className={styles.kicker}>Surface · {fase}</div>
          <div className={styles.message}>{message}</div>
        </div>
        <button type="button" className={styles.pause}>
          <Pause size={12} aria-hidden="true" />
          Pauze
        </button>
      </div>
    </div>
  )
}
