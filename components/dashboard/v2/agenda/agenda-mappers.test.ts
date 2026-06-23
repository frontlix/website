import { describe, it, expect } from "vitest";
import type { ExternalEvent } from "@/lib/dashboard/external-events-queries";
import type { AgendaDag, AgendaMaandCel } from "./agenda-data";
import {
  mapExternalEventToItem,
  mergeExternalIntoWeekByKeys,
  mergeExternalIntoMonth,
} from "./agenda-mappers";

function ext(over: Partial<ExternalEvent>): ExternalEvent {
  return {
    google_event_id: "g1",
    summary: "Tandarts",
    start_at: "2026-05-13T07:00:00.000Z", // 09:00 Amsterdam (CEST)
    end_at: "2026-05-13T08:00:00.000Z", // 10:00 Amsterdam → 1u
    all_day: false,
    ...over,
  };
}

describe("mapExternalEventToItem", () => {
  it("mapt naar een read-only intern item met ext-key en Google-bron", () => {
    const item = mapExternalEventToItem(ext({}));
    expect(item.type).toBe("intern");
    expect(item.leadId).toBeUndefined();
    expect(item.key).toBe("ext-g1");
    expect(item.titel).toBe("Tandarts");
    expect(item.sub).toBe("Google Agenda");
    expect(item.tijd).toBe("09:00");
    expect(item.duur).toBe("1u");
    expect(item.klaar).toBe(false);
  });

  it("valt terug op 'Google-afspraak' zonder summary", () => {
    expect(mapExternalEventToItem(ext({ summary: null })).titel).toBe("Google-afspraak");
  });

  it("toont geen duur zonder eindtijd", () => {
    expect(mapExternalEventToItem(ext({ end_at: null })).duur).toBe("geen");
  });

  it("all-day: lege tijd, geen duur", () => {
    const item = mapExternalEventToItem(
      ext({ all_day: true, start_at: "2026-05-13T00:00:00.000Z", end_at: null }),
    );
    expect(item.tijd).toBe("");
    expect(item.duur).toBe("geen");
  });
});

describe("mergeExternalIntoWeekByKeys", () => {
  const baseDays: AgendaDag[] = [
    { dag: "Ma", datum: "11", vandaag: false, items: [] },
    {
      dag: "Wo",
      datum: "13",
      vandaag: true,
      items: [
        {
          tijd: "13:00",
          duur: "3u",
          titel: "Klus · Klant",
          sub: "Utrecht",
          plaats: "Utrecht",
          type: "klus",
          klaar: false,
          key: "L1",
          leadId: "L1",
        },
      ],
    },
  ];
  const keys = ["2026-05-11", "2026-05-13"];

  it("voegt het externe event toe op de juiste dag, gesorteerd op tijd", () => {
    const out = mergeExternalIntoWeekByKeys(baseDays, keys, [ext({})]);
    const wo = out[1];
    expect(wo.items.map((i) => i.key)).toEqual(["ext-g1", "L1"]); // 09:00 vóór 13:00
    expect(out[0].items).toHaveLength(0); // maandag onaangeraakt
  });

  it("laat events buiten de zichtbare dagen vallen", () => {
    const out = mergeExternalIntoWeekByKeys(baseDays, keys, [
      ext({ start_at: "2026-05-20T07:00:00.000Z" }),
    ]);
    expect(out.flatMap((d) => d.items.filter((i) => i.key === "ext-g1"))).toHaveLength(0);
  });

  it("returnt de input ongewijzigd zonder externe events", () => {
    const out = mergeExternalIntoWeekByKeys(baseDays, keys, []);
    expect(out).toBe(baseDays);
  });
});

describe("mergeExternalIntoMonth", () => {
  const cells: AgendaMaandCel[] = [
    {
      dateKey: "2026-05-13",
      dag: 13,
      inMaand: true,
      vandaag: true,
      verleden: false,
      vrij: false,
      items: [],
    },
    {
      dateKey: "2026-04-30",
      dag: 30,
      inMaand: false,
      vandaag: false,
      verleden: true,
      vrij: false,
      items: [],
    },
  ];

  it("voegt externe events toe in de in-maand-cel", () => {
    const out = mergeExternalIntoMonth(cells, [ext({})]);
    expect(out[0].items.map((i) => i.key)).toEqual(["ext-g1"]);
  });

  it("plaatst niets in gedimde voor-/naloop-cellen", () => {
    const out = mergeExternalIntoMonth(cells, [
      ext({ start_at: "2026-04-30T07:00:00.000Z" }),
    ]);
    expect(out[1].items).toHaveLength(0);
  });
});
