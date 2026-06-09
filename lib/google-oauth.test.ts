// lib/google-oauth.test.ts
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { buildConsentUrl, redirectUri, refreshAccessToken, listCalendars } from './google-oauth'

beforeAll(() => {
  process.env.GOOGLE_CALENDAR_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD = 'http://localhost:3000'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildConsentUrl', () => {
  it('bevat de juiste scopes, offline access en consent-prompt', () => {
    const url = new URL(buildConsentUrl('state-abc'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('state')).toBe('state-abc')
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri())
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar')
    expect(url.searchParams.get('scope')).toContain('email')
  })
})

describe('refreshAccessToken', () => {
  it('POST naar het token-endpoint met grant_type=refresh_token en geeft access_token terug', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'fresh-token' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const token = await refreshAccessToken('my-refresh-token')

    expect(token).toBe('fresh-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    expect(init.method).toBe('POST')
    const body = init.body as URLSearchParams
    expect(body.get('grant_type')).toBe('refresh_token')
    expect(body.get('refresh_token')).toBe('my-refresh-token')
    expect(body.get('client_id')).toBe('test-client-id')
    expect(body.get('client_secret')).toBe('test-secret')
  })

  it('gooit als de response niet ok is', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'invalid_grant' }),
    )
    await expect(refreshAccessToken('bad')).rejects.toThrow(/Token-refresh faalde/)
  })

  it('gooit als er geen access_token terugkomt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    await expect(refreshAccessToken('x')).rejects.toThrow(/Geen access_token/)
  })
})

describe('listCalendars', () => {
  it('GET naar calendarList met bearer-token en mapt items naar id/summary/primary', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { id: 'primary-id', summary: 'Hoofdagenda', primary: true },
          { id: 'schoon-straatje@group.calendar.google.com', summary: 'Schoon Straatje' },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const calendars = await listCalendars('access-123')

    expect(calendars).toEqual([
      { id: 'primary-id', summary: 'Hoofdagenda', primary: true },
      { id: 'schoon-straatje@group.calendar.google.com', summary: 'Schoon Straatje', primary: false },
    ])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://www.googleapis.com/calendar/v3/users/me/calendarList')
    expect(init.headers.Authorization).toBe('Bearer access-123')
  })

  it('geeft een lege lijst als er geen items zijn', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    await expect(listCalendars('x')).resolves.toEqual([])
  })

  it('gooit als de response niet ok is', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' }),
    )
    await expect(listCalendars('x')).rejects.toThrow(/Kalenderlijst ophalen faalde/)
  })
})
