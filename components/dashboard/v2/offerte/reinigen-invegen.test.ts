import { describe, it, expect } from "vitest";
import { mapWizardToManualOfferte, type WizardSubmitState } from "./offerte-mappers";
import { computeRules } from "@/lib/dashboard/manual-offerte-rules";
import { FALLBACK_PRICING } from "@/lib/dashboard/pricing-types";

// Regressietest voor de bug "alleen reinigen kreeg tóch invegen + voegzand":
// de wizard's oppervlakte-invoer vult voegzandM2 altijd, dus de mapper moet
// voegzand alleen activeren als Invegen ook echt is aangeklikt, en reiniging
// alleen meetellen als Reinigen aanstaat (reinigen_actief).

function baseState(over: Partial<WizardSubmitState>): WizardSubmitState {
  return {
    klant: { naam: "Test", bedrijf: "", straat: "", nr: "", postcode: "", plaats: "", tel: "", email: "", initials: "T" },
    factuurZelfde: true,
    factuur: { straat: "", nr: "", postcode: "", plaats: "" },
    m2: 10,
    qty: { invegen: 0, rollen: 0 },
    rolPrijs: "8,50",
    // Simuleert wat de wizard's setM2 doet: voegzandM2 volgt de oppervlakte,
    // óók als Invegen niet is gekozen.
    voegzandM2: { normaal: 10, onkruidwerend: 0 },
    voegzandZakken: { normaal: 2, onkruidwerend: 0 },
    voegzandDekking: { normaal: 5, onkruidwerend: 5 },
    zandPrijzen: { normaal: "2,90", onkruidwerend: "20,90" },
    diensten: { Reinigen: false, Invegen: false, Beschermlaag: false, "Preventieve onkruid": false, Onderhoudsabonnement: false },
    groeneAanslag: false,
    kleur: "Naturel",
    korstmosConditie: false,
    kortingType: "procent",
    kortingPct: "",
    kortingEuro: "",
    kortingReden: "",
    geldigheidDagen: 21,
    bericht: "",
    kanaal: "email",
    afstandKm: null,
    extraArbeid: { minuten: 0, personen: 0, omschrijving: "" },
    ...over,
  };
}

const descs = (state: WizardSubmitState) =>
  computeRules(mapWizardToManualOfferte(state), FALLBACK_PRICING).map((r) => r.desc);

describe("reinigen/invegen ontkoppeld (mapper → computeRules)", () => {
  it("alleen Reinigen → enkel reiniging, geen invegen of voegzand", () => {
    const d = descs(baseState({ diensten: { Reinigen: true, Invegen: false, Beschermlaag: false, "Preventieve onkruid": false, Onderhoudsabonnement: false } }));
    expect(d).toEqual(["Reiniging oppervlak (dagprijs)"]);
    expect(d.some((x) => x.toLowerCase().includes("invegen"))).toBe(false);
    expect(d.some((x) => x.toLowerCase().includes("voegzand"))).toBe(false);
  });

  it("alleen Invegen → invegen-arbeid + voegzand, geen reiniging", () => {
    const d = descs(baseState({ diensten: { Reinigen: false, Invegen: true, Beschermlaag: false, "Preventieve onkruid": false, Onderhoudsabonnement: false } }));
    expect(d.some((x) => x.includes("Reiniging"))).toBe(false);
    expect(d).toContain("Invegen normaal voegzand excl voegzand");
    expect(d.some((x) => x.startsWith("Voegzand normaal"))).toBe(true);
  });

  it("Reinigen + Invegen → reiniging + invegen + voegzand", () => {
    const d = descs(baseState({ diensten: { Reinigen: true, Invegen: true, Beschermlaag: false, "Preventieve onkruid": false, Onderhoudsabonnement: false } }));
    expect(d).toContain("Reiniging oppervlak (dagprijs)");
    expect(d).toContain("Invegen normaal voegzand excl voegzand");
    expect(d.some((x) => x.startsWith("Voegzand normaal"))).toBe(true);
  });
});
