// ─────────────────────────────────────────────────────────────────────
// Mappers voor v2-Overzicht: DB-rij / afgeleide stats → de prop-vormen die
// de bestaande v2-componenten (BriefCard, ActionList, OmzetCard, KpiTiles,
// AgendaCard) al verwachten. GEEN nieuwe DB-logica hier; puur transformatie
// op data die de server-component al heeft opgehaald via de bestaande
// lib/dashboard-helpers.
//
// De prop-vormen zijn 1-op-1 afgeleid van de demo-data-types
// (OwnerAction, OMZET, Kpi, AgendaItem) zodat de componenten visueel
// ongewijzigd blijven; alleen de bron wisselt van demo naar echte data.
// ─────────────────────────────────────────────────────────────────────

import type { DashboardAction } from "@/lib/dashboard/eerst-dit-doen";
import type { KpiMetric, ExtraMetric } from "@/components/dashboard/overzicht/kpi-types";
import type { Appointment } from "@/lib/dashboard/agenda-queries";
import type { OwnerAction, Kpi } from "@/components/dashboard/v2/demo-data";
import type { AgendaItem, AgendaKind } from "./overzicht-data";

// ── BriefCard ────────────────────────────────────────────────────────

/** Props voor de Surface-samenvatting bovenaan ("Drie dingen voor de koffie"). */
export interface BriefData {
  /** Status-regel-segmenten, gejoind met "·" door de component. */
  statusLine: string[];
  /** Tijd-afhankelijke begroeting ("Goedemorgen"). */
  greeting: string;
  /** Voornaam van de owner. */
  voornaam: string;
  /** Briefing-tekst (buildSurfaceSummary). */
  body: string;
  /** CTA-label; navigeert naar Leads. */
  cta: string;
  /**
   * Bestemming van de CTA. Bij open offertes deeplinkt 'ie naar de
   * gefilterde lijst (`/leads?offertes=open`) zodat de belofte in het label
   * ("Open de N wachtende offertes") klopt met wat de gebruiker te zien krijgt;
   * anders gewoon de volledige leadslijst.
   */
  ctaHref: string;
}

/**
 * Bouwt de status-regel: "<chatbot> is live · X actieve gesprekken ·
 * Y komende afspraken". Mirrort de demo STATUS_LINE-vorm maar met echte
 * tellingen.
 */
export function mapBriefData(input: {
  chatbotName: string;
  greeting: string;
  voornaam: string;
  summary: string;
  openOffertes: number;
  actieveGesprekken: number;
  komendeAfspraken: number;
}): BriefData {
  const statusLine = [
    `${input.chatbotName} is live`,
    `${input.actieveGesprekken} ${input.actieveGesprekken === 1 ? "actief gesprek" : "actieve gesprekken"}`,
    `${input.komendeAfspraken} ${input.komendeAfspraken === 1 ? "komende afspraak" : "komende afspraken"}`,
  ];
  const heeftOpenOffertes = input.openOffertes > 0;
  const cta = heeftOpenOffertes
    ? `Open de ${input.openOffertes} ${input.openOffertes === 1 ? "wachtende offerte" : "wachtende offertes"}`
    : "Bekijk je leads";
  // Deeplink naar de gefilterde lijst (offertes=open spiegelt countOpenOffertes:
  // verstuurd + nog geen akkoord), zodat het aantal in het label gelijk is aan
  // wat de lijst toont. Zonder open offertes: de volledige leadslijst.
  const ctaHref = heeftOpenOffertes ? "/leads?offertes=open" : "/leads";
  return {
    statusLine,
    greeting: input.greeting,
    voornaam: input.voornaam,
    body: input.summary,
    cta,
    ctaHref,
  };
}

// ── ActionList ───────────────────────────────────────────────────────

/** Eén actie-rij + het lead-id zodat de rij naar het juiste dossier klikt. */
export interface ActionRow extends OwnerAction {
  /** Lead-id voor navigatie naar /v2/leads/<id>. */
  leadId: string;
}

