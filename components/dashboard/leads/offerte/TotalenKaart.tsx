'use client'

import { Eye, MessageCircle } from 'lucide-react'
import type { Totalen } from '@/lib/dashboard/btw-calc'
import { formatDateNL, formatEuro } from '@/lib/dashboard/format'
import styles from './TotalenKaart.module.css'

type Props = {
  totalen: Totalen
  /** Huidig kortingspercentage (0-100). Bij > 0 wordt de korting-regel getoond. */
  kortingPct?: number
  /** ISO date string. `null` als er nog geen geldigheidsdatum bekend is. */
  geldigTot: string | null
  onPdfClick?: () => void
  /** "Versturen via WhatsApp", fase 1: prop is genoeg, knop is voorbereid. */
  onSendClick?: () => void
  /** Bij `true` is de Versturen-knop uitgeschakeld (bv. geen regels in de offerte). */
  versturenDisabled?: boolean
}

export function TotalenKaart({
  totalen,
  kortingPct = 0,
  geldigTot,
  onPdfClick,
  onSendClick,
  versturenDisabled = false,
}: Props) {
  const heeftKorting = kortingPct > 0 && totalen.kortingBedrag > 0
  return (
    <div className={styles.card}>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Subtotaal</span>
          <span className={styles.rowValue}>{formatEuro(totalen.subtotaalExcl)}</span>
        </div>
        {heeftKorting && (
          <div className={`${styles.row} ${styles.rowDiscount}`}>
            <span className={styles.rowLabel}>Korting ({kortingPct}%)</span>
            <span className={styles.rowValue}>− {formatEuro(totalen.kortingBedrag)}</span>
          </div>
        )}
        <div className={`${styles.row} ${styles.rowStrong}`}>
          <span className={styles.rowLabel}>Excl BTW</span>
          <span className={styles.rowValue}>{formatEuro(totalen.naKortingExcl)}</span>
        </div>
        <div className={`${styles.row} ${styles.rowMuted}`}>
          <span className={styles.rowLabel}>BTW {totalen.btwPercentage}%</span>
          <span className={styles.rowValue}>{formatEuro(totalen.btw)}</span>
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <span className={styles.heroLabel}>TOTAAL INCL. BTW</span>
          <span className={styles.heroSub}>
            {geldigTot ? `geldig t/m ${formatDateNL(geldigTot)}` : 'geldigheid nog niet bepaald'}
          </span>
        </div>
        <span className={styles.heroAmount}>{formatEuro(totalen.totaalIncl)}</span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnOutline}
          onClick={onPdfClick}
        >
          <Eye size={14} aria-hidden="true" />
          <span>PDF</span>
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={versturenDisabled ? undefined : onSendClick}
          aria-disabled={versturenDisabled || undefined}
          disabled={versturenDisabled}
          title={versturenDisabled ? 'Voeg eerst regels toe' : undefined}
        >
          <MessageCircle size={14} aria-hidden="true" />
          <span>Versturen via WhatsApp</span>
        </button>
      </div>
    </div>
  )
}
