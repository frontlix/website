import type { ManualOfferteData } from './manual-offerte-types'
import type { ExtractedFields } from './manual-offerte-ai'
import type { ExistingClientMatch } from './manual-offerte-search'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

/**
 * Vul de klant-velden vanuit een bestaande lead. Adres laat de
 * postcode-auto-fetch vervolgens met rust (afstand_km wordt opnieuw
 * berekend door het effect in ManualOfferteModal). Sub-dienst /
 * m² / etc. raken we expliciet niet aan, dit is alleen "klant".
 */
export function applyExistingClient(set: SetFn, m: ExistingClientMatch) {
  set('existing_lead_id', m.lead_id)
  set('naam', m.naam ?? '')
  set('bedrijf', m.bedrijfsnaam ?? '')
  set('telefoon', m.telefoon ?? '')
  set('email', m.email ?? '')
  set('postcode', m.postcode ?? '')
  set('huisnummer', m.huisnummer ?? '')
  set('straat', m.straat ?? '')
  set('plaats', m.plaats ?? '')
}

/**
 * Merge AI-extractie in de wizard-data. Alleen niet-null velden
 * overschrijven we, een gedeeltelijk gevuld formulier blijft dus
 * staan voor velden die de AI niet kon vinden. `wensen` gaat naar
 * `notitie` (de begeleidende tekst-veld in stap 4).
 *
 * onBeforeAiFill: hook die vlak vóór de set-calls wordt aangeroepen.
 * ManualOfferteModal gebruikt 'm om een effect te suppressen dat
 * anders de net-ge-extracteerde zakken-aantallen overschrijft.
 */
export function applyAiExtracted(
  set: SetFn,
  f: ExtractedFields,
  onBeforeAiFill?: () => void,
) {
  onBeforeAiFill?.()
  if (f.naam) set('naam', f.naam)
  if (f.bedrijf) set('bedrijf', f.bedrijf)
  if (f.telefoon) set('telefoon', f.telefoon)
  if (f.email) set('email', f.email)
  if (f.postcode) set('postcode', f.postcode)
  if (f.huisnummer) set('huisnummer', f.huisnummer)
  if (f.straat) set('straat', f.straat)
  if (f.plaats) set('plaats', f.plaats)

  // Factuur-adres: zodra de AI een aparte postcode of huisnummer
  // teruggeeft, klappen we factuur_zelfde uit (vink van het "gelijk
  // aan werk-adres"-vakje af) en vullen we de factuur-velden.
  const heeftFactuur = Boolean(f.factuur_postcode || f.factuur_huisnummer)
  if (heeftFactuur) {
    set('factuur_zelfde', false)
    if (f.factuur_postcode) set('factuur_postcode', f.factuur_postcode)
    if (f.factuur_huisnummer) set('factuur_huisnummer', f.factuur_huisnummer)
    if (f.factuur_straat) set('factuur_straat', f.factuur_straat)
    if (f.factuur_plaats) set('factuur_plaats', f.factuur_plaats)
  }

  if (f.hoofdcategorie && f.hoofdcategorie.length > 0) set('hoofdcategorie', f.hoofdcategorie)
  if (f.sub_diensten && f.sub_diensten.length > 0) set('sub', f.sub_diensten)
  if (typeof f.m2 === 'number' && f.m2 > 0) set('m2', f.m2)

  // Voegzand normaal, bij actief=true mag het auto-zakken-effect in
  // ManualOfferteModal het aantal nog overschrijven, behalve als de
  // user expliciet een aantal heeft genoemd. Daarom set het aantal
  // ná de boolean (zelfde tick, react batched).
  if (f.voegzand_normaal !== null) set('voegzand_normaal_actief', f.voegzand_normaal)
  if (typeof f.voegzand_normaal_zakken === 'number' && f.voegzand_normaal_zakken > 0) {
    set('voegzand_normaal_zakken', f.voegzand_normaal_zakken)
  }
  if (typeof f.voegzand_normaal_prijs === 'number' && f.voegzand_normaal_prijs > 0) {
    set('voegzand_normaal_prijs', f.voegzand_normaal_prijs)
  }

  if (f.voegzand_onkruidwerend !== null) {
    set('voegzand_onkruidwerend_actief', f.voegzand_onkruidwerend)
  }
  if (typeof f.voegzand_onkruidwerend_zakken === 'number' && f.voegzand_onkruidwerend_zakken > 0) {
    set('voegzand_onkruidwerend_zakken', f.voegzand_onkruidwerend_zakken)
  }
  if (typeof f.voegzand_onkruidwerend_prijs === 'number' && f.voegzand_onkruidwerend_prijs > 0) {
    set('voegzand_onkruidwerend_prijs', f.voegzand_onkruidwerend_prijs)
  }

  // Kleur, als AI iets teruggeeft, vervangen we de defaults; anders
  // raken we de kleurkeuze niet aan (default = naturel aan).
  if (f.kleur_naturel !== null) set('kleur_naturel', f.kleur_naturel)
  if (f.kleur_antraciet !== null) set('kleur_antraciet', f.kleur_antraciet)

  if (f.planten_afschermen !== null) set('planten_afschermen_actief', f.planten_afschermen)
  if (typeof f.planten_afschermen_rollen === 'number' && f.planten_afschermen_rollen > 0) {
    set('planten_afschermen_rollen', f.planten_afschermen_rollen)
  }
  if (typeof f.planten_afschermen_prijs === 'number' && f.planten_afschermen_prijs > 0) {
    set('planten_afschermen_prijs', f.planten_afschermen_prijs)
  }

  if (f.groene_aanslag !== null) set('groene_aanslag', f.groene_aanslag ? 'ja' : 'nee')
  if (f.korstmos !== null) set('korstmos', f.korstmos ? 'ja' : 'nee')

  if (
    f.onderhoud_weken === 4 ||
    f.onderhoud_weken === 8 ||
    f.onderhoud_weken === 12 ||
    f.onderhoud_weken === 16
  ) {
    set('onderhoud_weken', f.onderhoud_weken)
  }

  // Extra arbeid, alleen overschrijven als de AI een complete set
  // teruggaf (minuten + tenminste een omschrijving). Half-leeg laten
  // we de wizard-defaults staan.
  if (typeof f.extra_arbeid_minuten === 'number' && f.extra_arbeid_minuten > 0) {
    set('extra_arbeid_minuten', f.extra_arbeid_minuten)
    if (typeof f.extra_arbeid_personen === 'number' && f.extra_arbeid_personen > 0) {
      set('extra_arbeid_personen', f.extra_arbeid_personen)
    } else {
      set('extra_arbeid_personen', 1)
    }
    if (f.extra_arbeid_omschrijving) set('extra_arbeid_omschrijving', f.extra_arbeid_omschrijving)
  }

  // Korting, alleen overschrijven bij geldig percentage. 0% = "geen
  // korting" en is niet anders dan default; daar laten we 'm met rust.
  if (
    typeof f.korting_percentage === 'number' &&
    f.korting_percentage > 0 &&
    f.korting_percentage <= 100
  ) {
    set('korting_percentage', f.korting_percentage)
    if (f.korting_omschrijving) set('korting_omschrijving', f.korting_omschrijving)
  }

  if (f.kanaal === 'mail' || f.kanaal === 'manual') {
    set('kanaal', f.kanaal)
  }

  if (f.wensen) set('notitie', f.wensen)
}
