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
  OPMERKING_KEYS,
  type ManualOfferteData,
  type OpmerkingKey,
  type RegelOpmerking,
} from './manual-offerte-types'
import {
  mapBotSubDiensten,
  mapBotHoofdcategorie,
  dashboardHoofdcategorieToDb,
  dashboardSubDienstenToDb,
} from './bot-dienst-mapping'
import type { Lead } from './database.types'

/** Trim, en geef null terug bij lege string. Identiek aan de helper in
 *  manual-offerte-actions.ts (bewust gedupliceerd om de mapping zelf-
 *  dragend te houden). */
function trimOrNull(v: string): string | null {
  const t = v.trim()
  return t.length > 0 ? t : null
}

/** Per-offerte eenheidsprijs-override-velden (ManualOfferteData) die als JSON op
 *  leads.offerte_prijs_overrides bewaard worden. Voegzand/planten-prijzen hebben
 *  hun eigen kolommen en horen hier dus niet bij. */
const PRIJS_OVERRIDE_KEYS = [
  'reinigen_dagprijs_override',
  'reiniging_per_m2_override',
  'arbeid_invegen_normaal_override',
  'arbeid_invegen_onkruidwerend_override',
  'beschermlaag_override',
  'preventieve_onkruid_override',
  'onderhoud_per_m2_override',
  'reiskosten_per_km_override',
] as const

/** Form-data → JSON voor leads.offerte_prijs_overrides (alleen gezette, eindige
 *  waarden; null als er geen enkele override is, zodat de kolom leeg blijft). */
