'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

export type OfferteRegelInput = {
  omschrijving: string
  aantal: number | null
  eenheid: string | null
  stukprijs: number
}

export type OfferteActionResult =
  | { ok: true; offerteId: string; versie: number }
  | { ok: false; error: string }

/**
 * Maakt handmatig een offerte aan voor een lead. Berekent regel-totalen,
 * subtotaal en het uiteindelijke bedrag na korting. Pakt automatisch de
 * volgende versie (huidige max + 1, anders 1).
 *
 * Schrijf-paden gaan via de service-role client omdat het dashboard alleen
 * SELECT-policies heeft op offertes/prijsregels (de bot doet zelf de write).
 * De auth-check daarvoor staat boven: alleen ingelogde, approved
 * dashboard-users mogen deze action aanroepen (requireApprovedUser).
 */
export async function createManualOfferte(
  leadId: string,
  regels: OfferteRegelInput[],
  kortingPct: number
): Promise<OfferteActionResult> {
  const cleaned = regels
    .map((r) => ({
      omschrijving: r.omschrijving.trim(),
      aantal: r.aantal,
      eenheid: r.eenheid?.trim() || null,
      stukprijs: Number(r.stukprijs) || 0,
    }))
    .filter((r) => r.omschrijving.length > 0)

  if (cleaned.length === 0) {
    return { ok: false, error: 'Voeg minimaal één regel met omschrijving toe.' }
  }

  const korting = Math.max(0, Math.min(100, Number(kortingPct) || 0))

  // Auth-check: ingelogd EN approved. Een pending/rejected user heeft wél een
  // sessie maar mag via de service-role-write hieronder geen RLS omzeilen.
  // requireApprovedUser() redirect bij niet-approved (client-transition vangt
  // de NEXT_REDIRECT af).
  await requireApprovedUser()

  // Verify lead bestaat & leesbaar voor deze user (RLS).
  const supabase = await getDashboardSupabase()
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('lead_id')
    .eq('lead_id', leadId)
    .maybeSingle()
  if (leadErr) return { ok: false, error: leadErr.message }
  if (!lead) return { ok: false, error: 'Lead niet gevonden.' }

  // Bereken bedragen
  const regelsMetTotaal = cleaned.map((r, idx) => {
    const factor = r.aantal != null ? r.aantal : 1
    const totaal = Math.round(factor * r.stukprijs * 100) / 100
    return { ...r, totaal, volgorde: idx + 1 }
  })
  const subtotaal = regelsMetTotaal.reduce((sum, r) => sum + r.totaal, 0)
  const totaalIncl = Math.round(subtotaal * (1 - korting / 100) * 100) / 100

  // Schrijven via admin client, bot-tabel zonder dashboard-INSERT policy.
  const admin = getDashboardAdmin()

  // Volgende versie bepalen
  const { data: laatste } = await admin
    .from('offertes')
    .select('versie')
    .eq('lead_id', leadId)
    .order('versie', { ascending: false })
    .limit(1)
    .maybeSingle()
  const versie = laatste ? (laatste.versie as number) + 1 : 1

  const { data: offerte, error: offerteErr } = await admin
    .from('offertes')
    .insert({
      lead_id: leadId,
      versie,
      pdf_path: '',
      pdf_url: '',
      totaal_incl: totaalIncl,
      korting_pct: korting,
    })
    .select('id')
    .single()

  if (offerteErr || !offerte) {
    return { ok: false, error: offerteErr?.message ?? 'Kon offerte niet opslaan.' }
  }

  // Bij een nieuwe versie willen we oude prijsregels niet stapelen, we
  // vervangen ze door alleen de regels van de nieuwste versie te tonen.
  // De bestaande LeadOfferte.tsx leest alle prijsregels voor de lead; om
  // niet te dubbelen verwijderen we eerst de oude regels van deze lead.
  await admin.from('prijsregels').delete().eq('lead_id', leadId)

  const { error: regelsErr } = await admin.from('prijsregels').insert(
    regelsMetTotaal.map((r) => ({
      lead_id: leadId,
      omschrijving: r.omschrijving,
      aantal: r.aantal,
      eenheid: r.eenheid,
      stukprijs: r.stukprijs,
      totaal: r.totaal,
      volgorde: r.volgorde,
    }))
  )

  if (regelsErr) {
    // Best-effort: rollback de offerte zodat we niet half-state achterlaten
    await admin.from('offertes').delete().eq('id', offerte.id)
    return { ok: false, error: regelsErr.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true, offerteId: offerte.id as string, versie }
}
