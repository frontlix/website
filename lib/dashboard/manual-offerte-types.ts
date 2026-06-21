/**
 * Types + constants voor de handmatige-offerte wizard.
 *
 * Prijzen hieronder spiegelen de prijslijst zoals die in het Schoon-Straatje
 * design staat. Op termijn moeten deze uit Supabase `bot_config` komen
 * (zelfde tabel die de bot leest); voor nu zijn ze hardcoded zodat de
 * wizard offline werkt en exact dezelfde getallen geeft als het ontwerp.
 */

export type Hoofdcategorie = 'oprit_terras_terrein' | 'onkruidbeheersing'

export type SubDienst =
  | 'invegen'
  | 'preventieve_onkruid'
  | 'beschermlaag'
  | 'onderhoud'

// 'wa' en 'both' verwijderd: WhatsApp-verzending vereist goedgekeurde
// Meta-templates met PDF-bijlage; tot dat ingericht is kiest de owner
// tussen e-mail (met PDF) of handmatige download.
export type SendKanaal = 'mail' | 'manual'

export type ManualOfferteData = {
  // koppeling, gevuld als de wizard via "zoek bestaande klant" een
  // bestaande lead heeft geselecteerd. Bij submit gebruikt de action dit
  // om de offerte onder de bestaande lead te hangen i.p.v. een nieuwe
  // lead aan te maken.
  existing_lead_id: string | null
  // klant
  naam: string
  bedrijf: string
  telefoon: string
  email: string
  straat: string
  huisnummer: string
  postcode: string
  plaats: string
  // factuur
  factuur_zelfde: boolean
  factuur_straat: string
  factuur_huisnummer: string
  factuur_postcode: string
  factuur_plaats: string
  // werk, hoofdcategorie is een array zodat de owner zowel
  // oprit/terras als onkruidbeheersing kan kiezen voor één klus.
  // Lege array = nog niets gekozen (validatie in stap 2 blokkeert
  // Volgende dan).
  hoofdcategorie: Hoofdcategorie[]
  sub: SubDienst[]
  // Reiniging los van invegen: de v2-wizard maakt "Reinigen" en "Invegen"
  // aparte keuzes. Deze vlag bepaalt of de reiniging-regel meetelt, los van
  // het voegzand/invegen-werk. Optioneel + default true (zie DEFAULTS) zodat
  // bestaande flows (bot, offerte-formulier) hun gedrag behouden.
  reinigen_actief?: boolean
  onderhoud_weken: 4 | 8 | 12 | 16
  m2: number
  // voegzand
  voegzand_normaal_actief: boolean
  voegzand_normaal_m2: number
  voegzand_normaal_zakken: number
  voegzand_normaal_prijs: number
  voegzand_onkruidwerend_actief: boolean
  voegzand_onkruidwerend_m2: number
  voegzand_onkruidwerend_zakken: number
  voegzand_onkruidwerend_prijs: number
  /** Optioneel: eigen m² voor beschermlaag / preventieve onkruid (v2-wizard).
   *  Afwezig (oud dashboard) => rules-engine valt terug op de hoofd-m2. */
  beschermlaag_m2?: number
  preventieve_onkruid_m2?: number
  // kleur
  kleur_naturel: boolean
  kleur_antraciet: boolean
  // overige
  groene_aanslag: 'ja' | 'nee'
  korstmos: 'ja' | 'nee'
  afstand_km: number
  // plantenafscherming
  planten_afschermen_actief: boolean
  planten_afschermen_rollen: number
  planten_afschermen_prijs: number
  // Per-offerte prijs-overrides (v2-wizard): de owner past de EENHEIDSPRIJS van
  // een regel aan voor déze offerte; undefined ⇒ val terug op de prijslijst.
  // computeRules past ze toe als `override ?? pricing.*`, zodat de wizard-rail,
  // de server-berekening en de PDF identiek blijven. Voegzand/planten hebben hun
  // eigen prijs-velden hierboven; dit dekt de overige dienst/arbeid-regels + km.
  reinigen_dagprijs_override?: number
  reiniging_per_m2_override?: number
  arbeid_invegen_normaal_override?: number
  arbeid_invegen_onkruidwerend_override?: number
  beschermlaag_override?: number
  preventieve_onkruid_override?: number
  reiskosten_per_km_override?: number
  // offerte
  extra_arbeid_minuten: number
  extra_arbeid_personen: number
  extra_arbeid_omschrijving: string
  korting_percentage: number
  // Vaste actiekorting in euro. > 0 ⇒ vast-bedrag-modus (overruled het
  // percentage), 0 ⇒ percentage-modus. Gecapt op de kortbare grondslag.
  korting_bedrag: number
  korting_omschrijving: string
  // Geldigheid van deze offerte in dagen. 0 ⇒ val terug op de tenant-instelling
  // (offerte_geldigheid_dagen). > 0 ⇒ override per offerte (gebruikt in de PDF).
  geldigheid_dagen: number
  // verzending
  notitie: string
  kanaal: SendKanaal
  // true ⇒ de owner koos "Download PDF": de server rendert de PDF en geeft 'm
  // (base64) terug zodat de browser 'm downloadt. Er gaat geen mail/WhatsApp uit
  // (kanaal blijft 'manual', offerte_verstuurd=false).
  lever_pdf_download: boolean
}

