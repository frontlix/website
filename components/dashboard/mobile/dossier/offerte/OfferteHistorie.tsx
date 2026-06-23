'use client'

// ── OfferteHistorie ───────────────────────────────────────────────────────
// Versie-historie overlay voor de mobiele offerte-editor. Bovenaan altijd de
// huidige (nog niet verstuurde) concept-kaart; daaronder de echte versies,
// meest recente eerst. Per verstuurde versie met een bruikbare snapshot een
// actieve Inzien (PDF-voorbeeld) en Download. Versies zonder model tonen geen
// knoppen.
// ──────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { Eye, Download } from 'lucide-react'
import { OFullSheet } from './OfferteEditAtoms'
import { eur } from './offerte-edit-model'
import { OffertePdfPreview, type OffertePdfData } from './OffertePdfPreview'
import type { SentOffertePdfModel } from '@/lib/dashboard/offerte/sent-offerte-pdf-model'
import { offertePdfFileName, base64ToPdfBlob } from '@/components/dashboard/offerte/render-offerte-pdf'
import { renderSentOffertePdf } from '@/lib/dashboard/offerte/sent-offerte-pdf-action'
import { deliverPdfBlob } from '@/components/dashboard/offerte/pdf-download'
import styles from './OfferteHistorie.module.css'

// Eén echte, eerder opgeslagen versie (uit detail.offertes via de mapper).
type OfferteVersie = {
  versie: number
  totaalIncl: number
  datum: string
  verstuurd: boolean
  /** PDF-voorbeeld van deze versie; null = geen bruikbare snapshot. */
  pdfData?: OffertePdfData | null
  /** Model om de PDF te downloaden; null = geen bruikbare snapshot. */
  downloadModel?: SentOffertePdfModel | null
  /** true = oude offerte zonder snapshot, heropgemaakt (kan afwijken). */
  reconstructed?: boolean
}

type OfferteHistorieProps = {
  open: boolean
  onClose: () => void
  /** Lead-id (route lead_id) voor de server-render van de echte PDF bij download.
   *  Optioneel zodat de legacy DossOfferteEdit (zonder lead-context) blijft compileren;
   *  zonder leadId is download niet beschikbaar. */
  leadId?: string
  /** Bedrag van het huidige (nog niet verstuurde) concept. */
  huidigBedrag: number
  /** Echte eerdere versies; deze component toont ze meest recent eerst. */
  versies: OfferteVersie[]
}

const EMPTY_PDF_DATA: OffertePdfData = {
  nr: '',
  datum: '',
  geldigTot: '',
  dienst: '',
  klant: { naam: '', straat: '', pcplaats: '' },
  regels: [],
  subtotaal: 0,
  toeslagen: [],
  kortingPct: 0,
  kortingBedrag: 0,
  totaalExcl: 0,
  btwPct: 21,
  btwBedrag: 0,
  totaalIncl: 0,
}

export function OfferteHistorie({ open, onClose, leadId, huidigBedrag, versies }: OfferteHistorieProps) {
  // Meest recente eerst (hoogste versienummer bovenaan), zonder de input te muteren.
  const gesorteerd = [...versies].sort((a, b) => b.versie - a.versie)
  const [preview, setPreview] = useState<OffertePdfData | null>(null)
  const [busyVersie, setBusyVersie] = useState<number | null>(null)

  const download = async (h: OfferteVersie) => {
    if (!leadId || !h.downloadModel || busyVersie != null) return
    setBusyVersie(h.versie)
    try {
      // Echte server-PDF (zelfde Puppeteer-template als de mail, met keurmerken).
      const res = await renderSentOffertePdf(leadId, h.versie)
      if ('error' in res) throw new Error(res.error)
      await deliverPdfBlob(base64ToPdfBlob(res.base64), offertePdfFileName(h.downloadModel.data.naam))
    } catch (e) {
      console.error('[OfferteHistorie] PDF download mislukt:', e)
      // eslint-disable-next-line no-alert
      alert('PDF maken mislukt, probeer het opnieuw.')
    } finally {
      setBusyVersie(null)
    }
  }

  return (
    <OFullSheet open={open} onClose={onClose} title="Versie-historie">
      <div className={styles.list}>
        {/* Huidig concept, accent-rand, altijd bovenaan, geen knoppen. */}
        <article className={`${styles.card} ${styles.cardCurrent}`}>
          <div className={styles.head}>
            <div
              className={styles.badge}
              style={{ '--tone': 'var(--color-text-muted)' } as React.CSSProperties}
            >
              ·
            </div>
            <div className={styles.meta}>
              <div className={styles.topRow}>
                <span className={styles.bedrag}>{eur(huidigBedrag)}</span>
                <span
                  className={styles.status}
                  style={{ '--tone': 'var(--color-text-muted)' } as React.CSSProperties}
                >
                  Huidige versie
                </span>
              </div>
              <div className={styles.datum}>Nu, niet verstuurd</div>
            </div>
          </div>
        </article>

        {/* Echte versies, meest recent eerst. */}
        {gesorteerd.map((h) => {
          const tone = h.verstuurd ? 'var(--color-success)' : 'var(--color-warning-strong)'
          const statusLabel = h.verstuurd ? 'Verstuurd' : 'In review'
          return (
            <article key={h.versie} className={styles.card}>
              <div className={styles.head}>
                <div className={styles.badge} style={{ '--tone': tone } as React.CSSProperties}>
                  v{h.versie}
                </div>
                <div className={styles.meta}>
                  <div className={styles.topRow}>
                    <span className={styles.bedrag}>{eur(h.totaalIncl)}</span>
                    <span className={styles.status} style={{ '--tone': tone } as React.CSSProperties}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className={styles.datum}>
                    {h.datum}
                    {h.reconstructed ? ' · heropgemaakt, kan afwijken' : ''}
                  </div>
                </div>
              </div>

              {/* Inzien + download, alleen als er een bruikbare snapshot is. */}
              {h.pdfData && h.downloadModel ? (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.actBtn}
                    onClick={() => setPreview(h.pdfData!)}
                  >
                    <Eye size={14} aria-hidden="true" /> Inzien
                  </button>
                  <button
                    type="button"
                    className={styles.actBtn}
                    onClick={() => download(h)}
                    disabled={busyVersie === h.versie}
                  >
                    <Download size={14} aria-hidden="true" /> Download
                  </button>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <OffertePdfPreview open={preview != null} onClose={() => setPreview(null)} data={preview ?? EMPTY_PDF_DATA} />
    </OFullSheet>
  )
}
