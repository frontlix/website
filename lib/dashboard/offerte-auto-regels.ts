'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { getManualOffertePricing } from './pricing-queries'
import { computeRules } from './manual-offerte-rules'
import { DEFAULTS, type ManualOfferteData } from './manual-offerte-types'
import type { Database } from './database.types'

type LeadRow = Database['public']['Tables']['leads']['Row']

type Result = { ok: true; regelCount: number } | { ok: false; error: string }

// ── Fase 2.4: lead-data sync naar prijsregels ────────────────────────────
//
// Wordt aangeroepen na een succesvolle `updateLeadFields()` (info-tab edit)
// om de auto-berekende offerte-regels in sync te houden met de actuele
// lead-data. De flow:
//
//   1. Lees lead-row via admin client (RLS bypassen, gebruiker is al
//      gauth'd via de aanroepende server-action).
//   2. Map de lead-row naar een ManualOfferteData-shape (zelfde input die
//      de handmatige wizard ook in computeRules() voert). Velden die niet
//      in `leads` staan krijgen veilige defaults (geen toeslag, geen
//      extra regel) zodat regenerate nooit ongewenst iets toevoegt.
//   3. Haal pricing op (DB → fallback), exact hetzelfde pad als de
//      handmatige action gebruikt.
//   4. Compute regels via dezelfde pure functie als de wizard.
//   5. Vervang alleen de AUTO-prijsregels (bron='auto_lead') van de lead.
//      Handmatige regels (bron='manual') blijven ongemoeid, die heeft
//      de owner zelf toegevoegd via de offerte-tab en mogen niet
//      verdwijnen door een info-tab edit.
//
//   6. revalidatePath voor lead-detail zodat de UI verse data binnenhaalt.

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
function leadToOfferteData(lead: LeadRow): ManualOfferteData {
  const validSubs = new Set(['invegen', 'preventieve_onkruid', 'beschermlaag', 'onderhoud'])
  const subFiltered = (lead.sub_diensten ?? []).filter((s): s is ManualOfferteData['sub'][number] =>
    validSubs.has(s),
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

  // Onderhoud-weken: niet apart opgeslagen in `leads`. Default = 8 (mid).
  // Wordt alleen gebruikt als 'onderhoud' in `sub_diensten` staat.
  const onderhoudWeken: 4 | 8 | 12 | 16 = DEFAULTS.onderhoud_weken

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
    hoofdcategorie: DEFAULTS.hoofdcategorie, // niet relevant voor computeRules
    sub: subFiltered,
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

/**
 * Herbereken auto-uit-lead-data prijsregels voor een lead.
 *
 * Geen auth-check, wordt alleen aangeroepen vanuit andere server-actions
 * die zelf al gauth zijn (zie lead-actions.ts). Errors worden teruggegeven
 * in `Result`; de aanroeper besluit zelf of dat fataal is voor de
 * gebruikersactie of niet (lead-actions logt + slikt 'm).
 */
export async function regenerateAutoRegels(leadId: string): Promise<Result> {
  if (!leadId) return { ok: false, error: 'leadId ontbreekt' }

  const admin = getDashboardAdmin()

  // 1) Lead-row ophalen
  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle<LeadRow>()

  if (leadErr) return { ok: false, error: `Lead ophalen mislukt: ${leadErr.message}` }
  if (!lead) return { ok: false, error: 'Lead niet gevonden' }

  // 2) Lead → ManualOfferteData
  const data = leadToOfferteData(lead)

  // 3) Pricing (DB → fallback)
  const pricing = await getManualOffertePricing()

  // 4) Compute regels
  const rules = computeRules(data, pricing)

  // 5) DELETE bestaande AUTO-regels + INSERT nieuwe set
  //
  // Filter op bron='auto_lead' (migratie 041) zodat handmatig toegevoegde
  // regels (bron='manual') ongemoeid blijven. De owner kan een meerwerk-
  // regel hebben toegevoegd die niet uit lead-data hoort te komen.
  const { error: delErr } = await admin
    .from('prijsregels')
    .delete()
    .eq('lead_id', leadId)
    .eq('bron', 'auto_lead')

  if (delErr) return { ok: false, error: `Oude regels verwijderen mislukt: ${delErr.message}` }

  if (rules.length > 0) {
    const { error: insErr } = await admin.from('prijsregels').insert(
      rules.map((r, idx) => ({
        lead_id: leadId,
        omschrijving: r.desc,
        aantal: r.aantal,
        eenheid: r.eenheid,
        stukprijs: r.prijs,
        totaal: Math.round(r.totaal * 100) / 100,
        volgorde: idx + 1,
        bron: 'auto_lead',
      })),
    )
    if (insErr) return { ok: false, error: `Nieuwe regels opslaan mislukt: ${insErr.message}` }
  }

  // 6) UI refresh
  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')

  return { ok: true, regelCount: rules.length }
}
