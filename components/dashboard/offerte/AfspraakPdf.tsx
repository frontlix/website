'use client'

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { AfspraakInfo } from '@/lib/dashboard/afspraak-info'

/**
 * AFSPRAAK-PDF: een overzichtelijke een-pagina-kaart met alle info van een
 * ingeplande afspraak (planning, klus, locatie, contact) die de eigenaar
 * uitprint en op het prikbord hangt. Afgeleid van de stijl van OpdrachtbonPdf
 * (cremekleurige kop, gouden accent, navy), maar afspraak-gericht met een grote
 * datum/tijd-banner. Client-side gerenderd, geen server-roundtrip.
 *
 * Streep-vrij conform huisstijl (komma/middelpunt i.p.v. liggend streepje).
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

  // Grote datum/tijd-banner.
  banner: {
    flexDirection: 'row',
    backgroundColor: COLORS.blueDark,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  bannerCol: { flexDirection: 'column' },
  bannerColTijd: {
    flexDirection: 'column',
    marginLeft: 28,
    paddingLeft: 28,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.25)',
  },
  bannerLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  bannerValue: { fontSize: 16, fontWeight: 700, color: COLORS.white },

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

  klusRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderLight,
  },
  klusLabel: { flex: 2, fontSize: 10, fontWeight: 700, color: COLORS.textMuted },
  klusValue: { flex: 4, fontSize: 11, color: COLORS.text },

  notitieBox: {
    marginTop: 18,
    borderColor: COLORS.borderLight,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 70,
  },
  notitieRegel: {
    flexDirection: 'row',
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  notitieBullet: { width: 12, color: COLORS.blueAccent },
  notitieTekst: { flex: 1 },

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

export function AfspraakPdfDocument({
  info,
  origin,
}: {
  info: AfspraakInfo
  /** Absolute origin-URL voor het logo-asset (window.location.origin). */
  origin?: string
}) {
  const baseUrl = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const logoSrc = `${baseUrl}/assets/schoon-straatje/logo.png`

  const reis = info.reisAfstand
    ? info.reisTijd
      ? `${info.reisAfstand} · ${info.reisTijd}`
      : info.reisAfstand
    : ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerBrand}>Schoon Straatje</Text>
            <Text style={styles.headerTitle}>AFSPRAAK</Text>
            <Text style={styles.headerSubtitle}>Geprint op {formatDateNL(new Date())}</Text>
          </View>
          <View style={styles.headerRight}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoSrc} style={styles.headerLogo} />
          </View>
        </View>

        <View style={styles.accent} />

        <View style={styles.content}>
          {/* Grote datum/tijd-banner */}
          <View style={styles.banner}>
            <View style={styles.bannerCol}>
              <Text style={styles.bannerLabel}>Datum</Text>
              <Text style={styles.bannerValue}>{info.datumLang || 'Onbekend'}</Text>
            </View>
            <View style={styles.bannerColTijd}>
              <Text style={styles.bannerLabel}>Tijd</Text>
              <Text style={styles.bannerValue}>{info.tijd || 'Onbekend'}</Text>
            </View>
          </View>

          {/* Klant/contact + locatie */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Klant en contact</Text>
              <Text style={styles.metaName}>{info.klantNaam}</Text>
              {info.telefoon ? (
                <Text style={styles.metaRow}>
                  <Text style={styles.metaRowStrong}>Tel: </Text>
                  {info.telefoon}
                </Text>
              ) : null}
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Locatie</Text>
              {info.adres ? <Text style={styles.metaRow}>{info.adres}</Text> : null}
              {info.plaats ? <Text style={styles.metaRow}>{info.plaats}</Text> : null}
              {reis ? (
                <Text style={styles.metaRow}>
                  <Text style={styles.metaRowStrong}>Reisafstand: </Text>
                  {reis}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Klus-details */}
          <Text style={styles.sectionTitle}>Klus</Text>
          {info.dienst ? (
            <View style={styles.klusRow}>
              <Text style={styles.klusLabel}>Dienst</Text>
              <Text style={styles.klusValue}>{info.dienst}</Text>
            </View>
          ) : null}
          {info.subDiensten ? (
            <View style={styles.klusRow}>
              <Text style={styles.klusLabel}>Werkzaamheden</Text>
              <Text style={styles.klusValue}>{info.subDiensten}</Text>
            </View>
          ) : null}
          {info.oppervlakte ? (
            <View style={styles.klusRow}>
              <Text style={styles.klusLabel}>Oppervlakte</Text>
              <Text style={styles.klusValue}>{info.oppervlakte}</Text>
            </View>
          ) : null}
          {info.groeneAanslag ? (
            <View style={styles.klusRow}>
              <Text style={styles.klusLabel}>Groene aanslag</Text>
              <Text style={styles.klusValue}>Aanwezig</Text>
            </View>
          ) : null}
          {info.plantenAfschermen ? (
            <View style={styles.klusRow}>
              <Text style={styles.klusLabel}>Planten</Text>
              <Text style={styles.klusValue}>Afschermen</Text>
            </View>
          ) : null}

          {/* Bijzonderheden / notities: de team-notities met "Afspraak"-vinkje
              aan. Geen notities ⇒ leeg vak om met de hand in te vullen. */}
          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Bijzonderheden / notities</Text>
          <View style={styles.notitieBox}>
            {info.notities.map((n, i) => (
              <View key={i} style={styles.notitieRegel}>
                <Text style={styles.notitieBullet}>•</Text>
                <Text style={styles.notitieTekst}>{n}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Text style={styles.footerBrand}>Schoon Straatje</Text>
            {'  |  '}KvK 62612018{'  |  '}welkom@schoon-straatje.nl
          </Text>
        </View>
      </Page>
    </Document>
  )
}
