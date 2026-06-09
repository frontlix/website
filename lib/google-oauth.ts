// lib/google-oauth.ts
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo'

const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar']

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

/** De callback-URL, afgeleid van de dashboard-host. Moet exact in de Google-client staan. */
export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/integrations/google-calendar/callback`
}

export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: SCOPES.join(' '),
    state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export interface TokenResult {
  refreshToken: string
  accessToken: string
}

/** Wisselt de auth-code in voor tokens. Gooit als er geen refresh_token terugkomt. */
export async function exchangeCode(code: string): Promise<TokenResult> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token-exchange faalde: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { refresh_token?: string; access_token?: string }
  if (!json.refresh_token) throw new Error('Geen refresh_token van Google (prompt=consent vereist)')
  return { refreshToken: json.refresh_token, accessToken: json.access_token || '' }
}

/** Haalt het e-mailadres van het gekoppelde account op (voor de statusweergave). */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { email?: string }
  return json.email ?? null
}
