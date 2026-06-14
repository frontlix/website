'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import { getDashboardAdmin } from './supabase-admin'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Welke templates kunnen via de aanvraag-flow worden voorgesteld. Hardcoded
 * omdat de source-of-truth in de Surface-config (Python service) zit. Een
 * aanvraag muteert die config niet, Frontlix past hem handmatig toe na
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
 * géén foutmelding, Frontlix-support ziet de aanvraag alsnog in de tabel
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

  // INSERT met .select('id') zodat we 'm in de Slack-buttons kunnen
  // meegeven, de interactivity-endpoint heeft de id nodig om de juiste
  // rij te updaten bij approve/reject/note.
  const { data: inserted, error } = await supabase
    .from('template_aanvragen')
    .insert({
      template_naam: templateNaam,
      voorgestelde_tekst: tekst,
      aanvrager_user_id: user.id,
      aanvrager_email: user.email ?? '',
    })
    .select('id')
    .single()
  if (error || !inserted) {
    return { ok: false, error: error?.message ?? 'Aanvraag opslaan mislukt' }
  }
  const aanvraagId = (inserted as { id: string }).id

  // Slack-melding met interactieve knoppen (Block Kit). Best-effort:
  // bij netwerkfout faalt de hele actie niet, de aanvraag staat
  // veilig in de DB en is via /instellingen + Studio nog beheersbaar.
  const webhookUrl = process.env.SLACK_TEMPLATE_REQUEST_WEBHOOK_URL
  if (webhookUrl) {
    const headerText = `:envelope_with_arrow: *Template-aanvraag*, \`${templateNaam}\``
    const metaText = `*Door:* ${user.email}`
    // ``` blokken zijn Slack-mrkdwn. Triple-backticks in de input
    // zelf escapen we naar spaces om de codeblok niet te breken.
    const veiligeTekst = tekst.replace(/```/g, '` ` `')
    const blocks = [
      { type: 'section', text: { type: 'mrkdwn', text: headerText } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: metaText }] },
      { type: 'section', text: { type: 'mrkdwn', text: '*Voorgestelde tekst:*' } },
      { type: 'section', text: { type: 'mrkdwn', text: '```' + veiligeTekst + '```' } },
      {
        type: 'actions',
        block_id: `tpl_actions_${aanvraagId}`,
        elements: [
          {
            type: 'button',
            action_id: 'approve',
            text: { type: 'plain_text', text: '✅ Goedkeuren', emoji: true },
            style: 'primary',
            value: `approve:${aanvraagId}`,
          },
          {
            type: 'button',
            action_id: 'reject',
            text: { type: 'plain_text', text: '❌ Afkeuren', emoji: true },
            style: 'danger',
            value: `reject:${aanvraagId}`,
          },
          {
            type: 'button',
            action_id: 'note',
            text: { type: 'plain_text', text: '💬 Notitie toevoegen', emoji: true },
            value: `note:${aanvraagId}`,
          },
        ],
      },
    ]
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // text is een fallback voor notificaties/screen-readers; blocks
          // is wat zichtbaar wordt in de Slack-UI.
          text: `Template-aanvraag: ${templateNaam} door ${user.email}`,
          blocks,
        }),
      })
    } catch {
      // Stille fout, niet falen op netwerkproblemen met Slack.
    }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}

/**
 * Owner annuleert een eigen template-aanvraag. Alleen toegestaan wanneer
 * de aanvraag nog `pending` is, zodra Frontlix 'm doorzet naar Meta
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
    .select('status, aanvrager_user_id, template_naam')
    .eq('id', id)
    .maybeSingle()
  if (selErr) {
    console.error('[cancelTemplateAanvraag] select failed:', selErr)
    return { ok: false, error: 'Kon aanvraag niet ophalen.' }
  }
  if (!row) return { ok: false, error: 'Aanvraag niet gevonden.' }
  if (row.aanvrager_user_id !== user.id) {
    return { ok: false, error: 'Niet toegestaan, niet jouw aanvraag.' }
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

  // Slack-melding (best-effort), zelfde kanaal als de aanvraag zelf, zodat
  // Frontlix-support ziet dat de owner een openstaande aanvraag heeft
  // ingetrokken. Een Slack-outage laat het annuleren niet falen.
  const webhookUrl = process.env.SLACK_TEMPLATE_REQUEST_WEBHOOK_URL
  if (webhookUrl) {
    const templateNaam = row.template_naam ?? 'onbekend'
    const blocks = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `:wastebasket: *Template-aanvraag geannuleerd*, \`${templateNaam}\`` },
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `*Door:* ${user.email ?? 'onbekend'}` }] },
    ]
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Template-aanvraag geannuleerd: ${templateNaam} door ${user.email ?? 'onbekend'}`,
          blocks,
        }),
      })
    } catch {
      // Stille fout, niet falen op Slack-problemen.
    }
  }

  revalidatePath('/instellingen')
  return { ok: true }
}
