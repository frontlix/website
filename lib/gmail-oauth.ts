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
