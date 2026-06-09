'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { getManualOffertePricing } from './pricing-queries'
import { computeRules } from './manual-offerte-rules'
import { leadToOfferteData } from './lead-to-offerte-data'
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
