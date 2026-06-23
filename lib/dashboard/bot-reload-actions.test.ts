import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const OLD_ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  process.env.BOT_RELOAD_URL = 'http://bot.local:3001/dashboard-api/config/reload'
  process.env.BOT_RELOAD_TOKEN = 'test-token'
})

afterEach(() => {
  process.env = { ...OLD_ENV }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('triggerBotConfigReload', () => {
  it('POST met bearer-token bij status 200 geeft ok:true', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const { triggerBotConfigReload } = await import('./bot-reload-actions')
    const res = await triggerBotConfigReload()

    expect(res).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer test-token')
  })

  it('geeft ok:false zonder te gooien als de fetch faalt', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    vi.stubGlobal('fetch', fetchMock)

    const { triggerBotConfigReload } = await import('./bot-reload-actions')
    const res = await triggerBotConfigReload()

    expect(res).toEqual({ ok: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('geeft ok:false en roept fetch NIET aan zonder env', async () => {
    delete process.env.BOT_RELOAD_URL
    delete process.env.BOT_RELOAD_TOKEN
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { triggerBotConfigReload } = await import('./bot-reload-actions')
    const res = await triggerBotConfigReload()

    expect(res).toEqual({ ok: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
