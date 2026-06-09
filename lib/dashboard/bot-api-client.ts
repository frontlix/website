/**
 * Framework-onafhankelijke client voor de lead-scoped bot-API-endpoints
 * (`/dashboard-api/lead/:id/*`). Bevat geen Next-specifieke types, zodat zowel
 * de API-route-proxy (bot-api-proxy.ts) als server-actions (agenda-actions.ts)
 * hem kunnen hergebruiken. Doet GEEN auth-check: de caller is verantwoordelijk
 * (de API-route via requireApprovedUserForApi, een server-action via zijn eigen
 * sessie-check). De gedeelde bearer-token blijft server-side in `.env`.
 */

export type BotApiResult = {
  ok: boolean
  status: number
  data: unknown
}

/** Pakt een nette foutmelding uit een bot-respons (of een fallback). */
export function botApiError(result: BotApiResult, fallback: string): string {
  const d = result.data
  if (d && typeof d === 'object' && 'error' in d && (d as { error: unknown }).error) {
    return String((d as { error: unknown }).error)
  }
  return fallback
}

export async function callBotLeadApi(
  leadId: string,
  endpoint: string,
  payload: unknown = {},
): Promise<BotApiResult> {
  const botUrl = process.env.DASHBOARD_API_URL
  const token = process.env.DASHBOARD_API_TOKEN
  if (!botUrl || !token) {
    return {
      ok: false,
      status: 503,
      data: {
        ok: false,
        error: 'Bot-API niet geconfigureerd (DASHBOARD_API_URL / DASHBOARD_API_TOKEN)',
      },
    }
  }

  try {
    const res = await fetch(
      `${botUrl}/dashboard-api/lead/${encodeURIComponent(leadId)}/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload ?? {}),
      },
    )

    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { ok: res.ok, message: text }
    }
    return { ok: res.ok, status: res.status, data }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      data: { ok: false, error: e instanceof Error ? e.message : 'Bot-API niet bereikbaar' },
    }
  }
}
