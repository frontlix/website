'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'
import { computeRules, computeTotals } from './manual-offerte-rules'
import { getManualOffertePricing } from './pricing-queries'
import type { ManualOfferteData } from './manual-offerte-types'

export type ManualOfferteResult =
  | { ok: true; leadId: string; offerteId: string; total: number }
  | { ok: false; error: string }

/**
 * Lead-id format zoals de bot ze maakt: `${ms-timestamp}-${5-digit suffix}`.
 * Genoeg entropie voor handmatige aanmaak zonder collision-risico in de
 * praktijk.
 */
function generateLeadId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 90000) + 10000}`
}

function trimOrNull(v: string): string | null {
  const t = v.trim()
  return t.length > 0 ? t : null
}

/**
 * Volledige flow vanuit de "Handmatige offerte" wizard:
 * 1) Validate input (verplichte velden)
 * 2) INSERT lead (status='handmatig', gesprek_fase='offerte_besproken')
 * 3) Bereken regels + totaal via dezelfde pure functies als de UI
 * 4) INSERT offerte (versie 1) + prijsregels
 * 5) Markeer offerte_verstuurd zodra kanaal != 'manual'
 *
 * Schrijf gaat via service-role omdat de leads/offertes/prijsregels tabellen
 * geen INSERT-policy hebben voor dashboard-users (alleen SELECT). Auth check
 * blijft staan: alleen ingelogde dashboard-users mogen deze action runnen.
 */
export async function createManualLeadEnOfferte(
  data: ManualOfferteData
): Promise<ManualOfferteResult> {
  // ── Auth-check (mag deze user überhaupt offertes maken?) ──────────
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  // ── Validatie van verplichte velden ───────────────────────────────
  if (!data.naam.trim()) return { ok: false, error: 'Naam is verplicht.' }
  if (!data.telefoon.trim()) return { ok: false, error: 'Telefoon is verplicht.' }
  if (!data.postcode.trim() || !data.huisnummer.trim()) {
    return { ok: false, error: 'Postcode + huisnummer zijn verplicht.' }
  }
  if (data.sub.length === 0) return { ok: false, error: 'Kies minstens één sub-dienst.' }
  if (Number(data.m2) <= 0) return { ok: false, error: 'Oppervlakte moet > 0 zijn.' }

  const pricing = await getManualOffertePricing()
  const rules = computeRules(data, pricing)
  if (rules.length === 0) return { ok: false, error: 'Geen offerte-regels — controleer de gekozen diensten.' }
  const totals = computeTotals(rules, data)
  if (totals.total <= 0) return { ok: false, error: 'Totaalbedrag moet > 0 zijn.' }

  const admin = getDashboardAdmin()
  const leadId = generateLeadId()

  // ── Kleur voegzand (string voor de leads-kolom) ───────────────────
  const kleuren: string[] = []
  if (data.kleur_naturel) kleuren.push('naturel')
  if (data.kleur_antraciet) kleuren.push('antraciet')
  const zandKleur = kleuren.length > 0 ? kleuren.join('+') : null

  const totaalIncl = Math.round((totals.total + totals.btw) * 100) / 100

  // ── 1) Lead aanmaken ──────────────────────────────────────────────
  const { error: leadErr } = await admin.from('leads').insert({
    lead_id: leadId,
    naam: data.naam.trim(),
    bedrijfsnaam: trimOrNull(data.bedrijf),
    email: data.email.trim() || `${leadId}@handmatig.frontlix.nl`,  // niet-leeg vereist
    telefoon: data.telefoon.trim(),
    postcode: data.postcode.trim(),
    huisnummer: data.huisnummer.trim(),
    straat: trimOrNull(data.straat),
    plaats: trimOrNull(data.plaats),
    hoofdcategorie: data.hoofdcategorie,
    sub_diensten: data.sub,
    m2: Number(data.m2) || null,
    zand_kleur: zandKleur,
    planten_afschermen: data.planten_afschermen_actief ? 'ja' : 'nee',
    groene_aanslag: data.groene_aanslag,
    fotos_ontvangen: false,
    fotos_geweigerd: false,
    status: 'handmatig',
    gesprek_fase: 'offerte_besproken',
    offerte_verstuurd: data.kanaal !== 'manual',
    offerte_verstuurd_op: data.kanaal !== 'manual' ? new Date().toISOString() : null,
    afstand_km: Number(data.afstand_km) || null,
    totaal_prijs: totaalIncl,
    extra_arbeid_minuten: Number(data.extra_arbeid_minuten) || 0,
    extra_arbeid_personen: Number(data.extra_arbeid_personen) || 0,
    voegzand_zakken:
      Number(data.voegzand_normaal_zakken || 0) +
      Number(data.voegzand_onkruidwerend_zakken || 0),
    korting_percentage: Number(data.korting_percentage) || 0,
    dashboard_status: 'open',
    dashboard_archived: false,
    bron: 'dashboard_handmatig',
  })

  if (leadErr) {
    return { ok: false, error: `Lead opslaan mislukt: ${leadErr.message}` }
  }

  // ── 2) Offerte aanmaken ───────────────────────────────────────────
  const { data: offerte, error: offerteErr } = await admin
    .from('offertes')
    .insert({
      lead_id: leadId,
      versie: 1,
      pdf_path: '',
      pdf_url: '',
      totaal_incl: totaalIncl,
      korting_pct: Number(data.korting_percentage) || 0,
    })
    .select('id')
    .single()

  if (offerteErr || !offerte) {
    // Rollback lead — anders blijft 'ie als wees in de pipeline staan
    await admin.from('leads').delete().eq('lead_id', leadId)
    return { ok: false, error: `Offerte opslaan mislukt: ${offerteErr?.message ?? 'onbekend'}` }
  }

  // ── 3) Prijsregels ────────────────────────────────────────────────
  const { error: regelsErr } = await admin.from('prijsregels').insert(
    rules.map((r, idx) => ({
      lead_id: leadId,
      omschrijving: r.desc,
      aantal: r.aantal,
      eenheid: r.eenheid,
      stukprijs: r.prijs,
      totaal: Math.round(r.totaal * 100) / 100,
      volgorde: idx + 1,
    }))
  )

  if (regelsErr) {
    await admin.from('offertes').delete().eq('id', offerte.id)
    await admin.from('leads').delete().eq('lead_id', leadId)
    return { ok: false, error: `Prijsregels opslaan mislukt: ${regelsErr.message}` }
  }

  // ── 4) Notitie als begeleidende tekst — opslaan als lead_note ─────
  if (data.notitie.trim()) {
    await admin.from('lead_notes').insert({
      lead_id: leadId,
      tekst: `[Handmatige offerte] ${data.notitie.trim()}`,
      auteur: user.id,
    })
  }

  revalidatePath('/leads')
  revalidatePath('/')

  return {
    ok: true,
    leadId,
    offerteId: offerte.id as string,
    total: totaalIncl,
  }
}
