// ─────────────────────────────────────────────────────────────────────
// Analyses, mappers: echte Supabase-rijen → de prop-vormen die de
// bestaande v2-analyses-componenten al verwachten. De prop-vormen
// (PeriodeReeks, Kpi[], FunnelStap[], Bron[], DienstAandeel[]) blijven
// onaangeroerd; hier komt alleen de echte data erin.
//
// Hergebruikt de queries/condities uit lib/dashboard/stats-queries.ts via
// de server-component; deze module is pure transformatie (geen DB, geen
// React) en volgt het master-contract (server-fetch → mapper → component).
// ─────────────────────────────────────────────────────────────────────

import { formatDuration, dashboardStatusLabel } from "@/lib/dashboard/format";
import type { PeriodKey, StatsPeriod } from "@/lib/dashboard/period";
import { bucketGranulariteit } from "@/lib/dashboard/omzet-buckets";
import type { Kpi } from "@/components/dashboard/v2/demo-data";
import type {
  PeriodeNaam,
  PeriodeReeks,
  FunnelStap,
  Bron,
  DienstAandeel,
} from "./analyses-data";

// ── Periode-mapping: v2 (5 pills) ↔ PeriodKey (5 opties) ───────────────
// De v2-pagina biedt nu dezelfde 5 tijdvensters als de (app)-PeriodSelector
// (deze-week, deze-maand, dit-kwartaal, dit-jaar, all-time). We koppelen ze
// 1-op-1 zodat de bestaande queries het juiste venster krijgen.
const PERIODE_NAAR_KEY: Record<PeriodeNaam, PeriodKey> = {
  Week: "deze-week",
  Maand: "deze-maand",
  Kwartaal: "dit-kwartaal",
  Jaar: "dit-jaar",
  Alles: "all-time",
};

const KEY_NAAR_PERIODE: Partial<Record<PeriodKey, PeriodeNaam>> = {
  "deze-week": "Week",
  "deze-maand": "Maand",
  "dit-kwartaal": "Kwartaal",
  "dit-jaar": "Jaar",
  "all-time": "Alles",
};

export function periodeNaarKey(naam: PeriodeNaam): PeriodKey {
  return PERIODE_NAAR_KEY[naam];
}

export function keyNaarPeriode(key: PeriodKey): PeriodeNaam {
  return KEY_NAAR_PERIODE[key] ?? "Maand";
}

// ── Euro-helper voor compacte "€7.4k"-weergave (matcht de demo-vorm) ───
/** Compacte euro-weergave in duizenden: 7400 → "€7.4k", 980 → "€980". */
function euroCompact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    // 1 decimaal, maar geen ".0" tonen (27.0k → 27k).
    const s = k.toFixed(1).replace(/\.0$/, "");
    return `€${s}k`;
  }
  return `€${Math.round(n)}`;
}

/** Omzet in euro-duizenden (1 decimaal) voor de grafiek-as. */
function naarK(n: number): number {
  return Math.round((n / 1000) * 10) / 10;
}

// ── KPI-tegels ─────────────────────────────────────────────────────────
// Zelfde KPI's als de (app)-statistiekenpagina (totaal leads, conversie,
// gem. offertewaarde, gem. reactietijd), gemapt naar de Kpi-prop-vorm.
// reactieMs → seconden voor formatDuration (zoals de valkuil voorschrijft:
// avgReactietijdMs geeft ms, formatDuration verwacht seconden).
export interface KpiBron {
  total: number;
  converted: number;
  avgOfferte: number | null;
  avgReactieMs: number | null;
}

export function mapKpis(bron: KpiBron): Kpi[] {
  const conversiePct =
    bron.total > 0 ? Math.round((bron.converted / bron.total) * 100) : 0;
  const reactieSec =
    bron.avgReactieMs !== null ? bron.avgReactieMs / 1000 : null;

  return [
    {
      label: "Totaal leads",
      value: String(bron.total),
      unit: "",
      delta: "",
      up: true,
    },
    {
      label: "Conversie lead→klant",
      value: bron.total > 0 ? String(conversiePct) : "—",
      unit: bron.total > 0 ? "%" : "",
      delta: bron.total > 0 ? `${bron.converted}/${bron.total}` : "",
      up: true,
    },
    {
      label: "Gem. offertewaarde",
      value: bron.avgOfferte !== null ? euroCompact(bron.avgOfferte) : "—",
      unit: "",
      delta: "",
      up: true,
    },
    {
      label: "Reactietijd (gem.)",
      value: reactieSec !== null ? formatDuration(reactieSec) : "—",
      unit: "",
      delta: "",
      up: true,
    },
  ];
}

