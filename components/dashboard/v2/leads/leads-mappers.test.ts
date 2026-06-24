import { describe, it, expect } from "vitest";
import { applyLeadsFilters } from "./leads-mappers";
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
