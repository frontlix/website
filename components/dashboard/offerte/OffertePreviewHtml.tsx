'use client'

import { formatEuro } from '@/lib/dashboard/format'
import type {
  ManualOfferteData,
  RegelComputed,
  TotalsComputed,
  SubDienst,
  Hoofdcategorie,
} from '@/lib/dashboard/manual-offerte-types'
import { LOSSE_OPMERKINGEN, zichtbareOpmerking } from '@/lib/dashboard/manual-offerte-types'

/**
 * Responsive HTML-weergave van de offerte, één-op-één gemodelleerd naar
 * OffertePdf.tsx (zelfde cream-header, gouden accent-lijn, blauwe tabel-header,
 * donkerblauwe grand-row). Bewust HTML i.p.v. de PDF-in-een-iframe: iOS rendert
 * een ingebedde PDF op een vaste zoom (negeert #view=FitH), waardoor 'ie op de
 * telefoon ingezoomd/afgekapt staat. Deze HTML past zich vanzelf aan de
 * schermbreedte aan, zodat de hele offerte overzichtelijk in beeld komt. De
 * exacte PDF blijft via "Download PDF" beschikbaar.
 */

const C = {
  cream: '#FAFAF0',
  gold: '#F5C518',
  blueDark: '#002D63',
  blueAccent: '#003F8A',
  text: '#1A1A1A',
  textMuted: '#4B5563',
  textSubtle: '#6B7280',
  border: '#E5E7EB',
  rowAlt: '#FAFAFA',
  cardBg: '#F9FAFB',
  toelBg: '#FFFBEB',
  toelBorder: '#FDE68A',
  toelLabel: '#92400E',
  toelText: '#78350F',
  korting: '#15803D',
  white: '#FFFFFF',
}

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

const cardStyle: React.CSSProperties = {
  flex: '1 1 240px',
  minWidth: 0,
  background: C.cardBg,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: 14,
}
const metaLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1.2,
  color: C.blueAccent,
  marginBottom: 8,
  textTransform: 'uppercase',
}
const metaRowStyle: React.CSSProperties = {
  fontSize: 12.5,
  color: C.textMuted,
  lineHeight: 1.5,
  marginBottom: 2,
}
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.2,
  color: C.blueAccent,
  textTransform: 'uppercase',
  marginTop: 6,
  marginBottom: 8,
}
const numCell: React.CSSProperties = { textAlign: 'right', whiteSpace: 'nowrap' }
const totalRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '6px 10px',
  fontSize: 12.5,
}