function writePrijsOverrides(data: ManualOfferteData): Record<string, number> | null {
  const out: Record<string, number> = {}
  for (const k of PRIJS_OVERRIDE_KEYS) {
    const v = data[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return Object.keys(out).length > 0 ? out : null
}

/** Schrijf de per-regel overrides OOK naar de losse lead-kolommen die de bot
 *  (calculatePrice) leest. De bot leest deze kolommen, NIET de
 *  offerte_prijs_overrides-JSON. Zonder deze write gaat een aangepaste
 *  regelprijs verloren bij het versturen. Altijd alle kolommen schrijven (null
 *  als de override weg is), zodat een teruggezette prijs de oude waarde wist. */
function writePrijsOverrideColumns(data: ManualOfferteData): Record<string, number | null> {
  const val = (v: number | undefined): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null
  // onkruid_per_m2_override wordt door de bot in twee contexten gelezen
  // (onderhoud-basisdienst en preventieve sub-dienst). Per lead is normaal maar
  // een van beide actief; onderhoud heeft voorrang als beide gezet zijn.
  const onkruid = data.onderhoud_per_m2_override ?? data.preventieve_onkruid_override
  return {
    reinigen_dagprijs_onder_100m2_override: val(data.reinigen_dagprijs_override),
    reinigen_per_m2_override: val(data.reiniging_per_m2_override),
    invegen_arbeid_normaal_per_m2_override: val(data.arbeid_invegen_normaal_override),
    invegen_arbeid_onkruidwerend_per_m2_override: val(data.arbeid_invegen_onkruidwerend_override),
    beschermlaag_per_m2_override: val(data.beschermlaag_override),
    reiskosten_per_km_override: val(data.reiskosten_per_km_override),
    onkruid_per_m2_override: val(onkruid),
  }
}

/** leads.offerte_prijs_overrides (JSON) → de *_override-velden voor de form-data
 *  (alleen bekende keys + eindige getallen), zodat een aangepaste prijs na
 *  heropenen blijft staan. */
function readPrijsOverrides(json: unknown): Partial<ManualOfferteData> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {}
  const src = json as Record<string, unknown>
  const out: Partial<ManualOfferteData> = {}
  for (const k of PRIJS_OVERRIDE_KEYS) {
    const v = src[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out
}

/** Form-data → JSON voor leads.offerte_regel_opmerkingen. Slaat alleen
 *  onderdelen met een niet-lege tekst op (ook als zichtbaar=false, zodat een
 *  uitgeschakelde opmerking na heropenen onthouden blijft). null als er geen
 *  enkele opmerking is, zodat de kolom leeg blijft. */
function writeRegelOpmerkingen(
  data: ManualOfferteData,
): Record<string, RegelOpmerking> | null {
  const src = data.regel_opmerkingen
  if (!src) return null
  const out: Record<string, RegelOpmerking> = {}
  for (const k of OPMERKING_KEYS) {
    const o = src[k]
    const tekst = o?.tekst?.trim()
    if (tekst) out[k] = { tekst, zichtbaar: o!.zichtbaar !== false }
  }
  return Object.keys(out).length > 0 ? out : null
}

/** leads.offerte_regel_opmerkingen (JSON) → de regel_opmerkingen-map voor de
 *  form-data (alleen bekende keys + niet-lege tekst), zodat opmerkingen +
 *  schakelaar-stand na heropenen blijven staan. */
export function readRegelOpmerkingen(
  json: unknown,
): Partial<Record<OpmerkingKey, RegelOpmerking>> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {}
  const src = json as Record<string, unknown>
  const out: Partial<Record<OpmerkingKey, RegelOpmerking>> = {}
  for (const k of OPMERKING_KEYS) {
    const v = src[k]
    if (!v || typeof v !== 'object') continue
    const rec = v as Record<string, unknown>
    const tekst = typeof rec.tekst === 'string' ? rec.tekst : ''
    if (!tekst.trim()) continue
    out[k] = { tekst, zichtbaar: rec.zichtbaar !== false }
  }
  return out
}

/**
 * Init het formulier vanuit een bestaande Lead. Inverse van de leadFields-
 * mapping: start vanaf DEFAULTS en override met wat de lead aanlevert. Geen
 * string-parsing — adres-velden staan al opgesplitst in losse kolommen.
 */
/**
 * Voegzand-verdeling (m² + aantal zakken per type) voor een lead. Dit is de
 * dashboard-spiegel van de bot-functie `getVoegzandSplit` (pricing.ts) en MOET
 * daarmee 1-op-1 in sync blijven, zodat het dashboard exact toont wat de klant
 * in de mail ontvangt. Regels:
 *  - m²: NULL = afgeleid (één type → totale m², beide → helft); een numerieke
 *    waarde (incl 0) is expliciet en wint.
 *  - zakken: expliciet ingevuld (>0, owner-modify/wizard) wint; anders legacy
 *    `voegzand_zakken` (>0); anders afgeleid uit m² ÷ dekking
 *    (`voegzand_m2_per_zak`, default 5) via ceil.
 */
export function deriveVoegzandSplit(
  lead: {
    voegzand_type?: string | null
    m2?: number | string | null
    voegzand_zakken?: number | string | null
    voegzand_normaal_m2?: number | string | null
    voegzand_normaal_zakken?: number | string | null
    voegzand_onkruidwerend_m2?: number | string | null
    voegzand_onkruidwerend_zakken?: number | string | null
  },
  voegzandM2PerZak: number = 5,
): {
  normaalM2: number
  normaalZakken: number
  onkruidwerendM2: number
  onkruidwerendZakken: number
} {
  const vt = lead.voegzand_type
  const normaalActief = vt === 'normaal' || vt === 'beide'
  const onkruidwerendActief = vt === 'onkruidwerend' || vt === 'beide'
  const beide = normaalActief && onkruidwerendActief
  const m2PerZak = voegzandM2PerZak > 0 ? voegzandM2PerZak : 5
  const totaalM2 = Number(lead.m2) || 0
  const legacyZakken = Number(lead.voegzand_zakken) || 0

  const normaalM2 =
    lead.voegzand_normaal_m2 != null
      ? Number(lead.voegzand_normaal_m2)
      : normaalActief
        ? beide
          ? totaalM2 / 2
          : totaalM2
        : 0
  const onkruidwerendM2 =
    lead.voegzand_onkruidwerend_m2 != null
      ? Number(lead.voegzand_onkruidwerend_m2)
      : onkruidwerendActief
        ? beide
          ? totaalM2 / 2
          : totaalM2
        : 0

  const normaalZakken = !normaalActief
    ? 0
    : (Number(lead.voegzand_normaal_zakken) || 0) > 0
      ? Number(lead.voegzand_normaal_zakken)
      : legacyZakken > 0
        ? beide
          ? Math.ceil(legacyZakken / 2)
          : legacyZakken
        : normaalM2 > 0
          ? Math.ceil(normaalM2 / m2PerZak)
          : 0
  const onkruidwerendZakken = !onkruidwerendActief
    ? 0
    : (Number(lead.voegzand_onkruidwerend_zakken) || 0) > 0
      ? Number(lead.voegzand_onkruidwerend_zakken)
      : legacyZakken > 0
        ? beide
          ? Math.floor(legacyZakken / 2)
          : legacyZakken
        : onkruidwerendM2 > 0
          ? Math.ceil(onkruidwerendM2 / m2PerZak)
          : 0

  return { normaalM2, normaalZakken, onkruidwerendM2, onkruidwerendZakken }
}

export function mapLeadToFormData(
  lead: Lead,
  voegzandM2PerZak: number = 5,
): ManualOfferteData {
  // ── hoofdcategorie + sub_diensten: vertaal de bot-keys naar de dashboard-
  // vorm (plan_X_weken → 'onderhoud' + interval, onkruidbeheersing_zakelijk →
  // 'onkruidbeheersing'). Zonder deze vertaling viel de onkruid-dienst weg en
  // toonde de editor EUR 0 diensten. Gedeeld met de auto-prijsregels-mapper.
  const hoofdcategorie = mapBotHoofdcategorie(lead.hoofdcategorie)
  const { sub, onderhoudWeken } = mapBotSubDiensten(lead.sub_diensten, lead.hoofdcategorie)

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

  // Voegzand-split: leidt m² + zakken af zoals de bot, zodat de invegen-arbeid
  // EN de voegzand-zakken consistent met de mail verschijnen.
  const vz = deriveVoegzandSplit(lead, voegzandM2PerZak)

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
    onderhoud_weken: onderhoudWeken ?? DEFAULTS.onderhoud_weken,
    m2: Number(lead.m2) || DEFAULTS.m2,
    // voegzand
    voegzand_normaal_actief: voegzandNormaalActief,
    voegzand_normaal_m2: vz.normaalM2,
    voegzand_normaal_zakken: vz.normaalZakken,
    voegzand_normaal_prijs:
      Number(lead.voegzand_normaal_prijs_per_zak) ||
      DEFAULTS.voegzand_normaal_prijs,
    voegzand_onkruidwerend_actief: voegzandOnkruidwerendActief,
    voegzand_onkruidwerend_m2: vz.onkruidwerendM2,
    voegzand_onkruidwerend_zakken: vz.onkruidwerendZakken,
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
    korting_bedrag: Number(lead.korting_bedrag) || 0,
    korting_omschrijving: lead.korting_omschrijving ?? '',
    // Per-offerte prijs-overrides terug op de form-data (blijven staan na heropenen).
    ...readPrijsOverrides(lead.offerte_prijs_overrides),
    // Per-onderdeel opmerkingen terug op de form-data (tekst + schakelaar-stand).
    regel_opmerkingen: readRegelOpmerkingen(lead.offerte_regel_opmerkingen),
    // notitie/kanaal blijven op DEFAULTS (geen lead-kolom).
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
    // leads.hoofdcategorie + sub_diensten: serialiseer terug naar de bot-
    // waarden (onkruidbeheersing → onkruidbeheersing_zakelijk, 'onderhoud' →
    // plan_X_weken) zodat een dashboard-save het interval + de categorie
    // behoudt en de bot de lead nog steeds als onkruidbeheersing herkent.
    hoofdcategorie: dashboardHoofdcategorieToDb(data.hoofdcategorie),
    sub_diensten: dashboardSubDienstenToDb(data.sub, data.onderhoud_weken),
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
    korting_bedrag: Number(data.korting_bedrag) || 0,
    korting_omschrijving: trimOrNull(data.korting_omschrijving),
    offerte_prijs_overrides: writePrijsOverrides(data),
    ...writePrijsOverrideColumns(data),
    offerte_regel_opmerkingen: writeRegelOpmerkingen(data),
  }
}
