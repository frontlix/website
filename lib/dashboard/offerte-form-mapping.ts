/**
 * Gedeelde, pure mapping-module tussen een Lead en de ManualOfferteData
 * vorm die het offerte-formulier gebruikt. GEEN 'use server'/'use client':
 * beide kanten (server-action én client-form) importeren hieruit.
 *
 *  - mapLeadToFormData()       → Lead  → ManualOfferteData  (init formulier)
 *  - buildLeadFieldsFromForm() → form  → leads-update-payload (persist)
 *
 * buildLeadFieldsFromForm is de byte-voor-byte uitgelichte `leadFields`-
 * mapping uit manual-offerte-actions.ts, zodat de handmatige-wizard én het
 * nieuwe formulier exact dezelfde lead-kolommen schrijven.
 */

import {
  DEFAULTS,
  type ManualOfferteData,
  type Hoofdcategorie,
  type SubDienst,
} from './manual-offerte-types'
import type { Lead } from './database.types'

/** Trim, en geef null terug bij lege string. Identiek aan de helper in
 *  manual-offerte-actions.ts (bewust gedupliceerd om de mapping zelf-
 *  dragend te houden). */
function trimOrNull(v: string): string | null {
  const t = v.trim()
  return t.length > 0 ? t : null
}

const VALID_HOOFDCATEGORIE: ReadonlySet<Hoofdcategorie> = new Set([
  'oprit_terras_terrein',
  'onkruidbeheersing',
])

const VALID_SUB: ReadonlySet<SubDienst> = new Set([
  'invegen',
  'preventieve_onkruid',
  'beschermlaag',
  'onderhoud',
])

/**
 * Init het formulier vanuit een bestaande Lead. Inverse van de leadFields-
 * mapping: start vanaf DEFAULTS en override met wat de lead aanlevert. Geen
 * string-parsing — adres-velden staan al opgesplitst in losse kolommen.
 */
export function mapLeadToFormData(lead: Lead): ManualOfferteData {
  // ── hoofdcategorie: single string-kolom → array ──────────────────
  let hoofdcategorie: Hoofdcategorie[]
  if (lead.hoofdcategorie === 'beide') {
    hoofdcategorie = ['oprit_terras_terrein', 'onkruidbeheersing']
  } else if (
    lead.hoofdcategorie &&
    VALID_HOOFDCATEGORIE.has(lead.hoofdcategorie as Hoofdcategorie)
  ) {
    hoofdcategorie = [lead.hoofdcategorie as Hoofdcategorie]
  } else {
    hoofdcategorie = []
  }

  // ── sub_diensten: filter op geldige SubDienst-waarden ────────────
  // 'onderhoud' bewust behouden ook al toont de form-UI 'm misschien niet.
  const sub: SubDienst[] = (lead.sub_diensten ?? []).filter(
    (s): s is SubDienst => VALID_SUB.has(s as SubDienst),
  )

  // ── voegzand_type stuurt de actief-flags ─────────────────────────
  const vt = lead.voegzand_type
  const voegzandNormaalActief = vt === 'normaal' || vt === 'beide'
  const voegzandOnkruidwerendActief = vt === 'onkruidwerend' || vt === 'beide'

  // ── factuur: zelfde-vlag uit aan/afwezigheid van factuur_postcode ─
  const factuurZelfde = !(lead.factuur_postcode && lead.factuur_postcode.trim())

  const straat = lead.straat ?? ''
  const huisnummer = lead.huisnummer ?? ''
  const postcode = lead.postcode ?? ''
  const plaats = lead.plaats ?? ''

  return {
    ...DEFAULTS,
    existing_lead_id: lead.lead_id,
    // klant
    naam: lead.naam ?? '',
    bedrijf: lead.bedrijfsnaam ?? '',
    telefoon: lead.telefoon ?? '',
    email: lead.email ?? '',
    straat,
    huisnummer,
    postcode,
    plaats,
    // factuur — bij "zelfde" tonen we de werk-adres-waarden zodat de UI
    // iets zinnigs laat zien; anders de echte factuur-kolommen.
    factuur_zelfde: factuurZelfde,
    factuur_straat: factuurZelfde ? straat : lead.factuur_straat ?? '',
    factuur_huisnummer: factuurZelfde
      ? huisnummer
      : lead.factuur_huisnummer ?? '',
    factuur_postcode: factuurZelfde ? postcode : lead.factuur_postcode ?? '',
    factuur_plaats: factuurZelfde ? plaats : lead.factuur_plaats ?? '',
    // werk
    hoofdcategorie,
    sub,
    m2: Number(lead.m2) || DEFAULTS.m2,
    // voegzand
    voegzand_normaal_actief: voegzandNormaalActief,
    voegzand_normaal_m2: Number(lead.voegzand_normaal_m2) || 0,
    voegzand_normaal_zakken:
      Number(lead.voegzand_normaal_zakken) || DEFAULTS.voegzand_normaal_zakken,
    voegzand_normaal_prijs:
      Number(lead.voegzand_normaal_prijs_per_zak) ||
      DEFAULTS.voegzand_normaal_prijs,
    voegzand_onkruidwerend_actief: voegzandOnkruidwerendActief,
    voegzand_onkruidwerend_m2: Number(lead.voegzand_onkruidwerend_m2) || 0,
    voegzand_onkruidwerend_zakken:
      Number(lead.voegzand_onkruidwerend_zakken) ||
      DEFAULTS.voegzand_onkruidwerend_zakken,
    voegzand_onkruidwerend_prijs:
      Number(lead.voegzand_onkruidwerend_prijs_per_zak) ||
      DEFAULTS.voegzand_onkruidwerend_prijs,
    // kleur
    kleur_naturel: lead.zand_kleur_naturel === true,
    kleur_antraciet: lead.zand_kleur_antraciet === true,
    // overige
    groene_aanslag: lead.groene_aanslag === 'ja' ? 'ja' : 'nee',
    korstmos: lead.korstmos === 'ja' ? 'ja' : 'nee',
    afstand_km: Number(lead.afstand_km) || 0,
    // plantenafscherming
    planten_afschermen_actief: lead.planten_afschermen === 'ja',
    // offerte
    extra_arbeid_minuten: Number(lead.extra_arbeid_minuten) || 0,
    // DEFAULTS zet 0, maar de form wil 1 als zinnige default.
    extra_arbeid_personen: Number(lead.extra_arbeid_personen) || 1,
    extra_arbeid_omschrijving: lead.extra_arbeid_omschrijving ?? '',
    korting_percentage: Number(lead.korting_percentage) || 0,
    korting_omschrijving: lead.korting_omschrijving ?? '',
    // notitie/kanaal/onderhoud_weken blijven op DEFAULTS (geen lead-kolom).
  }
}

