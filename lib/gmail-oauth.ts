// lib/gmail-oauth.ts
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export const GMAIL_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.labels',
]

function clientId(): string {
  const v = process.env.GOOGLE_CALENDAR_CLIENT_ID
  if (!v) throw new Error('GOOGLE_CALENDAR_CLIENT_ID ontbreekt')
  return v
}

function clientSecret(): string {
  const v = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  if (!v) throw new Error('GOOGLE_CALENDAR_CLIENT_SECRET ontbreekt')
  return v
}

/** Callback-URL voor de Gmail-koppeling. Moet exact in de Google-client staan. */
export function gmailRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/integrations/gmail/callback`
}

export function buildGmailConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: gmailRedirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: GMAIL_SCOPES.join(' '),
    state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export async function exchangeGmailCode(
  code: string,
): Promise<{ refreshToken: string; accessToken: string }> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: gmailRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token-exchange faalde: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { refresh_token?: string; access_token?: string }
  if (!json.refresh_token) throw new Error('Geen refresh_token van Google (prompt=consent vereist)')
  if (!json.access_token) throw new Error('Geen access_token van Google')
  return { refreshToken: json.refresh_token, accessToken: json.access_token }
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/** Geeft het id van het label met deze naam; maakt het aan als het nog niet bestaat. */
export async function ensureLabel(accessToken: string, name: string): Promise<string> {
  const listRes = await fetch(`${GMAIL_API}/labels`, { headers: authHeaders(accessToken) })
  if (!listRes.ok) throw new Error(`Labels ophalen faalde: ${listRes.status} ${await listRes.text()}`)
  const list = (await listRes.json()) as { labels?: Array<{ id?: string; name?: string }> }
  const existing = (list.labels ?? []).find((l) => l.name === name)
  if (existing?.id) return existing.id

  const createRes = await fetch(`${GMAIL_API}/labels`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ name, labelListVisibility: 'labelShow', messageListVisibility: 'show' }),
  })
  if (!createRes.ok) throw new Error(`Label aanmaken faalde: ${createRes.status} ${await createRes.text()}`)
  const created = (await createRes.json()) as { id?: string }
  if (!created.id) throw new Error('Geen label-id terug van Gmail')
  return created.id
}
