// ─────────────────────────────────────────────────────────────────────
// Mappers: echte Supabase-leads (LeadListItem) -> v2-component-props.
//
// We hergebruiken de bestaande query-vorm (LeadListItem uit
// lib/dashboard/lead-queries) en de bestaande helpers (format, status-meta,
// DIENST_LABELS, mobile lead-mappers voor stage/urgent). De prop-vormen van
// de v2-componenten (Lead, PipelineCol) blijven exact gelijk; we vullen ze
// met echte data. Geen DB-logica hier, puur transformatie.
// ─────────────────────────────────────────────────────────────────────

import type { LeadListItem } from "@/lib/dashboard/lead-queries";
import { formatEuro, formatRelative } from "@/lib/dashboard/format";
import { DIENST_LABELS } from "@/lib/dashboard/manual-offerte-types";
import type { SubDienst } from "@/lib/dashboard/manual-offerte-types";
import {
  leadStage,
  isLeadUrgent,
  type MobileLeadStage,
} from "@/components/dashboard/mobile/leads/lead-mappers";
import type { Lead, StatusKind } from "@/components/dashboard/v2/demo-data";
import type { PipelineCol } from "./leads-data";

// ── Helpers ──────────────────────────────────────────────────────────

function humanize(key: string): string {
  return key.replace(/_/g, " ");
}

/** Dienst-label uit sub_diensten (zelfde DIENST_LABELS-mapping als de
 *  bestaande LeadsTable), met hoofdcategorie als fallback. */
function dienstLabel(lead: LeadListItem): string {
  const labels = (lead.sub_diensten ?? [])
    .map((d) => DIENST_LABELS[d as SubDienst] ?? humanize(d))
    .filter(Boolean);
  if (labels.length > 0) return labels.join(", ");
  if (lead.hoofdcategorie) return humanize(lead.hoofdcategorie);
  return "Aanvraag";
}

/** Bron-label voor de v2-kaart. kanaal 'web' = formulier (website), de rest
 *  is WhatsApp, zelfde semantiek als de bestaande bron-filter. */
function bronLabel(lead: LeadListItem): string {
  return lead.kanaal === "web" ? "Website" : "WhatsApp";
}

/** Initialen uit de naam (eerste letters van max 2 woorden). */
function initialsFromNaam(naam: string | null): string {
  const parts = (naam ?? "").split(/\s+/).filter(Boolean).slice(0, 2);
  const text = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return text || "?";
}

/**
 * StatusKind voor de v2-StatusPill. We leiden de v2-kleur af van de pipeline-
 * stage (zelfde stage-bepaling als de mobile/desktop-pipeline) zodat de
 * kleur consistent is met de kolom waar de lead in valt. Urgente leads
 * (wacht op owner-review / klus geblokkeerd) worden "hot".
 */
const STAGE_TO_KIND: Record<MobileLeadStage, StatusKind> = {
  gesprek: "talking", // in gesprek -> blauw
  review: "review", // offerte review / onderhandelen -> amber
  uit: "sent", // offerte verstuurd -> grijs-blauw
  gepland: "plan", // bezoek/afspraak gepland -> cyaan-teal
  klaar: "won", // afgerond / akkoord -> vol groen
};

function statusKindForLead(lead: LeadListItem): StatusKind {
  if (isLeadUrgent(lead)) return "hot"; // wacht op jou / urgent -> koraal
  return STAGE_TO_KIND[leadStage(lead)];
}

/** Korte status-tekst op de v2-pill. Urgent -> "Wacht op jou", anders het
 *  fase-label van de kolom. */
const STAGE_LABEL: Record<MobileLeadStage, string> = {
  gesprek: "In gesprek",
  review: "Offerte review",
  uit: "Offerte uit",
  gepland: "Ingepland",
  klaar: "Afgerond",
};

function statusLabelForLead(lead: LeadListItem): string {
  if (isLeadUrgent(lead)) return "Wacht op jou";
  return STAGE_LABEL[leadStage(lead)];
}

/** Plaats-tekst (valt terug op "—" voor de UI). */
function plaatsLabel(lead: LeadListItem): string {
  return lead.plaats ?? "—";
}

// ── Lead-rij -> v2 Lead-prop ─────────────────────────────────────────

