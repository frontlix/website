'use client'

/**
 * MargeKaart, owner-only sidebar-kaart die de marge van de huidige offerte
 * inzichtelijk maakt. Toont kosten, marge in euro's, marge in percentage met
 * status-kleur, een progress-bar, en (optioneel uit te klappen) een lijst van
 * regels met hun individuele marge.
 *
 * De data komt uit `berekenMarge()` (zie lib/dashboard/marge-calc.ts), deze
 * component bevat geen rekenlogica zelf, alleen presentatie + lokale UI-state
 * voor de "Toon per regel"-expand.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Settings, X } from 'lucide-react'
import { formatEuro } from '@/lib/dashboard/format'
import type { MargeOverview } from '@/lib/dashboard/marge-calc'
import styles from './MargeKaart.module.css'

type Props = {
  overview: MargeOverview
  /** Opent de Kostprijzen-modal (parent owns modal-state). */
  onOpenKostprijzen: () => void
  /** Sluit de kaart visueel (parent owns visibility-state). Optioneel. */
  onClose?: () => void
}

/**
 * Map status → CSS-modifier-classname. Eén plek om kleur-mapping aan te passen.
 * Acceptabel valt op `--accent` (cyaan), we hebben geen dedicated warning-token
 * en de cyaan past binnen het blauw/cyaan-merk.
 */
function statusClass(status: MargeOverview['status']): string {
  switch (status) {
    case 'krap':
      return styles.statusKrap
    case 'acceptabel':
      return styles.statusAcceptabel
    case 'gezond':
      return styles.statusGezond
    case 'uitstekend':
      return styles.statusUitstekend
    default:
      return styles.statusGezond
  }
}

function statusLabel(status: MargeOverview['status']): string {
  switch (status) {
    case 'krap':
      return 'Krap, onder verlies-grens'
    case 'acceptabel':
      return 'Acceptabel'
    case 'gezond':
      return 'Gezond, boven 50%'
    case 'uitstekend':
      return 'Uitstekend'
    default:
      return ''
  }
}

export function MargeKaart({ overview, onOpenKostprijzen, onClose }: Props) {
  const [perRegelOpen, setPerRegelOpen] = useState(false)

  // Progress-bar fill: cap op 100% voor visuele consistentie bij outliers.
  // margePct uit berekenMarge() is een ongerond float, wij ronden voor display.
  const margePctDisplay = Math.round(overview.margePct)
  const fillPct = Math.max(0, Math.min(margePctDisplay, 100))
  const statusCls = statusClass(overview.status)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Settings size={14} aria-hidden="true" className={styles.headerIcon} />
          <span className={styles.headerLabel}>MARGE-ZICHT</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.alleenJijBadge}>alleen jij</span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className={styles.closeBtn}
              aria-label="Marge-kaart verbergen"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.kostenRow}>
        <div className={styles.kostenCol}>
          <span className={styles.kostenLine}>
            kosten ≈ {formatEuro(overview.kosten)}
          </span>
          <span className={styles.margeLine}>
            marge {formatEuro(overview.marge)}
          </span>
        </div>
        <div className={`${styles.pctValue} ${statusCls}`}>
          {margePctDisplay}%
        </div>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${statusCls}`}
          style={{ width: `${fillPct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className={`${styles.statusText} ${statusCls}`}>
        {statusLabel(overview.status)}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => setPerRegelOpen((v) => !v)}
          className={styles.actionBtn}
          aria-expanded={perRegelOpen}
        >
          {perRegelOpen ? (
            <ChevronUp size={12} aria-hidden="true" />
          ) : (
            <ChevronDown size={12} aria-hidden="true" />
          )}
          Toon per regel
        </button>
        <button
          type="button"
          onClick={onOpenKostprijzen}
          className={styles.actionBtn}
        >
          <Settings size={12} aria-hidden="true" />
          Pas kostprijzen aan
        </button>
      </div>

      {perRegelOpen ? (
        <div className={styles.perRegelList}>
          <div className={`${styles.perRegelRow} ${styles.perRegelHeader}`}>
            <span>Omschrijving</span>
            <span className={styles.perRegelNum}>Omzet</span>
            <span className={styles.perRegelNum}>Kosten</span>
            <span className={styles.perRegelNum}>Marge</span>
          </div>
          {overview.regels.map((r, idx) => (
            <div key={`${r.omschrijving}-${idx}`} className={styles.perRegelRow}>
              <span className={styles.perRegelLabel} title={r.omschrijving}>
                {r.omschrijving || '—'}
              </span>
              <span className={styles.perRegelNum}>{formatEuro(r.omzet)}</span>
              <span className={styles.perRegelNum}>{formatEuro(r.kosten)}</span>
              <span
                className={`${styles.perRegelNum} ${styles.perRegelMargePct} ${statusClass(r.status)}`}
              >
                {Math.round(r.margePct)}%
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
