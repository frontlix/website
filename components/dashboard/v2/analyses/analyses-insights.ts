// "Wat Surface ziet" — echte inzichten afgeleid uit de tenant-data van de
// gekozen periode (i.p.v. het oude statische prototype). Pure functie: de
// pagina levert de al-opgehaalde cijfers + lead-rijen, hier rekenen we de
// kaarten uit. Alleen kaarten met genoeg data worden getoond.

import type { Inzicht } from "./analyses-data";
import { euroCompact, type KanaalLeadRow } from "./analyses-mappers";

const WEEKDAGEN = [
  "Zondag",
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
];
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Reactietijd (ms) → kort label: "47s" / "12 min" / "1.5 uur". */
function reactieLabel(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.round((min / 60) * 10) / 10} uur`;
}

/** Weekdag-index (0=zo..6=za) in Europe/Amsterdam uit een ISO-timestamp. */
function weekdagIndex(iso: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
  }).format(new Date(iso));
  return WD_EN.indexOf(wd);
}

interface InzichtInput {
  /** Gemiddelde reactietijd in ms (of null als onbekend). */
  avgReactieMs: number | null;
  /** Aantal leads in de periode. */
  total: number;
  /** Aantal gewonnen leads (akkoord) in de periode. */
  converted: number;
  /** Lead-rijen van de periode (aangemaakt, afstand, prijs). */
  rows: KanaalLeadRow[];
  /** Door de eigenaar ingestelde max. radius (km), uit tenant_settings.
   *  Null/0 = niet ingesteld, dan tonen we het "buiten radius"-inzicht niet. */
  radiusKm: number | null;
}

export function buildInzichten({
  avgReactieMs,
  total,
  converted,
  rows,
  radiusKm,
}: InzichtInput): Inzicht[] {
  const out: Inzicht[] = [];

  // 1. Reactietijd.
  if (avgReactieMs && avgReactieMs > 0) {
    const snel = avgReactieMs <= 5 * 60 * 1000;
    out.push({
      titel: snel ? "Reactietijd is je superkracht" : "Reactietijd kan sneller",
      tekst: `Gemiddeld ${reactieLabel(avgReactieMs)} tot je eerste reactie. ${
        snel
          ? "Snelle reacties zetten leads vaker om."
          : "Sneller reageren zet meer leads om."
      }`,
      kind: snel ? "plus" : "let-op",
    });
  }

  // 2. Buiten radius (de door de eigenaar ingestelde max. radius).
  if (radiusKm && radiusKm > 0) {
    const ver = rows.filter(
      (r) => r.afstand_km != null && Number(r.afstand_km) > radiusKm,
    );
    if (ver.length > 0) {
      const omzet = ver.reduce((s, r) => s + (Number(r.totaal_prijs) || 0), 0);
      out.push({
        titel: `${ver.length} lead${ver.length === 1 ? "" : "s"} buiten je radius`,
        tekst: `Verder dan ${radiusKm} km${
          omzet > 0 ? `, samen ${euroCompact(omzet)}` : ""
        }. Overweeg je werkgebied hier te verruimen.`,
        kind: "kans",
      });
    }
  }

  // 3. Conversie.
  if (total > 0) {
    const pct = Math.round((converted / total) * 100);
    const sterk = pct >= 20;
    out.push({
      titel: `${pct}% van je leads wordt klant`,
      tekst: `${converted} van ${total} lead${total === 1 ? "" : "s"} deze periode. ${
        sterk ? "Een sterke score." : "Er is ruimte om meer leads om te zetten."
      }`,
      kind: sterk ? "plus" : "let-op",
    });
  }

  // 4. Beste dag (drukste binnenkomst-weekdag).
  if (total > 0) {
    const tel = [0, 0, 0, 0, 0, 0, 0];
    let metDatum = 0;
    for (const r of rows) {
      if (!r.aangemaakt) continue;
      const wd = weekdagIndex(r.aangemaakt);
      if (wd >= 0) {
        tel[wd]++;
        metDatum++;
      }
    }
    if (metDatum > 0) {
      let best = 0;
      for (let i = 1; i < 7; i++) if (tel[i] > tel[best]) best = i;
      const pct = Math.round((tel[best] / metDatum) * 100);
      out.push({
        titel: `${WEEKDAGEN[best]} is je beste dag`,
        tekst: `${pct}% van je leads komt op ${WEEKDAGEN[best].toLowerCase()} binnen. Plan je opvolging dan in.`,
        kind: "plus",
      });
    }
  }

  // Geen enkel inzicht (te weinig data): toon een nette lege-staat-kaart.
  if (out.length === 0) {
    out.push({
      titel: "Nog te weinig data",
      tekst: "Zodra er meer leads binnenkomen, verschijnen hier je inzichten.",
      kind: "plus",
    });
  }

  return out;
}

// ── Demo-inzichten (dev-preview zonder login) ──────────────────────────
// Zelfde berekening als live, maar met voorbeeld-rijen, zodat de preview het
// nieuwe inzicht-format toont zonder echte data.

function demoRow(
  aangemaakt: string,
  afstand_km: number,
  totaal_prijs: number,
): KanaalLeadRow {
  return {
    kanaal: null,
    bron: null,
    aangemaakt,
    akkoord_op: null,
    afspraak_geboekt_op: null,
    totaal_prijs,
    afstand_km,
  };
}

const DEMO_ROWS: KanaalLeadRow[] = [
  demoRow("2026-06-02T09:00:00Z", 12, 420), // di
  demoRow("2026-06-09T10:00:00Z", 28, 540), // di
  demoRow("2026-06-16T11:00:00Z", 80, 360), // di · buiten radius
  demoRow("2026-06-23T09:30:00Z", 18, 480), // di
  demoRow("2026-06-01T08:00:00Z", 35, 300), // ma
  demoRow("2026-06-03T13:00:00Z", 110, 720), // wo · buiten radius
  demoRow("2026-06-04T14:00:00Z", 22, 260), // do
  demoRow("2026-06-05T09:00:00Z", 40, 390), // vr
  demoRow("2026-06-08T15:00:00Z", 15, 510), // ma
  demoRow("2026-06-11T10:00:00Z", 30, 280), // do
];

export function buildDemoInzichten(): Inzicht[] {
  return buildInzichten({
    avgReactieMs: 47000,
    total: DEMO_ROWS.length,
    converted: 3,
    rows: DEMO_ROWS,
    radiusKm: 50,
  });
}
