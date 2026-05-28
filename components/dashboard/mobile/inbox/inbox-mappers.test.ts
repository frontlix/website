import { describe, it, expect } from 'vitest'
import { bucketFor, speakerFor } from './inbox-mappers'

describe('bucketFor', () => {
  const now = new Date('2026-05-28T12:00:00Z')
  it('live: < 30 min', () =>
    expect(bucketFor(new Date('2026-05-28T11:45:00Z').toISOString(), now)).toBe('live'))
  it('today: zelfde dag > 30 min', () =>
    expect(bucketFor(new Date('2026-05-28T08:00:00Z').toISOString(), now)).toBe('today'))
  it('yest: gisteren', () =>
    expect(bucketFor(new Date('2026-05-27T20:00:00Z').toISOString(), now)).toBe('yest'))
  it('older', () =>
    expect(bucketFor(new Date('2026-05-20T20:00:00Z').toISOString(), now)).toBe('older'))
})

describe('speakerFor', () => {
  it('inkomend → klant', () => expect(speakerFor('inkomend')).toBe('klant'))
  it('uitgaand → surface', () => expect(speakerFor('uitgaand')).toBe('surface'))
})
