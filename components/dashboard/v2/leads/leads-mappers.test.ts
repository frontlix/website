import { describe, it, expect } from "vitest";
import { applyLeadsFilters, mapLeadToV2 } from "./leads-mappers";
import type { LeadListItem } from "@/lib/dashboard/lead-queries";

// Minimale lead-factory; alleen de velden die de filters raken zijn relevant,
// de rest casten we weg (de pure filter leest geen andere velden).
function lead(partial: Partial<LeadListItem>): LeadListItem {
  return {
    lead_id: "x",
    naam: "Test",
    telefoon: "0600000000",
    straat: null,
    huisnummer: null,
    postcode: null,
    plaats: null,
    kanaal: null,
    offerte_verstuurd_op: null,
    akkoord_op: null,
    ...partial,
  } as unknown as LeadListItem;
}

describe("applyLeadsFilters — offertes=open (wachtende offertes)", () => {
  it("houdt alleen verstuurde, nog niet geaccepteerde offertes over (spiegelt countOpenOffertes)", () => {
    const leads = [
      // verstuurd, nog geen akkoord -> wacht
      lead({ lead_id: "a", offerte_verstuurd_op: "2026-06-20T10:00:00Z", akkoord_op: null }),
      // verstuurd én akkoord -> niet meer wachtend
      lead({ lead_id: "b", offerte_verstuurd_op: "2026-06-19T10:00:00Z", akkoord_op: "2026-06-21T10:00:00Z" }),
      // nog geen offerte verstuurd
      lead({ lead_id: "c", offerte_verstuurd_op: null, akkoord_op: null }),
    ];
    const out = applyLeadsFilters(leads, { offertes: "open" });
    expect(out.map((l) => l.lead_id)).toEqual(["a"]);
  });

  it("laat de lijst ongemoeid zonder de offertes-filter", () => {
    const leads = [lead({ lead_id: "a" }), lead({ lead_id: "b" })];
    expect(applyLeadsFilters(leads, {}).length).toBe(2);
  });

  it("combineert met de zoekfilter", () => {
    const leads = [
      lead({ lead_id: "a", naam: "Bakker", offerte_verstuurd_op: "2026-06-20T10:00:00Z", akkoord_op: null }),
      lead({ lead_id: "b", naam: "Wilms", offerte_verstuurd_op: "2026-06-20T10:00:00Z", akkoord_op: null }),
    ];
    const out = applyLeadsFilters(leads, { offertes: "open", q: "bakker" });
    expect(out.map((l) => l.lead_id)).toEqual(["a"]);
  });
});

function baseLead(overrides: Partial<LeadListItem>): LeadListItem {
  return {
    lead_id: 'L1', naam: 'Test', bedrijfsnaam: null, telefoon: null, email: null,
    straat: null, huisnummer: null, postcode: null, plaats: 'Goes',
    hoofdcategorie: null, sub_diensten: null, m2: null, totaal_prijs: null,
    afstand_km: null, status: 'in_gesprek', gesprek_fase: 'info_verzamelen',
    dashboard_status: 'open', bron: null, afspraak_datum: null, afspraak_starttijd: null,
    aangemaakt: '2026-06-01T10:00:00Z', bijgewerkt: '2026-06-01T10:00:00Z', kanaal: 'wa',
    pending_eigenaar_review: null, klus_geblokkeerd: null, offerte_pending_sinds: null,
    offerte_verstuurd: null, offerte_verstuurd_op: null, akkoord_op: null,
    eigenaar_overgenomen: false,
    ...overrides,
  } as LeadListItem
}

describe('leadslijst hand-over-badge', () => {
  it('toont "Zelf overnemen" + hot bij eigenaar_overgenomen=true', () => {
    const lead = mapLeadToV2(baseLead({ eigenaar_overgenomen: true }))
    expect(lead.status).toBe('Zelf overnemen')
    expect(lead.statusKind).toBe('hot')
  })
  it('wint van urgent', () => {
    const lead = mapLeadToV2(baseLead({ eigenaar_overgenomen: true, pending_eigenaar_review: { reden: 'x' } as never }))
    expect(lead.status).toBe('Zelf overnemen')
  })
  it('toont de gewone status bij een normale lead', () => {
    const lead = mapLeadToV2(baseLead({}))
    expect(lead.status).not.toBe('Zelf overnemen')
  })
})
