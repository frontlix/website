'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Welke templates kunnen vanuit /instellingen?section=opening worden
 * voorgesteld. Hardcoded omdat de source-of-truth in de Surface-config
 * (Python service) zit. Een aanvraag muteert die config niet — Frontlix
 * past hem handmatig toe na Meta-goedkeuring.
 */
const ALLOWED_TEMPLATES = ['lead_intake_oprit', 'lead_intake_onkruid'] as const
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
