import { NextRequest, NextResponse } from 'next/server'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'
import { buildDigestContent } from '@/lib/dashboard/notifications/digest'

/**
 * Daily-digest cron-endpoint.
 *
 * Externe scheduler (cron-job.org / Vercel cron / GitHub Actions / etc.)
 * pingt deze elke minuut. De route:
 *   1) Auth via shared secret (CRON_SECRET)
 *   2) Leest tenant_settings.daily_digest_tijd + laatste_run_op
 *   3) Check: huidige Europe/Amsterdam-tijd >= digest_tijd
 *      en laatste_run_op < vandaag-amsterdam → mag runnen
 *   4) Bouwt digest-content (gisteren-stats)
 *   5) Roept create_notification_for_all_users() aan
 *   6) Update tenant_settings.daily_digest_laatste_run_op
 *
 * Single-tenant: één tenant_settings rij, geen loop nodig. Bij multi-
 * tenant later vervangen we de .maybeSingle() door .select() + per-rij loop.
 */

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  const provided = req.headers.get('x-cron-secret')
  if (!expected) {
    console.error('[daily-digest] CRON_SECRET niet gezet')
    return NextResponse.json({ ok: false, error: 'server misconfigured' }, { status: 500 })
  }
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const admin = getDashboardAdmin()

  // 1) Tenant-instellingen ophalen
  const { data: tenantRow, error: tErr } = await admin
    .from('tenant_settings')
    .select('id, daily_digest_tijd, daily_digest_laatste_run_op')
    .limit(1)
    .maybeSingle()

  if (tErr || !tenantRow) {
    return NextResponse.json({ ok: false, error: 'tenant_settings niet gevonden' }, { status: 500 })
  }

  const digestTijd: string = tenantRow.daily_digest_tijd ?? '08:00'
  const lastRunOp: string | null = tenantRow.daily_digest_laatste_run_op

  // 2) Huidige tijd in Europe/Amsterdam
  const now = new Date()
  const amsterdamNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }),
  )
  const amsterdamDate = formatDateYMD(amsterdamNow) // YYYY-MM-DD
  const amsterdamHHMM =
    String(amsterdamNow.getHours()).padStart(2, '0') +
    ':' +
    String(amsterdamNow.getMinutes()).padStart(2, '0')

  // 3) Trigger-conditie: tijd-match én niet al vandaag gerund
  const alreadyRanToday = lastRunOp === amsterdamDate
  const tijdBereikt = amsterdamHHMM >= digestTijd
  if (alreadyRanToday || !tijdBereikt) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: alreadyRanToday ? 'vandaag al verstuurd' : 'tijd nog niet bereikt',
      now: amsterdamHHMM,
      digestTijd,
      lastRunOp,
    })
  }

  // 4) Content bouwen
  const content = await buildDigestContent(now)

  // 5) Notificatie inschieten via de bestaande helper-function in de DB.
  // PostgREST rpc-call — de function staat als SECURITY DEFINER ingesteld
  // en doet zelf de pref-check + insert per user.
  const { error: rpcErr } = await admin.rpc('create_notification_for_all_users', {
    p_event_type: 'dagelijkse_samenvatting',
    p_titel: content.titel,
    p_body: content.body,
    p_lead_id: null,
    p_payload: content.payload,
  })

  if (rpcErr) {
    console.error('[daily-digest] rpc failed:', rpcErr)
    return NextResponse.json({ ok: false, error: 'rpc failed' }, { status: 500 })
  }

  // 6) Markeer als gerund — voorkomt dat de volgende minuut-tick een
  // duplicate stuurt. Update via id (single-tenant — één rij).
  const { error: upErr } = await admin
    .from('tenant_settings')
    .update({ daily_digest_laatste_run_op: amsterdamDate })
    .eq('id', tenantRow.id)

  if (upErr) {
    // Niet hard-falen — de notificatie is al weg. Volgende cron-tick zou
    // wel duplicate kunnen veroorzaken; log voor debugging.
    console.error('[daily-digest] update last_run_op failed:', upErr)
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    digestContent: content,
    amsterdamDate,
  })
}

function formatDateYMD(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}
