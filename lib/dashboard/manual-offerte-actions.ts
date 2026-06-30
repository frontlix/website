'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'
import { computeRules, computeTotals } from './manual-offerte-rules'
import { getManualOffertePricing } from './pricing-queries'
import { buildOfferteSnapshot } from './offerte-snapshot'
import { geocodeAddress } from './geocoding'
import type { ManualOfferteData } from './manual-offerte-types'
import { buildLeadFieldsFromForm } from './offerte-form-mapping'
import {
  renderOffertePDFBuffer,
  loadLogoBase64,
  loadBadgeBase64,
  loadKeurmerkBase64,
  loadBesteVakmanBase64,
} from './offerte/pdf-renderer'
import { buildOffertePDFData, type TenantBedrijf } from './offerte/pdf-template'
import { sendOfferteMail } from './offerte/mail-sender'
import {
  getActiveEmailConnectionForSend,
  setNeedsReconnect,
} from './email-connection-queries'

export type ManualOfferteResult =
  | {
      ok: true
      leadId: string
      offerteId: string
      total: number
      mailError?: string | null
      // Gezet wanneer de offerte alsnog uitging via de Frontlix-mailbox
      // omdat de gekoppelde SMTP faalde (sectie 8.1 punt 4 stale-afhandeling).
      mailWarning?: string | null
      // Gevuld wanneer data.lever_pdf_download true is: PDF als base64 + nummer
      // zodat de client 'm als bestand kan downloaden.
      pdfBase64?: string | null
      offertenummer?: string
    }
  | { ok: false; error: string }

/**
 * Lead-id format zoals de bot ze maakt: `${ms-timestamp}-${5-digit suffix}`.
 * Genoeg entropie voor handmatige aanmaak zonder collision-risico in de
 * praktijk.
 */
