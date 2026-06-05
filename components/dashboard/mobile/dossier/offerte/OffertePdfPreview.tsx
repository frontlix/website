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
// ── A4-getrouw + zoom ──────────────────────────────────────────────────────
// Het vel wordt op de échte A4-maten gerenderd (.paper = 794px ≈ 210mm breed,
// min-height 1123px ≈ 297mm hoog, álle binnen-maten exact die van
// pdf-template.ts). Een zoom-viewport eromheen schaalt het hele vel met
// transform:scale() zó dat het standaard passend op schermbreedte staat
// ("fit width"), en laat de gebruiker met twee vingers in-/uitzoomen
// (focuspunt blijft staan). Zo is dit een getrouw mini-A4 van hoe de offerte
// er echt uitkomt, niet langer een mobiel-uitgerekte layout.
//
// De voet-knop "Versturen via WhatsApp" is VISUEEL/DISABLED: versturen
// blijft de desktop-flow. Papier-kleuren zijn thema-onafhankelijk (vaste
// SS-print-kleuren in OffertePdfPreview.module.css, gedocumenteerd).
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { MessageCircle } from 'lucide-react'
import { OFullSheet } from './OfferteEditAtoms'
import styles from './OffertePdfPreview.module.css'

// ── A4-afmeting + zoom-grenzen ───────────────────────────────────────────
// A4_WIDTH (px @96dpi ≈ 210mm) MOET gelijk zijn aan .paper { width } in de
// module.css; de schaal die we berekenen rekent hiermee terug naar 1:1.
const A4_WIDTH = 794
const VIEWPORT_PAD = 16 // px lucht rondom het vel binnen de zoom-viewport
const ZOOM_MIN = 1 // 1 = exact passend op breedte (fit width)
const ZOOM_MAX = 5 // tot 5× inzoomen met de vingers

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
  return `€ ${n.toFixed(2).replace('.', ',')}`
}

// ── Bedrijfsnaam-constante (spiegelt pdf-template.ts gebruik) ────────────
const SS_NAAM = 'Schoon Straatje'

// Afstand tussen twee vingers (pinch) — voor de zoom-ratio.
function touchDist(t: TouchList): number {
  const dx = t[0].clientX - t[1].clientX
  const dy = t[0].clientY - t[1].clientY
  return Math.hypot(dx, dy)
}

