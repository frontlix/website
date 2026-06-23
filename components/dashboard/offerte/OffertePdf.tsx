'use client'

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatEuro } from '@/lib/dashboard/format'
import type {
  ManualOfferteData,
  RegelComputed,
  TotalsComputed,
  SubDienst,
  Hoofdcategorie,
} from '@/lib/dashboard/manual-offerte-types'

/**
 * PDF-template gemodelleerd naar het Schoon Straatje-design dat de bot
 * via Puppeteer genereert (zie src/templates/offerte-pdf-template.ts in
 * de bot-repo). Gebruikt @react-pdf/renderer i.p.v. HTML+Puppeteer want
 * dit draait client-side in de dashboard-wizard, geen server-roundtrip
 * en geen Puppeteer-dependency op de browser.
 *
 * Visueel houden we vast aan: cream-header, gouden accent-lijn, blauwe
 * tabel-header, totalen-grand-row in donkerblauw, gele toelichting-box,
 * cream footer met gouden top-border.
 *
 * Tenant-info (bedrijfsnaam, KvK, BTW-nr) is hardcoded op Schoon Straatje
 * tot we 'm uit tenant_settings doorgeven aan de wizard.
 */

const COLORS = {
  bg: '#FFFFFF',
  cream: '#FAFAF0',
  gold: '#F5C518',
  blueDark: '#002D63',
  blueAccent: '#003F8A',
  text: '#1A1A1A',
  textMuted: '#4B5563',
  textSubtle: '#6B7280',
  borderLight: '#E5E7EB',
  rowAlt: '#FAFAFA',
  cardBg: '#F9FAFB',
  toelichtingBg: '#FFFBEB',
  toelichtingBorder: '#FDE68A',
  toelichtingLabel: '#92400E',
  toelichtingText: '#78350F',
  kortingGreen: '#15803D',
  white: '#FFFFFF',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: COLORS.text,
    backgroundColor: COLORS.bg,
    paddingBottom: 0,
  },

  // ── Header ─────────────────────────────────────
  header: {
    backgroundColor: COLORS.cream,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 800,
    color: COLORS.blueDark,
    letterSpacing: 1,
    lineHeight: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: COLORS.textSubtle,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    gap: 8,
  },
  headerBadge: {
    height: 75,
    objectFit: 'contain',
  },
  headerKeurmerk: {
    height: 75,
    objectFit: 'contain',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  headerLogo: {
    width: 180,
    objectFit: 'contain',
  },

  // Gouden accent-lijn onder de header
  accent: {
    height: 4,
    backgroundColor: COLORS.gold,
  },

  // ── Content ────────────────────────────────────
  content: {
    paddingHorizontal: 40,
    paddingTop: 22,
  },

  // Meta-grid: 2 cards (Offerte gegevens + Voor)
  metaGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  metaCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.borderLight,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: COLORS.blueAccent,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  metaRow: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 1.5,
    marginBottom: 2,
  },
  metaName: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.blueDark,
    marginBottom: 4,
  },
  metaRowStrong: {
    color: COLORS.text,
    fontWeight: 700,
  },
  metaSeparator: {
    marginVertical: 6,
  },

  // Section title (Specificatie)
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: COLORS.blueAccent,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 8,
  },

  // ── Regels-tabel ────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.blueDark,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  tableRowAlt: {
    backgroundColor: COLORS.rowAlt,
  },
  cellDesc: { flex: 5, fontSize: 10, color: COLORS.text },
  cellAantal: { flex: 1.5, fontSize: 10, color: COLORS.text, textAlign: 'right' },
  cellPrijs: { flex: 1.5, fontSize: 10, color: COLORS.text, textAlign: 'right' },
  cellTotaal: {
    flex: 1.8,
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.blueDark,
    textAlign: 'right',
  },
  cellHeaderDesc: { flex: 5, textAlign: 'left' },
  cellHeaderNum: { flex: 1.5, textAlign: 'right' },
  cellHeaderTotaal: { flex: 1.8, textAlign: 'right' },

  // ── Totals ──────────────────────────────────────
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  totalsTable: {
    width: '62%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 10,
  },
  totalRowLabel: {
    color: COLORS.textMuted,
  },
  totalRowAmount: {
    color: COLORS.text,
    textAlign: 'right',
  },
  totalRowKorting: {
    color: COLORS.kortingGreen,
    fontWeight: 700,
  },
  totalRowSubtotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopColor: COLORS.borderLight,
    borderTopWidth: 1,
    fontSize: 10,
  },
  totalRowSubtotalLabel: {
    color: COLORS.text,
    fontWeight: 700,
  },
  totalRowGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.blueDark,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    borderRadius: 6,
  },
  totalRowGrandLabel: {
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 13,
  },
  totalRowGrandAmount: {
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 13,
  },

  // ── Toelichting (gele box) ──────────────────────
  toelichting: {
    marginTop: 16,
    padding: 14,
    backgroundColor: COLORS.toelichtingBg,
    borderColor: COLORS.toelichtingBorder,
    borderWidth: 1,
    borderRadius: 8,
  },
  toelichtingLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: COLORS.toelichtingLabel,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  toelichtingText: {
    fontSize: 10,
    color: COLORS.toelichtingText,
    lineHeight: 1.5,
  },

  // ── Voorwaarden ─────────────────────────────────
  voorwaarden: {
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 0,
    fontSize: 9,
    color: COLORS.textSubtle,
    lineHeight: 1.55,
  },
  voorwaardenLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: COLORS.blueAccent,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  // ── Footer ──────────────────────────────────────
  footer: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: COLORS.cardBg,
    borderTopColor: COLORS.gold,
    borderTopWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.textSubtle,
    lineHeight: 1.6,
    flex: 1,
  },
  footerBadge: {
    height: 46,
    objectFit: 'contain',
  },
  footerBrand: {
    fontWeight: 700,
    color: COLORS.blueDark,
  },
})

