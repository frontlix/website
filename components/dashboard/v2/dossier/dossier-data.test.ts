import { describe, it, expect } from 'vitest'
import { deriveAlVerstuurd } from './dossier-data'

describe('deriveAlVerstuurd', () => {
  it('een verstuurde offerte telt als verstuurd', () => {
    expect(deriveAlVerstuurd([{ concept: false, tone: 'verstuurd' }])).toBe(true)
  })

  it('een offerte die op goedkeuring wacht telt NIET als verstuurd', () => {
    expect(
      deriveAlVerstuurd([{ concept: false, tone: 'verstuurd', wachtOpGoedkeuring: true }]),
    ).toBe(false)
  })

  it('een concept telt niet als verstuurd', () => {
    expect(deriveAlVerstuurd([{ concept: true, tone: 'concept' }])).toBe(false)
  })

  it('een archief-offerte telt niet als verstuurd', () => {
    expect(deriveAlVerstuurd([{ concept: false, tone: 'archief' }])).toBe(false)
  })

  it('leeg, dan niet verstuurd', () => {
    expect(deriveAlVerstuurd([])).toBe(false)
  })
})
