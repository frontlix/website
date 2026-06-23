// lib/gmail-oauth.test.ts
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { buildGmailConsentUrl, gmailRedirectUri, exchangeGmailCode } from './gmail-oauth'

beforeAll(() => {
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD = 'http://localhost:3000'
})

afterEach(() => vi.restoreAllMocks())

describe('buildGmailConsentUrl', () => {
  it('vraagt de gmail-scopes, offline access en consent-prompt', () => {
    const url = new URL(buildGmailConsentUrl('state-xyz'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('state')).toBe('state-xyz')
    expect(url.searchParams.get('redirect_uri')).toBe(gmailRedirectUri())
    const scope = url.searchParams.get('scope') ?? ''
    expect(scope).toContain('https://www.googleapis.com/auth/gmail.labels')
    expect(scope).toContain('https://www.googleapis.com/auth/gmail.settings.basic')
  })

  it('gmailRedirectUri wijst naar de gmail-callback', () => {
    expect(gmailRedirectUri()).toBe('http://localhost:3000/api/integrations/gmail/callback')
  })
})

describe('exchangeGmailCode', () => {
  it('POST naar het token-endpoint met de gmail-redirect en geeft het refresh-token terug', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ refresh_token: 'r-token', access_token: 'a-token' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await exchangeGmailCode('the-code')

    expect(res).toEqual({ refreshToken: 'r-token', accessToken: 'a-token' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    const body = init.body as URLSearchParams
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('redirect_uri')).toBe(gmailRedirectUri())
    expect(body.get('client_id')).toBe('test-client-id')
  })

  it('gooit als er geen refresh_token terugkomt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: 'x' }) }))
    await expect(exchangeGmailCode('c')).rejects.toThrow(/Geen refresh_token/)
  })
})