export type RegelComputed = {
  desc: string
  aantal: number
  eenheid: string
  prijs: number
  totaal: number
}

export type TotalsComputed = {
  subtotal: number
  korstmosToeslag: number
  kortingBedrag: number
  discount: number
  total: number   // excl. BTW na korting
  btw: number     // 21% over total
}

export const DEFAULTS: ManualOfferteData = {
  existing_lead_id: null,
  naam: '',
  bedrijf: '',
  telefoon: '',
  email: '',
  straat: '',
  huisnummer: '',
  postcode: '',
  plaats: '',
  factuur_zelfde: true,
  factuur_straat: '',
  factuur_huisnummer: '',
  factuur_postcode: '',
  factuur_plaats: '',
  // Geen hoofdcategorie, sub-dienst, voegzand-type of kleur standaard
  // aan, user (of de AI-fill) moet expliciet kiezen. Validatie in
  // stap 2 (sub.length > 0 én hoofdcategorie.length > 0) blokkeert
  // anders Volgende, dat is de bewuste guardrail.
  hoofdcategorie: [],
  sub: [],
  reinigen_actief: true,
  onderhoud_weken: 8,
  m2: 100,
  voegzand_normaal_actief: false,
  voegzand_normaal_m2: 0,
  voegzand_normaal_zakken: 20,
  voegzand_normaal_prijs: 2.9,
  voegzand_onkruidwerend_actief: false,
  voegzand_onkruidwerend_m2: 0,
  voegzand_onkruidwerend_zakken: 0,
  voegzand_onkruidwerend_prijs: 20.9,
  kleur_naturel: false,
  kleur_antraciet: false,
  groene_aanslag: 'nee',
  korstmos: 'nee',
  afstand_km: 25,
  planten_afschermen_actief: false,
  planten_afschermen_rollen: 2,
  planten_afschermen_prijs: 8.5,
  extra_arbeid_minuten: 0,
  extra_arbeid_personen: 0,
  extra_arbeid_omschrijving: '',
  korting_percentage: 0,
  korting_bedrag: 0,
  korting_omschrijving: '',
  geldigheid_dagen: 0,
  notitie: '',
  kanaal: 'mail',
  lever_pdf_download: false,
}

export const DIENST_LABELS: Record<SubDienst, string> = {
  invegen: 'Voegen invegen',
  preventieve_onkruid: 'Preventieve onkruidbehandeling',
  beschermlaag: 'Nieuwe beschermlaag',
  onderhoud: 'Onderhoudsplan',
}

export const SUB_OPTIES: ReadonlyArray<{
  k: SubDienst
  l: string
  d: string
  cat: Hoofdcategorie | 'both'
}> = [
  { k: 'invegen',             l: 'Invegen',                        d: 'Reinigen + voegzand bijvullen', cat: 'oprit_terras_terrein' },
  { k: 'preventieve_onkruid', l: 'Preventieve onkruidbehandeling', d: 'Eenmalige behandeling, €1,10/m²', cat: 'both' },
  { k: 'beschermlaag',        l: 'Nieuwe beschermlaag toepassen',  d: 'Impregneer-coating, €1,60/m²',  cat: 'oprit_terras_terrein' },
  // Onderhoudsplan is een terugkerende onkruidbeheersings-flow; bij
  // alleen oprit/terras (eenmalige klus) is dit niet relevant en zou
  // de wizard 'm niet aanbieden.
  { k: 'onderhoud',           l: 'Onderhoudsplan',                 d: 'Terugkerende beurten, 4 t/m 16 weken', cat: 'onkruidbeheersing' },
]

export const ONDERHOUD_PRIJZEN: Record<4 | 8 | 12 | 16, number> = {
  4: 1.25,
  8: 1.75,
  12: 2.9,
  16: 4.5,
}