function generateLeadId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 90000) + 10000}`
}

/**
 * Detecteert of een mail-foutmelding een login- of verbindingsfout is, zodat
 * de stale-afhandeling (sectie 8.1 punt 4) weet wanneer ze moet terugvallen
 * op de Frontlix-mailbox en needs_reconnect moet zetten. sendOfferteMail vangt
 * de nodemailer-fout intern en geeft alleen err.message door in de error-tekst,
 * dus we matchen op de bekende nodemailer/SMTP-markeringen in die tekst.
 */
function isAuthOrConnError(error: string): boolean {
  return /\b(EAUTH|ECONNREFUSED|ETIMEDOUT|ESOCKET|ECONNECTION|ENOTFOUND|EDNS|535|Invalid login)\b/i.test(
    error,
  )
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
 * gate't op approved-status: een pending/rejected user heeft wél een sessie
 * maar mag via service-role geen RLS omzeilen, dus requireApprovedUser().
 */
export async function createManualLeadEnOfferte(
  data: ManualOfferteData
): Promise<ManualOfferteResult> {
  // ── Auth-check (mag deze user überhaupt offertes maken?) ──────────
  // requireApprovedUser() redirect bij niet-ingelogd/niet-approved; de
  // client-transition vangt die NEXT_REDIRECT correct af.
  const { user, profile } = await requireApprovedUser()
  // Tenant van de ingelogde owner; bepaalt of er een eigen e-mailkoppeling is.
  const tenantId = profile.tenant_id

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
  if (rules.length === 0) return { ok: false, error: 'Geen offerte-regels, controleer de gekozen diensten.' }

  const admin = getDashboardAdmin()

  // Tenant-instellingen voor de offerte (btw-tarief, betaaltermijn, geldigheid,
  // bedrijfsgegevens). Het btw-tarief bepaalt de totalen, dus we halen het op
  // vóór computeTotals. De bot leest dezelfde kolommen, zie pdf.py.
  const { data: tenantRows } = await admin
    .from('tenant_settings')
    .select(
      'bedrijfsnaam, adres, postcode, plaats, eigenaar_email, offerte_geldigheid_dagen, offerte_btw_tarief, offerte_betaaltermijn_dagen',
    )
    .limit(1)
    .maybeSingle()
  const btwTarief = Number(tenantRows?.offerte_btw_tarief) || 21
  const bedrijf: TenantBedrijf = {
    bedrijfsnaam: tenantRows?.bedrijfsnaam ?? 'Schoon Straatje',
    adres: tenantRows?.adres ?? null,
    postcode: tenantRows?.postcode ?? null,
    plaats: tenantRows?.plaats ?? null,
    // Per-offerte override uit de wizard (data.geldigheid_dagen > 0) gaat vóór
    // de tenant-standaard; zo bepaalt de owner de geldigheid per offerte. De
    // PDF (buildOffertePDFData → bedrijf) gebruikt deze waarde voor "geldig t/m".
    offerte_geldigheid_dagen:
      Number(data.geldigheid_dagen) > 0
        ? Number(data.geldigheid_dagen)
        : Number(tenantRows?.offerte_geldigheid_dagen) || 21,
    offerte_btw_tarief: btwTarief,
    offerte_betaaltermijn_dagen: Number(tenantRows?.offerte_betaaltermijn_dagen) || 14,
  }

  const totals = computeTotals(rules, data, btwTarief)
  if (totals.total <= 0) return { ok: false, error: 'Totaalbedrag moet > 0 zijn.' }

  const isReuse = Boolean(data.existing_lead_id)
  const leadId = data.existing_lead_id ?? generateLeadId()

  const totaalIncl = Math.round((totals.total + totals.btw) * 100) / 100

  // Velden die we voor zowel INSERT als UPDATE delen. `lead_id` zit
  // alleen in de INSERT-payload (de UPDATE matcht 'm in WHERE). De mapping
  // zelf leeft in offerte-form-mapping.ts zodat het nieuwe offerte-formulier
  // exact dezelfde lead-kolommen schrijft; hier voegen we alleen de twee
  // verzend-velden toe (die zijn send-flow-specifiek).
  const leadFields = {
    ...buildLeadFieldsFromForm(data, leadId, totaalIncl),
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
      return { ok: false, error: 'Bestaande lead niet meer gevonden, probeer opnieuw zonder koppeling.' }
    }

    // UPDATE: status/dashboard_status/bron raken we niet aan, dat is
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

  // Doorlopend offertenummer via de atomische teller (PREFIX-JAAR-volgnummer,
  // bv. SS-2026-001). Valt terug op het lead-gebaseerde nummer als de RPC
  // onverhoopt niets teruggeeft, zodat de offerte altijd een nummer heeft.
  const { data: nummerData } = await admin.rpc('next_offerte_nummer')
  const offertenummer =
    typeof nummerData === 'string' && nummerData.trim()
      ? nummerData
      : `${leadId}-v${nextVersie}`

  const { data: offerte, error: offerteErr } = await admin
    .from('offertes')
    .insert({
      lead_id: leadId,
      versie: nextVersie,
      pdf_path: '',
      pdf_url: '',
      totaal_incl: totaalIncl,
      korting_pct: Number(data.korting_percentage) || 0,
      offertenummer,
      // Bevries de gebruikte prijslijst + regels + de volledige editor-invoer,
      // zodat het concept later exact deze verzonden prijzen seedt i.p.v. live
      // te herberekenen, en "Terug naar verstuurde versie" ook de werk-invoer
      // (m2, afstand, diensten, korting) compleet kan terugzetten.
      regels_snapshot: buildOfferteSnapshot({
        pricing,
        rules,
        kortingPct: Number(data.korting_percentage) || 0,
        geldigheidDagen: bedrijf.offerte_geldigheid_dagen,
        data,
      }),
    })
    .select('id')
    .single()

  if (offerteErr || !offerte) {
    // Rollback alleen bij nieuwe lead, een bestaande mogen we niet weggooien.
    if (!isReuse) {
      await admin.from('leads').delete().eq('lead_id', leadId)
    }
    return { ok: false, error: `Offerte opslaan mislukt: ${offerteErr?.message ?? 'onbekend'}` }
  }

  // ── 3) Prijsregels ────────────────────────────────────────────────
  // Bij reuse plakken we de nieuwe regels erbij, oude regels van
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

  // ── 4) Notitie als begeleidende tekst, opslaan als lead_note ─────
  if (data.notitie.trim()) {
    await admin.from('lead_notes').insert({
      lead_id: leadId,
      tekst: `[Handmatige offerte] ${data.notitie.trim()}`,
      auteur: user.id,
    })
  }

  // ── 5) Geocoding, fire-and-forget, blokkeert lead-create niet ────
  // De lead is al opgeslagen; als geocoding faalt (bv. postcode.tech
  // down) heeft 'ie alleen geen pin op de routekaart. Volgende edit
  // of een handmatige backfill-run vult 'm alsnog.
  void geocodeAndStore(admin, leadId, data.postcode.trim(), data.huisnummer.trim())

  // ── 6) Mail-verzending (alleen bij kanaal=mail) ───────────────────
  // Rendert PDF via puppeteer + schoon-straatje-template, stuurt 'm
  // als bijlage via nodemailer. Faalt niet hard: bij fout markeren we
  // offerte_verstuurd terug naar false en rapporteren in het result,   // de offerte zelf blijft staan zodat user 'm via dashboard alsnog
  // kan re-sturen.
  let mailError: string | null = null
  let mailWarning: string | null = null
  let pdfBase64: string | null = null
  if (data.kanaal === 'mail' && data.email.trim()) {
    try {
      // bedrijf + tenantRows zijn al bovenaan opgehaald (incl. btw + betaaltermijn).
      const pdfData = buildOffertePDFData({
        data,
        rules,
        totals,
        offertenummer,
        bedrijf,
        logoBase64: loadLogoBase64(),
        badgeBase64: loadBadgeBase64(),
        keurmerkBase64: loadKeurmerkBase64(),
        besteVakmanBase64: loadBesteVakmanBase64(),
      })
      const pdfBuffer = await renderOffertePDFBuffer(pdfData)

      // Per-bedrijf e-mailkoppeling laden. Aanwezig → verstuur vanuit het
      // gekoppelde adres via die SMTP; reply-to volgt sectie 6.6 (de koppeling-
      // reply_to, anders het gekoppelde adres zelf), NIET eigenaar_email.
      // Geen rij → niets extra meegeven, gedrag identiek aan voorheen.
      const conn = tenantId ? await getActiveEmailConnectionForSend(tenantId) : null

      const mailRes = conn
        ? await sendOfferteMail({
            toEmail: data.email.trim(),
            klantNaam: data.naam.trim(),
            bedrijfsnaam: bedrijf.bedrijfsnaam,
            offertenummer,
            totaalIncl,
            notitie: data.notitie.trim() || null,
            pdfBuffer,
            replyTo: conn.replyTo || conn.email,
            smtpConfig: {
              host: conn.smtpHost,
              port: conn.smtpPort,
              secure: conn.security === 'ssl',
              requireTLS: conn.security === 'starttls',
              user: conn.email,
              pass: conn.password,
            },
            fromEmail: conn.email,
            senderName: conn.senderName,
          })
        : await sendOfferteMail({
            toEmail: data.email.trim(),
            klantNaam: data.naam.trim(),
            bedrijfsnaam: bedrijf.bedrijfsnaam,
            offertenummer,
            totaalIncl,
            notitie: data.notitie.trim() || null,
            pdfBuffer,
            replyTo: tenantRows?.eigenaar_email ?? null,
          })

      if (!mailRes.ok) {
        // Stale-afhandeling (sectie 8.1 punt 4): faalde de gekoppelde SMTP op
        // een login-/verbindingsfout, zet needs_reconnect en stuur de offerte
        // alsnog via de Frontlix-env-transporter (smtpConfig weglaten), zodat
        // de mail niet stil verloren gaat.
        const isStale = conn !== null && isAuthOrConnError(mailRes.error)
        if (isStale) {
          try {
            if (tenantId) await setNeedsReconnect(tenantId, true)
          } catch (flagErr) {
            const fe = flagErr as { code?: string; responseCode?: number }
            console.error('[createManualLeadEnOfferte] setNeedsReconnect failed:', {
              code: fe?.code,
              responseCode: fe?.responseCode,
            })
          }
          const fallbackRes = await sendOfferteMail({
            toEmail: data.email.trim(),
            klantNaam: data.naam.trim(),
            bedrijfsnaam: bedrijf.bedrijfsnaam,
            offertenummer,
            totaalIncl,
            notitie: data.notitie.trim() || null,
            pdfBuffer,
            replyTo: conn.replyTo || conn.email,
          })
          if (fallbackRes.ok) {
            mailWarning =
              'De offerte is verstuurd vanaf Frontlix, je e-mailkoppeling werkt niet meer. Koppel opnieuw om weer vanaf je eigen adres te versturen.'
          } else {
            // Ook de fallback faalde: huidig gedrag (flip terug + mailError).
            mailError = fallbackRes.error
            await admin
              .from('leads')
              .update({ offerte_verstuurd: false, offerte_verstuurd_op: null })
              .eq('lead_id', leadId)
          }
        } else {
          mailError = mailRes.error
          // offerte_verstuurd flip terug, de mail is NIET aangekomen.
          await admin
            .from('leads')
            .update({ offerte_verstuurd: false, offerte_verstuurd_op: null })
            .eq('lead_id', leadId)
        }
      }
    } catch (err) {
      mailError = err instanceof Error ? err.message : 'onbekende mail-fout'
      // Logging-hardening (sectie 10/6.1): veld-gefilterd, geen err-object,
      // want de mail-flow draait straks met per-tenant-credentials.
      const e = err as { code?: string; responseCode?: number }
      console.error('[createManualLeadEnOfferte] mail flow failed:', {
        code: e?.code,
        responseCode: e?.responseCode,
      })
      await admin
        .from('leads')
        .update({ offerte_verstuurd: false, offerte_verstuurd_op: null })
        .eq('lead_id', leadId)
    }
  }

  // ── 7) PDF-download (kanaal "Download PDF") ───────────────────────
  // De owner koos download i.p.v. verzenden: render dezelfde offerte-PDF en
  // geef 'm als base64 terug zodat de browser 'm opslaat. Er gaat niets naar de
  // klant (offerte_verstuurd blijft false). Faalt zacht: bij een render-fout
  // blijft de offerte gewoon opgeslagen, de client toont dan een melding.
  if (data.lever_pdf_download) {
    try {
      const pdfData = buildOffertePDFData({
        data,
        rules,
        totals,
        offertenummer,
        bedrijf,
        logoBase64: loadLogoBase64(),
        badgeBase64: loadBadgeBase64(),
        keurmerkBase64: loadKeurmerkBase64(),
        besteVakmanBase64: loadBesteVakmanBase64(),
      })
      const pdfBuffer = await renderOffertePDFBuffer(pdfData)
      pdfBase64 = pdfBuffer.toString('base64')
    } catch (err) {
      console.error('[createManualLeadEnOfferte] pdf-download render failed:', err)
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
    mailWarning,
    pdfBase64,
    offertenummer,
  }
}

/**
 * Geocode postcode+huisnummer en sla lat/lng op de lead op. Faalt
 * stil, een lead zonder coords mist alleen z'n pin op de routekaart.
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
