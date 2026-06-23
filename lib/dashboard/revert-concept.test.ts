import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FALLBACK_PRICING } from './pricing-types'

const {
  mockRequireApprovedUser,
  mockRevalidatePath,
  mockFrom,
  mockOffertesMaybeSingle,
  mockPrijsregelsInsert,
  mockPrijsregelsDelete,
  mockOffertesDeleteEq,
  mockLeadsUpdateEq,
} = vi.hoisted(() => {
  const mockRequireApprovedUser = vi.fn(() => Promise.resolve())
  const mockRevalidatePath = vi.fn()
  // Eerste maybeSingle-call = concept, tweede = verstuurde versie.
  const mockOffertesMaybeSingle = vi.fn()
  const mockPrijsregelsInsert = vi.fn((_rows: Array<Record<string, unknown>>) =>
    Promise.resolve({ error: null }),
  )
  const mockPrijsregelsDelete = vi.fn(() => Promise.resolve({ error: null }))
  const mockOffertesDeleteEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockLeadsUpdateEq = vi.fn(() => Promise.resolve({ error: null }))

  // Chainbaar select-object dat zowel .eq().eq().maybeSingle() als
  // .eq().eq().order().limit().maybeSingle() ondersteunt.
  const selectChain: Record<string, unknown> = {}
  selectChain.eq = () => selectChain
  selectChain.order = () => selectChain
  selectChain.limit = () => selectChain
  selectChain.maybeSingle = mockOffertesMaybeSingle

  const mockFrom = vi.fn((table: string) => {
    if (table === 'offertes') {
      return {
        select: () => selectChain,
        delete: () => ({ eq: mockOffertesDeleteEq }),
      }
    }
    if (table === 'prijsregels') {
      return {
        delete: () => ({ eq: mockPrijsregelsDelete }),
        insert: mockPrijsregelsInsert,
      }
    }
    if (table === 'leads') {
      return { update: () => ({ eq: mockLeadsUpdateEq }) }
    }
    throw new Error(`onverwachte tabel: ${table}`)
  })

  return {
    mockRequireApprovedUser,
    mockRevalidatePath,
    mockFrom,
    mockOffertesMaybeSingle,
    mockPrijsregelsInsert,
    mockPrijsregelsDelete,
    mockOffertesDeleteEq,
    mockLeadsUpdateEq,
  }
})

vi.mock('./supabase-admin', () => ({
  getDashboardAdmin: () => ({ from: mockFrom }),
}))
vi.mock('./require-approved-user', () => ({
  requireApprovedUser: mockRequireApprovedUser,
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { revertConcept } from './offerte-draft-actions'

const snapshotRegels = [
  { omschrijving: 'Reiniging oppervlak (dagprijs)', aantal: 1, eenheid: 'dag', stukprijs: 395, totaal: 395, volgorde: 1 },
  { omschrijving: 'Preventieve onkruidbeheersing', aantal: 90, eenheid: 'm²', stukprijs: 4.5, totaal: 405, volgorde: 2 },
]

describe('revertConcept met object-snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOffertesMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'CONCEPT-1' }, error: null }) // concept
      .mockResolvedValueOnce({
        data: {
          id: 'VERSTUURD-1',
          versie: 1,
          korting_pct: 0,
          // Nieuw object-formaat (geen bare array).
          regels_snapshot: { schemaVersie: 1, pricing: FALLBACK_PRICING, regels: snapshotRegels, kortingPct: 0 },
        },
        error: null,
      }) // verstuurd
  })

  it('herstelt prijsregels uit de object-snapshot', async () => {
    const res = await revertConcept('LEAD-1')
    expect(res.ok).toBe(true)
    expect(mockPrijsregelsInsert).toHaveBeenCalledTimes(1)
    const rows = mockPrijsregelsInsert.mock.calls[0][0]
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ omschrijving: 'Reiniging oppervlak (dagprijs)', stukprijs: 395 })
    // bot-regels hebben geen bron → moet defaulten naar 'auto_lead'
    expect(rows[1].bron).toBe('auto_lead')
  })
})
