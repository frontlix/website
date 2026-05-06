import { describe, it, expect } from 'vitest'
import {
  parseLeadsFilters,
  serializeLeadsFilters,
  countActiveFilters,
  hasActiveFilters,
  normalizePhone,
} from './lead-filters'

describe('parseLeadsFilters', () => {
  it('returnt lege filters voor lege params', () => {
    expect(parseLeadsFilters({})).toEqual({})
  })

  it('parseert alle filters uit volledige params', () => {
    expect(
      parseLeadsFilters({
        q: 'jan',
        status: 'opgevolgd',
        tags: 'hot,vip',
        dateField: 'aangemaakt',
        from: '2026-04-01',
        to: '2026-04-30',
        fase: 'onderhandelen',
      })
    ).toEqual({
      q: 'jan',
      status: 'opgevolgd',
      tags: ['hot', 'vip'],
      dateField: 'aangemaakt',
      from: '2026-04-01',
      to: '2026-04-30',
      fase: 'onderhandelen',
    })
  })

  it('negeert ongeldige status', () => {
    expect(parseLeadsFilters({ status: 'gibberish' })).toEqual({})
  })

  it('negeert ongeldige fase', () => {
    expect(parseLeadsFilters({ fase: 'something_else' })).toEqual({})
  })

  it('negeert ongeldig datum-formaat', () => {
    expect(parseLeadsFilters({ from: 'not-a-date', to: '2026/04/01' })).toEqual({})
  })

  it('negeert ongeldige dateField waarde', () => {
    expect(parseLeadsFilters({ dateField: 'gibberish' })).toEqual({})
  })

  it('negeert lege tags string', () => {
    expect(parseLeadsFilters({ tags: '' })).toEqual({})
  })

  it('strip whitespace en lege segmenten in tags', () => {
    expect(parseLeadsFilters({ tags: ' hot ,, vip ' })).toEqual({ tags: ['hot', 'vip'] })
  })

  it('trimt q whitespace', () => {
    expect(parseLeadsFilters({ q: '  jan  ' })).toEqual({ q: 'jan' })
  })

  it('werkt met URLSearchParams als input', () => {
    const sp = new URLSearchParams('q=piet&status=open')
    expect(parseLeadsFilters(sp)).toEqual({ q: 'piet', status: 'open' })
  })
})

describe('serializeLeadsFilters', () => {
  it('returnt lege string voor lege filters', () => {
    expect(serializeLeadsFilters({})).toBe('')
  })

  it('serialiseert volledige filters', () => {
    const qs = serializeLeadsFilters({
      q: 'jan',
      status: 'opgevolgd',
      tags: ['hot', 'vip'],
      dateField: 'aangemaakt',
      from: '2026-04-01',
      to: '2026-04-30',
      fase: 'onderhandelen',
    })
    expect(qs).toContain('q=jan')
    expect(qs).toContain('status=opgevolgd')
    expect(qs).toContain('tags=hot%2Cvip')
    expect(qs).toContain('dateField=aangemaakt')
    expect(qs).toContain('from=2026-04-01')
    expect(qs).toContain('to=2026-04-30')
    expect(qs).toContain('fase=onderhandelen')
  })

  it('skipt undefined velden', () => {
    expect(serializeLeadsFilters({ q: 'jan' })).toBe('q=jan')
  })

  it('skipt lege tags array', () => {
    expect(serializeLeadsFilters({ tags: [] })).toBe('')
  })
})

describe('countActiveFilters', () => {
  it('returnt 0 voor lege filters', () => {
    expect(countActiveFilters({})).toBe(0)
  })

  it('telt elke filter individueel', () => {
    expect(
      countActiveFilters({
        q: 'jan',
        status: 'opgevolgd',
        tags: ['hot'],
        from: '2026-04-01',
        fase: 'onderhandelen',
      })
    ).toBe(5)
  })

  it('telt from+to als 1 datum-filter', () => {
    expect(countActiveFilters({ from: '2026-04-01', to: '2026-04-30' })).toBe(1)
  })

  it('telt alleen-from of alleen-to ook als 1', () => {
    expect(countActiveFilters({ from: '2026-04-01' })).toBe(1)
    expect(countActiveFilters({ to: '2026-04-30' })).toBe(1)
  })

  it('telt lege tags array niet', () => {
    expect(countActiveFilters({ tags: [] })).toBe(0)
  })
})

describe('hasActiveFilters', () => {
  it('false voor leeg', () => {
    expect(hasActiveFilters({})).toBe(false)
  })
  it('true zodra 1 filter actief is', () => {
    expect(hasActiveFilters({ q: 'jan' })).toBe(true)
  })
})

describe('normalizePhone', () => {
  it('strip spaties, plus, dashes en haakjes', () => {
    expect(normalizePhone('+31 (0) 6-12-34 56 78')).toBe('310612345678')
  })
  it('laat alfanumeriek met rust', () => {
    expect(normalizePhone('0612345678')).toBe('0612345678')
  })
})
