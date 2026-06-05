import { describe, expect, it } from 'vitest'
import { cumulativeStarts } from './timeline'

describe('cumulativeStarts', () => {
  it('geeft starttijden plus de totale duur als laatste element', () => {
    expect(cumulativeStarts([7, 12, 10])).toEqual([0, 7, 19, 29])
  })

  it('werkt met een lege lijst', () => {
    expect(cumulativeStarts([])).toEqual([0])
  })
})