const CATEGORIE_LABEL: Record<Hoofdcategorie, string> = {
  oprit_terras_terrein: 'Oprit / Terras / Terreinreiniging',
  onkruidbeheersing: 'Onkruidbeheersing',
}

const SUB_LABEL: Record<SubDienst, string> = {
  invegen: 'Invegen',
  preventieve_onkruid: 'Preventieve onkruidbehandeling',
  beschermlaag: 'Nieuwe beschermlaag',
  onderhoud: 'Onderhoudsplan',
}

function formatDateNL(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const rounded = Math.round(n * 10) / 10
  if (Number.isInteger(rounded)) return rounded.toString()
  return rounded.toString().replace('.', ',')
}

export function OffertePdfDocument({
  data,
  rules,
  totals,
  offerteNummer,
  bedrijfsnaam = 'Schoon Straatje',
  geldigheidDagen = 21,
  origin,
}: {
  data: ManualOfferteData
  rules: RegelComputed[]
  totals: TotalsComputed
  offerteNummer: string
  bedrijfsnaam?: string
  geldigheidDagen?: number
  /** Absolute origin URL voor de logo/badge assets (window.location.origin). */
  origin?: string
}) {
  const vandaag = new Date()
  const geldigTot = new Date(vandaag)
  geldigTot.setDate(geldigTot.getDate() + geldigheidDagen)

  // Image-URLs: @react-pdf/renderer accepteert absolute URLs en
  // base64 data-URLs. In de browser nemen we de origin van de huidige
  // pagina; in node/SSR fallback we naar het relatieve pad (waarschijnlijk
  // werkt 'ie dan niet, maar de PDF wordt sowieso client-side gerenderd).
  const baseUrl = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const logoSrc = `${baseUrl}/assets/schoon-straatje/logo.png`
  const badgeSrc = `${baseUrl}/assets/schoon-straatje/top-30-vakbedrijven.png`
  const keurmerkSrc = `${baseUrl}/assets/schoon-straatje/keurmerk-vakman.png`
  const besteVakmanSrc = `${baseUrl}/assets/schoon-straatje/beste-vakman-buurt.png`

  const klantNaam = data.bedrijf?.trim() ? data.bedrijf : data.naam
  const klantContact = data.bedrijf?.trim() ? `T.a.v. ${data.naam}` : ''
  const adresLine1 =
    data.straat && data.huisnummer ? `${data.straat} ${data.huisnummer}` : ''
  const adresLine2 =
    data.postcode && data.plaats ? `${data.postcode} ${data.plaats}` : ''
  const heeftFactuur =
    !data.factuur_zelfde &&
    (data.factuur_postcode || data.factuur_huisnummer || data.factuur_straat || data.factuur_plaats)
  const factuurAdres1 = heeftFactuur
    ? `${data.factuur_straat || ''} ${data.factuur_huisnummer || ''}`.trim()
    : ''
  const factuurAdres2 = heeftFactuur
    ? `${data.factuur_postcode || ''} ${data.factuur_plaats || ''}`.trim()
    : ''

  // hoofdcategorie is een array; render alle gekozen labels gescheiden
  // door " + ". Bij lege array fallback naar lege string (validatie zou
  // dit moeten voorkomen).
  const dienstLabel =
    data.hoofdcategorie.length === 0
      ? ''
      : data.hoofdcategorie.map((c) => CATEGORIE_LABEL[c] ?? c).join(' + ')
  const subLabels = data.sub.map((s) => SUB_LABEL[s] ?? s).join(', ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>OFFERTE</Text>
            <Text style={styles.headerSubtitle}>Nr. {offerteNummer}</Text>
          </View>
          <View style={styles.headerCenter}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={badgeSrc} style={styles.headerBadge} />
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={keurmerkSrc} style={styles.headerKeurmerk} />
          </View>
          <View style={styles.headerRight}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoSrc} style={styles.headerLogo} />
          </View>
        </View>

        {/* Gouden accent-lijn */}
        <View style={styles.accent} />

        {/* CONTENT */}
        <View style={styles.content}>
          {/* Meta-grid: Offerte gegevens + Voor */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Offerte gegevens</Text>
              <Text style={styles.metaRow}>
                <Text style={styles.metaRowStrong}>Datum: </Text>
                {formatDateNL(vandaag)}
              </Text>
              <Text style={styles.metaRow}>
                <Text style={styles.metaRowStrong}>Geldig tot: </Text>
                {formatDateNL(geldigTot)}
              </Text>
              <Text style={styles.metaRow}>
                <Text style={styles.metaRowStrong}>Dienst: </Text>
                {dienstLabel}
              </Text>
              {subLabels ? (
                <Text style={styles.metaRow}>
                  <Text style={styles.metaRowStrong}>Subdiensten: </Text>
                  {subLabels}
                </Text>
              ) : null}
              {data.m2 ? (
                <Text style={styles.metaRow}>
                  <Text style={styles.metaRowStrong}>Oppervlakte: </Text>
                  {data.m2} m²
                </Text>
              ) : null}
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Voor</Text>
              <Text style={styles.metaName}>{klantNaam || '—'}</Text>
              {klantContact ? (
                <Text style={styles.metaRow}>{klantContact}</Text>
              ) : null}
              {adresLine1 ? <Text style={styles.metaRow}>{adresLine1}</Text> : null}
              {adresLine2 ? <Text style={styles.metaRow}>{adresLine2}</Text> : null}
              {heeftFactuur ? (
                <View style={styles.metaSeparator}>
                  <Text style={[styles.metaRow, styles.metaRowStrong]}>
                    Factuuradres:
                  </Text>
                  {factuurAdres1 ? (
                    <Text style={styles.metaRow}>{factuurAdres1}</Text>
                  ) : null}
                  {factuurAdres2 ? (
                    <Text style={styles.metaRow}>{factuurAdres2}</Text>
                  ) : null}
                </View>
              ) : null}
              {data.email ? <Text style={styles.metaRow}>{data.email}</Text> : null}
              {data.telefoon ? (
                <Text style={styles.metaRow}>{data.telefoon}</Text>
              ) : null}
            </View>
          </View>

          {/* Specificatie */}
          <Text style={styles.sectionTitle}>Specificatie</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellHeaderDesc]}>Omschrijving</Text>
            <Text style={[styles.tableHeaderCell, styles.cellHeaderNum]}>Aantal</Text>
            <Text style={[styles.tableHeaderCell, styles.cellHeaderNum]}>Stukprijs</Text>
            <Text style={[styles.tableHeaderCell, styles.cellHeaderTotaal]}>Totaal</Text>
          </View>
          {rules.length === 0 ? (
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.cellDesc,
                  { textAlign: 'center', color: COLORS.textSubtle, flex: 1 },
                ]}
              >
                Geen specificatie beschikbaar
              </Text>
            </View>
          ) : (
            rules.map((r, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={styles.cellDesc}>{r.desc}</Text>
                <Text style={styles.cellAantal}>
                  {r.aantal} {r.eenheid}
                </Text>
                <Text style={styles.cellPrijs}>{formatEuro(r.prijs)}</Text>
                <Text style={styles.cellTotaal}>{formatEuro(r.totaal)}</Text>
              </View>
            ))
          )}

          {/* Totals */}
          <View style={styles.totalsWrap}>
            <View style={styles.totalsTable}>
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Subtotaal diensten</Text>
                <Text style={styles.totalRowAmount}>
                  {formatEuro(totals.subtotal)}
                </Text>
              </View>
              {totals.korstmosToeslag > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalRowLabel}>Korstmos-toeslag (10%)</Text>
                  <Text style={styles.totalRowAmount}>
                    {formatEuro(totals.korstmosToeslag)}
                  </Text>
                </View>
              )}
              {totals.kortingBedrag > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalRowKorting}>
                    Actiekorting ({formatPct(totals.discount)}%)
                    {data.korting_omschrijving?.trim()
                      ? `, ${data.korting_omschrijving.trim()}`
                      : ''}
                  </Text>
                  <Text style={[styles.totalRowAmount, styles.totalRowKorting]}>
