import { describe, it, expect } from 'vitest'
import { toOwnerContactState } from './instellingen-mappers'
import { OWNER_CONTACT_DEFAULT } from './instellingen-data'

describe('toOwnerContactState', () => {
  it('mapt de tenant-rij naar de UI-state', () => {
    const state = toOwnerContactState({
      eigenaar_email: 'basis@b.nl',
      goedkeuring_email: 'goed@b.nl',
      meldingen_email: null,
      eigenaar_whatsapp: '31612345678',
    } as never)
    expect(state).toEqual({
      basisEmail: 'basis@b.nl',
      goedkeuringEmail: 'goed@b.nl',
      meldingenEmail: '',
      whatsapp: '31612345678',
    })
  })
  it('geeft de default bij null', () => {
    expect(toOwnerContactState(null)).toEqual(OWNER_CONTACT_DEFAULT)
  })
})