// ── Omzet & leads-lijngrafiek (PeriodeReeks) ───────────────────────────
// Voedt zich op de echte omzetTrendVoorPeriode()-buckets (volgt het
// periode-filter: dag-buckets voor week/maand, maand-buckets voor kwartaal)
// + leadsPerDag() voor de leads-lijn. We zetten beide reeksen om naar de
// PeriodeReeks-vorm (labels, omzet[in k], leads[], max, lmax, totaal, delta).
export interface ReeksBron {
  periodKey: PeriodKey;
  omzetTrend: Array<{ bucket: string; omzet: number }>;
  leadsPerDag: Array<{ date: string; count: number }>;
  omzetTotaal: number;
}

const MAANDEN_KORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

const WEEKDAGEN_KORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];

/** As-label voor een bucket-sleutel (YYYY-MM-DD of YYYY-MM). */
function bucketLabel(bucket: string, gran: "dag" | "maand"): string {
  if (gran === "maand") {
    // "2026-06" → "jun"
    const [, m] = bucket.split("-");
    const idx = Number(m) - 1;
    return MAANDEN_KORT[idx] ?? bucket;
  }
  // "2026-06-10" → weekdag-afkorting
  const d = new Date(`${bucket}T00:00:00.000Z`);
  return WEEKDAGEN_KORT[d.getUTCDay()] ?? bucket;
}

/** Bovengrens (afgerond naar boven, minimaal 1) voor een as. */
function asMax(values: number[]): number {
  const m = Math.max(0, ...values);
  return Math.max(1, Math.ceil(m));
}

export function mapPeriodeReeks(bron: ReeksBron): PeriodeReeks {
  const gran = bucketGranulariteit(bron.periodKey);

  // Omzet-buckets → labels + omzet[in k]. Bij maand-granulariteit (kwartaal)
  // tonen we alleen het maand-label op de eerste bucket van elke maand;
  // hier is elke bucket al een maand dus elk label tonen we.
  const labels = bron.omzetTrend.map((b) => bucketLabel(b.bucket, gran));
  const omzet = bron.omzetTrend.map((b) => naarK(b.omzet));

  // Leads: leg de leadsPerDag-reeks naast de omzet-buckets. Bij dag-buckets
  // matchen de datums 1-op-1; bij maand-buckets aggregeren we per maand.
  const leadsPerDatum = new Map<string, number>();
  for (const r of bron.leadsPerDag) leadsPerDatum.set(r.date, r.count);

  const leads = bron.omzetTrend.map((b) => {
    if (gran === "dag") {
      return leadsPerDatum.get(b.bucket) ?? 0;
    }
    // maand-bucket: tel alle dagen in die maand op
    let som = 0;
    for (const [date, count] of leadsPerDatum) {
      if (date.startsWith(b.bucket)) som += count;
    }
    return som;
  });

  return {
    labels,
    omzet,
    leads,
    max: asMax(omzet),
    lmax: asMax(leads),
    totaal: euroCompact(bron.omzetTotaal),
    delta: "",
  };
}

// ── Funnel: van lead naar klant ────────────────────────────────────────
// Geen dedicated funnel-query in (app); afgeleid uit de bestaande tellers
// (countLeads, gereageerd via berichten, countOffertesVerstuurd,
// countConverted) zoals het data-contract stap 4 beschrijft.
export interface FunnelBron {
  leadsBinnen: number;
  gereageerd: number;
  offertesVerstuurd: number;
  geaccepteerd: number;
}

function pct(n: number, basis: number): number {
  return basis > 0 ? Math.round((n / basis) * 100) : 0;
}

export function mapFunnel(bron: FunnelBron): FunnelStap[] {
  const basis = bron.leadsBinnen;
  return [
    { stap: "Leads binnen", n: bron.leadsBinnen, pct: 100 },
    { stap: "Gereageerd", n: bron.gereageerd, pct: pct(bron.gereageerd, basis) },
    {
      stap: "Offerte gestuurd",
      n: bron.offertesVerstuurd,
      pct: pct(bron.offertesVerstuurd, basis),
    },
    {
      stap: "Geaccepteerd",
      n: bron.geaccepteerd,
      pct: pct(bron.geaccepteerd, basis),
    },
  ];
}

// ── Bronnen per kanaal ─────────────────────────────────────────────────
// Geen dedicated helper in (app): we groeperen de leads-rijen (gefetcht in
// de server-component via de gescopete client) op kanaal, tellen leads +
// converted + omzet, en bouwen de sparkline uit een per-kanaal dagreeks.
export interface KanaalLeadRow {
  kanaal: string | null;
  bron: string | null;
  aangemaakt: string | null;
  akkoord_op: string | null;
  afspraak_geboekt_op: string | null;
  totaal_prijs: number | null;
  /** Reisafstand (km) vanaf de werkplaats; voor het "buiten radius"-inzicht. */
  afstand_km?: number | null;
}

