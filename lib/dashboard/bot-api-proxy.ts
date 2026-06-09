import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser, getCurrentUserProfile } from './auth'
import { callBotLeadApi } from './bot-api-client'

/**
 * Gemeenschappelijke proxy-handler voor de `/api/dashboard/lead/[id]/*`
 * routes. Verifieert auth, forwardt naar de bot-API met de gedeelde
 * bearer-token, en retourneert het bot-resultaat 1-op-1 terug naar de
 * client.
 *
 * Reden: alle "zware" acties (approve-quote, modify-quote, book-appointment,
 * reschedule, AVG-delete) blijven in de bot, dit dashboard is alleen
 * de UI-laag. Het token zit alleen server-side in `.env`.
 *
 * Auth-eisen: ingelogd EN tenant_status='approved'. Een pending/rejected
 * user heeft wél een sessie maar mag geen schrijf-acties triggeren tot
 * de owner ze goedkeurt, vandaar de extra profile-check.
 */

/** Auth-check identiek aan requireApprovedUser() maar zonder redirect:
 *  retourneert een 401/403 JSON-response die de API-route door kan geven. */
async function requireApprovedUserForApi(): Promise<NextResponse | null> {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Niet ingelogd' }, { status: 401 })
  }
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    return NextResponse.json(
      { ok: false, error: 'Account nog niet goedgekeurd' },
      { status: 403 },
    )
  }
  return null
}

/**
 * Proxy voor system-level bot-endpoints zonder leadId (bv. `/config/reload`).
 * Dezelfde auth-flow als proxyToBotApi, andere URL-structuur.
 */
export async function proxyToBotApiGlobal(
  req: NextRequest,
  endpoint: string,
): Promise<NextResponse> {
  const authFail = await requireApprovedUserForApi()
  if (authFail) return authFail

  const botUrl = process.env.DASHBOARD_API_URL
  const token = process.env.DASHBOARD_API_TOKEN
  if (!botUrl || !token) {
    return NextResponse.json(
      { ok: false, error: 'Bot-API niet geconfigureerd (DASHBOARD_API_URL / DASHBOARD_API_TOKEN)' },
      { status: 503 },
    )
  }

  let body: unknown = {}
  if (req.headers.get('content-length') && req.headers.get('content-length') !== '0') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
  }

  try {
    const res = await fetch(`${botUrl}/dashboard-api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { ok: res.ok, message: text }
    }
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Bot-API niet bereikbaar' },
      { status: 502 },
    )
  }
}

export async function proxyToBotApi(
  req: NextRequest,
  leadId: string,
  endpoint: string,
): Promise<NextResponse> {
  // 1) Auth-check: alleen ingelogde EN goedgekeurde dashboard-users.
  const authFail = await requireApprovedUserForApi()
  if (authFail) return authFail

  // 2) Body 1-op-1 doorforwarden (mag leeg zijn voor de POSTs zonder payload).
  let body: unknown = {}
  if (req.headers.get('content-length') && req.headers.get('content-length') !== '0') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
  }

  // 3) Doorsturen naar de bot via de gedeelde client (URL + token + token-auth).
  const result = await callBotLeadApi(leadId, endpoint, body)
  return NextResponse.json(result.data, { status: result.status })
}
