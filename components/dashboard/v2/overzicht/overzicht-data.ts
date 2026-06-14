// ─────────────────────────────────────────────────────────────────────
// Pagina-specifieke demo-data voor het Overzicht.
// Gedeelde data (BRIEF, OWNER_ACTIONS, OMZET, KPIS, SPARK) komt uit
// `@/components/dashboard/v2/demo-data`; alleen Overzicht-eigen data die
// niet gedeeld wordt, staat hier (zoals de agenda van vandaag).
// ─────────────────────────────────────────────────────────────────────

/** Soort agenda-item; bepaalt de kleur van de kind-balk en de rij-achtergrond. */
export type AgendaKind = "bezoek" | "klus" | "deadline";

export interface AgendaItem {
  tijd: string;
  titel: string;
  sub: string;
  kind: AgendaKind;
}

/** "Vandaag in de agenda": drie items voor vandaag (conform prototype). */
export const AGENDA_TODAY: AgendaItem[] = [
  {
    tijd: "09:00",
    titel: "Plaatsbezoek · Sandra Janssen",
    sub: "Terras + schutting · Hilversum",
    kind: "bezoek",
  },
  {
    tijd: "13:00",
    titel: "Klus · Gevelreiniging Pietersen",
    sub: "Utrecht · 2 man · ±3 uur",
    kind: "klus",
  },
  {
    tijd: "16:00",
    titel: "Offerte verloopt · Thomas Wilms",
    sub: "€395 · nog niet geaccepteerd",
    kind: "deadline",
  },
];
