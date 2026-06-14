'use server'

import { getDashboardAdmin } from './supabase-admin'
import { requireApprovedUser } from './require-approved-user'

/**
 * "Dienst toevoegen" in de v2 Instellingen is bewust GEEN echte self-service:
 * een nieuwe dienst vergt bij ons bot-intake (welke vragen stelt Surface?) en
 * prijslogica, die in de Surface-config (Python) leven, niet in de dashboard-DB.
 * Zelf toevoegen zou een half-werkende dienst opleveren.
 *
 * Daarom een lichte AANVRAAG-flow (variant A): de owner vult de dienstgegevens
 * in en wij krijgen een Slack-melding op het bestaande template-aanvraag-kanaal
 * (`SLACK_TEMPLATE_REQUEST_WEBHOOK_URL`). Wij zetten de dienst dan handmatig
 * klaar. Geen DB-rij, geen interactieve knoppen: er valt niets automatisch goed
 * te keuren. Best-effort, zoals `requestTemplateChange`: een Slack-outage of
 * ontbrekende env-var laat de owner niet falen.
 */
export type DienstAanvraagResult = { ok: true } | { ok: false; error: string }

export interface DienstAanvraagInput {
  naam: string
  omschrijving?: string
  /** per_m2 | vast | per_uur | op_aanvraag | '' (geen keuze) */
  prijsmodel?: string
  indicatiePrijs?: string
  botVragen?: string
  opmerking?: string
}

const PRIJSMODEL_LABEL: Record<string, string> = {
  per_m2: 'Per m²',
  vast: 'Vast bedrag',
  per_uur: 'Per uur',
  op_aanvraag: 'Op aanvraag',
}

const MAX = {
  naam: 120,
  omschrijving: 600,
  indicatie: 120,
  botVragen: 600,
  opmerking: 600,
} as const

/** Trim + harde lengtegrens; backticks eruit zodat Slack-mrkdwn niet breekt. */
function clip(raw: string | undefined, max: number): string {
  const t = String(raw ?? '').trim().replace(/`/g, "'")
  return t.length > max ? t.slice(0, max) : t
}

export async function requestNewService(
  input: DienstAanvraagInput,
): Promise<DienstAanvraagResult> {
  // Ingelogd én approved (zelfde poort als de andere instellingen-acties).
  const { user } = await requireApprovedUser()

  const naam = clip(input.naam, MAX.naam)
  if (naam.length === 0) return { ok: false, error: 'Geef de dienst een naam.' }

  const omschrijving = clip(input.omschrijving, MAX.omschrijving)
  const indicatie = clip(input.indicatiePrijs, MAX.indicatie)
  const botVragen = clip(input.botVragen, MAX.botVragen)
  const opmerking = clip(input.opmerking, MAX.opmerking)
  const prijsmodel = PRIJSMODEL_LABEL[String(input.prijsmodel ?? '')] ?? null

  // Bedrijfsnaam erbij zoeken (single-tenant) zodat wij in Slack meteen zien
  // wélk bedrijf de aanvraag doet. Best-effort: faalt dit, dan melden we zonder.
  let bedrijf: string | null = null
  try {
    const admin = getDashboardAdmin()
    const { data } = await admin
      .from('tenant_settings')
      .select('bedrijfsnaam')
      .limit(1)
      .maybeSingle()
    bedrijf = (data as { bedrijfsnaam: string | null } | null)?.bedrijfsnaam ?? null
  } catch {
    // negeren, de melding gaat sowieso door
  }

  const webhookUrl = process.env.SLACK_TEMPLATE_REQUEST_WEBHOOK_URL
  if (!webhookUrl) {
    console.error(
      '[dienst-aanvraag] SLACK_TEMPLATE_REQUEST_WEBHOOK_URL niet gezet, melding overgeslagen',
    )
    // We laten de owner niet falen op onze eigen config: behandel als verstuurd.
    return { ok: true }
  }

  // Block Kit-melding op het template-aanvraag-kanaal. Geen actie-knoppen.
  const meta: string[] = []
  if (bedrijf) meta.push(`*Bedrijf:* ${bedrijf}`)
  meta.push(`*Aangevraagd door:* ${user.email ?? 'onbekend'}`)
  if (prijsmodel) meta.push(`*Prijsmodel:* ${prijsmodel}`)
  if (indicatie) meta.push(`*Indicatie:* ${indicatie}`)

  const blocks: unknown[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `:hammer_and_wrench: *Nieuwe dienst aangevraagd*, \`${naam}\`` },
    },
    { type: 'context', elements: [{ type: 'mrkdwn', text: meta.join('   ·   ') }] },
  ]
  if (omschrijving) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Wat houdt het in:*\n${omschrijving}` } })
  }
  if (botVragen) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Bot moet uitvragen:*\n${botVragen}` } })
  }
  if (opmerking) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Opmerking:*\n${opmerking}` } })
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Fallback-tekst voor notificaties; blocks is wat zichtbaar wordt.
        text: `Nieuwe dienst aangevraagd: ${naam}${bedrijf ? ` (${bedrijf})` : ''} door ${user.email ?? 'onbekend'}`,
        blocks,
      }),
    })
  } catch (err) {
    console.error('[dienst-aanvraag] Slack-post mislukt:', err)
    // Niet falen op een Slack-outage: de owner heeft z'n deel gedaan.
  }

  return { ok: true }
}
