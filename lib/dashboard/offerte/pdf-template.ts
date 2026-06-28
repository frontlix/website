/**
 * HTML-template voor de offerte-PDF. 1:1 geport vanuit schoon-straatje
 * (src/templates/offerte-pdf-template.ts) zodat de mail-bijlage exact
 * dezelfde look heeft als wat de bot stuurt. Wijzigingen aan opmaak:
 * eerst daar afstemmen, dan hier mirrorren.
 *
 * Input is gemapt naar de frontlix-wizard via `buildOffertePDFData`
 * onderaan deze file, die converteert ManualOfferteData + rules +
 * totals + tenant_settings naar de OffertePDFData die de template
 * verwacht.
 */

import type { ManualOfferteData, RegelComputed, TotalsComputed } from '../manual-offerte-types'
import { LOSSE_OPMERKINGEN, zichtbareOpmerking } from '../manual-offerte-types'

export type TenantBedrijf = {
  bedrijfsnaam: string
  adres: string | null
  postcode: string | null
  plaats: string | null
  offerte_geldigheid_dagen: number
  /** BTW-percentage uit tenant_settings (default 21). */
  offerte_btw_tarief: number
  /** Betaaltermijn in dagen uit tenant_settings (default 14). */
  offerte_betaaltermijn_dagen: number
}

export type OffertePDFData = {
  // Klant + werk
  klantNaam: string
  klantBedrijf: string | null
  klantStraat: string
  klantHuisnummer: string
  klantPostcode: string
  klantPlaats: string
  klantEmail: string
  klantTelefoon: string
  // Factuur-adres (alleen ingevuld bij override)
  factuurStraat: string | null
  factuurHuisnummer: string | null
  factuurPostcode: string | null
  factuurPlaats: string | null
  // Offerte-metadata
  offertenummer: string
  vandaag: Date
  geldigheidDagen: number
  /** Betaaltermijn in dagen (uit tenant_settings); getoond bij de voorwaarden. */
  betaaltermijnDagen: number
  // Diensten + regels
  hoofdcategorieLabels: string[]
  subDienstenLabels: string[]
  m2: number
  regels: Array<{
    omschrijving: string
    aantal: number | null
    eenheid: string | null
    stukprijs: number
    totaal: number
    /** Klant-opmerking als subregel onder deze regel (alleen gevuld als
     *  zichtbaar + niet leeg). */
    opmerking?: string | null
  }>
  /** Losse opmerkingen zonder eigen prijsregel (conditie / actiekorting),
   *  getoond onder de specificatie. */
  losseOpmerkingen?: Array<{ label: string; tekst: string }>
  // Totalen
  subtotaalExcl: number
  kortingPercentage: number
  kortingBedrag: number
  kortingOmschrijving: string | null
  totaalExcl: number
  btwPercentage: number
  btwBedrag: number
  totaalIncl: number
  // Toelichting (optioneel)
  toelichting: string | null
  // Branding
  logoBase64: string | null
  badgeBase64: string | null
  /** Keurmerk Kwaliteitsvakman, rechts naast de top-30-badge in de header. */
  keurmerkBase64: string | null
  /** "Geverifieerd door BesteVakmanInDeBuurt.nl"-badge, rechtsonder in de footer. */
  besteVakmanBase64: string | null
  bedrijf: TenantBedrijf
  // Compact-mode (door renderer geëscaleerd bij overflow)
  compactLevel?: 0 | 1 | 2
}

/**
 * Render de offerte-HTML die Puppeteer naar PDF print. A4-formaat, alle
 * styling inline. Compact-level wordt door de renderer opgehoogd zodra
 * de content niet op één A4 past (zie pdf-renderer.ts).
 */
