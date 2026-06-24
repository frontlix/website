//
// Zet lead/offerte-data om naar het model voor de OPDRACHTBON-PDF: een offerte
// zonder prijzen die de eigenaar uitprint voor zijn collega's. Pure functie,
// geen next/headers of supabase: veilig vanuit de server-mappers en de client.
//
// Werkzaamheden komen bij voorkeur uit de laatst verstuurde offerte (de
// bevroren regels), anders uit de werkvelden van de lead. Klantgegevens,
// werkadres en planning komen altijd van de lead. Geen enkel prijsveld zit in
// dit model.
//
// Streep-vrij conform huisstijl (komma i.p.v. liggend streepje).
//

import { DIENST_LABELS, type SubDienst } from '@/lib/dashboard/manual-offerte-types'

export type OpdrachtbonRegel = {
  omschrijving: string
  /** Bijv. "145 m²"; leeg als er geen zinvol aantal/eenheid is. */
  aantal: string
}

export type OpdrachtbonModel = {
  bonnummer: string
  bedrijfsnaam: string
  klantNaam: string
  bedrijf: string | null
  /** Werkadres-regels (alleen ingevulde delen). */
  werkadres: string[]
  telefoon: string | null
  /** Geplande uitvoering in nl-NL; null ⇒ de PDF toont "Nog in te plannen". */
  afspraak: string | null
  werkzaamheden: OpdrachtbonRegel[]
  /** Materiaal-detail (voegzand, groene aanslag), alleen indien aanwezig. */
  detailregels: { label: string; waarde: string }[]
}

/** Eén verstuurde offerteregel, prijs-loos doorgegeven (uit RegelComputed). */
type SentRule = { desc: string; aantal: number; eenheid: string }

export type BuildOpdrachtbonInput = {
  leadId: string
  klantNaam: string | null
  bedrijf: string | null
  straat: string | null
  huisnummer: string | null
  postcode: string | null
  plaats: string | null
  telefoon: string | null
  afspraakDatum: string | null
  afspraakStarttijd: string | null
  /** Offertenummer van de laatst verstuurde offerte (voor het bonnummer). */
  sentOfferteNummer: string | null
  /** Regels van de laatst verstuurde offerte; null ⇒ val terug op de lead. */
  sentRules: SentRule[] | null
  hoofdcategorie: string | null
  subDiensten: string[] | null
  m2: number | null
  voegzandType: string | null
  zandKleur: string | null
  groeneAanslag: string | null
  /** Default 'Schoon Straatje'. */
  bedrijfsnaam?: string
}

const MAAND = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]
const WEEKDAG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

/** "voegzand_type" -> "Voegzand Type"; null/leeg -> "". */
function humanize(key: string | null | undefined): string {
  if (!key) return ''
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Hoofdcategorie -> leesbaar label (humanized, geen liggende streepjes). */
function humanizeHoofd(key: string | null | undefined): string {
  if (!key) return ''
  const parts = key.split('_')
  return parts.map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p)).join(' / ')
}

/** Sub-dienst -> leesbaar label (hergebruikt DIENST_LABELS, fallback humanize). */
function dienstLabel(key: string): string {
  return DIENST_LABELS[key as SubDienst] ?? humanize(key)
}

/** 'YYYY-MM-DD' (+ optioneel 'HH:MM[:SS]') -> "woensdag 1 juli 2026, 09:00". */
function formatAfspraak(datum: string | null, starttijd: string | null): string | null {
  if (!datum) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(datum)
  if (!m) return null
  const jaar = Number(m[1])
  const maandIdx = Number(m[2]) - 1
  const dag = Number(m[3])
  if (maandIdx < 0 || maandIdx > 11) return null
  // UTC gebruiken zodat de weekdag niet door een tijdzone verschuift.
  const weekdagIdx = new Date(Date.UTC(jaar, maandIdx, dag)).getUTCDay()
  let out = `${WEEKDAG[weekdagIdx]} ${dag} ${MAAND[maandIdx]} ${jaar}`
  const tijd = (starttijd ?? '').trim().slice(0, 5)
  if (/^\d{2}:\d{2}$/.test(tijd)) out += `, ${tijd}`
  return out
}

/** Werkzaamheden uit de lead-velden (fallback zonder verstuurde offerte). */
function werkzaamhedenUitLead(input: BuildOpdrachtbonInput): OpdrachtbonRegel[] {
  const rows: OpdrachtbonRegel[] = []
  if (input.hoofdcategorie) {
    rows.push({
      omschrijving: humanizeHoofd(input.hoofdcategorie),
      aantal: input.m2 != null && input.m2 > 0 ? `${input.m2} m²` : '',
    })
  }
  for (const sub of (input.subDiensten ?? []).filter(Boolean)) {
    rows.push({ omschrijving: dienstLabel(sub), aantal: '' })
  }
  return rows
}

export function buildOpdrachtbonModel(input: BuildOpdrachtbonInput): OpdrachtbonModel {
  const bonnummer = input.sentOfferteNummer?.trim()
    ? `OB-${input.sentOfferteNummer.trim()}`
    : `OB-${input.leadId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'LEAD'}`

  const adresLine1 = [input.straat, input.huisnummer].filter(Boolean).join(' ')
  const adresLine2 = [input.postcode, input.plaats].filter(Boolean).join(' ')
  const werkadres = [adresLine1, adresLine2].filter((s) => s.length > 0)

  const werkzaamheden: OpdrachtbonRegel[] =
    input.sentRules && input.sentRules.length > 0
      ? input.sentRules.map((r) => ({
          omschrijving: r.desc,
          aantal: r.aantal > 0 && r.eenheid ? `${r.aantal} ${r.eenheid}` : '',
        }))
      : werkzaamhedenUitLead(input)

  const detailregels: { label: string; waarde: string }[] = []
  const voegzand = [humanize(input.voegzandType), humanize(input.zandKleur)]
    .filter(Boolean)
    .join(' · ')
  if (voegzand) detailregels.push({ label: 'Voegzand', waarde: voegzand })
  if (input.groeneAanslag) {
    detailregels.push({ label: 'Groene aanslag', waarde: humanize(input.groeneAanslag) })
  }

  return {
    bonnummer,
    bedrijfsnaam: input.bedrijfsnaam ?? 'Schoon Straatje',
    klantNaam: input.klantNaam?.trim() || 'Onbekend',
    bedrijf: input.bedrijf?.trim() || null,
    werkadres,
    telefoon: input.telefoon?.trim() || null,
    afspraak: formatAfspraak(input.afspraakDatum, input.afspraakStarttijd),
    werkzaamheden,
    detailregels,
  }
}
