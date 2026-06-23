// lib/gmail-oauth.ts
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export const GMAIL_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.settings.basic',
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
  return { refreshToken: json.refresh_token, accessToken: json.access_token || '' }
}

// append in lib/gmail-oauth.ts
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export const APPROVAL_FILTER_QUERY = 'subject:"Offerte ter goedkeuring"'

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

/** Geeft het id van het approval-filter; maakt het aan als het nog niet bestaat. */
export async function ensureApprovalFilter(accessToken: string, labelId: string): Promise<string> {
  const listRes = await fetch(`${GMAIL_API}/settings/filters`, { headers: authHeaders(accessToken) })
  if (!listRes.ok) throw new Error(`Filters ophalen faalde: ${listRes.status} ${await listRes.text()}`)
  const list = (await listRes.json()) as {
    filter?: Array<{ id?: string; criteria?: { query?: string }; action?: { addLabelIds?: string[] } }>
  }
  const existing = (list.filter ?? []).find(
    (f) => f.criteria?.query === APPROVAL_FILTER_QUERY && (f.action?.addLabelIds ?? []).includes(labelId),
  )
  if (existing?.id) return existing.id

  const createRes = await fetch(`${GMAIL_API}/settings/filters`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ criteria: { query: APPROVAL_FILTER_QUERY }, action: { addLabelIds: [labelId] } }),
  })
  if (!createRes.ok) throw new Error(`Filter aanmaken faalde: ${createRes.status} ${await createRes.text()}`)
  const created = (await createRes.json()) as { id?: string }
  if (!created.id) throw new Error('Geen filter-id terug van Gmail')
  return created.id
}

export async function deleteFilter(accessToken: string, filterId: string): Promise<void> {
  const res = await fetch(`${GMAIL_API}/settings/filters/${filterId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
  // 404 = al weg; dat is prima.
  if (!res.ok && res.status !== 404) {
    throw new Error(`Filter verwijderen faalde: ${res.status} ${await res.text()}`)
  }
}
