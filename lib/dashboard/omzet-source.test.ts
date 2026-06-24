import { describe, it, expect } from 'vitest'
import { buildOmzetRows, latestSentTotaalByLead, type WonLeadInput, type SentOfferteInput } from './omzet-source'

const won = (over: Partial<WonLeadInput>): WonLeadInput => ({
  lead_id: 'L', akkoord_op: '2026-06-10T10:00:00Z', afspraak_geboekt_op: null,
  totaal_prijs: 999, hoofdcategorie: 'oprit', ...over,
})

describe('latestSentTotaalByLead', () => {
  it('pakt het hoogste versienummer per lead', () => {
    const offs: SentOfferteInput[] = [
      { lead_id: 'L', versie: 1, totaal_incl: 100 },
      { lead_id: 'L', versie: 3, totaal_incl: 300 },
      { lead_id: 'L', versie: 2, totaal_incl: 200 },
    ]
    expect(latestSentTotaalByLead(offs).get('L')).toBe(300)
  })
})

describe('buildOmzetRows', () => {
  it('gebruikt het snapshot-bedrag (totaal_incl) i.p.v. totaal_prijs', () => {
    const rows = buildOmzetRows([won({ lead_id: 'L', totaal_prijs: 999 })], [{ lead_id: 'L', versie: 1, totaal_incl: 143 }])
    expect(rows).toEqual([{ wonDate: '2026-06-10T10:00:00Z', prijs: 143, categorie: 'oprit' }])
  })

  it('valt terug op totaal_prijs als er geen verzonden offerte is', () => {
    const rows = buildOmzetRows([won({ lead_id: 'L', totaal_prijs: 250 })], [])
    expect(rows[0].prijs).toBe(250)
  })

  it('0 als er geen offerte en geen totaal_prijs is', () => {
    const rows = buildOmzetRows([won({ totaal_prijs: null })], [])
    expect(rows[0].prijs).toBe(0)
  })

  it('win-datum = akkoord_op, anders afspraak_geboekt_op', () => {
    const a = buildOmzetRows([won({ akkoord_op: null, afspraak_geboekt_op: '2026-06-05T09:00:00Z' })], [])
    expect(a[0].wonDate).toBe('2026-06-05T09:00:00Z')
  })

  it('slaat leads zonder enige win-datum over', () => {
    const rows = buildOmzetRows([won({ akkoord_op: null, afspraak_geboekt_op: null })], [])
    expect(rows).toEqual([])
  })

  it('null-categorie wordt "Onbekend"', () => {
    const rows = buildOmzetRows([won({ hoofdcategorie: null })], [])
    expect(rows[0].categorie).toBe('Onbekend')
  })
})