/** Map één LeadListItem naar de v2 Lead-prop (LeadsList-rij + pipeline-kaart). */
export function mapLeadToV2(lead: LeadListItem): Lead {
  const waardeRaw = formatEuro(lead.totaal_prijs);
  return {
    id: lead.lead_id,
    naam: lead.naam ?? "Onbekend",
    plaats: plaatsLabel(lead),
    dienst: dienstLabel(lead),
    // formatEuro geeft "— " bij null; toon dan een streepje-vrije fallback.
    waarde: lead.totaal_prijs ? waardeRaw : "Nog geen prijs",
    bron: bronLabel(lead),
    status: statusLabelForLead(lead),
    statusKind: statusKindForLead(lead),
    tijd: formatRelative(lead.bijgewerkt),
    initials: initialsFromNaam(lead.naam),
  };
}

/** Map een hele lijst leads naar v2 Lead-props (voor de lijst-weergave). */
export function mapLeadsToV2(leads: LeadListItem[]): Lead[] {
  return leads.map(mapLeadToV2);
}

// ── Pipeline-verdeling ───────────────────────────────────────────────

/**
 * De 5 vaste pipeline-kolommen, exact dezelfde stage-matching als de
 * bestaande (app)-LeadsPipeline (via leadStage op gesprek_fase +
 * dashboard_status). Per kolom: count, som (EUR-geformatteerd) en de
 * gemapte v2-leadkaarten.
 *
 * De v2-PipelineCol-vorm (titel, dotKind, done, leads, som) blijft gelijk;
 * we vullen 'm met echte data.
 */
const PIPELINE_STAGES: ReadonlyArray<{
  stage: MobileLeadStage;
  titel: PipelineCol["titel"];
  dotKind: StatusKind;
  done: boolean;
}> = [
  { stage: "gesprek", titel: "In gesprek", dotKind: "new", done: false },
  { stage: "review", titel: "Offerte review", dotKind: "review", done: false },
  { stage: "uit", titel: "Offerte uit", dotKind: "sent", done: false },
  { stage: "gepland", titel: "Ingepland", dotKind: "plan", done: false },
  { stage: "klaar", titel: "Afgerond", dotKind: "won", done: true },
];

export function buildPipelineFromLeads(leads: LeadListItem[]): PipelineCol[] {
  return PIPELINE_STAGES.map(({ stage, titel, dotKind, done }) => {
    const inStage = leads.filter((l) => leadStage(l) === stage);
    const total = inStage.reduce((sum, l) => sum + (l.totaal_prijs ?? 0), 0);
    return {
      titel,
      dotKind,
      done,
      leads: inStage.map(mapLeadToV2),
      som: total > 0 ? formatEuro(total) : formatEuro(0),
    };
  });
}

// ── Client-side filtering (zelfde semantiek als de (app)-pagina) ─────

export interface LeadsFilterParams {
  q?: string;
  bron?: string;
  urgent?: string;
  sort?: string;
}

const STAGE_ORDER: Record<MobileLeadStage, number> = {
  gesprek: 0,
  review: 1,
  uit: 2,
  gepland: 3,
  klaar: 4,
};

/**
 * Filtert + sorteert een leads-lijst client-side, identiek aan de bestaande
 * (app)-LeadsPage: search op naam/telefoon/adres, bron-filter (form/wa),
 * urgent-filter, en sortering (prijs/naam/fase). Werkt op de rauwe
 * LeadListItem zodat we daarna pas mappen (de stage-bepaling heeft de
 * rauwe velden nodig).
 */
export function applyLeadsFilters(
  leads: LeadListItem[],
  params: LeadsFilterParams,
): LeadListItem[] {
  let out = leads;

  const search = (params.q ?? "").trim().toLowerCase();
  if (search) {
    out = out.filter((l) => {
      const adres = [l.straat, l.huisnummer, l.postcode, l.plaats]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (l.naam ?? "").toLowerCase().includes(search) ||
        adres.includes(search) ||
        (l.telefoon ?? "").toLowerCase().includes(search)
      );
    });
  }

  const bronFilter =
    params.bron === "wa" || params.bron === "form" ? params.bron : null;
  if (bronFilter === "form") {
    out = out.filter((l) => l.kanaal === "web");
  } else if (bronFilter === "wa") {
    out = out.filter((l) => l.kanaal !== "web");
  }

  if (params.urgent === "1") {
    out = out.filter((l) => isLeadUrgent(l));
  }

  const sortKey = params.sort;
  if (sortKey === "prijs") {
    out = [...out].sort(
      (a, b) => (b.totaal_prijs ?? 0) - (a.totaal_prijs ?? 0),
    );
  } else if (sortKey === "naam") {
    out = [...out].sort((a, b) =>
      (a.naam ?? "").localeCompare(b.naam ?? "", "nl"),
    );
  } else if (sortKey === "fase") {
    out = [...out].sort(
      (a, b) => STAGE_ORDER[leadStage(a)] - STAGE_ORDER[leadStage(b)],
    );
  }

  return out;
}
