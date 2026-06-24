import { describe, it, expect } from 'vitest'
import { toThreads, toLeadContextProps, isOngelezen } from './inbox-mappers'
import type { ConversationPreview } from '@/lib/dashboard/inbox-queries'
import type { InboxLeadContext } from '@/lib/dashboard/inbox-queries'

function baseConversation(overrides: Partial<ConversationPreview>): ConversationPreview {
  return {
    leadId: 'L1',
    naam: 'Test Klant',
    telefoon: '0612345678',
    dashboardStatus: 'open',
    gesprekFase: 'info_verzamelen',
    status: 'in_gesprek',
    eigenaarOvergenomen: false,
    totaalPrijs: null,
    offerteVerstuurd: false,
    needsAction: false,
    inboxGelezenOp: null,
    laatsteBericht: {
      richting: 'inkomend',
      tekst: 'Hallo',
      type: 'tekst',
      timestamp: '2026-06-24T10:00:00Z',
    },
    ...overrides,
  }
}

function baseLeadContext(overrides: Partial<InboxLeadContext>): InboxLeadContext {
  return {
    lead_id: 'L1',
    naam: 'Test Klant',
    telefoon: '0612345678',
    email: null,
    postcode: null,
    plaats: 'Goes',
    straat: null,
    huisnummer: null,
    hoofdcategorie: 'oprit_terras_terrein',
    sub_diensten: null,
    m2: null,
    totaal_prijs: null,
    offerte_verstuurd: false,
    offerte_verstuurd_op: null,
    dashboard_status: 'open',
    gesprek_fase: 'info_verzamelen',
    status: 'in_gesprek',
    eigenaar_overgenomen: false,
    aangemaakt: '2026-06-01T10:00:00Z',
    fotosCount: 0,
    botGepauzeerd: false,
    ...overrides,
  } as InboxLeadContext
}

describe('toThreads hand-over-markering', () => {
  it('zet handover=true bij eigenaarOvergenomen=true', () => {
    const threads = toThreads([baseConversation({ eigenaarOvergenomen: true })])
    expect(threads[0].handover).toBe(true)
  })

  it('zet handover=true bij status=handoff', () => {
    const threads = toThreads([baseConversation({ status: 'handoff' })])
    expect(threads[0].handover).toBe(true)
  })

  it('zet handover=false bij een gewone lead', () => {
    const threads = toThreads([baseConversation({})])
    expect(threads[0].handover).toBe(false)
  })

  it('zet handover=false bij ontbrekende velden (beide false/normaal)', () => {
    const threads = toThreads([baseConversation({ eigenaarOvergenomen: false, status: 'in_gesprek' })])
    expect(threads[0].handover).toBe(false)
  })
})

describe('toLeadContextProps hand-over statusLabel en statusKind', () => {
  it('geeft "Zelf overnemen" + hot bij eigenaar_overgenomen=true', () => {
    const { context } = toLeadContextProps(baseLeadContext({ eigenaar_overgenomen: true }))
    expect(context.statusLabel).toBe('Zelf overnemen')
    expect(context.statusKind).toBe('hot')
  })

  it('geeft "Zelf overnemen" + hot bij status=handoff', () => {
    const { context } = toLeadContextProps(baseLeadContext({ status: 'handoff' }))
    expect(context.statusLabel).toBe('Zelf overnemen')
    expect(context.statusKind).toBe('hot')
  })

  it('geeft de gewone status bij een normale lead', () => {
    const { context } = toLeadContextProps(baseLeadContext({}))
    expect(context.statusLabel).not.toBe('Zelf overnemen')
    expect(context.statusKind).not.toBe('hot')
  })

  it('hand-over wint van onderhandelen-fase', () => {
    const { context } = toLeadContextProps(
      baseLeadContext({ eigenaar_overgenomen: true, gesprek_fase: 'onderhandelen' }),
    )
    expect(context.statusLabel).toBe('Zelf overnemen')
    expect(context.statusKind).toBe('hot')
  })
})

describe('isOngelezen', () => {
  it('is true bij inkomend bericht en nooit gelezen', () => {
    const c = baseConversation({ inboxGelezenOp: null })
    expect(isOngelezen(c)).toBe(true)
  })

  it('is false bij uitgaand bericht', () => {
    const c = baseConversation({ inboxGelezenOp: null, laatsteBericht: { richting: 'uitgaand', tekst: 'Hoi', type: 'tekst', timestamp: '2026-06-24T10:00:00Z' } })
    expect(isOngelezen(c)).toBe(false)
  })

  it('is false als gelezen na het laatste bericht', () => {
    const c = baseConversation({ inboxGelezenOp: '2026-06-24T11:00:00Z' })
    expect(isOngelezen(c)).toBe(false)
  })
})
