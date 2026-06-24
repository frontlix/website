import { describe, it, expect } from "vitest";
import { mapBriefData } from "./overzicht-mappers";

const base = {
  chatbotName: "Surface",
  greeting: "Goedemorgen",
  voornaam: "Thierry",
  summary: "Een korte briefing.",
  actieveGesprekken: 2,
  komendeAfspraken: 0,
};

describe("mapBriefData — CTA-label + deeplink", () => {
  it("deeplinkt naar de gefilterde wachtende offertes als er open offertes zijn", () => {
    const brief = mapBriefData({ ...base, openOffertes: 3 });
    expect(brief.cta).toBe("Open de 3 wachtende offertes");
    expect(brief.ctaHref).toBe("/leads?offertes=open");
  });

  it("gebruikt enkelvoud bij precies één wachtende offerte", () => {
    const brief = mapBriefData({ ...base, openOffertes: 1 });
    expect(brief.cta).toBe("Open de 1 wachtende offerte");
    expect(brief.ctaHref).toBe("/leads?offertes=open");
  });

  it("valt terug op de volledige leadslijst zonder wachtende offertes", () => {
    const brief = mapBriefData({ ...base, openOffertes: 0 });
    expect(brief.cta).toBe("Bekijk je leads");
    expect(brief.ctaHref).toBe("/leads");
  });
});
