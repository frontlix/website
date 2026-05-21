import { describe, it, expect, vi, afterEach } from 'vitest'
import { getInitialMatch } from './useMediaQuery'

describe('getInitialMatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('geeft false terug zonder window (SSR)', () => {
    // In node-env is `window` al undefined.
    expect(getInitialMatch('(max-width: 640px)')).toBe(false)
  })

  it('geeft true terug als matchMedia matcht', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('640px') }),
    })
    expect(getInitialMatch('(max-width: 640px)')).toBe(true)
  })

  it('geeft false terug als matchMedia niet matcht', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('320px') }),
    })
    expect(getInitialMatch('(max-width: 640px)')).toBe(false)
  })

  it('geeft false terug als window.matchMedia ontbreekt', () => {
    vi.stubGlobal('window', {}) // window aanwezig, geen matchMedia
    expect(getInitialMatch('(max-width: 640px)')).toBe(false)
  })
})
