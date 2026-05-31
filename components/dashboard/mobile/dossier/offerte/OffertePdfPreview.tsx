'use client'

// ── OffertePdfPreview ──────────────────────────────────────────────────────
// Full-screen PDF-preview overlay van de mobiele offerte-editor.
// Port van QPDFPreview uit de handoff (MobileOfferteEdit.jsx): een nagebootst
// A4-offertedocument op wit papier binnen een OFullSheet, met een sticky
// voet-knop. Afwijkingen t.o.v. de handoff:
//  - Briefhoofd = "Schoon Straatje" (niet "Frontlix"), neutrale contactregel.
//  - De voet-knop "Versturen via WhatsApp" is deze ronde VISUEEL/DISABLED:
//    versturen blijft de desktop-flow. Onopvallende helper-noot eronder.
// Het papier is bewust een licht/wit document, óók in dark mode (het bootst
// gedrukt papier na). De interne kleuren zijn daarom letterlijke print-greys
// in OffertePdfPreview.module.css ('papier, niet thema-afhankelijk').
// ──────────────────────────────────────────────────────────────────────────

import { Fragment } from 'react'
import { MessageCircle } from 'lucide-react'
import { OFullSheet } from './OfferteEditAtoms'
import { eur } from './offerte-edit-model'
import styles from './OffertePdfPreview.module.css'

// ── data-vorm (props-contract) ──
// De preview spiegelt het al-uitgerekende totalenblok van de live editor-state.
export type OffertePdfData = {
  nr: string
  datum: string
  geldigTot: string
  klant: { naam: string; bedrijf?: string; straat: string; pcplaats: string }
  bericht: string
  lines: { label: string; qtyLabel: string; amount: number; note?: string }[]
  toeslagen: { label: string; bedrag: number }[]
  sub0: number
  kortingBedrag: number
  kortingNote?: string
  btwLabel: string
  btwBedrag: number
  btwTxt: string
  totaal: number
}

export type OffertePdfPreviewProps = {
  open: boolean
  onClose: () => void
  data: OffertePdfData
}

// Eén tabelrij van het document (omschrijving · aantal · bedrag).
// `muted` dempt het label (gebruikt voor het subtotaal/toeslagen-blok).
function PRow({ l, q, v, muted }: { l: string; q?: string; v: string; muted?: boolean }) {
  return (
    <tr className={muted ? styles.rowMuted : undefined}>
      <td className={styles.cellLabel}>{l}</td>
      <td className={styles.cellQty}>{q}</td>
      <td className={styles.cellAmount}>{v}</td>
    </tr>
  )
}

export function OffertePdfPreview({ open, onClose, data }: OffertePdfPreviewProps) {
  // Voet: visueel uitgeschakelde "Versturen via WhatsApp"-knop + helper-noot.
  // Versturen gebeurt deze ronde via het dashboard (desktop), niet hier.
  const foot = (
    <div className={styles.footWrap}>
      <button type="button" className={styles.sendBtn} disabled aria-disabled="true">
        <MessageCircle size={16} aria-hidden="true" /> Versturen via WhatsApp
      </button>
      <p className={styles.footNote}>Versturen gaat via het dashboard</p>
    </div>
  )

  return (
    <OFullSheet open={open} onClose={onClose} title="Voorbeeld offerte" foot={foot}>
      <div className={styles.paperWrap}>
        <div className={styles.paper}>
          {/* Briefhoofd: links de afzender, rechts OFFERTE + meta. */}
          <div className={styles.head}>
            <div>
              <div className={styles.brand}>Schoon Straatje</div>
              <div className={styles.brandSub}>
                Reiniging &amp; onderhoud bestrating
                <br />
                info@schoonstraatje.nl
              </div>
            </div>
            <div className={styles.headRight}>
              <div className={styles.docTitle}>OFFERTE</div>
              <div className={styles.docMeta}>
                Nr. {data.nr}
                <br />
                Datum: {data.datum}
                <br />
                Geldig t/m: {data.geldigTot}
              </div>
            </div>
          </div>

          {/* Factuuradres-blok. */}
          <div className={styles.addrLabel}>Factuuradres</div>
          <div className={styles.addr}>
            <div className={styles.addrName}>{data.klant.naam}</div>
            {data.klant.bedrijf && <div>{data.klant.bedrijf}</div>}
            <div>{data.klant.straat}</div>
            <div>{data.klant.pcplaats}</div>
          </div>

          {/* Persoonlijk bericht (aanhef) — newlines behouden. */}
          {data.bericht && <div className={styles.bericht}>{data.bericht}</div>}

          {/* Regeltabel: Omschrijving · Aantal · Bedrag. */}
          <table className={styles.lines}>
            <thead>
              <tr className={styles.linesHead}>
                <th className={styles.thLabel}>Omschrijving</th>
                <th className={styles.thQty}>Aantal</th>
                <th className={styles.thAmount}>Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((r, i) => (
                <Fragment key={i}>
                  <PRow l={r.label} q={r.qtyLabel} v={eur(r.amount)} />
                  {r.note && (
                    <tr>
                      {/* Cursieve klant-notitie onder de regel (print-amber). */}
                      <td colSpan={3} className={styles.lineNote}>
                        ↳ {r.note}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>

          {/* Totalen-blok: subtotaal → toeslagen → korting → BTW. */}
          <table className={styles.sums}>
            <tbody>
              <PRow l="Subtotaal" v={eur(data.sub0)} muted />
              {data.toeslagen.map((t, i) => (
                <PRow key={i} l={t.label} v={eur(t.bedrag)} muted />
              ))}
              {data.kortingBedrag > 0 && (
                <PRow
                  l={`Korting${data.kortingNote ? ' — ' + data.kortingNote : ''}`}
                  v={'– ' + eur(data.kortingBedrag)}
                  muted
                />
              )}
              <PRow l={data.btwLabel} v={eur(data.btwBedrag)} muted />
            </tbody>
          </table>

          {/* Grand-totaal met dikke bovenlijn. */}
          <div className={styles.grand}>
            <span className={styles.grandLabel}>Totaal</span>
            <span className={styles.grandValue}>{eur(data.totaal)}</span>
          </div>

          {/* Voorwaarden-voettekst. */}
          <div className={styles.terms}>
            Op deze offerte zijn onze algemene voorwaarden van toepassing. Prijzen incl. {data.btwTxt}.
          </div>
        </div>
      </div>
    </OFullSheet>
  )
}
