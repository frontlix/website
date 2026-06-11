// ─────────────────────────────────────────────────────────────────────
// Analyses, PAGINA-SPECIFIEKE demo-data.
//
// Getypeerde port van de reeksen uit de design-handoff
// (CData3.jsx → object C3, en P_PERIODES uit PAnalysesInstellingen.jsx).
// Alleen voor de Analyses-pagina; gedeelde stukken komen uit demo-data.ts.
// ─────────────────────────────────────────────────────────────────────

import { KPIS, type Kpi } from "@/components/dashboard/v2/demo-data";

// ── KPI-tegels (gedeeld met Overzicht) ─────────────────────────────────
export const ANALYSE_KPIS: Kpi[] = KPIS;

// ── Periode-reeksen voor de omzet/leads-lijngrafiek ────────────────────
// (port van P_PERIODES, leidend voor het interactieve gedrag)
export type PeriodeNaam = "Week" | "Maand" | "Kwartaal" | "Jaar" | "Alles";

export interface PeriodeReeks {
  /** As-labels per punt; lege string = geen label tonen (kwartaal-dichtheid). */
  labels: string[];
  /** Omzet in euro-duizenden per punt. */
  omzet: number[];
  /** Aantal leads per punt. */
  leads: number[];
  /** Bovengrens omzet-as (in k). */
  max: number;
  /** Bovengrens leads-as. */
  lmax: number;
  /** Totaal-omzet over de periode. */
  totaal: string;
  /** Delta-tekst t.o.v. vorige periode. */
  delta: string;
}

export const PERIODES: Record<PeriodeNaam, PeriodeReeks> = {
  Week: {
    labels: ["wo", "do", "vr", "za", "ma", "di", "wo"],
    omzet: [0.6, 1.4, 0.9, 0, 1.1, 0.8, 0.4],
    leads: [2, 3, 1, 0, 4, 3, 1],
    max: 2,
    lmax: 6,
    totaal: "€5.2k",
    delta: "+9% vs vorige week",
  },
  Maand: {
    labels: ["w16", "w17", "w18", "w19", "w20", "w21", "w22", "w23"],
    omzet: [3.1, 2.6, 3.4, 2.9, 3.8, 3.3, 4.1, 3.9],
    leads: [7, 5, 8, 6, 9, 8, 11, 9],
    max: 5,
    lmax: 12,
    totaal: "€27.1k",
    delta: "+18% vs vorige periode",
  },
  Kwartaal: {
    labels: ["apr", "", "", "", "mei", "", "", "", "jun", "", "", ""],
    omzet: [2.2, 2.8, 2.4, 3.0, 3.1, 2.6, 3.4, 2.9, 3.8, 3.3, 4.1, 3.9],
    leads: [5, 6, 5, 7, 7, 5, 8, 6, 9, 8, 11, 9],
    max: 5,
    lmax: 12,
    totaal: "€78.4k",
    delta: "+24% vs vorig kwartaal",
  },
  Jaar: {
    labels: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
    omzet: [18, 16, 21, 19, 24, 27, 22, 20, 26, 29, 25, 31],
    leads: [38, 34, 44, 40, 51, 58, 47, 43, 55, 61, 53, 66],
    max: 35,
    lmax: 70,
    totaal: "€278k",
    delta: "+19% vs vorig jaar",
  },
  Alles: {
    labels: ["2024", "", "", "", "2025", "", "", "", "2026", "", "", ""],
    omzet: [12, 15, 14, 18, 20, 22, 19, 24, 27, 25, 29, 31],
    leads: [28, 33, 31, 39, 44, 48, 42, 52, 58, 54, 62, 66],
    max: 35,
    lmax: 70,
    totaal: "€612k",
    delta: "sinds de start",
  },
};

export const PERIODE_NAMEN: PeriodeNaam[] = [
  "Week",
  "Maand",
  "Kwartaal",
  "Jaar",
  "Alles",
];

// ── Trechter: van lead naar klant ──────────────────────────────────────
export interface FunnelStap {
  stap: string;
  n: number;
  pct: number;
}

