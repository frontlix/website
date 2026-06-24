'use client'

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { OpdrachtbonModel } from '@/lib/dashboard/offerte/opdrachtbon-model'

/**
 * OPDRACHTBON-PDF: een offerte zonder prijzen, voor de uitvoerende collega's.
 * Afgeleid van OffertePdf.tsx, maar prijskolommen, totalen, gele toelichting,
 * voorwaarden en keurmerken zijn verwijderd. Toegevoegd: groot "OPDRACHTBON"
 * in de kop, een planning-blok, een leeg notitie-kader en een aftekenregel.
 * Client-side gerenderd, geen server-roundtrip.
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

  header: {
    backgroundColor: COLORS.cream,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'column', justifyContent: 'center' },
  headerBrand: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.blueAccent,
    letterSpacing: 0.5,
    marginBottom: 4,
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
  headerRight: { flexDirection: 'column', alignItems: 'flex-end' },
  headerLogo: { width: 180, objectFit: 'contain' },

  accent: { height: 4, backgroundColor: COLORS.gold },

  content: { paddingHorizontal: 40, paddingTop: 22 },

  metaGrid: { flexDirection: 'row', gap: 16, marginBottom: 18 },
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
  metaName: { fontSize: 13, fontWeight: 700, color: COLORS.blueDark, marginBottom: 4 },
  metaRow: { fontSize: 10, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 2 },
  metaRowStrong: { color: COLORS.text, fontWeight: 700 },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: COLORS.blueAccent,
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 8,
  },

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
  tableRowAlt: { backgroundColor: COLORS.rowAlt },
  cellDesc: { flex: 5, fontSize: 10, color: COLORS.text },
  cellAantal: { flex: 2, fontSize: 10, color: COLORS.text, textAlign: 'right' },
  cellHeaderDesc: { flex: 5, textAlign: 'left' },
  cellHeaderNum: { flex: 2, textAlign: 'right' },

  detailWrap: { marginTop: 14 },
  detailRow: { fontSize: 10, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 2 },

  notitieBox: {
    marginTop: 18,
    borderColor: COLORS.borderLight,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
  },

  aftekenRow: { marginTop: 18, fontSize: 10, color: COLORS.textMuted },

  footer: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: COLORS.cardBg,
    borderTopColor: COLORS.gold,
    borderTopWidth: 3,
  },
  footerText: { fontSize: 8, color: COLORS.textSubtle, lineHeight: 1.6 },
  footerBrand: { fontWeight: 700, color: COLORS.blueDark },
})

function formatDateNL(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function OpdrachtbonPdfDocument({
  model,
  origin,
}: {
  model: OpdrachtbonModel
  /** Absolute origin-URL voor het logo-asset (window.location.origin). */
  origin?: string
}) {
  const baseUrl = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const logoSrc = `${baseUrl}/assets/schoon-straatje/logo.png`
  const klantTitel = model.bedrijf ?? model.klantNaam
  const klantContact = model.bedrijf ? `T.a.v. ${model.klantNaam}` : ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER: bedrijfsnaam + OPDRACHTBON + bonnummer/printdatum, logo rechts */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerBrand}>{model.bedrijfsnaam}</Text>
            <Text style={styles.headerTitle}>OPDRACHTBON</Text>
            <Text style={styles.headerSubtitle}>
              Nr. {model.bonnummer}  ·  Geprint op {formatDateNL(new Date())}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoSrc} style={styles.headerLogo} />
          </View>
        </View>

        <View style={styles.accent} />

        <View style={styles.content}>
          {/* Klant & locatie + Planning */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Klant en locatie</Text>
              <Text style={styles.metaName}>{klantTitel}</Text>
              {klantContact ? <Text style={styles.metaRow}>{klantContact}</Text> : null}
              {model.werkadres.map((line, i) => (
                <Text key={i} style={styles.metaRow}>{line}</Text>
              ))}
              {model.telefoon ? (
                <Text style={styles.metaRow}>
                  <Text style={styles.metaRowStrong}>Tel: </Text>
                  {model.telefoon}
                </Text>
              ) : null}
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Planning</Text>
              <Text style={styles.metaRow}>
                <Text style={styles.metaRowStrong}>Uitvoering: </Text>
                {model.afspraak ?? 'Nog in te plannen'}
              </Text>
            </View>
          </View>

          {/* Werkzaamheden (geen prijzen) */}
          <Text style={styles.sectionTitle}>Uit te voeren werkzaamheden</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellHeaderDesc]}>Omschrijving</Text>
            <Text style={[styles.tableHeaderCell, styles.cellHeaderNum]}>Aantal</Text>
          </View>
          {model.werkzaamheden.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.cellDesc, { color: COLORS.textSubtle, flex: 1 }]}>
                Geen werkzaamheden bekend
              </Text>
            </View>
          ) : (
            model.werkzaamheden.map((r, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <Text style={styles.cellDesc}>{r.omschrijving}</Text>
                <Text style={styles.cellAantal}>{r.aantal}</Text>
              </View>
            ))
          )}

          {/* Materiaal-detail (alleen indien aanwezig) */}
          {model.detailregels.length > 0 ? (
            <View style={styles.detailWrap}>
              {model.detailregels.map((d, i) => (
                <Text key={i} style={styles.detailRow}>
                  <Text style={styles.metaRowStrong}>{d.label}: </Text>
                  {d.waarde}
                </Text>
              ))}
            </View>
          ) : null}

          {/* Bijzonderheden / notities (handmatig in te vullen) */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Bijzonderheden / notities</Text>
          <View style={styles.notitieBox} />

          {/* Aftekenregel */}
          <Text style={styles.aftekenRow}>
            Uitgevoerd op ____________________   door ____________________   (handtekening)
          </Text>
        </View>

        {/* Footer: bedrijfsidentiteit, geen keurmerk */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Text style={styles.footerBrand}>{model.bedrijfsnaam}</Text>
            {'  |  '}KvK 62612018{'  |  '}welkom@schoon-straatje.nl
          </Text>
        </View>
      </Page>
    </Document>
  )
}
