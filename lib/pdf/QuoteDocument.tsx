/**
 * React-PDF component voor de demo offerte.
 *
 * Layout volgt de referentie-PDF: blauwe gradient bar bovenaan, klantgegevens
 * links + bedrijfsgegevens rechts, "Offerte" heading, meta-info, intro,
 * "Ons aanbod" sectie, "Begroting" tabel, blauwe totaalbalk, voorwaarden,
 * en een footer met "Dit is een demo van Frontlix" attributie.
 *
 * Wordt gerenderd via lib/pdf/generate.ts en gebruikt @react-pdf/renderer.
 */

/* eslint-disable jsx-a11y/alt-text */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { BrancheConfig, PricingResult } from '@/lib/branches'

// Brand kleuren — exact matchen met styles/tokens.css
const COLORS = {
  primary: '#1A56FF',
  accent: '#00CFFF',
  text: '#1A1A1A',
  textMuted: '#555555',
  border: '#E5E7EB',
  surface: '#F5F7FA',
  white: '#FFFFFF',
}

const FONT = {
  // Helvetica is ingebouwd in react-pdf — geen externe font nodig
  body: 'Helvetica',
  bold: 'Helvetica-Bold',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    fontFamily: FONT.body,
    fontSize: 9.5,
    color: COLORS.text,
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 0,
  },
  // Top blauwe gradient bar (gradient niet ondersteund — solid primary kleur)
  topBar: {
    height: 8,
    backgroundColor: COLORS.primary,
  },
  topBarAccent: {
    height: 2,
    backgroundColor: COLORS.accent,
  },
  // Hoofdcontent met padding
  body: {
    paddingTop: 32,
    paddingHorizontal: 40,
  },
  // Header met klant-info links en bedrijfs-info rechts
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headerCol: {
    width: '48%',
  },
  headerLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerName: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  headerLine: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 1,
  },
  // Offerte title
  title: {
    fontSize: 28,
    fontFamily: FONT.bold,
    color: COLORS.text,
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  // Meta-info grid (klantnummer, offertenummer, datum, geldig tot)
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 6,
    marginBottom: 22,
  },
  metaItem: {
    width: '50%',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: COLORS.text,
  },
  // Intro paragraaf
  paragraph: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    lineHeight: 1.55,
    marginBottom: 14,
  },
  greeting: {
    fontSize: 10,
    fontFamily: FONT.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  // Sectie heading ("Ons aanbod", "Begroting", "Voorwaarden")
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: COLORS.text,
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    borderBottomStyle: 'solid',
  },
  // Begroting tabel
  table: {
    marginTop: 4,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: FONT.bold,
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    borderBottomStyle: 'solid',
  },
  tableCell: {
    fontSize: 9,
    color: COLORS.text,
  },
  // Kolombreedtes
  colDescription: { width: '46%' },
  colQty: { width: '12%', textAlign: 'right' },
  colUnit: { width: '12%', textAlign: 'right' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '15%', textAlign: 'right' },
  // Subtotaal en BTW rijen
  totalsBlock: {
    marginTop: 4,
    marginLeft: '50%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  totalsLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: FONT.bold,
    color: COLORS.text,
  },
  // Eind-totaalbalk in primary kleur
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  grandTotalValue: {
    fontSize: 13,
    fontFamily: FONT.bold,
    color: COLORS.white,
  },
  // Voorwaarden (kleine tekst onderaan)
  voorwaarden: {
    fontSize: 8,
    color: COLORS.textMuted,
    lineHeight: 1.5,
    marginTop: 16,
  },
  // Footer onderaan elke pagina — fixed positie
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    borderTopStyle: 'solid',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: COLORS.textMuted,
  },
  footerBrand: {
    fontSize: 7.5,
    fontFamily: FONT.bold,
    color: COLORS.primary,
  },
})

/** Format euro bedrag — Nederlandse stijl met komma als decimaal */
function euro(n: number): string {
  return `\u20AC ${n.toFixed(2).replace('.', ',')}`
}

/** Format datum — DD-MM-YYYY */
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export interface QuoteData {
  /** Klantgegevens — top-level uit de leads tabel */
  klantNaam: string
  klantEmail: string
  klantAdres?: string
  /** Branche-config (bevat bedrijfs-info en branding tekst) */
  branche: BrancheConfig
  /** Berekende prijs */
  pricing: PricingResult
  /** Vrijwillige unieke nummers — anders auto-gegenereerd */
  klantnummer?: string
  offertenummer?: string
  /** Datum waarop de offerte gemaakt wordt — default: vandaag */
  offerteDatum?: Date
  /** Aantal dagen geldig — default 30 */
  geldigDagen?: number
  /** Korte samenvatting van de antwoorden, voor de intro paragraaf */
  intakeSamenvatting?: string
}