export const FUNNEL: FunnelStap[] = [
  { stap: "Leads binnen", n: 38, pct: 100 },
  { stap: "Gereageerd", n: 35, pct: 92 },
  { stap: "Offerte gestuurd", n: 24, pct: 63 },
  { stap: "Geaccepteerd", n: 15, pct: 39 },
  { stap: "Afgerond & betaald", n: 13, pct: 34 },
];

// ── Bronnen: per kanaal ────────────────────────────────────────────────
export interface Bron {
  bron: string;
  leads: number;
  omzet: string;
  conv: string;
  spark: number[];
}

export const BRONNEN: Bron[] = [
  { bron: "WhatsApp", leads: 21, omzet: "€7.4k", conv: "71%", spark: [3, 4, 3, 5, 6, 5, 7, 8] },
  { bron: "Website", leads: 11, omzet: "€3.2k", conv: "55%", spark: [2, 3, 2, 2, 3, 4, 3, 4] },
  { bron: "Telefoon", leads: 6, omzet: "€1.3k", conv: "50%", spark: [1, 2, 1, 2, 1, 2, 2, 1] },
];

// ── Inzichten: wat Surface ziet ────────────────────────────────────────
export type InzichtKind = "plus" | "kans" | "let-op";

export interface Inzicht {
  titel: string;
  tekst: string;
  kind: InzichtKind;
}

export const INZICHTEN: Inzicht[] = [
  {
    titel: "Reactietijd is je superkracht",
    tekst:
      "Gemiddeld 47s, leads die binnen 1 minuut antwoord krijgen converteren 2,3x vaker.",
    kind: "plus",
  },
  {
    titel: "4 leads buiten radius gemist",
    tekst:
      "Samen €2.9k. Overweeg de radius op donderdagen te verruimen, dan is er rij-ruimte.",
    kind: "kans",
  },
  {
    titel: "Korting-verzoeken nemen toe",
    tekst:
      "3 deze maand (vorige maand 1). Vooral bij offertes boven €400, bundel-aanbod kan helpen.",
    kind: "let-op",
  },
  {
    titel: "Dinsdag is je beste dag",
    tekst: "31% van alle leads komt op dinsdag binnen. Plan je offerte-uur dan in.",
    kind: "plus",
  },
];

// ── Top-tags / diensten (eenvoudige bar-verdeling) ─────────────────────
export interface DienstAandeel {
  naam: string;
  pct: number;
  omzet: string;
}

export const TOP_DIENSTEN: DienstAandeel[] = [
  { naam: "Gevelreiniging", pct: 34, omzet: "€9.2k" },
  { naam: "Oprit & terras", pct: 27, omzet: "€7.3k" },
  { naam: "Dakgoot reinigen", pct: 18, omzet: "€4.9k" },
  { naam: "Zonnepanelen", pct: 12, omzet: "€3.3k" },
  { naam: "Impregnatie", pct: 9, omzet: "€2.4k" },
];

// ── Verdeling per status / categorie (eenvoudige bar-verdeling) ────────
// {label,count}-vorm voor de DistributionBars-component. Demo-fallback voor
// de dev-preview zonder login; in productie komt dit uit
// statusVerdeling()/categorieVerdeling().
export interface VerdelingRij {
  label: string;
  count: number;
}

export const STATUS_VERDELING: VerdelingRij[] = [
  { label: "Inkomend", count: 14 },
  { label: "Offerte verstuurd", count: 9 },
  { label: "Akkoord", count: 6 },
  { label: "Afgerond", count: 5 },
  { label: "Geen interesse", count: 4 },
];

export const CATEGORIE_VERDELING: VerdelingRij[] = [
  { label: "Gevelreiniging", count: 12 },
  { label: "Oprit & terras", count: 8 },
  { label: "Dakgoot reinigen", count: 6 },
  { label: "Zonnepanelen", count: 5 },
  { label: "Impregnatie", count: 3 },
];

// ── Top-tags ───────────────────────────────────────────────────────────
// {naam,count}-vorm voor de TopTagsList-component. Demo-fallback; in
// productie komt dit uit topTags().
export interface TagRij {
  naam: string;
  count: number;
}

export const TOP_TAGS: TagRij[] = [
  { naam: "Spoed", count: 9 },
  { naam: "Particulier", count: 7 },
  { naam: "Herhaalklant", count: 5 },
  { naam: "Zakelijk", count: 4 },
  { naam: "Korting gevraagd", count: 3 },
];
