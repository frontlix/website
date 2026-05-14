import { NextResponse, type NextRequest } from 'next/server'
import { getDashboardSupabase } from './supabase-server'

/**
 * Gemeenschappelijke proxy-handler voor de `/api/dashboard/lead/[id]/*`
 * routes. Verifieert auth, forwardt naar de bot-API met de gedeelde
 * bearer-token, en retourneert het bot-resultaat 1-op-1 terug naar de
 * client.
 *
 * Reden: alle "zware" acties (approve-quote, modify-quote, book-appointment,
 * reschedule, AVG-delete) blijven in de bot — dit dashboard is alleen
 * de UI-laag. Het token zit alleen server-side in `.env`.
 */
/**
 * Proxy voor system-level bot-endpoints zonder leadId (bv. `/config/reload`).
 * Dezelfde auth-flow als proxyToBotApi, andere URL-structuur.
 */
export async function proxyToBotApiGlobal(
  req: NextRequest,
  endpoint: string,
): Promise<NextResponse> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Niet ingelogd' }, { status: 401 })
  }

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
  // 1) Auth-check: alleen ingelogde dashboard-users mogen.
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Niet ingelogd' }, { status: 401 })
  }

  // 2) Config: bot-API URL + token.
  const botUrl = process.env.DASHBOARD_API_URL
  const token = process.env.DASHBOARD_API_TOKEN
  if (!botUrl || !token) {
    return NextResponse.json(
      { ok: false, error: 'Bot-API niet geconfigureerd (DASHBOARD_API_URL / DASHBOARD_API_TOKEN)' },
      { status: 503 },
    )
  }

  // 3) Body 1-op-1 doorforwarden (mag leeg zijn voor de POSTs zonder payload).
  let body: unknown = {}
  if (req.headers.get('content-length') && req.headers.get('content-length') !== '0') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
  }

  try {
    const res = await fetch(`${botUrl}/dashboard-api/lead/${encodeURIComponent(leadId)}/${endpoint}`, {
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
