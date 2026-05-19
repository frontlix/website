'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatEuro } from '@/lib/dashboard/format'
import type {
  ManualOfferteData,
  RegelComputed,
  TotalsComputed,
} from '@/lib/dashboard/manual-offerte-types'

/**
 * Client-side PDF-generator voor de handmatige offerte. Gebruikt
 * `@react-pdf/renderer` (al in dependencies) — geen extra dependencies
 * nodig. Het document is bewust simpel: header + klant-info + regel-tabel
 * + totalen + footer. Layout-tweaks volgen wanneer de design-template
 * er komt; voor nu is dit een werkbare V1.
 *
 * Tenant-info (bedrijfsnaam, BTW-nr etc.) is hardcoded op Schoon Straatje
 * tot we 'm uit tenant_settings doorgeven aan de wizard.
 */

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  // ── Top ─────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  brand: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  brandSub: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
  },
  meta: {
    textAlign: 'right',
    fontSize: 9,
    color: '#666',
  },
  metaValue: {
    color: '#1a1a1a',
    fontWeight: 700,
  },
  // ── Titel ────────────────────────────────────────
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 24,
  },
  // ── Klant-block ─────────────────────────────────
  klantBlock: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  klantLabel: {
    fontSize: 8,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  klantName: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 2,
  },
  klantLine: {
    fontSize: 10,
    color: '#333',
    lineHeight: 1.4,
  },
  // ── Notitie ─────────────────────────────────────
  notitie: {
    marginBottom: 16,
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333',
  },
  // ── Tabel ───────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 6,
    marginBottom: 6,
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#666',
    letterSpacing: 0.5,
  },
  colDesc: { flex: 3 },
  colAantal: { flex: 1, textAlign: 'right' },
  colPrijs: { flex: 1, textAlign: 'right' },
  colTotaal: { flex: 1.2, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    fontSize: 10,
  },
  // ── Totalen ─────────────────────────────────────
  totalsBlock: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: '55%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    fontSize: 10,
  },
  totalRowMuted: {
    color: '#666',
  },
  totalRowKorting: {
    color: '#15803d',
  },
  totalRowExcl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    marginTop: 4,
    fontSize: 11,
    fontWeight: 700,
  },
  totalRowIncl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    padding: 10,
    backgroundColor: '#1a56ff',
    color: 'white',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 4,
  },
  totalRowInclLabel: {
    color: 'white',
  },
  totalRowInclValue: {
    color: 'white',
  },
  // ── Footer ──────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
})

export function OffertePdfDocument({
  data,
  rules,
  totals,
  offerteNummer,
  bedrijfsnaam = 'Schoon Straatje',
}: {
  data: ManualOfferteData
  rules: RegelComputed[]
  totals: TotalsComputed
  offerteNummer: string
  bedrijfsnaam?: string
}) {
  const datum = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const adres = [
    data.straat && data.huisnummer ? `${data.straat} ${data.huisnummer}` : null,
    data.postcode && data.plaats ? `${data.postcode} ${data.plaats}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{bedrijfsnaam}</Text>
            <Text style={styles.brandSub}>Reiniging · Voegwerk · Onderhoud</Text>
          </View>
          <View style={styles.meta}>
            <Text>Offertenummer</Text>
            <Text style={styles.metaValue}>{offerteNummer}</Text>
            <Text style={{ marginTop: 6 }}>Datum</Text>
            <Text style={styles.metaValue}>{datum}</Text>
          </View>
        </View>

        <Text style={styles.title}>Offerte</Text>

        {/* Klant-block */}
        <View style={styles.klantBlock}>
          <Text style={styles.klantLabel}>Aan</Text>
          <Text style={styles.klantName}>{data.naam || '—'}</Text>
          {data.bedrijf ? (
            <Text style={styles.klantLine}>{data.bedrijf}</Text>
          ) : null}
          {adres ? <Text style={styles.klantLine}>{adres}</Text> : null}
          {(data.telefoon || data.email) && (
            <Text style={styles.klantLine}>
              {[data.telefoon, data.email].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>

        {/* Notitie */}
        {data.notitie && (
          <Text style={styles.notitie}>{data.notitie}</Text>
        )}

        {/* Tabel-header */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Omschrijving</Text>
          <Text style={styles.colAantal}>Aantal</Text>
          <Text style={styles.colPrijs}>Prijs</Text>
          <Text style={styles.colTotaal}>Totaal</Text>
        </View>

        {/* Regels */}
        {rules.map((r, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.colDesc}>{r.desc}</Text>
            <Text style={styles.colAantal}>
              {r.aantal} {r.eenheid}
            </Text>
            <Text style={styles.colPrijs}>{formatEuro(r.prijs)}</Text>
            <Text style={styles.colTotaal}>{formatEuro(r.totaal)}</Text>
          </View>
        ))}

        {/* Totalen */}
        <View style={styles.totalsBlock}>
          <View style={[styles.totalRow, styles.totalRowMuted]}>
            <Text>Subtotaal</Text>
            <Text>{formatEuro(totals.subtotal)}</Text>
          </View>
          {totals.korstmosToeslag > 0 && (
            <View style={[styles.totalRow, styles.totalRowMuted]}>
              <Text>Korstmos-toeslag (10%)</Text>
              <Text>{formatEuro(totals.korstmosToeslag)}</Text>
            </View>
          )}
          {totals.kortingBedrag > 0 && (
            <View style={[styles.totalRow, styles.totalRowKorting]}>
              <Text>Korting ({totals.discount}%)</Text>
              <Text>– {formatEuro(totals.kortingBedrag)}</Text>
            </View>
          )}
          <View style={styles.totalRowExcl}>
            <Text>Excl. BTW</Text>
            <Text>{formatEuro(totals.total)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowMuted]}>
            <Text>BTW (21%)</Text>
            <Text>{formatEuro(totals.btw)}</Text>
          </View>
          <View style={styles.totalRowIncl}>
            <Text style={styles.totalRowInclLabel}>Totaal incl. BTW</Text>
            <Text style={styles.totalRowInclValue}>
              {formatEuro(totals.total + totals.btw)}
            </Text>
          </View>
        </View>

        {/* Footer (op elke pagina) */}
        <Text style={styles.footer} fixed>
          {bedrijfsnaam} · Offerte gegenereerd via Frontlix dashboard
        </Text>
      </Page>
    </Document>
  )
}