/**
 * Bouwt de leads-update-payload uit de formulier-data. Dit is de exacte
 * `leadFields`-mapping zoals 'ie in createManualLeadEnOfferte zat, MINUS de
 * twee verzend-velden (offerte_verstuurd / offerte_verstuurd_op — die voegt
 * de caller toe wanneer nodig), en met de meegegeven `totaalIncl` voor
 * leads.totaal_prijs.
 */
export function buildLeadFieldsFromForm(
  data: ManualOfferteData,
  leadId: string,
  totaalIncl: number,
): Record<string, unknown> {
  // ── Kleur voegzand: zowel de string (legacy + bot) als de losse
  // booleans (nieuwere queries). Bij geen kleur = beide false + string null.
  const kleuren: string[] = []
  if (data.kleur_naturel) kleuren.push('naturel')
  if (data.kleur_antraciet) kleuren.push('antraciet')
  const zandKleur = kleuren.length > 0 ? kleuren.join('+') : null

  // Voegzand-type voor de leads.voegzand_type kolom: 'normaal',
  // 'onkruidwerend', of 'beide'. Null als geen van beide actief.
  const voegzandTypes: string[] = []
  if (data.voegzand_normaal_actief) voegzandTypes.push('normaal')
  if (data.voegzand_onkruidwerend_actief) voegzandTypes.push('onkruidwerend')
  const voegzandType =
    voegzandTypes.length === 0
      ? null
      : voegzandTypes.length === 1
        ? voegzandTypes[0]
        : 'beide'

  // m² per sub-dienst, bot/PDF gebruiken deze voor regel-uitsplitsing.
  // Alleen vullen als die sub_dienst gekozen is.
  const m2Num = Number(data.m2) || 0
  const invegenM2 = data.sub.includes('invegen') ? m2Num : null
  const beschermlaagM2 = data.sub.includes('beschermlaag') ? m2Num : null

  // m² per voegzand-type, de user kiest dit nu expliciet in StepWerk.
  // Hier alleen sanitizen (Number + null voor niet-actieve types) en als
  // safety-net terugvallen op totale m² als alleen 1 type actief is maar
  // het m²-veld 0 staat (oude drafts vóór de m²-input bestond).
  const normaalM2Raw = Number(data.voegzand_normaal_m2 || 0)
  const onkruidwerendM2Raw = Number(data.voegzand_onkruidwerend_m2 || 0)
  let voegzandNormaalM2: number | null = null
  let voegzandOnkruidwerendM2: number | null = null
  if (data.voegzand_normaal_actief) {
    voegzandNormaalM2 = normaalM2Raw > 0
      ? normaalM2Raw
      : data.voegzand_onkruidwerend_actief ? 0 : m2Num
  }
  if (data.voegzand_onkruidwerend_actief) {
    voegzandOnkruidwerendM2 = onkruidwerendM2Raw > 0
      ? onkruidwerendM2Raw
      : data.voegzand_normaal_actief ? 0 : m2Num
  }

  return {
    naam: data.naam.trim(),
    bedrijfsnaam: trimOrNull(data.bedrijf),
    email: data.email.trim() || `${leadId}@handmatig.frontlix.nl`,
    telefoon: data.telefoon.trim(),
    postcode: data.postcode.trim(),
    huisnummer: data.huisnummer.trim(),
    straat: trimOrNull(data.straat),
    plaats: trimOrNull(data.plaats),
    // ── Factuur-adres: null als gelijk aan werk-adres, anders gevuld.
    // Bij UPDATE belangrijk dat we 'm expliciet null zetten als de
    // user 'm later weer naar "gelijk" vinkt.
    factuur_postcode: data.factuur_zelfde ? null : trimOrNull(data.factuur_postcode),
    factuur_huisnummer: data.factuur_zelfde ? null : trimOrNull(data.factuur_huisnummer),
    factuur_straat: data.factuur_zelfde ? null : trimOrNull(data.factuur_straat),
    factuur_plaats: data.factuur_zelfde ? null : trimOrNull(data.factuur_plaats),
    // leads.hoofdcategorie is een single string-kolom; serialiseer
    // de array: 0 keuzes → fallback 'oprit_terras_terrein' (validatie
    // zou dit moeten voorkomen maar veilig is veilig), 1 keuze → die
    // waarde, 2 keuzes → 'beide' (mirror van voegzand_type pattern).
    hoofdcategorie:
      data.hoofdcategorie.length === 0
        ? 'oprit_terras_terrein'
        : data.hoofdcategorie.length === 1
          ? data.hoofdcategorie[0]
          : 'beide',
    sub_diensten: data.sub,
    m2: m2Num || null,
    invegen_m2: invegenM2,
    beschermlaag_m2: beschermlaagM2,
    // ── Voegzand: legacy totaal + per-type zakken/prijs/m².
    zand_kleur: zandKleur,
    zand_kleur_naturel: data.kleur_naturel,
    zand_kleur_antraciet: data.kleur_antraciet,
    voegzand_type: voegzandType,
    voegzand_zakken:
      Number(data.voegzand_normaal_zakken || 0) +
      Number(data.voegzand_onkruidwerend_zakken || 0),
    voegzand_normaal_zakken: data.voegzand_normaal_actief ? Number(data.voegzand_normaal_zakken || 0) : null,
    voegzand_normaal_prijs_per_zak: data.voegzand_normaal_actief ? Number(data.voegzand_normaal_prijs || 0) || null : null,
    voegzand_normaal_m2: voegzandNormaalM2,
    voegzand_onkruidwerend_zakken: data.voegzand_onkruidwerend_actief ? Number(data.voegzand_onkruidwerend_zakken || 0) : null,
    voegzand_onkruidwerend_prijs_per_zak: data.voegzand_onkruidwerend_actief ? Number(data.voegzand_onkruidwerend_prijs || 0) || null : null,
    voegzand_onkruidwerend_m2: voegzandOnkruidwerendM2,
    planten_afschermen: data.planten_afschermen_actief ? 'ja' : 'nee',
    groene_aanslag: data.groene_aanslag,
    korstmos: data.korstmos,
    afstand_km: Number(data.afstand_km) || null,
    totaal_prijs: totaalIncl,
    extra_arbeid_minuten: Number(data.extra_arbeid_minuten) || 0,
    extra_arbeid_personen: Number(data.extra_arbeid_personen) || 0,
    extra_arbeid_omschrijving: trimOrNull(data.extra_arbeid_omschrijving),
    korting_percentage: Number(data.korting_percentage) || 0,
    korting_omschrijving: trimOrNull(data.korting_omschrijving),
  }
}