export function OffertePdfPreview({ open, onClose, data }: OffertePdfPreviewProps) {
  // ── Zoom-state ─────────────────────────────────────────────────────────
  // fitScale = factor die het 794px-vel exact op de viewport-breedte legt.
  // userZoom = extra pinch-factor van de gebruiker (1 = fit, tot ZOOM_MAX).
  // paperH   = natuurlijke (ongeschaalde) hoogte van het vel, om de
  //            geschaalde scroll-ruimte te reserveren.
  const viewportRef = useRef<HTMLDivElement>(null)
  const sizerRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(0)
  const [userZoom, setUserZoom] = useState(1)
  const [paperH, setPaperH] = useState(0)

  // Refs die de live waarden spiegelen voor de native touch-handlers
  // (die buiten de React-render-cyclus draaien).
  const fitScaleRef = useRef(0)
  const zoomRef = useRef(1)
  useEffect(() => { fitScaleRef.current = fitScale }, [fitScale])
  useEffect(() => { zoomRef.current = userZoom }, [userZoom])

  // Bij (her)openen terug naar fit-width.
  useEffect(() => {
    if (open) {
      setUserZoom(1)
      zoomRef.current = 1
    }
  }, [open])

  // fitScale meten: viewport-breedte (minus lucht) / A4-breedte.
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const measure = () => {
      const avail = vp.clientWidth - VIEWPORT_PAD * 2
      setFitScale(avail > 0 ? avail / A4_WIDTH : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [open])

  // Natuurlijke vel-hoogte meten (offsetHeight is transform-onafhankelijk).
  useEffect(() => {
    const paper = paperRef.current
    if (!paper) return
    const measure = () => setPaperH(paper.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(paper)
    return () => ro.disconnect()
  }, [open, data])

  // ── Pinch-zoom (twee vingers) ──────────────────────────────────────────
  // Native, non-passieve touchmove zodat we preventDefault kunnen aanroepen.
  // Tijdens het knijpen schrijven we de schaal direct naar de DOM (vloeiend,
  // geen React-render per frame) en houden het focuspunt onder de vingers
  // stabiel via scrollLeft/scrollTop. Bij loslaten committen we naar state.
  useEffect(() => {
    const vp = viewportRef.current
    const sizer = sizerRef.current
    if (!vp || !sizer) return

    // Beginsituatie van de actieve pinch (null = niet aan het knijpen).
    let pinch: { d: number; z: number; cx: number; cy: number } | null = null

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const rect = vp.getBoundingClientRect()
      const eff = fitScaleRef.current * zoomRef.current
      if (eff <= 0) return
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
      pinch = {
        d: touchDist(e.touches),
        z: zoomRef.current,
        // Content-coördinaat onder het pinch-midden (ongeschaald).
        cx: (vp.scrollLeft + mx) / eff,
        cy: (vp.scrollTop + my) / eff,
      }
    }

    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return
      e.preventDefault() // onderdruk native scroll/zoom tijdens de pinch
      const rect = vp.getBoundingClientRect()
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
      let z = pinch.z * (touchDist(e.touches) / pinch.d)
      z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z))
      zoomRef.current = z
      const eff = fitScaleRef.current * z
      // Schaal live naar de DOM (paper erft --scale via var()).
      sizer.style.setProperty('--scale', String(eff))
      // Houd het content-punt onder de vingers op zijn plek.
      vp.scrollLeft = pinch.cx * eff - mx
      vp.scrollTop = pinch.cy * eff - my
    }

    const onEnd = (e: TouchEvent) => {
      if (e.touches.length >= 2 || !pinch) return
      pinch = null
      setUserZoom(zoomRef.current) // commit zodat React-render in sync blijft
    }

    vp.addEventListener('touchstart', onStart, { passive: true })
    vp.addEventListener('touchmove', onMove, { passive: false })
    vp.addEventListener('touchend', onEnd)
    vp.addEventListener('touchcancel', onEnd)
    return () => {
      vp.removeEventListener('touchstart', onStart)
      vp.removeEventListener('touchmove', onMove)
      vp.removeEventListener('touchend', onEnd)
      vp.removeEventListener('touchcancel', onEnd)
    }
  }, [open])

  // Effectieve schaal voor de React-render (DOM-direct overschreven tijdens pinch).
  const effScale = fitScale * userZoom

  // CSS-variabelen voor de sizer; --scale stuurt zowel de gereserveerde
  // (geschaalde) ruimte als de transform van het vel.
  const sizerVars = {
    '--scale': effScale,
    '--paper-h': `${paperH}px`,
  } as CSSProperties

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
      {/* Zoom-viewport: scrollt (pan) en vangt de pinch op. */}
      <div ref={viewportRef} className={styles.zoomViewport}>
        {/* Sizer reserveert de GESCHAALDE ruimte (transform telt niet mee in
            de layout), zodat fit-width én scrollen kloppen. */}
        <div ref={sizerRef} className={styles.zoomSizer} style={sizerVars}>
          {/* Het witte A4-vel op échte maten: spiegelt de .page in de SS-template. */}
          <article ref={paperRef} aria-label="Offerte voorbeeld" className={styles.paper}>

          {/* ── Briefhoofd: crème header ────────────────────────────────
              Spiegelt .header in pdf-template.ts: background #FAFAF0,
              "OFFERTE" navy #002D63 links, "Top 30 vakbedrijven"-badge in
              het midden, Schoon Straatje-logo rechts (zelfde assets als de
              echte PDF, op dezelfde A4-maten). */}
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

          {/* Spacer duwt voorwaarden + footer naar de onderkant van het A4-vel,
              precies zoals .page-spacer in pdf-template.ts. */}
          <div className={styles.spacer} aria-hidden="true" />

          <div className={styles.bottomBlock}>
            {/* ── Voorwaarden ───────────────────────────────────────────
                Spiegelt .voorwaarden in pdf-template.ts: label uppercase
                #003F8A, tekst incl. geldigTot + btwPct. */}
            <div className={styles.voorwaarden}>
              <div className={styles.voorwaardenLabel}>Voorwaarden</div>
              Deze offerte is geldig tot {data.geldigTot}. Alle bedragen zijn in euro&apos;s.
              {data.btwPct > 0
                ? ` BTW-tarief ${data.btwPct}% is van toepassing op alle posten.`
                : ' BTW is verlegd.'}
            </div>

            {/* ── Footer ────────────────────────────────────────────────
                Spiegelt .footer in pdf-template.ts: 3px #F5C518 bovenrand,
                achtergrond #f9fafb, gecentreerd, bedrijfsnaam navy. */}
            <footer className={styles.docFooter}>
              <strong className={styles.footerBrand}>{SS_NAAM}</strong>
            </footer>
          </div>

          </article>
        </div>
      </div>
    </OFullSheet>
  )
}
