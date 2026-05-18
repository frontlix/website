'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Welke templates kunnen via de aanvraag-flow worden voorgesteld. Hardcoded
 * omdat de source-of-truth in de Surface-config (Python service) zit. Een
 * aanvraag muteert die config niet — Frontlix past hem handmatig toe na
 * Meta-goedkeuring (WhatsApp Business Templates).
 *
 * - `lead_intake_*` → openingsbericht-templates (per hoofddienst)
 * - `reminder_1/2/3` → herinnerings-templates die Surface stuurt wanneer
 *   een klant niet reageert op de offerte. De DELAY (`reminder_dag_X` in
 *   tenant_settings) past de owner direct aan; alleen de TEKST loopt
 *   via Meta-approval.
 */
const ALLOWED_TEMPLATES = [
  'lead_intake_oprit',
  'lead_intake_onkruid',
  'reminder_1',
  'reminder_2',
  'reminder_3',
] as const
type TemplateNaam = (typeof ALLOWED_TEMPLATES)[number]

function isAllowedTemplate(s: string): s is TemplateNaam {
  return (ALLOWED_TEMPLATES as readonly string[]).includes(s)
}

/**
 * Owner dient een template-wijziging in. We schrijven naar template_aanvragen
 * (audit) en sturen daarnaast een Slack-melding via een webhook. Als Slack
 * faalt of niet is geconfigureerd: de DB-rij blijft staan en de owner krijgt
 * géén foutmelding — Frontlix-support ziet de aanvraag alsnog in de tabel
 * en kan hem handmatig oppakken.
 */
export async function requestTemplateChange(
  templateNaam: string,
  voorgesteldeTekst: string,
): Promise<ActionResult> {
  if (!isAllowedTemplate(templateNaam)) {
    return { ok: false, error: 'Onbekende template' }
  }
  const tekst = String(voorgesteldeTekst ?? '').trim()
  if (tekst.length === 0) {
    return { ok: false, error: 'Tekst is leeg' }
  }
  if (tekst.length > 1024) {
    return { ok: false, error: 'Tekst is te lang (max 1024 tekens)' }
  }

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { error } = await supabase.from('template_aanvragen').insert({
    template_naam: templateNaam,
    voorgestelde_tekst: tekst,
    aanvrager_user_id: user.id,
    aanvrager_email: user.email ?? '',
  })
  if (error) return { ok: false, error: error.message }

  // Slack-melding op best-effort basis. Géén throw bij failure — de aanvraag
  // is veilig opgeslagen in de DB en Frontlix-support pikt 'm daar op.
  const webhookUrl = process.env.SLACK_TEMPLATE_REQUEST_WEBHOOK_URL
  if (webhookUrl) {
    const payload = {
      text: `:envelope_with_arrow: *Template-aanvraag* — \`${templateNaam}\`\n*Door:* ${user.email}\n\n*Voorgestelde tekst:*\n\`\`\`${tekst}\`\`\``,
    }
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      // Stille fout — niet falen op netwerkproblemen met Slack.
    }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}

/**
 * Owner annuleert een eigen template-aanvraag. Alleen toegestaan wanneer
 * de aanvraag nog `pending` is — zodra Frontlix 'm doorzet naar Meta
 * (`forwarded`) of een eindstatus heeft, is annuleren niet meer zinvol.
 *
 * Implementatie: DELETE de rij via admin-client. RLS op template_aanvragen
 * heeft geen DELETE-policy voor dashboard-users; auth + ownership-check
 * regelen we hier in code. Zelfde pattern als `saveTenantBase` in
 * tenant-base-actions.ts.
 */
export async function cancelTemplateAanvraag(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Ongeldige id.' }

  // Auth-check via user-client.
  const supabase = await getDashboardSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  // Status + ownership-check + delete via admin-client (omzeilt RLS).
  const admin = getDashboardAdmin()
  const { data: row, error: selErr } = await admin
    .from('template_aanvragen')
    .select('status, aanvrager_user_id')
    .eq('id', id)
    .maybeSingle()
  if (selErr) {
    console.error('[cancelTemplateAanvraag] select failed:', selErr)
    return { ok: false, error: 'Kon aanvraag niet ophalen.' }
  }
  if (!row) return { ok: false, error: 'Aanvraag niet gevonden.' }
  if (row.aanvrager_user_id !== user.id) {
    return { ok: false, error: 'Niet toegestaan — niet jouw aanvraag.' }
  }
  if (row.status !== 'pending') {
    return {
      ok: false,
      error: 'Alleen aanvragen "in behandeling" kun je annuleren.',
    }
  }

  const { error } = await admin.from('template_aanvragen').delete().eq('id', id)
  if (error) {
    console.error('[cancelTemplateAanvraag] delete failed:', error)
    return { ok: false, error: `Annuleren mislukt: ${error.message}` }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
