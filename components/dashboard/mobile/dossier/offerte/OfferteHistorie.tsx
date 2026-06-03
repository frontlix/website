'use client'

// ── OfferteHistorie ───────────────────────────────────────────────────────
// Versie-historie overlay voor de mobiele offerte-editor. Port van QHistorie
// uit de handoff (MobileOfferteEdit.jsx), maar gevoed met ECHTE versies i.p.v.
// mock-data. Bovenaan altijd de huidige (nog niet verstuurde) concept-kaart
// met accent-rand; daaronder de echte versies, meest recente eerst.
// De 'PDF' en 'Dupliceer' knoppen zijn deze ronde puur visueel (disabled,
// geen handler), versturen/dupliceren blijft de desktop-flow.
// Theming via tokens + per-rij --tone custom property + color-mix; geen
// inline kleuren of hardcoded hex.
// ──────────────────────────────────────────────────────────────────────────

import type React from 'react'
import { Eye, Copy } from 'lucide-react'
import { OFullSheet } from './OfferteEditAtoms'
import { eur } from './offerte-edit-model'
import styles from './OfferteHistorie.module.css'

// Eén echte, eerder opgeslagen versie (uit detail.offertes via de mapper).
type OfferteVersie = {
  versie: number
  totaalIncl: number
  datum: string
  verstuurd: boolean
}

type OfferteHistorieProps = {
  open: boolean
  onClose: () => void
  /** Bedrag van het huidige (nog niet verstuurde) concept. */
  huidigBedrag: number
  /** Echte eerdere versies; deze component toont ze meest recent eerst. */
  versies: OfferteVersie[]
}

export function OfferteHistorie({ open, onClose, huidigBedrag, versies }: OfferteHistorieProps) {
  // Meest recente eerst (hoogste versienummer bovenaan), zonder de input te muteren.
  const gesorteerd = [...versies].sort((a, b) => b.versie - a.versie)

  return (
    <OFullSheet open={open} onClose={onClose} title="Versie-historie">
      <div className={styles.list}>
        {/* Huidig concept, accent-rand, altijd bovenaan, geen knoppen. */}
        <article className={`${styles.card} ${styles.cardCurrent}`}>
          <div className={styles.head}>
            {/* Badge-tint = muted-grijs (handoff #8E8E93) via --tone. */}
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
              <div className={styles.datum}>Nu &mdash; niet verstuurd</div>
            </div>
          </div>
        </article>

        {/* Echte versies, meest recent eerst. */}
        {gesorteerd.map((h) => {
          // Verstuurd => groen 'Verstuurd'; anders amber 'In review'.
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
                  <div className={styles.datum}>{h.datum}</div>
                </div>
              </div>

              {/* PDF + Dupliceer, deze ronde puur visueel (disabled, geen handler). */}
              <div className={styles.actions}>
                <button type="button" className={styles.actBtn} disabled>
                  <Eye size={14} aria-hidden="true" /> PDF
                </button>
                <button type="button" className={`${styles.actBtn} ${styles.actBtnAccent}`} disabled>
                  <Copy size={14} aria-hidden="true" /> Dupliceer
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </OFullSheet>
  )
}
