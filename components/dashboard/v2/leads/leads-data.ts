// ─────────────────────────────────────────────────────────────────────
// Pagina-specifieke demo-data + afleidingen voor de Leads-pagina.
// Importeert de gedeelde stukken (LEADS, PIPELINE_COLUMNS) en verdeelt de
// leads over de pipeline-kolommen op basis van lead.status. Leads zonder
// exacte match landen in de dichtstbijzijnde passende kolom.
//
// Bewerk demo-data.ts niet; pagina-specifieke afleidingen horen hier.
// ─────────────────────────────────────────────────────────────────────

import { LEADS, PIPELINE_COLUMNS } from "../demo-data";
import type { Lead, StatusKind } from "../demo-data";

export type PipelineColumn = (typeof PIPELINE_COLUMNS)[number];

/** Een dot-kleur per kolom, parallel aan de StatusKind-pillkleuren. */
export interface PipelineCol {
  // Vrije string i.p.v. de demo-PIPELINE_COLUMNS-union: de echte fase-titels
  // (bv. "In gesprek", "Offerte review") komen uit de bestaande desktop-pipeline
  // en zitten niet in de demo-set. De demo-fallback (buildPipeline) blijft de
  // union-waarden gebruiken, die zijn nog steeds geldige strings.
  titel: string;
  /** Kleur-soort voor de status-dot in de kolomkop. */
  dotKind: StatusKind;
  /** Tonen de kolom als "afgerond" (gedimde kaarten, check-avatar). */
  done: boolean;
  leads: Lead[];
  /** Som van de leadwaardes in deze kolom, NL-geformatteerd met euro. */
  som: string;
}

/** Map een lead-status (vrije tekst) naar de juiste pipeline-kolom.
 *  Exacte titels matchen direct; de overige statussen worden naar de
 *  dichtstbijzijnde fase gestuurd (bv. "Wacht op jou" en "Buiten radius"
 *  zijn beslissingen op een verstuurde offerte → "Offerte uit"). */
function columnForLead(lead: Lead): PipelineColumn {
  const status = lead.status.toLowerCase();

  // Exacte kolomtitel?
  const exact = PIPELINE_COLUMNS.find((c) => c.toLowerCase() === status);
  if (exact) return exact;

  // Sleutelwoorden → fase.
  if (status.includes("nieuw")) return "Nieuw";
  if (status.includes("bezoek") || status.includes("gepland"))
    return "Bezoek gepland";
  if (status.includes("ingepland")) return "Ingepland";
  if (
    status.includes("afgerond") ||
    status.includes("betaald") ||
    status.includes("review")
  )
    return "Afgerond";

  // Overige beslis-/offerte-statussen ("Wacht op jou", "Buiten radius",
  // "Korting gevraagd", ...) horen bij de offerte-fase.
  return "Offerte uit";
}

/** De status-dot-kleur per kolom (vaste fase-kleur, los van losse leads). */
const COLUMN_DOT: Record<PipelineColumn, StatusKind> = {
  Nieuw: "new",
  "Bezoek gepland": "plan",
  "Offerte uit": "sent",
  Ingepland: "plan",
  Afgerond: "new",
};

/** Parse een NL-euro-string ("€2.549" / "€736") naar een getal in euro. */
function parseEuro(waarde: string): number {
  const digits = waarde.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

/** Formatteer een euro-bedrag NL-stijl ("€2.549"). */
function formatEuro(total: number): string {
  return `€${total.toLocaleString("nl-NL")}`;
}

/** De pipeline: vaste 5 kolommen met verdeelde leads en som-per-kolom. */
export function buildPipeline(): PipelineCol[] {
  const buckets = new Map<PipelineColumn, Lead[]>();
  for (const titel of PIPELINE_COLUMNS) buckets.set(titel, []);
  for (const lead of LEADS) {
    buckets.get(columnForLead(lead))!.push(lead);
  }

  return PIPELINE_COLUMNS.map((titel) => {
    const leads = buckets.get(titel)!;
    const total = leads.reduce((sum, l) => sum + parseEuro(l.waarde), 0);
    return {
      titel,
      dotKind: COLUMN_DOT[titel],
      done: titel === "Afgerond",
      leads,
      som: formatEuro(total),
    };
  });
}

export const PIPELINE: PipelineCol[] = buildPipeline();