, {formatEuro(totals.kortingBedrag)}
                  </Text>
                </View>
              )}
              <View style={styles.totalRowSubtotal}>
                <Text style={styles.totalRowSubtotalLabel}>Totaal excl. BTW</Text>
                <Text style={[styles.totalRowAmount, styles.totalRowSubtotalLabel]}>
                  {formatEuro(totals.total)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>BTW (21%)</Text>
                <Text style={styles.totalRowAmount}>{formatEuro(totals.btw)}</Text>
              </View>
              <View style={styles.totalRowGrand}>
                <Text style={styles.totalRowGrandLabel}>Totaal incl. BTW</Text>
                <Text style={styles.totalRowGrandAmount}>
                  {formatEuro(totals.total + totals.btw)}
                </Text>
              </View>
            </View>
          </View>

          {/* Toelichting (klant-notitie) */}
          {data.notitie?.trim() ? (
            <View style={styles.toelichting}>
              <Text style={styles.toelichtingLabel}>Toelichting</Text>
              <Text style={styles.toelichtingText}>{data.notitie}</Text>
            </View>
          ) : null}
        </View>

        {/* Voorwaarden */}
        <View style={styles.voorwaarden}>
          <Text style={styles.voorwaardenLabel}>Voorwaarden</Text>
          <Text>
            Deze offerte is geldig tot {formatDateNL(geldigTot)}. Alle bedragen
            zijn in euro&apos;s. BTW-tarief 21% is van toepassing op alle posten.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Text style={styles.footerBrand}>{bedrijfsnaam}</Text>
            {'  |  '}KvK 62612018{'  |  '}BTW NL001708304B31
            {'  |  '}welkom@schoon-straatje.nl
          </Text>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={besteVakmanSrc} style={styles.footerBadge} />
        </View>
      </Page>
    </Document>
  )
}
