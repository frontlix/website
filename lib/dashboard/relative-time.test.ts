import { describe, it, expect } from 'vitest'
import { shortTimeAgo } from './relative-time'

describe('shortTimeAgo', () => {
  const now = new Date('2026-05-28T12:00:00Z').getTime()
  it('geeft "nu" onder 60s', () => {
    expect(shortTimeAgo(new Date(now - 30_000).toISOString(), now)).toBe('nu')
  })
  it('minuten', () => {
    expect(shortTimeAgo(new Date(now - 12 * 60_000).toISOString(), now)).toBe('12m')
  })
  it('uren', () => {
    expect(shortTimeAgo(new Date(now - 3 * 3600_000).toISOString(), now)).toBe('3u')
  })
  it('dagen', () => {
    expect(shortTimeAgo(new Date(now - 2 * 86400_000).toISOString(), now)).toBe('2d')
  })
  it('leeg/ongeldig → "—"', () => {
    expect(shortTimeAgo(null, now)).toBe('—')
  })
})
