/**
 * Types voor de branche-driven demo workflow.
 *
 * Elk fictief demo-bedrijf (zonnepanelen / dakdekker / schoonmaak) heeft
 * een eigen BrancheConfig met fields, prijsformule en company info.
 * Branche-specifieke antwoorden van de klant worden opgeslagen als JSON
 * in demo_leads.answers — geen aparte kolommen per branche.
 */

export type BrancheId = 'zonnepanelen' | 'dakdekker' | 'schoonmaak'

export type FieldType = 'text' | 'email' | 'number' | 'enum'

export interface BrancheField {
  /** Sleutel waaronder het antwoord in answers JSON wordt opgeslagen */
  key: string
  /** Korte technische naam voor in de extractor-prompt */
  label: string
  /** Voorbeeld van een vraag — de reply-LLM mag varieren maar moet hetzelfde veld targeten */
  exampleQuestion: string
  type: FieldType
  /** Alleen bij type='enum' — toegestane waarden (kleine letters) */
  enumValues?: readonly string[]
  /** Optionele eenheid voor de extractor (bv. 'm²', 'kWh') */
  unit?: string
  /** Voorbeelden van geldige antwoorden — helpt de extractor */
  hints?: readonly string[]
}

export interface PriceLine {
  omschrijving: string
  aantal: number
  eenheid: string
  prijsPerEenheid: number
  totaal: number
}

export interface PricingResult {
  lines: PriceLine[]
  subtotaalExclBtw: number
  btwBedrag: number
  totaalInclBtw: number
}

export interface CompanyInfo {
  name: string
  /** Multi-line straat + postcode/plaats + land */
  addressLines: readonly string[]
  phone: string
  email: string
  website: string
  kvk: string
  btw: string
  iban: string
  contactPerson: string
}

export interface BrancheConfig {
  id: BrancheId
  /** Mens-leesbare label voor in WhatsApp / UI */
  label: string
  /** Naam van de fictieve agent die de bot speelt */
  agentName: string
  /** 1-2 zinnen persoonlijkheid voor de reply-LLM */
  personality: string
  company: CompanyInfo
  /** Korte intro-paragraaf op de PDF, vlak voor "Ons aanbod" */
  introOfferte: string
  /** Beschrijving onder "Ons aanbod" op de PDF */
  aanbodBeschrijving: string
  /** Volgorde van vragen — de reply-LLM vraagt het eerstvolgende ontbrekende veld */
  fields: readonly BrancheField[]
  /** Berekent de prijs uit de verzamelde answers */
  pricing: (answers: Record<string, string>) => PricingResult
  /**
   * Korte zinnen voor de "afspraak inplannen" knoppen in de klant-mail.
   * `actieKort`  — voor de knop tekst zelf, bv. "Plaatsing inplannen"
   * `actieLang`  — voor de paragraaf erboven, bv. "de plaatsing van de panelen"
   */
  actieKort: string
  actieLang: string
  /**
   * Duur in minuten van het Google Calendar event voor een PLAATSING afspraak.
   * Kennismakingsgesprek is altijd 30 min — alleen plaatsing varieert per branche.
   * Voorbeelden: zonnepanelen 480 (8u), dakdekker 480, schoonmaak 120.
   */
  plaatsingDuurMin: number
}

/** Helper: BTW-berekening (21%) op een subtotaal */
export function withBtw(subtotaal: number): { subtotaalExclBtw: number; btwBedrag: number; totaalInclBtw: number } {
  const subtotaalExclBtw = round2(subtotaal)
  const btwBedrag = round2(subtotaal * 0.21)
  const totaalInclBtw = round2(subtotaalExclBtw + btwBedrag)
  return { subtotaalExclBtw, btwBedrag, totaalInclBtw }
}

/** Afronden op 2 decimalen — euro-veilig */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Normaliseer een vrije LLM-output naar één van de toegestane enum-waarden.
 * Returnt `null` als geen exact match (case-insensitive trim).
 *
 * Gebruikt door de extract-LLMs om te voorkomen dat synoniemen of tikfouten
 * (bv. "noord-oost" voor orientatie) blijven hangen — bij `null` wordt het
 * veld weggegooid en stelt de bot de vraag opnieuw.
 */
export function normalizeEnum(value: string | undefined | null, allowed: readonly string[]): string | null {
  if (!value) return null
  const v = String(value).trim().toLowerCase()
  for (const a of allowed) {
    if (a.toLowerCase() === v) return a
  }
  return null
}

/** Parsed een vrij getal-veld (bv. '4000', '4.000', '4000 kWh') naar number */
export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0
  const cleaned = String(value).replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}