export function QuoteDocument({
  klantNaam,
  klantEmail,
  klantAdres,
  branche,
  pricing,
  klantnummer = generateKlantnummer(),
  offertenummer = generateOffertenummer(),
  offerteDatum = new Date(),
  geldigDagen = 30,
  intakeSamenvatting,
}: QuoteData) {
  const company = branche.company
  const geldigTot = new Date(offerteDatum.getTime() + geldigDagen * 24 * 60 * 60 * 1000)

  return (
    <Document
      title={`Offerte ${offertenummer}`}
      author={company.name}
      subject={`Offerte voor ${klantNaam}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Blauwe topbar */}
        <View style={styles.topBar} />
        <View style={styles.topBarAccent} />

        <View style={styles.body}>
          {/* Header met klant + bedrijf */}
          <View style={styles.headerRow}>
            <View style={styles.headerCol}>
              <Text style={styles.headerLabel}>T.a.v.</Text>
              <Text style={styles.headerName}>{klantNaam}</Text>
              {klantAdres ? <Text style={styles.headerLine}>{klantAdres}</Text> : null}
              <Text style={styles.headerLine}>{klantEmail}</Text>
            </View>
            <View style={styles.headerCol}>
              <Text style={styles.headerLabel}>Van</Text>
              <Text style={styles.headerName}>{company.name}</Text>
              {company.addressLines.map((l, i) => (
                <Text key={i} style={styles.headerLine}>{l}</Text>
              ))}
              <Text style={styles.headerLine}>Tel: {company.phone}</Text>
              <Text style={styles.headerLine}>{company.email}</Text>
            </View>
          </View>

          {/* Offerte titel */}
          <Text style={styles.title}>Offerte</Text>

          {/* Meta grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Klantnummer</Text>
              <Text style={styles.metaValue}>{klantnummer}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Offertenummer</Text>
              <Text style={styles.metaValue}>{offertenummer}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Offertedatum</Text>
              <Text style={styles.metaValue}>{formatDate(offerteDatum)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Geldig tot</Text>
              <Text style={styles.metaValue}>{formatDate(geldigTot)}</Text>
            </View>
          </View>

          {/* Intro */}
          <Text style={styles.greeting}>Beste {klantNaam.split(' ')[0]},</Text>
          <Text style={styles.paragraph}>{branche.introOfferte}</Text>
          {intakeSamenvatting ? (
            <Text style={styles.paragraph}>{intakeSamenvatting}</Text>
          ) : null}

          {/* Ons aanbod */}
          <Text style={styles.sectionTitle}>Ons aanbod</Text>
          <Text style={styles.paragraph}>{branche.aanbodBeschrijving}</Text>

          {/* Begroting */}
          <Text style={styles.sectionTitle}>Begroting</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>Omschrijving</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Aantal</Text>
              <Text style={[styles.tableHeaderCell, styles.colUnit]}>Eenheid</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>Per eenheid</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Totaal</Text>
            </View>
            {pricing.lines.map((line, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colDescription]}>{line.omschrijving}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{line.aantal}</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>{line.eenheid}</Text>
                <Text style={[styles.tableCell, styles.colPrice]}>{euro(line.prijsPerEenheid)}</Text>
                <Text style={[styles.tableCell, styles.colTotal]}>{euro(line.totaal)}</Text>
              </View>
            ))}
          </View>

          {/* Subtotaal + BTW */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotaal excl. BTW</Text>
              <Text style={styles.totalsValue}>{euro(pricing.subtotaalExclBtw)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>BTW (21%)</Text>
              <Text style={styles.totalsValue}>{euro(pricing.btwBedrag)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Totaal incl. BTW</Text>
              <Text style={styles.grandTotalValue}>{euro(pricing.totaalInclBtw)}</Text>
            </View>
          </View>

          {/* Voorwaarden */}
          <Text style={styles.sectionTitle}>Voorwaarden</Text>
          <Text style={styles.voorwaarden}>
            Deze offerte is {geldigDagen} dagen geldig vanaf {formatDate(offerteDatum)}.
            Genoemde bedragen zijn inclusief 21% BTW. Werkzaamheden worden uitgevoerd volgens
            de algemene voorwaarden van {company.name} (KvK {company.kvk}). Bij akkoord wordt
            een opdrachtbevestiging gestuurd en plannen we de uitvoering in overleg met u in.
          </Text>
        </View>

        {/* Footer (gefixeerd onderaan) */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {company.name} • KvK {company.kvk} • BTW {company.btw} • IBAN {company.iban}
          </Text>
          <Text style={styles.footerBrand}>frontlix.com</Text>
        </View>

        {/* Demo attributie — extra rij onder de footer */}
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            left: 40,
            right: 40,
          }}
          fixed
        >
          <Text style={{ fontSize: 7, color: COLORS.textMuted, textAlign: 'center' }}>
            Dit is een demo van Frontlix. Deze offerte is automatisch gegenereerd door ons systeem.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

/** Genereer een random klantnummer in formaat KL-NNNNNN */
function generateKlantnummer(): string {
  const n = Math.floor(Math.random() * 900000) + 100000
  return `KL-${n}`
}

/** Genereer offertenummer in formaat OFF-YYYYMMDD-XXXX (hex) */
function generateOffertenummer(d: Date = new Date()): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')
  return `OFF-${yyyy}${mm}${dd}-${hex}`
}
