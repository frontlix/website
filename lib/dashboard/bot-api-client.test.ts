import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callBotLeadApi, botApiError } from './bot-api-client'

const OLD_ENV = { ...process.env }

beforeEach(() => {
  process.env.DASHBOARD_API_URL = 'http://bot.local:3001'
  process.env.DASHBOARD_API_TOKEN = 'secret-token'
})

afterEach(() => {
  process.env = { ...OLD_ENV }
  vi.restoreAllMocks()
})

describe('callBotLeadApi', () => {
  it('POST naar het lead-endpoint met bearer-token en JSON-payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await callBotLeadApi('lead-123', 'reschedule', {
      datum: '2026-06-15',
      starttijd: '14:30',
    })

    expect(result).toEqual({ ok: true, status: 200, data: { ok: true } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://bot.local:3001/dashboard-api/lead/lead-123/reschedule')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer secret-token')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ datum: '2026-06-15', starttijd: '14:30' })
  })

  it('encodeert de leadId in de URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' })
    vi.stubGlobal('fetch', fetchMock)
    await callBotLeadApi('a/b c', 'book-appointment', {})
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://bot.local:3001/dashboard-api/lead/a%2Fb%20c/book-appointment',
    )
  })

  it('geeft status 503 als de bot-config ontbreekt', async () => {
    delete process.env.DASHBOARD_API_URL
    const result = await callBotLeadApi('lead-1', 'reschedule', {})
    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
  })

  it('geeft status 502 als de fetch faalt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')))
    const result = await callBotLeadApi('lead-1', 'reschedule', {})
    expect(result.ok).toBe(false)
    expect(result.status).toBe(502)
    expect(botApiError(result, 'fallback')).toBe('connect ECONNREFUSED')
  })

  it('valt terug op { ok, message } als de respons geen JSON is', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal Error' }),
    )
    const result = await callBotLeadApi('lead-1', 'reschedule', {})
    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
    expect(result.data).toEqual({ ok: false, message: 'Internal Error' })
  })
})

describe('botApiError', () => {
  it('pakt de error uit de bot-respons', () => {
    expect(
      botApiError({ ok: false, status: 400, data: { error: 'datum must be YYYY-MM-DD' } }, 'fallback'),
    ).toBe('datum must be YYYY-MM-DD')
  })
  it('gebruikt de fallback als er geen error in de respons zit', () => {
    expect(botApiError({ ok: false, status: 500, data: { ok: false } }, 'fallback')).toBe('fallback')
    expect(botApiError({ ok: false, status: 500, data: null }, 'fallback')).toBe('fallback')
  })
})
