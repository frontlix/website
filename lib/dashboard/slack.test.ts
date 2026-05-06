import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  process.env.SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL = 'https://hooks.slack.test/abc'
})

import { postSignupNotification } from './slack'

describe('postSignupNotification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('POST naar de configured Slack-webhook met JSON body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )

    await postSignupNotification('Nieuwe aanvraag: Bedrijf X — a@b.c')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://hooks.slack.test/abc')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(init?.body).toBe(
      JSON.stringify({ text: 'Nieuwe aanvraag: Bedrijf X — a@b.c' })
    )
  })

  it('faalt stilletjes (geen exception) als de webhook ontbreekt', async () => {
    delete process.env.SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL
    const fetchSpy = vi.spyOn(global, 'fetch')

    await expect(postSignupNotification('test')).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('faalt stilletjes als Slack 500 retourneert (logt wel)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 })
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(postSignupNotification('test')).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalled()
  })
})