/**
 * Mapt de deriveActions-output naar de OwnerAction-rijen die ActionList
 * rendert. `n` is een 1-based volgnummer (de badge in de UI), `hot` komt
 * uit tone. De volgorde van deriveActions blijft behouden.
 */
export function mapActionRows(actions: DashboardAction[]): ActionRow[] {
  return actions.map((a, i) => ({
    n: i + 1,
    title: a.title,
    sub: a.subtitle || "—",
    meta: a.waitLabel,
    hot: a.tone === "hot",
    leadId: a.leadId,
  }));
}

// ── OmzetCard ────────────────────────────────────────────────────────

/** Props voor de omzet-deze-maand-kaart (zelfde vorm als demo OMZET). */
export interface OmzetData {
  value: string;
  delta: string;
  deltaSub: string;
  doel: string;
  pct: number;
}

function formatEuroShort(n: number): string {
  const abs = Math.abs(Math.round(n));
  if (abs >= 1_000_000) return `€${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000) return `€${(abs / 1_000).toFixed(1).replace(".", ",")}k`;
  return `€${abs}`;
}

/**
 * Mapt omzet-cijfers naar de OmzetCard-props. `value` is het bedrag zonder
 * euroteken (de component zet er zelf "€" voor), `doel` met euroteken
 * (component toont "doel {doel}"), delta compact ("+€3,1k").
 */
export function mapOmzetData(input: {
  omzetMaand: number;
  omzetMaandPrev: number;
  omzetDoelMaand: number;
}): OmzetData {
  const diff = Math.round(input.omzetMaand - input.omzetMaandPrev);
  const sign = diff >= 0 ? "+" : "−";
  const pct =
    input.omzetDoelMaand > 0
      ? Math.round((input.omzetMaand / input.omzetDoelMaand) * 100)
      : 0;
  return {
    value: Math.round(input.omzetMaand).toLocaleString("nl-NL"),
    // Geen delta bij ontbrekende vorige-periode-basis (prev=0): anders lijkt de
    // hele omzet "groei" t.o.v. niets (gelijk aan de (app)-guard en kpiDelta).
    delta:
      input.omzetMaandPrev > 0 && diff !== 0
        ? `${sign}${formatEuroShort(Math.abs(diff))}`
        : "—",
    deltaSub: "vs vorige week",
    doel: `€${Math.round(input.omzetDoelMaand).toLocaleString("nl-NL")}`,
    pct,
  };
}

// ── KpiTiles ─────────────────────────────────────────────────────────

/** Compacte delta-string per KPI (signed), of "—" bij geen verandering. */
function kpiDelta(metric: KpiMetric | ExtraMetric): { delta: string; up: boolean } {
  const diff = metric.value - metric.prevValue;
  const absDiff = Math.abs(diff);
  if (absDiff === 0 || metric.prevValue === 0) {
    return { delta: "—", up: true };
  }
  const goingUp = metric.invertDelta ? diff < 0 : diff > 0;
  const sign = diff > 0 ? "+" : "−";

  if (metric.unit === "eur") {
    return { delta: `${sign}${formatEuroShort(absDiff)}`, up: goingUp };
  }
  if (metric.unit === "pct") {
    return { delta: `${sign}${absDiff}pt`, up: goingUp };
  }
  if (metric.unit === "s") {
    return { delta: `${sign}${formatDurShort(absDiff)}`, up: goingUp };
  }
  // count → percentage-vorm zoals demo ("+22%")
  const pct = Math.round((absDiff / metric.prevValue) * 100);
  return { delta: `${sign}${pct}%`, up: goingUp };
}

/** Compacte seconden-duur voor de reactietijd-delta. */
function formatDurShort(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return m > 0 ? `${h}u ${m}m` : `${h}u`;
  }
  const d = Math.floor(s / 86400);
  const h = Math.round((s % 86400) / 3600);
  return h > 0 ? `${d}d ${h}u` : `${d}d`;
}

const UNIT_SUFFIX: Record<KpiMetric["unit"], string> = {
  eur: "",
  count: "",
  pct: "%",
  s: "s",
};

/** Waarde-tekst per KPI-tegel (zonder unit-suffix, die zet de tegel apart). */
function kpiValue(metric: KpiMetric | ExtraMetric): string {
  if (metric.unit === "eur") {
    return `€${Math.round(metric.value).toLocaleString("nl-NL")}`;
  }
  return Math.round(metric.value).toLocaleString("nl-NL");
}

/**
 * Mapt de 4 KPI-metrics + de extra "Offertes open"-metric naar de Kpi[]-vorm
 * die KpiTiles rendert (label/value/unit/delta/up). Volgorde conform demo:
 * Nieuwe leads, Conversie, Reactietijd, Offertes open.
 */
export function mapKpiTiles(
  metrics: Record<"omzet" | "leads" | "conversie" | "reactietijd", KpiMetric>,
  extraOffertesOpen: ExtraMetric,
): Kpi[] {
  const make = (m: KpiMetric | ExtraMetric, label: string): Kpi => {
    const { delta, up } = kpiDelta(m);
    return {
      label,
      value: kpiValue(m),
      unit: m.unit === "eur" ? "" : UNIT_SUFFIX[m.unit as KpiMetric["unit"]],
      delta,
      up,
    };
  };
  return [
    make(metrics.leads, "Nieuwe leads (week)"),
    make(metrics.conversie, "Conversie offerte→klant"),
    make(metrics.reactietijd, "Reactietijd (gem.)"),
    make(extraOffertesOpen, "Offertes open"),
  ];
}

/**
 * Sparkline-reeks (10 punten) voor de KPI-tegels, afgeleid uit de
 * leads-per-dag-trend. Neemt de laatste 10 dagen; bij minder data wordt
 * de reeks links aangevuld met het eerste punt zodat de polyline klopt.
 * Lege trend → vlakke nul-reeks (de component crasht niet op leeg).
 */
export function mapSparkline(trendCounts: number[]): number[] {
  if (trendCounts.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const last = trendCounts.slice(-10);
  if (last.length === 10) return last;
  const pad = Array(10 - last.length).fill(last[0] ?? 0);
  return [...pad, ...last];
}

// ── AgendaCard ───────────────────────────────────────────────────────

/**
 * Mapt afspraken-van-vandaag naar de AgendaItem-vorm voor AgendaCard, plus
 * het lead-id voor navigatie. `tijd` is de Amsterdam-lokale starttijd
 * (HH:MM), `titel` = "Plaatsbezoek · <naam>", `sub` = categorie + plaats.
 * Alle items als kind 'bezoek' (afspraken = plaatsbezoeken); de demo had ook
 * 'deadline'/'klus', maar die soorten leiden we (nog) niet uit de DB af.
 */
export interface AgendaRow extends AgendaItem {
  /** Lead-id voor navigatie naar /v2/leads/<id>. */
  leadId: string;
}

export function mapAgendaRows(appts: Appointment[]): AgendaRow[] {
  return appts.map((a) => {
    const start = a.afspraak_geboekt_op ? new Date(a.afspraak_geboekt_op) : null;
    const tijd = start
      ? start.toLocaleTimeString("nl-NL", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Amsterdam",
        })
      : "—";
    const subParts: string[] = [];
    if (a.hoofdcategorie) subParts.push(a.hoofdcategorie);
    if (a.plaats) subParts.push(a.plaats);
    const kind: AgendaKind = "bezoek";
    return {
      tijd,
      titel: `Plaatsbezoek · ${a.naam ?? "Onbekend"}`,
      sub: subParts.length > 0 ? subParts.join(" · ") : "—",
      kind,
      leadId: a.lead_id,
    };
  });
}
