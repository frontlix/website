'use client'

import { Pencil, FileText } from 'lucide-react'
import { dossEur } from './dossier-helpers'
import type { DossRegel } from './dossier-mock'
import styles from './DossOfferte.module.css'

// ── DossOfferte ──
// Offerte-tab: status-badge, regelkaart met subtotaal/btw/totaal en twee
// actie-knoppen (Aanpassen / PDF-preview, nog visueel-only). Gevoed met echte
// offerte-regels (props) i.p.v. de DOSS-mock.
type DossOfferteProps = {
  offerte: { status: string; regels: DossRegel[]; subtotaal: number; btw: number; totaal: number }
}

export function DossOfferte({ offerte: o }: DossOfferteProps) {
  return (
    <div className={styles.wrap}>
      {/* Amber status-badge: warning-tint bg + warning-strong tekst. */}
      <div>
        <span className={styles.statusBadge}>{o.status}</span>
      </div>

      {/* Regelkaart met de offerte-regels en de totalen. */}
      <div className={styles.card}>
        {o.regels.map((r, i) => (
          <div key={i} className={styles.regelRow}>
            <div className={styles.regelText}>
              <div className={styles.regelLabel}>{r.l}</div>
              <div className={styles.regelDetail}>{r.detail}</div>
            </div>
            <div className={styles.regelBedrag}>{dossEur(r.bedrag)}</div>
          </div>
        ))}

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotaal</span>
            <span>{dossEur(o.subtotaal)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>BTW 21%</span>
            <span>{dossEur(o.btw)}</span>
          </div>
          <div className={styles.totalGrand}>
            <span>Totaal</span>
            <span>{dossEur(o.totaal)}</span>
          </div>
        </div>
      </div>

      {/* Actie-knoppen — v1 visueel-only (geen wiring). */}
      <div className={styles.actions}>
        <button type="button" className={styles.editBtn}>
          <Pencil size={14} aria-hidden="true" /> Aanpassen
        </button>
        <button type="button" className={styles.pdfBtn}>
          <FileText size={14} aria-hidden="true" /> PDF-preview
        </button>
      </div>
    </div>
  )
}
