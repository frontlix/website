'use client'

// ── OffertePdfPreview ──────────────────────────────────────────────────────
// Full-screen PDF-preview overlay van de mobiele offerte-editor.
// Spiegel van renderOffertePDFHtml in lib/dashboard/offerte/pdf-template.ts
// (de échte Schoon Straatje PDF-template). Structuur 1:1 overgenomen:
//   crème header #FAFAF0 → gouden accentbalk #F5C518 → twee meta-kaarten
//   (Offerte gegevens / Voor) → Specificatie-tabel 4-kol navy header →
//   totalen (Subtotaal → toeslagen → Actiekorting → Totaal excl. BTW →
//   BTW → Totaal incl. BTW navy grand-row) → optioneel Toelichting (amber) →
//   Voorwaarden → footer met bedrijfsnaam (#F5C518 bovenrand).
// Wijzigingen aan opmaak: eerst in pdf-template.ts afstemmen, dan hier mirrorren.
//
// De voet-knop "Versturen via WhatsApp" is VISUEEL/DISABLED: versturen
// blijft de desktop-flow. Papier-kleuren zijn thema-onafhankelijk (vaste
// SS-print-kleuren in OffertePdfPreview.module.css, gedocumenteerd).
// ──────────────────────────────────────────────────────────────────────────

import { MessageCircle } from 'lucide-react'
import { OFullSheet } from './OfferteEditAtoms'
import styles from './OffertePdfPreview.module.css'

// ── Data-vorm (props-contract), §4.7 ────────────────────────────────────
// Exacte shape die DossOfferteEdit levert, afgeleid van de live editor-state.
// Spiegelt de velden die pdf-template.ts (OffertePDFData) gebruikt.
export type OffertePdfData = {
  nr: string                 // offertenummer
  datum: string              // dd-mm-jjjj (vandaag)
  geldigTot: string          // dd-mm-jjjj (vandaag + dagen)
  dienst: string             // korte dienst-omschrijving
  m2?: number                // optioneel, voor de Oppervlakte-regel
  klant: {
    naam: string
    bedrijf?: string
    straat: string
    pcplaats: string
    email?: string
    telefoon?: string
  }
  regels: {
    omschrijving: string
    aantalLabel: string      // bv. "80 m²" of "2 rol"; lege string bij geen aantal
    stukprijs: number
    totaal: number
  }[]
  subtotaal: number          // sub0 (som van actieve regels)
  toeslagen: { label: string; bedrag: number }[]
  kortingPct: number
  kortingBedrag: number
  kortingNote?: string
  totaalExcl: number         // subNet vóór BTW
  btwPct: number             // 21 | 9 | 0
  btwBedrag: number
  totaalIncl: number         // grand total
  toelichting?: string       // = persoonlijk bericht (optioneel blok ná totalen)
}

export type OffertePdfPreviewProps = {
  open: boolean
  onClose: () => void
  data: OffertePdfData
}

// ── Geldformaat: exact pdf-template.ts formatCurrency ────────────────────
// "€ 1234,56", euro + spatie + getal, komma als decimaal, géén duizendtal-punt.
// Bewust NIET eur() uit offerte-edit-model (die geeft nl-NL met duizendtal-punt).
function eurPdf(n: number): string {
  return `€ ${n.toFixed(2).replace('.', ',')}`
}

// ── Bedrijfsnaam-constante (spiegelt pdf-template.ts gebruik) ────────────
const SS_NAAM = 'Schoon Straatje'

