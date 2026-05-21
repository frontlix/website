'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'
import { computeRules, computeTotals } from './manual-offerte-rules'
import { getManualOffertePricing } from './pricing-queries'
import { geocodeAddress } from './geocoding'
import type { ManualOfferteData } from './manual-offerte-types'
import { renderOffertePDFBuffer, loadLogoBase64, loadBadgeBase64 } from './offerte/pdf-renderer'
import { buildOffertePDFData, type TenantBedrijf } from './offerte/pdf-template'
import { sendOfferteMail } from './offerte/mail-sender'

export type ManualOfferteResult =
  | { ok: true; leadId: string; offerteId: string; total: number; mailError?: string | null }
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
  const isReuse = Boolean(data.existing_lead_id)
  const leadId = data.existing_lead_id ?? generateLeadId()

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

  // m² per sub-dienst — bot/PDF gebruiken deze voor regel-uitsplitsing.
  // Alleen vullen als die sub_dienst gekozen is.
  const m2Num = Number(data.m2) || 0
  const invegenM2 = data.sub.includes('invegen') ? m2Num : null
  const beschermlaagM2 = data.sub.includes('beschermlaag') ? m2Num : null

  // m² per voegzand-type — de user kiest dit nu expliciet in StepWerk.
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

  const totaalIncl = Math.round((totals.total + totals.btw) * 100) / 100

  // Velden die we voor zowel INSERT als UPDATE delen. `lead_id` zit
  // alleen in de INSERT-payload (de UPDATE matcht 'm in WHERE).
  const leadFields = {
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
    offerte_verstuurd: data.kanaal !== 'manual',
    offerte_verstuurd_op: data.kanaal !== 'manual' ? new Date().toISOString() : null,
  }

  // ── 1) Lead INSERT (nieuwe klant) of UPDATE (bestaande klant) ─────
  if (isReuse) {
    // Bevestig dat de lead bestaat (race-conditie: tussen search en
    // submit kan 'ie verwijderd zijn).
    const { data: existing, error: existsErr } = await admin
      .from('leads')
      .select('lead_id')
      .eq('lead_id', leadId)
      .maybeSingle()
    if (existsErr || !existing) {
      return { ok: false, error: 'Bestaande lead niet meer gevonden — probeer opnieuw zonder koppeling.' }
    }

    // UPDATE: status/dashboard_status/bron raken we niet aan — dat is
    // de geschiedenis van de oorspronkelijke lead. Gesprek_fase wordt
    // wel teruggezet naar 'offerte_besproken' want dat is wat een
    // nieuwe handmatige offerte feitelijk doet.
    const { error: leadErr } = await admin
      .from('leads')
      .update({
        ...leadFields,
        gesprek_fase: 'offerte_besproken',
      })
      .eq('lead_id', leadId)

    if (leadErr) {
      return { ok: false, error: `Lead bijwerken mislukt: ${leadErr.message}` }
    }
  } else {
    const { error: leadErr } = await admin.from('leads').insert({
      lead_id: leadId,
      ...leadFields,
      fotos_ontvangen: false,
      fotos_geweigerd: false,
      status: 'handmatig',
      gesprek_fase: 'offerte_besproken',
      dashboard_status: 'open',
      dashboard_archived: false,
      bron: 'dashboard_handmatig',
    })

    if (leadErr) {
      return { ok: false, error: `Lead opslaan mislukt: ${leadErr.message}` }
    }
  }

  // ── 2) Offerte aanmaken ───────────────────────────────────────────
  // Bij reuse: pak max(versie)+1, anders versie 1.
  let nextVersie = 1
  if (isReuse) {
    const { data: lastOff } = await admin
      .from('offertes')
      .select('versie')
      .eq('lead_id', leadId)
      .order('versie', { ascending: false })
      .limit(1)
      .maybeSingle()
    nextVersie = ((lastOff?.versie as number | undefined) ?? 0) + 1
  }

  const { data: offerte, error: offerteErr } = await admin
    .from('offertes')
    .insert({
      lead_id: leadId,
      versie: nextVersie,
      pdf_path: '',
      pdf_url: '',
      totaal_incl: totaalIncl,
      korting_pct: Number(data.korting_percentage) || 0,
    })
    .select('id')
    .single()

  if (offerteErr || !offerte) {
    // Rollback alleen bij nieuwe lead — een bestaande mogen we niet weggooien.
    if (!isReuse) {
      await admin.from('leads').delete().eq('lead_id', leadId)
    }
    return { ok: false, error: `Offerte opslaan mislukt: ${offerteErr?.message ?? 'onbekend'}` }
  }

  // ── 3) Prijsregels ────────────────────────────────────────────────
  // Bij reuse plakken we de nieuwe regels erbij — oude regels van
  // vorige offertes blijven staan (geen offerte_id-kolom om op te
  // splitsen, zie schema-comment in CLAUDE.md). Volgorde start bij
  // (huidige max + 1) zodat ze in de UI achteraan komen.
  let volgordeOffset = 0
  if (isReuse) {
    const { data: lastVol } = await admin
      .from('prijsregels')
      .select('volgorde')
      .eq('lead_id', leadId)
      .order('volgorde', { ascending: false })
      .limit(1)
      .maybeSingle()
    volgordeOffset = (lastVol?.volgorde as number | undefined) ?? 0
  }

  const { error: regelsErr } = await admin.from('prijsregels').insert(
    rules.map((r, idx) => ({
      lead_id: leadId,
      omschrijving: r.desc,
      aantal: r.aantal,
      eenheid: r.eenheid,
      stukprijs: r.prijs,
      totaal: Math.round(r.totaal * 100) / 100,
      volgorde: volgordeOffset + idx + 1,
      // Door computeRules() gegenereerd → markeer als auto zodat info-tab
      // sync ze later correct kan vervangen ipv duplicaten te creëren.
      bron: 'auto_lead' as const,
    }))
  )

  if (regelsErr) {
    await admin.from('offertes').delete().eq('id', offerte.id)
    if (!isReuse) {
      await admin.from('leads').delete().eq('lead_id', leadId)
    }
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

  // ── 5) Geocoding — fire-and-forget, blokkeert lead-create niet ────
  // De lead is al opgeslagen; als geocoding faalt (bv. postcode.tech
  // down) heeft 'ie alleen geen pin op de routekaart. Volgende edit
  // of een handmatige backfill-run vult 'm alsnog.
  void geocodeAndStore(admin, leadId, data.postcode.trim(), data.huisnummer.trim())

  // ── 6) Mail-verzending (alleen bij kanaal=mail) ───────────────────
  // Rendert PDF via puppeteer + schoon-straatje-template, stuurt 'm
  // als bijlage via nodemailer. Faalt niet hard: bij fout markeren we
  // offerte_verstuurd terug naar false en rapporteren in het result —
  // de offerte zelf blijft staan zodat user 'm via dashboard alsnog
  // kan re-sturen.
  let mailError: string | null = null
  if (data.kanaal === 'mail' && data.email.trim()) {
    try {
      const { data: tenantRows } = await admin
        .from('tenant_settings')
        .select('bedrijfsnaam, adres, postcode, plaats, eigenaar_email, offerte_geldigheid_dagen')
        .limit(1)
        .maybeSingle()
      const bedrijf: TenantBedrijf = {
        bedrijfsnaam: tenantRows?.bedrijfsnaam ?? 'Schoon Straatje',
        adres: tenantRows?.adres ?? null,
        postcode: tenantRows?.postcode ?? null,
        plaats: tenantRows?.plaats ?? null,
        offerte_geldigheid_dagen: Number(tenantRows?.offerte_geldigheid_dagen) || 21,
      }

      const pdfData = buildOffertePDFData({
        data,
        rules,
        totals,
        offertenummer: `${leadId}-v${nextVersie}`,
        bedrijf,
        logoBase64: loadLogoBase64(),
        badgeBase64: loadBadgeBase64(),
      })
      const pdfBuffer = await renderOffertePDFBuffer(pdfData)

      const mailRes = await sendOfferteMail({
        toEmail: data.email.trim(),
        klantNaam: data.naam.trim(),
        bedrijfsnaam: bedrijf.bedrijfsnaam,
        offertenummer: `${leadId}-v${nextVersie}`,
        totaalIncl,
        notitie: data.notitie.trim() || null,
        pdfBuffer,
        replyTo: tenantRows?.eigenaar_email ?? null,
      })
      if (!mailRes.ok) {
        mailError = mailRes.error
        // offerte_verstuurd flip terug — de mail is NIET aangekomen.
        await admin
          .from('leads')
          .update({ offerte_verstuurd: false, offerte_verstuurd_op: null })
          .eq('lead_id', leadId)
      }
    } catch (err) {
      mailError = err instanceof Error ? err.message : 'onbekende mail-fout'
      console.error('[createManualLeadEnOfferte] mail flow failed:', err)
      await admin
        .from('leads')
        .update({ offerte_verstuurd: false, offerte_verstuurd_op: null })
        .eq('lead_id', leadId)
    }
  }

  revalidatePath('/leads')
  revalidatePath('/')

  return {
    ok: true,
    leadId,
    offerteId: offerte.id as string,
    total: totaalIncl,
    mailError,
  }
}

/**
 * Geocode postcode+huisnummer en sla lat/lng op de lead op. Faalt
 * stil — een lead zonder coords mist alleen z'n pin op de routekaart.
 */
async function geocodeAndStore(
  admin: ReturnType<typeof getDashboardAdmin>,
  leadId: string,
  postcode: string,
  huisnummer: string,
): Promise<void> {
  try {
    const result = await geocodeAddress(postcode, huisnummer)
    const now = new Date().toISOString()
    if (!result) {
      // Markeer als geprobeerd (anders blijft een batch-job 'm steeds opnieuw geocoden).
      await admin
        .from('leads')
        .update({ coords_geocoded_op: now })
        .eq('lead_id', leadId)
      return
    }
    await admin
      .from('leads')
      .update({
        lat: result.lat,
        lng: result.lng,
        coords_geocoded_op: now,
      })
      .eq('lead_id', leadId)
  } catch (e) {
    console.error(`[geocode] lead=${leadId} failed:`, e)
  }
}