export function renderOffertePDFHtml(d: OffertePDFData): string {
  const compactLevel = d.compactLevel ?? 0
  const logoWidth = compactLevel >= 1 ? 154 : 220
  const badgeHeight = compactLevel >= 1 ? 75 : 105
  const bodyClass = compactLevel === 2 ? 'compact-2' : compactLevel === 1 ? 'compact-1' : ''

  const geldigTot = new Date(d.vandaag)
  geldigTot.setDate(geldigTot.getDate() + d.geldigheidDagen)

  const klantNaamShown = d.klantBedrijf || d.klantNaam
  const klantContact = d.klantBedrijf ? `T.a.v. ${d.klantNaam}` : ''
  const klantAdres = `${d.klantStraat} ${d.klantHuisnummer}`.trim()
  const klantPlaatsLine = `${d.klantPostcode} ${d.klantPlaats}`.trim()
  const heeftFactuur = Boolean(
    d.factuurPostcode || d.factuurHuisnummer || d.factuurStraat || d.factuurPlaats,
  )
  const factuurAdres = heeftFactuur ? `${d.factuurStraat || ''} ${d.factuurHuisnummer || ''}`.trim() : ''
  const factuurPlaats = heeftFactuur ? `${d.factuurPostcode || ''} ${d.factuurPlaats || ''}`.trim() : ''

  const logoBlock = d.logoBase64
    ? `<img src="${d.logoBase64}" alt="${escapeHtml(d.bedrijf.bedrijfsnaam)}" style="display:block;width:${logoWidth}px;height:auto;" />`
    : `<div style="font-size:28px;font-weight:800;color:#003F8A;letter-spacing:1px;">${escapeHtml(d.bedrijf.bedrijfsnaam)}</div>`

  const headerBadgeBlock = d.badgeBase64
    ? `<img class="header-badge" src="${d.badgeBase64}" alt="Top 30 vakbedrijven" style="display:block;height:${badgeHeight}px;width:auto;" />`
    : ''

  // Keurmerk Kwaliteitsvakman: zelfde hoogte als de top-30-badge, ernaast.
  const keurmerkBlock = d.keurmerkBase64
    ? `<img class="header-keurmerk" src="${d.keurmerkBase64}" alt="Keurmerk Kwaliteitsvakman" style="display:block;height:${badgeHeight}px;width:auto;" />`
    : ''

  // BesteVakmanInDeBuurt.nl: rechtsonder in de footer, verticaal gecentreerd.
  const footerBadgeBlock = d.besteVakmanBase64
    ? `<img class="footer-badge" src="${d.besteVakmanBase64}" alt="Geverifieerd door BesteVakmanInDeBuurt.nl" />`
    : ''

  const regelsRows = d.regels
    .map((r) => {
      const aantalText = r.aantal !== null ? `${formatNumber(r.aantal)}${r.eenheid ? ' ' + r.eenheid : ''}` : ''
      // Opmerking als subregel binnen de omschrijving-cel (alleen indien aanwezig;
      // geen lege regel als er niets is).
      const opmerkingBlock = r.opmerking
        ? `<div class="cell-opmerking">↳ ${escapeHtml(r.opmerking)}</div>`
        : ''
      return `
        <tr>
          <td class="cell-desc">${escapeHtml(r.omschrijving)}${opmerkingBlock}</td>
          <td class="cell-num">${aantalText}</td>
          <td class="cell-num">${formatCurrency(r.stukprijs)}</td>
          <td class="cell-num cell-total">${formatCurrency(r.totaal)}</td>
        </tr>
      `
    })
    .join('')

  // Losse opmerkingen (conditie / actiekorting) — geen eigen prijsregel, dus
  // als aparte regel onder de specificatie.
  const losseOpmerkingenRows = (d.losseOpmerkingen ?? [])
    .map(
      (o) => `
        <tr>
          <td colspan="4" class="cell-opmerking-los">→ ${escapeHtml(o.label)}: ${escapeHtml(o.tekst)}</td>
        </tr>
      `,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8" />
<title>Offerte ${escapeHtml(d.offertenummer)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #ffffff;
  }
  /* min-height 290mm i.p.v. 297mm: Chrome's print-engine houdt ~6mm onderaan
     vrij (fantoom-marge die @page margin:0 niet wegneemt), dus een pagina van
     exact 297mm valt ~0,5px over de printbare hoogte en geeft een lege 2e
     pagina. 290mm (≈1096px) vult de pagina vrijwel volledig én blijft binnen
     de printbare hoogte (~1100px), zodat de offerte op één A4 past. */
  .page { width: 210mm; min-height: 290mm; padding: 0; position: relative; display: flex; flex-direction: column; }
  .page-spacer { flex: 1 1 auto; min-height: 24px; }
  .bottom-block { flex: 0 0 auto; }

  .header { background: #FAFAF0; padding: 28px 40px 24px 40px; display: flex; justify-content: space-between; align-items: center; }
  .header-left .title { font-size: 32px; font-weight: 800; color: #002D63; letter-spacing: 1px; margin: 0; line-height: 1; }
  .header-left .subtitle { font-size: 12px; color: #6b6b6b; margin-top: 6px; letter-spacing: 0.5px; }
  .header-center { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; gap: 16px; align-self: flex-start; }
  .header-right { text-align: right; }

  .accent { height: 4px; background: #F5C518; }

  .content { padding: 24px 40px 0 40px; flex: 0 0 auto; }

  .meta-grid { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
  .meta-card { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 18px; }
  .meta-card .label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #003F8A; margin-bottom: 10px; }
  .meta-card .row { font-size: 11px; color: #4b5563; line-height: 1.55; }
  .meta-card .row strong { color: #1a1a1a; font-weight: 600; }
  .meta-card .row .name { font-size: 13px; font-weight: 700; color: #002D63; display: block; margin-bottom: 2px; }

  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #003F8A; margin: 8px 0 12px 0; }

  table.regels { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  table.regels thead th { background: #002D63; color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; text-align: left; padding: 12px 14px; }
  table.regels thead th.cell-num { text-align: right; }
  table.regels tbody td { padding: 9px 14px; font-size: 11px; color: #1f2937; border-bottom: 1px solid #e5e7eb; }
  table.regels tbody tr:nth-child(even) td { background: #fafafa; }
  .cell-desc { width: 50%; }
  .cell-num { text-align: right; white-space: nowrap; }
  .cell-total { font-weight: 700; color: #002D63; }
  /* Klant-opmerking onder de regel-omschrijving: kleiner + gedempt. */
  .cell-opmerking { font-size: 10px; color: #6b7280; margin-top: 4px; line-height: 1.45; }
  /* Losse opmerking-regel (conditie / korting) onder de specificatie. */
  .cell-opmerking-los { font-size: 10px; color: #6b7280; line-height: 1.45; }

  .totals-wrap { display: flex; justify-content: flex-end; margin-top: 20px; }
  table.totals { width: 60%; border-collapse: collapse; table-layout: fixed; }
  table.totals td { padding: 8px 14px; font-size: 11px; color: #4b5563; vertical-align: top; word-wrap: break-word; }
  table.totals td.amount { text-align: right; color: #1a1a1a; white-space: nowrap; width: 38%; }
  table.totals tr.korting td { color: #15803d; font-weight: 600; }
  table.totals tr.subtotal td { border-top: 1px solid #e5e7eb; padding-top: 12px; }
  table.totals tr.grand td { background: #002D63; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 14px; }
  table.totals tr.grand td:first-child { border-radius: 6px 0 0 6px; }
  table.totals tr.grand td:last-child { border-radius: 0 6px 6px 0; }

  .toelichting { margin-top: 18px; padding: 16px 18px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; }
  .toelichting .label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #92400e; margin-bottom: 6px; }
  .toelichting .text { font-size: 11px; color: #78350f; line-height: 1.6; }

  .voorwaarden { margin-top: 18px; padding: 0 40px; font-size: 10px; color: #6b7280; line-height: 1.7; }
  .voorwaarden .label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #003F8A; margin-bottom: 6px; }

  /* min-height >= de footer-badge (46px) zodat de absoluut-gepositioneerde
     badge nooit boven/onder de footer uitsteekt. */
  .footer { position: relative; min-height: 46px; margin-top: 24px; padding: 18px 40px; background: #f9fafb; border-top: 3px solid #F5C518; font-size: 9px; color: #6b7280; line-height: 1.7; text-align: center; }
  .footer-text { text-align: center; }
  .footer strong { color: #002D63; }
  .footer .sep { color: #d1d5db; margin: 0 6px; }
  /* BesteVakmanInDeBuurt.nl-badge: rechts in de footer, verticaal gecentreerd,
     absoluut gepositioneerd zodat de gecentreerde tekst niet verschuift. */
  .footer-badge { position: absolute; right: 40px; top: 50%; transform: translateY(-50%); height: 46px; width: auto; }

  /* Compact-mode: tightere spacing wanneer offerte anders niet op één A4 past. */
  body.compact-2 .header             { padding: 18px 40px 16px 40px; }
  body.compact-2 .meta-card          { padding: 12px 14px; }
  body.compact-2 .regels td,
  body.compact-2 .regels th          { padding: 7px 14px; }
  body.compact-2 table.totals td     { padding: 5px 14px; }
  body.compact-2 table.totals tr.subtotal td { padding-top: 8px; }
  body.compact-2 table.totals tr.grand td    { padding: 10px 14px; }
  body.compact-2 .voorwaarden        { padding: 12px 18px; }
  body.compact-2 .footer             { padding: 12px 40px; margin-top: 16px; }
  body.compact-2 .totals-wrap        { margin-top: 14px; }
</style>
</head>
<body class="${bodyClass}">
  <div class="page" id="offerte-page">

    <div class="header">
      <div class="header-left">
        <p class="title">OFFERTE</p>
        <p class="subtitle">Nr. ${escapeHtml(d.offertenummer)}</p>
      </div>
      <div class="header-center">${headerBadgeBlock}${keurmerkBlock}</div>
      <div class="header-right">${logoBlock}</div>
    </div>

    <div class="accent"></div>

    <div class="content">
      <div class="meta-grid">
        <div class="meta-card">
          <div class="label">Offerte gegevens</div>
          <div class="row"><strong>Datum:</strong> ${formatDate(d.vandaag)}</div>
          <div class="row"><strong>Geldig tot:</strong> ${formatDate(geldigTot)}</div>
          <div class="row"><strong>Dienst:</strong> ${escapeHtml(d.hoofdcategorieLabels.join(' + '))}</div>
          ${d.subDienstenLabels.length ? `<div class="row"><strong>Subdiensten:</strong> ${escapeHtml(d.subDienstenLabels.join(', '))}</div>` : ''}
          ${d.m2 ? `<div class="row"><strong>Oppervlakte:</strong> ${d.m2} m²</div>` : ''}
        </div>
        <div class="meta-card">
          <div class="label">Voor</div>
          <div class="row">
            <span class="name">${escapeHtml(klantNaamShown)}</span>
            ${klantContact ? `${escapeHtml(klantContact)}<br/>` : ''}
            ${klantAdres ? `${escapeHtml(klantAdres)}<br/>` : ''}
            ${klantPlaatsLine ? `${escapeHtml(klantPlaatsLine)}<br/>` : ''}
            ${heeftFactuur ? `<br/><strong>Factuuradres:</strong><br/>${factuurAdres ? `${escapeHtml(factuurAdres)}<br/>` : ''}${factuurPlaats ? `${escapeHtml(factuurPlaats)}<br/>` : ''}` : ''}
            ${d.klantEmail ? `${escapeHtml(d.klantEmail)}<br/>` : ''}
            ${d.klantTelefoon ? `${escapeHtml(d.klantTelefoon)}` : ''}
          </div>
        </div>
      </div>

      <div class="section-title">Specificatie</div>
      <table class="regels">
        <thead>
          <tr>
            <th class="cell-desc">Omschrijving</th>
            <th class="cell-num">Aantal</th>
            <th class="cell-num">Stukprijs</th>
            <th class="cell-num">Totaal</th>
          </tr>
        </thead>
        <tbody>
          ${regelsRows || '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:20px;">Geen specificatie beschikbaar</td></tr>'}${losseOpmerkingenRows}
        </tbody>
      </table>

      <div class="totals-wrap">
        <table class="totals">
          <tr>
            <td>Subtotaal diensten</td>
            <td class="amount">${formatCurrency(d.subtotaalExcl)}</td>
          </tr>
          ${d.kortingBedrag > 0 ? `<tr class="korting"><td>${d.kortingOmschrijving ? `Actiekorting (${formatPct(d.kortingPercentage)}%), ${escapeHtml(d.kortingOmschrijving)}` : `Actiekorting (${formatPct(d.kortingPercentage)}%)`}</td><td class="amount">- ${formatCurrency(d.kortingBedrag)}</td></tr>` : ''}
          <tr class="subtotal">
            <td>Totaal excl. BTW</td>
            <td class="amount">${formatCurrency(d.totaalExcl)}</td>
          </tr>
          <tr>
            <td>BTW (${d.btwPercentage}%)</td>
            <td class="amount">${formatCurrency(d.btwBedrag)}</td>
          </tr>
          <tr class="grand">
            <td>Totaal incl. BTW</td>
            <td class="amount">${formatCurrency(d.totaalIncl)}</td>
          </tr>
        </table>
      </div>

      ${d.toelichting ? `<div class="toelichting"><div class="label">Toelichting</div><div class="text">${escapeHtml(d.toelichting)}</div></div>` : ''}
    </div>

    <div class="page-spacer"></div>

    <div class="bottom-block">
      <div class="voorwaarden">
        <div class="label">Voorwaarden</div>
        Deze offerte is geldig tot ${formatDate(geldigTot)}.
        Betaling binnen ${d.betaaltermijnDagen} dagen na afronding van de werkzaamheden.
        Alle bedragen zijn in euro&apos;s. BTW-tarief ${formatPct(d.btwPercentage)}% is van toepassing op alle posten.
      </div>

      <div class="footer">
        <div class="footer-text">
          <strong>${escapeHtml(d.bedrijf.bedrijfsnaam)}</strong>
          ${d.bedrijf.adres ? `<span class="sep">|</span>${escapeHtml(d.bedrijf.adres)}` : ''}${d.bedrijf.postcode && d.bedrijf.plaats ? `, ${escapeHtml(d.bedrijf.postcode)} ${escapeHtml(d.bedrijf.plaats)}` : ''}
        </div>
        ${footerBadgeBlock}
      </div>
    </div>

  </div>
</body>
</html>`
}

// ── Helpers ────────────────────────────────────────────────────────
function formatDate(date: Date): string {
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatCurrency(amount: number): string {
  return `€ ${amount.toFixed(2).replace('.', ',')}`
}
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString()
  return n.toFixed(2).replace('.', ',')
}
function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10
  if (Number.isInteger(rounded)) return rounded.toString()
  return rounded.toString().replace('.', ',')
}
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Mapper: ManualOfferteData → OffertePDFData ─────────────────────
const HOOFDCAT_LABELS: Record<string, string> = {
  oprit_terras_terrein: 'Oprit / Terras / Terreinreiniging',
  onkruidbeheersing: 'Onkruidbeheersing',
}

const SUB_LABELS: Record<string, string> = {
  invegen: 'Invegen',
  preventieve_onkruid: 'Preventieve onkruidbehandeling',
  beschermlaag: 'Nieuwe beschermlaag',
  onderhoud: 'Onderhoudsplan',
}

/**
 * Bouwt het OffertePDFData-object dat de template verwacht uit de
 * wizard-state + tenant-info + assets. Pure functie; geen IO.
 */
export function buildOffertePDFData(input: {
  data: ManualOfferteData
  rules: RegelComputed[]
  totals: TotalsComputed
  offertenummer: string
  bedrijf: TenantBedrijf
  logoBase64: string | null
  badgeBase64: string | null
  keurmerkBase64?: string | null
  besteVakmanBase64?: string | null
}): OffertePDFData {
  const { data, rules, totals, offertenummer, bedrijf, logoBase64, badgeBase64 } = input

  // Korting-EUROBEDRAG voor de Actiekorting-regel = totals.kortingBedrag. LET OP:
  // totals.discount is het PERCENTAGE (niet het bedrag) en hoort alleen op het
  // "(X%)"-label; dat eerder hier stond gaf een fout/ontbrekend kortingsbedrag
  // op de klant-PDF.
  const subtotaalExcl = totals.subtotal + totals.korstmosToeslag
  const kortingBedrag = totals.kortingBedrag
  const totaalExcl = totals.total
  // BTW-percentage uit de tenant-instelling; btwBedrag is met datzelfde tarief
  // berekend (computeTotals krijgt het tarief mee), dus label + bedrag kloppen.
  const btwPercentage = bedrijf.offerte_btw_tarief
  const btwBedrag = totals.btw
  const totaalIncl = Math.round((totaalExcl + btwBedrag) * 100) / 100

  return {
    klantNaam: data.naam.trim(),
    klantBedrijf: data.bedrijf.trim() || null,
    klantStraat: data.straat,
    klantHuisnummer: data.huisnummer,
    klantPostcode: data.postcode,
    klantPlaats: data.plaats,
    klantEmail: data.email,
    klantTelefoon: data.telefoon,
    factuurStraat: data.factuur_zelfde ? null : data.factuur_straat || null,
    factuurHuisnummer: data.factuur_zelfde ? null : data.factuur_huisnummer || null,
    factuurPostcode: data.factuur_zelfde ? null : data.factuur_postcode || null,
    factuurPlaats: data.factuur_zelfde ? null : data.factuur_plaats || null,
    offertenummer,
    vandaag: new Date(),
    geldigheidDagen: bedrijf.offerte_geldigheid_dagen,
    betaaltermijnDagen: bedrijf.offerte_betaaltermijn_dagen,
    hoofdcategorieLabels: data.hoofdcategorie.map((c) => HOOFDCAT_LABELS[c] ?? c),
    subDienstenLabels: data.sub.map((s) => SUB_LABELS[s] ?? s),
    m2: Number(data.m2) || 0,
    regels: rules.map((r) => ({
      omschrijving: r.desc,
      aantal: r.aantal,
      eenheid: r.eenheid,
      stukprijs: r.prijs,
      totaal: r.totaal,
      opmerking: r.opmerking ?? null,
    })),
    losseOpmerkingen: LOSSE_OPMERKINGEN.map(({ key, label }) => ({
      label,
      tekst: zichtbareOpmerking(data.regel_opmerkingen, key),
    })).filter((o): o is { label: string; tekst: string } => o.tekst != null),
    subtotaalExcl,
    kortingPercentage: Number(data.korting_percentage) || 0,
    kortingBedrag,
    kortingOmschrijving: data.korting_omschrijving.trim() || null,
    totaalExcl,
    btwPercentage,
    btwBedrag,
    totaalIncl,
    toelichting: data.notitie.trim() || null,
    logoBase64,
    badgeBase64,
    keurmerkBase64: input.keurmerkBase64 ?? null,
    besteVakmanBase64: input.besteVakmanBase64 ?? null,
    bedrijf,
  }
}