export function OffertePreviewHtml({
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
  offerteNummer?: string
  bedrijfsnaam?: string
  geldigheidDagen?: number
  origin?: string
}) {
  const vandaag = new Date()
  const geldigTot = new Date(vandaag)
  geldigTot.setDate(geldigTot.getDate() + geldigheidDagen)

  const stamp =
    vandaag.getFullYear().toString() +
    String(vandaag.getMonth() + 1).padStart(2, '0') +
    String(vandaag.getDate()).padStart(2, '0') +
    '-' +
    String(vandaag.getHours()).padStart(2, '0') +
    String(vandaag.getMinutes()).padStart(2, '0')
  const nummer = offerteNummer ?? `OFF-${stamp}`

  const baseUrl = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const logoSrc = `${baseUrl}/assets/schoon-straatje/logo.png`
  const badgeSrc = `${baseUrl}/assets/schoon-straatje/top-30-vakbedrijven.png`
  const keurmerkSrc = `${baseUrl}/assets/schoon-straatje/keurmerk-vakman.png`
  const besteVakmanSrc = `${baseUrl}/assets/schoon-straatje/beste-vakman-buurt.png`

  const klantNaam = data.bedrijf?.trim() ? data.bedrijf : data.naam
  const klantContact = data.bedrijf?.trim() ? `T.a.v. ${data.naam}` : ''
  const adresLine1 = data.straat && data.huisnummer ? `${data.straat} ${data.huisnummer}` : ''
  const adresLine2 = data.postcode && data.plaats ? `${data.postcode} ${data.plaats}` : ''
  const heeftFactuur =
    !data.factuur_zelfde &&
    (data.factuur_postcode || data.factuur_huisnummer || data.factuur_straat || data.factuur_plaats)
  const factuurAdres1 = heeftFactuur
    ? `${data.factuur_straat || ''} ${data.factuur_huisnummer || ''}`.trim()
    : ''
  const factuurAdres2 = heeftFactuur
    ? `${data.factuur_postcode || ''} ${data.factuur_plaats || ''}`.trim()
    : ''

  const dienstLabel =
    data.hoofdcategorie.length === 0
      ? ''
      : data.hoofdcategorie.map((c) => CATEGORIE_LABEL[c] ?? c).join(' + ')
  const subLabels = data.sub.map((s) => SUB_LABEL[s] ?? s).join(', ')

  return (
    <div
      style={{
        fontFamily: 'Helvetica, Arial, sans-serif',
        color: C.text,
        background: C.white,
        lineHeight: 1.5,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: C.cream,
          padding: '20px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.blueDark, letterSpacing: 1, lineHeight: 1 }}>
            OFFERTE
          </div>
          <div style={{ fontSize: 11, color: C.textSubtle, marginTop: 6, letterSpacing: 0.5 }}>
            Nr. {nummer}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeSrc} alt="" style={{ height: 54, objectFit: 'contain' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={keurmerkSrc} alt="" style={{ height: 54, objectFit: 'contain' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" style={{ height: 44, objectFit: 'contain' }} />
        </div>
      </div>
      <div style={{ height: 4, background: C.gold }} />

      {/* Content */}
      <div style={{ padding: '18px 20px' }}>
        {/* Meta-grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
          <div style={cardStyle}>
            <div style={metaLabelStyle}>Offerte gegevens</div>
            <div style={metaRowStyle}>
              <strong style={{ color: C.text }}>Datum: </strong>
              {formatDateNL(vandaag)}
            </div>
            <div style={metaRowStyle}>
              <strong style={{ color: C.text }}>Geldig tot: </strong>
              {formatDateNL(geldigTot)}
            </div>
            <div style={metaRowStyle}>
              <strong style={{ color: C.text }}>Dienst: </strong>
              {dienstLabel}
            </div>
            {subLabels ? (
              <div style={metaRowStyle}>
                <strong style={{ color: C.text }}>Subdiensten: </strong>
                {subLabels}
              </div>
            ) : null}
            {data.m2 ? (
              <div style={metaRowStyle}>
                <strong style={{ color: C.text }}>Oppervlakte: </strong>
                {data.m2} m²
              </div>
            ) : null}
          </div>

          <div style={cardStyle}>
            <div style={metaLabelStyle}>Voor</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.blueDark, marginBottom: 4 }}>
              {klantNaam || '—'}
            </div>
            {klantContact ? <div style={metaRowStyle}>{klantContact}</div> : null}
            {adresLine1 ? <div style={metaRowStyle}>{adresLine1}</div> : null}
            {adresLine2 ? <div style={metaRowStyle}>{adresLine2}</div> : null}
            {heeftFactuur ? (
              <div style={{ marginTop: 6 }}>
                <div style={{ ...metaRowStyle, color: C.text, fontWeight: 700 }}>Factuuradres:</div>
                {factuurAdres1 ? <div style={metaRowStyle}>{factuurAdres1}</div> : null}
                {factuurAdres2 ? <div style={metaRowStyle}>{factuurAdres2}</div> : null}
              </div>
            ) : null}
            {data.email ? <div style={metaRowStyle}>{data.email}</div> : null}
            {data.telefoon ? <div style={metaRowStyle}>{data.telefoon}</div> : null}
          </div>
        </div>

        {/* Specificatie */}
        <div style={sectionTitleStyle}>Specificatie</div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              background: C.blueDark,
              color: C.white,
              padding: '9px 12px',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            <div style={{ flex: 5 }}>Omschrijving</div>
            <div style={{ flex: 1.5, ...numCell }}>Aantal</div>
            <div style={{ flex: 1.5, ...numCell }}>Stukprijs</div>
            <div style={{ flex: 1.8, ...numCell }}>Totaal</div>
          </div>
          {rules.length === 0 ? (
            <div style={{ padding: 12, textAlign: 'center', color: C.textSubtle, fontSize: 12.5 }}>
              Geen specificatie beschikbaar
            </div>
          ) : (
            rules.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  borderTop: i > 0 ? `1px solid ${C.border}` : 'none',
                  background: i % 2 === 1 ? C.rowAlt : C.white,
                }}
              >
                <div style={{ display: 'flex', gap: 6, fontSize: 12.5 }}>
                  <div style={{ flex: 5, color: C.text, minWidth: 0 }}>{r.desc}</div>
                  <div style={{ flex: 1.5, ...numCell }}>
                    {r.aantal} {r.eenheid}
                  </div>
                  <div style={{ flex: 1.5, ...numCell }}>{formatEuro(r.prijs)}</div>
                  <div style={{ flex: 1.8, ...numCell, fontWeight: 700, color: C.blueDark }}>
                    {formatEuro(r.totaal)}
                  </div>
                </div>
                {r.opmerking ? (
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>↳ {r.opmerking}</div>
                ) : null}
              </div>
            ))
          )}
          {LOSSE_OPMERKINGEN.map(({ key, label }) => {
            const t = zichtbareOpmerking(data.regel_opmerkingen, key)
            return t ? (
              <div
                key={key}
                style={{
                  padding: '8px 12px',
                  borderTop: `1px solid ${C.border}`,
                  fontSize: 11,
                  color: C.textMuted,
                }}
              >
                ↳ {label}: {t}
              </div>
            ) : null
          })}
        </div>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <div style={{ width: '100%', maxWidth: 340 }}>
            <div style={totalRowStyle}>
              <span style={{ color: C.textMuted }}>Subtotaal diensten</span>
              <span style={numCell}>{formatEuro(totals.subtotal)}</span>
            </div>
            {totals.korstmosToeslag > 0 && (
              <div style={totalRowStyle}>
                <span style={{ color: C.textMuted }}>Korstmos-toeslag (10%)</span>
                <span style={numCell}>{formatEuro(totals.korstmosToeslag)}</span>
              </div>
            )}
            {totals.kortingBedrag > 0 && (
              <div style={totalRowStyle}>
                <span style={{ color: C.korting, fontWeight: 700 }}>
                  Actiekorting ({formatPct(totals.discount)}%)
                  {data.korting_omschrijving?.trim() ? `, ${data.korting_omschrijving.trim()}` : ''}
                </span>
                <span style={{ ...numCell, color: C.korting, fontWeight: 700 }}>
                  {formatEuro(totals.kortingBedrag)}
                </span>
              </div>
            )}
            <div
              style={{
                ...totalRowStyle,
                borderTop: `1px solid ${C.border}`,
                padding: '8px 10px',
                fontWeight: 700,
                color: C.text,
              }}
            >
              <span>Totaal excl. BTW</span>
              <span style={numCell}>{formatEuro(totals.total)}</span>
            </div>
            <div style={totalRowStyle}>
              <span style={{ color: C.textMuted }}>BTW (21%)</span>
              <span style={numCell}>{formatEuro(totals.btw)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                background: C.blueDark,
                color: C.white,
                padding: '12px 14px',
                borderRadius: 6,
                marginTop: 6,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <span>Totaal incl. BTW</span>
              <span style={numCell}>{formatEuro(totals.total + totals.btw)}</span>
            </div>
          </div>
        </div>

        {/* Toelichting */}
        {data.notitie?.trim() ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              background: C.toelBg,
              border: `1px solid ${C.toelBorder}`,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1.2,
                color: C.toelLabel,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Toelichting
            </div>
            <div style={{ fontSize: 12.5, color: C.toelText }}>{data.notitie}</div>
          </div>
        ) : null}
      </div>

      {/* Voorwaarden */}
      <div style={{ padding: '16px 20px', fontSize: 11, color: C.textSubtle, lineHeight: 1.55 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.2,
            color: C.blueAccent,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Voorwaarden
        </div>
        Deze offerte is geldig tot {formatDateNL(geldigTot)}. Alle bedragen zijn in euro&apos;s. BTW-tarief
        21% is van toepassing op alle posten.
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '14px 20px',
          background: C.cardBg,
          borderTop: `3px solid ${C.gold}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 10, color: C.textSubtle, lineHeight: 1.6 }}>
          <strong style={{ color: C.blueDark }}>{bedrijfsnaam}</strong>
          {'  |  '}KvK 62612018{'  |  '}BTW NL001708304B31{'  |  '}welkom@schoon-straatje.nl
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={besteVakmanSrc} alt="" style={{ height: 40, objectFit: 'contain' }} />
      </div>
    </div>
  )
}
