import { DEFAULTS, type ManualOfferteData } from './manual-offerte-types'
import { mapBotSubDiensten, mapBotHoofdcategorie } from './bot-dienst-mapping'
import type { Database } from './database.types'

type LeadRow = Database['public']['Tables']['leads']['Row']

/**
 * Map een lead-row naar de ManualOfferteData-shape die computeRules() leest.
 *
 * Belangrijke keuzes:
 *  - We starten van DEFAULTS en overschrijven alleen velden die we uit de
 *    lead kunnen halen. Onbekende velden (klant-/factuuradres-kopie,
 *    notitie, kanaal, etc.) krijgen daarmee neutrale waarden die
 *    computeRules() geen extra regels laten genereren.
 *  - `voegzand_normaal_actief` / `voegzand_onkruidwerend_actief` worden
 *    afgeleid van `leads.voegzand_type` (`'normaal'`, `'onkruidwerend'`,
 *    of `'beide'`).
 *  - `sub` filtert op alleen geldige sub-dienst-keys. Onbekende strings
 *    in `sub_diensten` worden genegeerd zodat computeRules() niet stuk
 *    gaat op vreemde input.
 */
export function leadToOfferteData(lead: LeadRow): ManualOfferteData {
  const { sub: subMapped, onderhoudWeken: onderhoudWekenDerived } = mapBotSubDiensten(
    lead.sub_diensten,
    lead.hoofdcategorie,
  )

  const voegzandType = lead.voegzand_type
  const voegzandNormaalActief = voegzandType === 'normaal' || voegzandType === 'beide'
  const voegzandOnkruidwerendActief = voegzandType === 'onkruidwerend' || voegzandType === 'beide'

  // Kleur: prefer expliciete booleans; fallback naar string-parsing
  // (legacy data heeft alleen `zand_kleur` als 'naturel' / 'antraciet' /
  // 'naturel+antraciet'). Beide vinkjes uit = onbekend → false/false,
  // computeRules() print dan "kleur n.t.b." in de regelbeschrijving.
  let kleurNaturel = lead.zand_kleur_naturel ?? false
  let kleurAntraciet = lead.zand_kleur_antraciet ?? false
  if (lead.zand_kleur && !kleurNaturel && !kleurAntraciet) {
    const parts = lead.zand_kleur.split('+').map((s) => s.trim().toLowerCase())
    kleurNaturel = parts.includes('naturel')
    kleurAntraciet = parts.includes('antraciet')
  }

  // Plantenafscherming: leads heeft alleen 'ja'/'nee' (geen rollen/prijs
  // kolommen). Bij 'ja' nemen we de DEFAULTS-waarden over zodat er
  // tenminste een redelijke regel ontstaat; bij 'nee' uit.
  const plantenAfschermenActief = lead.planten_afschermen === 'ja'

  // Onderhoud-weken: de bot levert een plan-key ('plan_4_weken' etc.) die
  // mapSubDiensten() naar 4/8/12/16 vertaalt. Handmatige leads zonder plan-key
  // (of het oude 'onderhoud'-veld zonder interval) vallen terug op DEFAULTS.
  const onderhoudWeken: 4 | 8 | 12 | 16 = onderhoudWekenDerived ?? DEFAULTS.onderhoud_weken

  return {
    ...DEFAULTS,
    existing_lead_id: lead.lead_id,
    naam: lead.naam ?? '',
    bedrijf: lead.bedrijfsnaam ?? '',
    telefoon: lead.telefoon ?? '',
    email: lead.email ?? '',
    straat: lead.straat ?? '',
    huisnummer: lead.huisnummer ?? '',
    postcode: lead.postcode ?? '',
    plaats: lead.plaats ?? '',

    // Werk
    hoofdcategorie: mapBotHoofdcategorie(lead.hoofdcategorie),
    sub: subMapped,
    onderhoud_weken: onderhoudWeken,
    m2: Number(lead.m2) || 0,

    // Voegzand
    voegzand_normaal_actief: voegzandNormaalActief,
    voegzand_normaal_m2: Number(lead.voegzand_normaal_m2) || 0,
    voegzand_normaal_zakken: Number(lead.voegzand_normaal_zakken) || 0,
    voegzand_normaal_prijs:
      Number(lead.voegzand_normaal_prijs_per_zak) || DEFAULTS.voegzand_normaal_prijs,
    voegzand_onkruidwerend_actief: voegzandOnkruidwerendActief,
    voegzand_onkruidwerend_m2: Number(lead.voegzand_onkruidwerend_m2) || 0,
    voegzand_onkruidwerend_zakken: Number(lead.voegzand_onkruidwerend_zakken) || 0,
    voegzand_onkruidwerend_prijs:
      Number(lead.voegzand_onkruidwerend_prijs_per_zak) || DEFAULTS.voegzand_onkruidwerend_prijs,

    // Kleur
    kleur_naturel: kleurNaturel,
    kleur_antraciet: kleurAntraciet,

    // Overige
    groene_aanslag: lead.groene_aanslag === 'ja' ? 'ja' : 'nee',
    korstmos: lead.korstmos === 'ja' ? 'ja' : 'nee',
    afstand_km: Number(lead.afstand_km) || 0,

    // Plantenafscherming, defaults voor rollen/prijs (lead bevat geen
    // detail; user kan dit alsnog via de wizard fijntunen).
    planten_afschermen_actief: plantenAfschermenActief,
    planten_afschermen_rollen: plantenAfschermenActief ? DEFAULTS.planten_afschermen_rollen : 0,
    planten_afschermen_prijs: DEFAULTS.planten_afschermen_prijs,

    // Extra arbeid + korting (1-op-1)
    extra_arbeid_minuten: Number(lead.extra_arbeid_minuten) || 0,
    extra_arbeid_personen: Number(lead.extra_arbeid_personen) || 0,
    extra_arbeid_omschrijving: lead.extra_arbeid_omschrijving ?? '',
    korting_percentage: Number(lead.korting_percentage) || 0,
    korting_omschrijving: lead.korting_omschrijving ?? '',
  }
}
