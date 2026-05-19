/**
 * Slack interactivity endpoint voor template-aanvragen.
 *
 * Slack POSTs hier wanneer iemand op een knop klikt in de melding in
 * #frontlix-template-aanvragen, of een modal submit. Payload-types die
 * we hanteren:
 *
 *   - block_actions: button-click. Acties:
 *       approve_{id}    → status='approved', edit message
 *       reject_{id}     → open modal voor notitie
 *       note_{id}       → open modal voor optionele notitie (geen status-change)
 *
 *   - view_submission: modal submit. Acties via callback_id:
 *       reject_submit   → status='rejected' + notitie
 *       note_submit     → notitie bijwerken, status onveranderd
 *
 * Beveiliging: Slack signing-secret HMAC (zie lib/dashboard/slack/verify.ts).
 * Zonder geldige signature: 401. Anders kan iedereen onze DB updaten.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySlackRequest } from '@/lib/dashboard/slack/verify'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type SlackUser = { id: string; username?: string; name?: string }
type SlackAction = { action_id: string; value: string; type: string }
type SlackPayload = {
  type: 'block_actions' | 'view_submission'
  user: SlackUser
  actions?: SlackAction[]
  response_url?: string
  trigger_id?: string
  view?: {
    callback_id: string
    private_metadata: string
    state: { values: Record<string, Record<string, { value?: string }>> }
  }
  // Voor block_actions: het bericht waarin de knop zat (zodat we 'm
  // kunnen editen via response_url).
  message?: { ts: string; blocks?: unknown[]; text?: string }
}

export async function POST(req: NextRequest) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    return NextResponse.json({ error: 'Slack signing-secret niet geconfigureerd.' }, { status: 500 })
  }

  const rawBody = await req.text()
  const verify = verifySlackRequest({
    signingSecret,
    rawBody,
    signature: req.headers.get('x-slack-signature'),
    timestamp: req.headers.get('x-slack-request-timestamp'),
  })
  if (!verify.ok) {
    console.warn('[slack-template-action] signature verify failed:', verify.reason)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Slack stuurt payload als x-www-form-urlencoded met één veld `payload`
  // dat een JSON-string is. Niet als raw JSON.
  const params = new URLSearchParams(rawBody)
  const payloadRaw = params.get('payload')
  if (!payloadRaw) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
  }

  let payload: SlackPayload
  try {
    payload = JSON.parse(payloadRaw) as SlackPayload
  } catch {
    return NextResponse.json({ error: 'Invalid payload JSON' }, { status: 400 })
  }

  try {
    if (payload.type === 'block_actions') {
      return await handleBlockAction(payload)
    }
    if (payload.type === 'view_submission') {
      return await handleViewSubmission(payload)
    }
    return NextResponse.json({ error: 'Unsupported payload type' }, { status: 400 })
  } catch (err) {
    console.error('[slack-template-action] handler crashed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── Block actions: button-clicks ────────────────────────────────────
async function handleBlockAction(payload: SlackPayload): Promise<NextResponse> {
  const action = payload.actions?.[0]
  if (!action) return NextResponse.json({ ok: true })

  const [verb, ...rest] = action.value.split(':')
  const aanvraagId = rest.join(':')
  if (!aanvraagId) return NextResponse.json({ ok: true })

  if (verb === 'approve') {
    return approveAanvraag(aanvraagId, payload)
  }
  if (verb === 'reject') {
    return openNotitieModal(aanvraagId, payload, 'reject')
  }
  if (verb === 'note') {
    return openNotitieModal(aanvraagId, payload, 'note')
  }
  return NextResponse.json({ ok: true })
}

async function approveAanvraag(aanvraagId: string, payload: SlackPayload): Promise<NextResponse> {
  const admin = getDashboardAdmin()
  const { error } = await admin
    .from('template_aanvragen')
    .update({ status: 'approved', bijgewerkt_op: new Date().toISOString() })
    .eq('id', aanvraagId)

  if (error) {
    await postBackToSlack(payload.response_url, `❌ Kon niet goedkeuren: ${error.message}`)
    return NextResponse.json({ ok: true })
  }

  await replaceMessage(payload, `:white_check_mark: *Goedgekeurd* door <@${payload.user.id}>`)
  return NextResponse.json({ ok: true })
}

async function openNotitieModal(
  aanvraagId: string,
  payload: SlackPayload,
  mode: 'reject' | 'note',
): Promise<NextResponse> {
  if (!payload.trigger_id) {
    return NextResponse.json({ ok: true })
  }
  const isReject = mode === 'reject'
  const view = {
    type: 'modal',
    callback_id: isReject ? 'reject_submit' : 'note_submit',
    private_metadata: JSON.stringify({ aanvraagId, channelTs: payload.message?.ts, responseUrl: payload.response_url }),
    title: { type: 'plain_text', text: isReject ? 'Aanvraag afkeuren' : 'Notitie toevoegen' },
    submit: { type: 'plain_text', text: isReject ? 'Afkeuren' : 'Opslaan' },
    close: { type: 'plain_text', text: 'Annuleren' },
    blocks: [
      {
        type: 'input',
        block_id: 'notitie_block',
        label: {
          type: 'plain_text',
          text: isReject ? 'Waarom afgekeurd?' : 'Notitie',
        },
        element: {
          type: 'plain_text_input',
          action_id: 'notitie_input',
          multiline: true,
          max_length: 500,
          placeholder: {
            type: 'plain_text',
            text: isReject
              ? 'Bv. "Niet mogelijk volgens Meta-regels: emoji niet toegestaan in headers."'
              : 'Optionele notitie voor de owner',
          },
        },
        optional: !isReject,
      },
    ],
  }

  // open de modal via views.open API. Hiervoor hebben we OAuth Bot Token
  // nodig (xoxb-...). Per memory zit die nog niet in env — we communiceren
  // duidelijk als 'ie mist.
  const botToken = process.env.SLACK_BOT_TOKEN
  if (!botToken) {
    await postBackToSlack(
      payload.response_url,
      ':warning: Modal kan niet openen — `SLACK_BOT_TOKEN` mist op de server. Vraag Frontlix om die te zetten.',
    )
    return NextResponse.json({ ok: true })
  }

  const res = await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({ trigger_id: payload.trigger_id, view }),
  })
  const data = (await res.json()) as { ok: boolean; error?: string }
  if (!data.ok) {
    await postBackToSlack(payload.response_url, `❌ Modal openen mislukt: ${data.error}`)
  }
  return NextResponse.json({ ok: true })
}

// ── View submissions: modal-submits ─────────────────────────────────
async function handleViewSubmission(payload: SlackPayload): Promise<NextResponse> {
  const view = payload.view
  if (!view) return NextResponse.json({ ok: true })

  let meta: { aanvraagId?: string; responseUrl?: string } = {}
  try {
    meta = JSON.parse(view.private_metadata) as { aanvraagId?: string; responseUrl?: string }
  } catch {
    return NextResponse.json({ ok: true })
  }
  const aanvraagId = meta.aanvraagId
  if (!aanvraagId) return NextResponse.json({ ok: true })

  const notitie = view.state.values?.notitie_block?.notitie_input?.value?.trim() || ''

  const admin = getDashboardAdmin()
  if (view.callback_id === 'reject_submit') {
    if (notitie.length === 0) {
      // Bij afkeuren is notitie verplicht — Slack input-block had optional=false
      // dus dit hoort niet voor te komen, maar dubbelcheck voor zekerheid.
      return NextResponse.json({
        response_action: 'errors',
        errors: { notitie_block: 'Notitie is verplicht bij afkeuren.' },
      })
    }
    const { error } = await admin
      .from('template_aanvragen')
      .update({ status: 'rejected', notitie, bijgewerkt_op: new Date().toISOString() })
      .eq('id', aanvraagId)
    if (error) {
      return NextResponse.json({
        response_action: 'errors',
        errors: { notitie_block: `DB-fout: ${error.message}` },
      })
    }
    await postBackToSlack(
      meta.responseUrl,
      `:x: *Afgekeurd* door <@${payload.user.id}>\n> ${escapeSlack(notitie)}`,
      true,
    )
    return NextResponse.json({ response_action: 'clear' })
  }

  if (view.callback_id === 'note_submit') {
    const { error } = await admin
      .from('template_aanvragen')
      .update({ notitie: notitie || null, bijgewerkt_op: new Date().toISOString() })
      .eq('id', aanvraagId)
    if (error) {
      return NextResponse.json({
        response_action: 'errors',
        errors: { notitie_block: `DB-fout: ${error.message}` },
      })
    }
    if (notitie) {
      await postBackToSlack(
        meta.responseUrl,
        `:speech_balloon: Notitie toegevoegd door <@${payload.user.id}>\n> ${escapeSlack(notitie)}`,
        false,
      )
    }
    return NextResponse.json({ response_action: 'clear' })
  }

  return NextResponse.json({ ok: true })
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Vervang het oorspronkelijke bericht door een verkorte status-regel.
 * Houdt de channel netjes en voorkomt dat anderen alsnog op de oude
 * knoppen klikken.
 */
async function replaceMessage(payload: SlackPayload, statusText: string): Promise<void> {
  if (!payload.response_url) return
  await fetch(payload.response_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replace_original: true,
      text: statusText,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: statusText },
        },
      ],
    }),
  })
}

/** Post een follow-up bericht (geen replace). Handig voor errors/notities. */
async function postBackToSlack(
  responseUrl: string | undefined,
  text: string,
  replaceOriginal = false,
): Promise<void> {
  if (!responseUrl) return
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      replace_original: replaceOriginal,
      text,
    }),
  })
}

/** Eenvoudige Slack-mrkdwn-escape: backticks en aan­halings­tekens. */
function escapeSlack(s: string): string {
  return s.replace(/```/g, '` ` `').replace(/[<>]/g, '')
}