export function OffertePdfPreview({ open, onClose, data }: OffertePdfPreviewProps) {
  // Voet: visueel uitgeschakelde "Versturen via WhatsApp"-knop + helper-noot.
  // Versturen gebeurt via het dashboard (desktop), niet hier.
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
        {/* Het witte A4-vel: spiegelt de .page in de echte SS-template. */}
        <article aria-label="Offerte voorbeeld" className={styles.paper}>

          {/* ── Briefhoofd: crème header ────────────────────────────────
              Spiegelt .header in pdf-template.ts: background #FAFAF0,
              "OFFERTE" navy #002D63 links, "Top 30 vakbedrijven"-badge in
              het midden, Schoon Straatje-logo rechts (zelfde assets als de
              echte PDF, proportioneel geschaald voor het telefoonvel). */}
          <header className={styles.head}>
            <div className={styles.headLeft}>
              <p className={styles.title}>OFFERTE</p>
              <p className={styles.docNr}>Nr. {data.nr}</p>
            </div>
            <div className={styles.headCenter}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/schoon-straatje/top-30-vakbedrijven.png"
                alt="Top 30 vakbedrijven"
                className={styles.headBadge}
              />
            </div>
            <div className={styles.headRight}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/schoon-straatje/logo.png"
                alt={SS_NAAM}
                className={styles.headLogo}
              />
            </div>
          </header>

          {/* ── Gouden accentbalk ───────────────────────────────────────
              Spiegelt .accent: height 4px, background #F5C518. */}
          <div className={styles.accentBar} aria-hidden="true" />

          {/* ── Content-wrapper ────────────────────────────────────────── */}
          <div className={styles.content}>

            {/* ── Twee meta-kaarten ────────────────────────────────────
                Spiegelt .meta-grid + .meta-card in pdf-template.ts:
                "Offerte gegevens" (links) + "Voor" (rechts). */}
            <div className={styles.metaGrid}>
              <div className={styles.metaCard}>
                <div className={styles.metaLabel}>Offerte gegevens</div>
                <div className={styles.metaRow}>
                  <strong>Datum:</strong> {data.datum}
                </div>
                <div className={styles.metaRow}>
                  <strong>Geldig tot:</strong> {data.geldigTot}
                </div>
                <div className={styles.metaRow}>
                  <strong>Dienst:</strong> {data.dienst}
                </div>
                {data.m2 ? (
                  <div className={styles.metaRow}>
                    <strong>Oppervlakte:</strong> {data.m2} m²
                  </div>
                ) : null}
              </div>

              <div className={styles.metaCard}>
                <div className={styles.metaLabel}>Voor</div>
                <div className={styles.metaRow}>
                  {/* Naam prominent, dan adresregels */}
                  <span className={styles.clientName}>{data.klant.naam}</span>
                  {data.klant.bedrijf && <span>{data.klant.bedrijf}</span>}
                  <span>{data.klant.straat}</span>
                  <span>{data.klant.pcplaats}</span>
                  {data.klant.email && <span>{data.klant.email}</span>}
                  {data.klant.telefoon && <span>{data.klant.telefoon}</span>}
                </div>
              </div>
            </div>

            {/* ── Specificatie-tabel ──────────────────────────────────
                Spiegelt .regels in pdf-template.ts: navy header, 4 kolommen
                Omschrijving · Aantal · Stukprijs · Totaal. */}
            <div className={styles.sectionTitle}>Specificatie</div>
            <table className={styles.lines}>
              <thead>
                <tr className={styles.linesHead}>
                  <th className={styles.thDesc}>Omschrijving</th>
                  <th className={styles.thNum}>Aantal</th>
                  <th className={styles.thNum}>Stukprijs</th>
                  <th className={styles.thNum}>Totaal</th>
                </tr>
              </thead>
              <tbody>
                {data.regels.length > 0 ? (
                  data.regels.map((r, i) => (
                    <tr key={i} className={i % 2 === 1 ? styles.rowAlt : undefined}>
                      <td className={styles.cellDesc}>{r.omschrijving}</td>
                      <td className={styles.cellNum}>{r.aantalLabel}</td>
                      <td className={styles.cellNum}>{eurPdf(r.stukprijs)}</td>
                      <td className={`${styles.cellNum} ${styles.cellTotal}`}>{eurPdf(r.totaal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>
                      Geen specificatie beschikbaar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* ── Totalen-blok ────────────────────────────────────────
                Volgorde (exact spec §4.7 + pdf-template.ts):
                Subtotaal → toeslagen (amber) → Actiekorting (groen) →
                Totaal excl. BTW (border-top) → BTW (n%) →
                Totaal incl. BTW (navy grand-row). */}
            <div className={styles.totalsWrap}>
              <table className={styles.totals}>
                <tbody>
                  {/* Subtotaal diensten */}
                  <tr>
                    <td className={styles.totalsLabel}>Subtotaal diensten</td>
                    <td className={styles.totalsAmount}>{eurPdf(data.subtotaal)}</td>
                  </tr>

                  {/* Toeslag-rijen (amber kleur, zoals pdf-template.ts tr.korting styling) */}
                  {data.toeslagen.map((t, i) => (
                    <tr key={i} className={styles.rowToeslag}>
                      <td className={styles.totalsLabel}>{t.label}</td>
                      <td className={styles.totalsAmount}>{eurPdf(t.bedrag)}</td>
                    </tr>
                  ))}

                  {/* Actiekorting, groen, negatief, met percentage en optionele noot */}
                  {data.kortingBedrag > 0 && (
                    <tr className={styles.rowKorting}>
                      <td className={styles.totalsLabel}>
                        {`Actiekorting (${data.kortingPct}%)${data.kortingNote ? ', ' + data.kortingNote : ''}`}
                      </td>
                      <td className={styles.totalsAmount}>
                        {`- ${eurPdf(data.kortingBedrag)}`}
                      </td>
                    </tr>
                  )}

                  {/* Totaal excl. BTW (border-top, class subtotal zoals pdf-template.ts) */}
                  <tr className={styles.rowSubtotal}>
                    <td className={styles.totalsLabel}>Totaal excl. BTW</td>
                    <td className={styles.totalsAmount}>{eurPdf(data.totaalExcl)}</td>
                  </tr>

                  {/* BTW (n%) */}
                  <tr>
                    <td className={styles.totalsLabel}>
                      {data.btwPct === 0 ? 'BTW verlegd' : `BTW (${data.btwPct}%)`}
                    </td>
                    <td className={styles.totalsAmount}>{eurPdf(data.btwBedrag)}</td>
                  </tr>

                  {/* Grand-row: Totaal incl. BTW, navy achtergrond, witte tekst */}
                  <tr className={styles.rowGrand}>
                    <td className={styles.grandCell}>Totaal incl. BTW</td>
                    <td className={`${styles.grandCell} ${styles.grandAmount}`}>
                      {eurPdf(data.totaalIncl)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Toelichting (optioneel) ──────────────────────────────
                = het persoonlijk bericht, ná de totalen.
                Spiegelt .toelichting in pdf-template.ts: amber blok
                (#fffbeb bg, #fde68a rand, label #92400e, tekst #78350f). */}
            {data.toelichting && (
              <div className={styles.toelichting}>
                <div className={styles.toelichtingLabel}>Toelichting</div>
                <div className={styles.toelichtingText}>{data.toelichting}</div>
              </div>
            )}

          </div>{/* /content */}

          {/* ── Voorwaarden ─────────────────────────────────────────────
              Spiegelt .voorwaarden in pdf-template.ts: label uppercase
              #003F8A, tekst incl. geldigTot + btwPct. */}
          <div className={styles.voorwaarden}>
            <div className={styles.voorwaardenLabel}>Voorwaarden</div>
            Deze offerte is geldig tot {data.geldigTot}. Alle bedragen zijn in euro&apos;s.
            {data.btwPct > 0
              ? ` BTW-tarief ${data.btwPct}% is van toepassing op alle posten.`
              : ' BTW is verlegd.'}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────
              Spiegelt .footer in pdf-template.ts: 3px #F5C518 bovenrand,
              achtergrond #f9fafb, gecentreerd, bedrijfsnaam navy. */}
          <footer className={styles.docFooter}>
            <strong className={styles.footerBrand}>{SS_NAAM}</strong>
          </footer>

        </article>
      </div>
    </OFullSheet>
  )
}
