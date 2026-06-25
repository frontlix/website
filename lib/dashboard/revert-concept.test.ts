import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FALLBACK_PRICING } from './pricing-types'
import { DEFAULTS } from './manual-offerte-types'

const {
  mockRequireApprovedUser,
  mockRevalidatePath,
  mockFrom,
  mockOffertesMaybeSingle,
  mockLeadsMaybeSingle,
  mockPrijsregelsInsert,
  mockPrijsregelsDelete,
  mockOffertesDeleteEq,
  mockLeadsUpdate,
  mockLeadsUpdateEq,
} = vi.hoisted(() => {
  const mockRequireApprovedUser = vi.fn(() => Promise.resolve())
  const mockRevalidatePath = vi.fn()
  // Eerste maybeSingle-call = concept, tweede = verstuurde versie.
  const mockOffertesMaybeSingle = vi.fn()
  // Lead-read aan het eind van revertConcept (voor de client-resync-data).
  const mockLeadsMaybeSingle = vi.fn(
    (): Promise<{ data: Record<string, unknown> | null; error: null }> =>
      Promise.resolve({ data: null, error: null }),
  )
  const mockPrijsregelsInsert = vi.fn((_rows: Array<Record<string, unknown>>) =>
    Promise.resolve({ error: null }),
  )
  const mockPrijsregelsDelete = vi.fn(() => Promise.resolve({ error: null }))
  const mockOffertesDeleteEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockLeadsUpdateEq = vi.fn(() => Promise.resolve({ error: null }))
  // Vangt de leads.update-payload zodat tests kunnen controleren WELKE velden
  // worden teruggezet.
  const mockLeadsUpdate = vi.fn((_payload: Record<string, unknown>) => ({
    eq: mockLeadsUpdateEq,
  }))

  // Chainbaar select-object voor offertes: ondersteunt zowel
  // .eq().eq().maybeSingle() als .eq().eq().order().limit().maybeSingle().
  const selectChain: Record<string, unknown> = {}
  selectChain.eq = () => selectChain
  selectChain.order = () => selectChain
  selectChain.limit = () => selectChain
  selectChain.maybeSingle = mockOffertesMaybeSingle

  // Chainbaar select-object voor leads: .eq().maybeSingle().
  const leadsSelectChain: Record<string, unknown> = {}
  leadsSelectChain.eq = () => leadsSelectChain
  leadsSelectChain.maybeSingle = mockLeadsMaybeSingle

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
      return {
        update: mockLeadsUpdate,
        select: () => leadsSelectChain,
      }
    }
    throw new Error(`onverwachte tabel: ${table}`)
  })

  return {
    mockRequireApprovedUser,
    mockRevalidatePath,
    mockFrom,
    mockOffertesMaybeSingle,
    mockLeadsMaybeSingle,
    mockPrijsregelsInsert,
    mockPrijsregelsDelete,
    mockOffertesDeleteEq,
    mockLeadsUpdate,
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

describe('revertConcept met object-snapshot (schemaVersie 1, geen data)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLeadsMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockOffertesMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'CONCEPT-1' }, error: null }) // concept
      .mockResolvedValueOnce({
        data: {
          id: 'VERSTUURD-1',
          versie: 1,
          korting_pct: 0,
          totaal_incl: 477.55,
          // schemaVersie 1: pricing + regels, GEEN data-veld.
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

  it('zet bij ontbrekende data alleen het kortingspercentage op de lead (legacy)', async () => {
    await revertConcept('LEAD-1')
    expect(mockLeadsUpdate).toHaveBeenCalledTimes(1)
    const payload = mockLeadsUpdate.mock.calls[0][0]
    // Legacy-pad: alleen korting_percentage, geen volledige veldenset.
    expect(payload).toEqual({ korting_percentage: 0 })
    expect(payload).not.toHaveProperty('m2')
  })
})

describe('revertConcept met volledige snapshot (schemaVersie 2, met data)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const bevrorenData = { ...DEFAULTS, m2: 44, afstand_km: 171, korting_percentage: 0 }

    mockOffertesMaybeSingle
      .mockResolvedValueOnce({ data: { id: 'CONCEPT-1' }, error: null }) // concept
      .mockResolvedValueOnce({
        data: {
          id: 'VERSTUURD-1',
          versie: 1,
          korting_pct: 0,
          totaal_incl: 119.92,
          // schemaVersie 2: bevat OOK de volledige invoer.
          regels_snapshot: {
            schemaVersie: 2,
            pricing: FALLBACK_PRICING,
            regels: snapshotRegels,
            kortingPct: 0,
            data: bevrorenData,
          },
        },
        error: null,
      }) // verstuurd

    // Na het terugzetten leest revertConcept de lead opnieuw voor de
    // client-resync; geef een lead met de teruggezette m2 terug.
    mockLeadsMaybeSingle.mockResolvedValue({
      data: { lead_id: 'LEAD-1', naam: 'chris', m2: 44, afstand_km: 171, offerte_geldigheid_dagen: 13 },
      error: null,
    })
  })

  it('zet de werk-invoer (m2/afstand + totaal_prijs) terug op de lead', async () => {
    const res = await revertConcept('LEAD-1')
    expect(res.ok).toBe(true)
    if (!res.ok) return // type-narrowing voor res.data hieronder

    expect(mockLeadsUpdate).toHaveBeenCalledTimes(1)
    const payload = mockLeadsUpdate.mock.calls[0][0]
    // De werk-invoer wordt teruggezet uit de bevroren data.
    expect(payload.m2).toBe(44)
    expect(payload.afstand_km).toBe(171)
    // totaal_prijs op de bevroren verstuurde waarde.
    expect(payload.totaal_prijs).toBe(119.92)
    // Klant/adres-velden worden bewust NIET teruggezet.
    expect(payload).not.toHaveProperty('naam')
    expect(payload).not.toHaveProperty('email')

    // De herstelde editor-state komt terug voor de client-resync.
    expect(res.data?.form.m2).toBe(44)
    expect(res.data?.geldigheidDagen).toBe(13)
  })
})