/** Leesbaar kanaal-label uit de rauwe kanaal/bron-velden. */
function kanaalLabel(row: KanaalLeadRow): string {
  const raw = (row.bron || row.kanaal || "Onbekend").toLowerCase();
  if (raw.includes("whatsapp") || raw === "wa") return "WhatsApp";
  if (raw.includes("formulier")) return "Website-formulier";
  if (raw.includes("web")) return "Website";
  if (raw.includes("tel") || raw.includes("phone") || raw.includes("bel"))
    return "Telefoon";
  if (raw.includes("handmatig") || raw.includes("dashboard")) return "Handmatig";
  if (raw.includes("test")) return "Test";
  // Val terug op de rauwe waarde met hoofdletter, underscores naar spaties.
  const v = (row.bron || row.kanaal || "Onbekend").replace(/_/g, " ");
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function isGewonnen(row: KanaalLeadRow): boolean {
  return row.akkoord_op !== null || row.afspraak_geboekt_op !== null;
}

export function mapBronnen(rows: KanaalLeadRow[]): Bron[] {
  interface Acc {
    leads: number;
    converted: number;
    omzet: number;
    perDag: Map<string, number>;
  }
  const groepen = new Map<string, Acc>();

  for (const row of rows) {
    const label = kanaalLabel(row);
    let acc = groepen.get(label);
    if (!acc) {
      acc = { leads: 0, converted: 0, omzet: 0, perDag: new Map() };
      groepen.set(label, acc);
    }
    acc.leads += 1;
    if (isGewonnen(row)) {
      acc.converted += 1;
      acc.omzet += row.totaal_prijs ?? 0;
    }
    if (row.aangemaakt) {
      const day = row.aangemaakt.slice(0, 10);
      acc.perDag.set(day, (acc.perDag.get(day) ?? 0) + 1);
    }
  }

  // Sparkline: laatste 8 dagen leads per kanaal (8 punten, zoals demo).
  const vandaag = new Date();
  const laatste8: string[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(
      Date.UTC(
        vandaag.getUTCFullYear(),
        vandaag.getUTCMonth(),
        vandaag.getUTCDate() - i,
      ),
    );
    laatste8.push(d.toISOString().slice(0, 10));
  }

  return [...groepen.entries()]
    .map(([bron, acc]) => ({
      bron,
      leads: acc.leads,
      omzet: euroCompact(acc.omzet),
      conv: `${pct(acc.converted, acc.leads)}%`,
      spark: laatste8.map((d) => acc.perDag.get(d) ?? 0),
    }))
    .sort((a, b) => b.leads - a.leads);
}

// ── Top-diensten (omzet per categorie) ─────────────────────────────────
// Hergebruikt omzetPerCategorie() (al beschikbaar). Top-5 op omzet, met
// aandeel-percentage en compacte euro-weergave.
export function mapTopDiensten(
  rows: Array<{ categorie: string; omzet: number }>,
): DienstAandeel[] {
  const totaal = rows.reduce((sum, r) => sum + r.omzet, 0);
  return rows
    .slice(0, 5)
    .map((r) => ({
      naam: r.categorie,
      pct: totaal > 0 ? Math.round((r.omzet / totaal) * 100) : 0,
      omzet: euroCompact(r.omzet),
    }));
}

// ── Verdeling-balken (status / categorie) ──────────────────────────────
// Map de echte statusVerdeling()/categorieVerdeling()-rijen naar de
// {label,count}-vorm die de v2 DistributionBars-component verwacht. De
// status-labels lopen via dashboardStatusLabel (zoals de (app)-pagina);
// categorie-rijen hebben al een leesbare naam.
export interface VerdelingBalk {
  label: string;
  count: number;
}

export function mapStatusVerdeling(
  rows: Array<{ status: string | null; count: number }>,
): VerdelingBalk[] {
  return rows.map((r) => ({
    // statusVerdeling levert string|null; dashboardStatusLabel verwacht
    // DashboardStatus|null. De (app)-pagina cast hier ook (eslint-disable).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    label: dashboardStatusLabel(r.status as any),
    count: r.count,
  }));
}

export function mapCategorieVerdeling(
  rows: Array<{ categorie: string; count: number }>,
): VerdelingBalk[] {
  return rows.map((r) => ({ label: r.categorie, count: r.count }));
}

export { euroCompact };
export type { StatsPeriod };
