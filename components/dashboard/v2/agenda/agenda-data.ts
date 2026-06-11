// ─────────────────────────────────────────────────────────────────────
// Demo-data voor de Agenda-pagina (rebrand v2).
// Bron: design-handoff `CData3.jsx` (object C3.week + C3.route).
// Week ma 8 - za 13 juni, vandaag = wo 10 juni.
// Eigen pagina-data: bewerk demo-data.ts niet (zie AGENTS-CONTRACT.md).
// ─────────────────────────────────────────────────────────────────────

/** Soort afspraak; stuurt de accentkleur en het icoon. */
export type AgendaType = "klus" | "bezoek" | "deadline" | "intern";

export interface AgendaItem {
  tijd: string;
  /** Duur, of EMPTY_DUUR wanneer niet van toepassing (deadline). */
  duur: string;
  titel: string;
  sub: string;
  /** Plaats van de afspraak (los veld: de sub-regel zet de plaats nu eens
   *  voor, dan weer achter de punt-separator). Leeg = geen plaats. */
  plaats: string;
  type: AgendaType;
  klaar: boolean;
  /** Optionele stabiele unieke sleutel voor React-keys en selectie-/afvink-
   *  matching. Live: de leadId (altijd aanwezig, dedupliceert twee afspraken
   *  op dezelfde tijd). Demo: `${dag}-${tijd}-${index}`. Demo-data zonder key
   *  valt in de UI terug op de tijd (uniek per demo-dag). */
  key?: string;
  /** Optionele echte lead-context (gevuld door agenda-mappers vanuit de
   *  leads-tabel). De demo-data laat deze leeg; de detail/route-modal valt
   *  dan terug op de afgeleide demo-helpers. */
  leadId?: string;
  telefoon?: string;
  adres?: string;
  /** UTC-instant van de afspraak (ISO). Live: gevuld door de mapper; gebruikt
   *  door de detail-modal om via rescheduleAppointment() te verzetten. Demo:
   *  leeg, dan blijft de verzet-knop verborgen. */
  iso?: string;
}

export interface AgendaDag {
  dag: string;
  datum: string;
  vandaag: boolean;
  items: AgendaItem[];
}

/** Sentinel: item zonder concrete duur (deadline). Wordt nooit getoond,
 *  de UI verbergt de duur wanneer deze gelijk is aan EMPTY_DUUR. */
export const EMPTY_DUUR = "geen";

export const AGENDA_WEEK_LABEL = "Week 24 · 8 - 13 juni";

export const AGENDA_WEEK: AgendaDag[] = [
  {
    dag: "Ma",
    datum: "8",
    vandaag: false,
    items: [
      {
        tijd: "09:00",
        duur: "1u",
        titel: "Plaatsbezoek · Familie Bakker",
        sub: "Amersfoort",
        plaats: "Amersfoort",
        type: "bezoek",
        klaar: true,
      },
      {
        tijd: "13:00",
        duur: "3u",
        titel: "Klus · Oprit De Vries",
        sub: "Soest · 2 man",
        plaats: "Soest",
        type: "klus",
        klaar: true,
      },
    ],
  },
  {
    dag: "Di",
    datum: "9",
    vandaag: false,
    items: [
      {
        tijd: "08:30",
        duur: "4u",
        titel: "Klus · Gevel Hendriks",
        sub: "Utrecht · 2 man",
        plaats: "Utrecht",
        type: "klus",
        klaar: true,
      },
      {
        tijd: "15:00",
        duur: "30m",
        titel: "Belafspraak · M. de Boer",
        sub: "Buiten radius, beslissen",
        plaats: "",
        type: "intern",
        klaar: true,
      },
    ],
  },
  {
    dag: "Wo",
    datum: "10",
    vandaag: true,
    items: [
      {
        tijd: "09:00",
        duur: "1u",
        titel: "Plaatsbezoek · Sandra Janssen",
        sub: "Terras + schutting · Hilversum",
        plaats: "Hilversum",
        type: "bezoek",
        klaar: false,
      },
      {
        tijd: "13:00",
        duur: "3u",
        titel: "Klus · Gevelreiniging Pietersen",
        sub: "Utrecht · 2 man",
        plaats: "Utrecht",
        type: "klus",
        klaar: false,
      },
      {
        tijd: "16:00",
        duur: EMPTY_DUUR,
        titel: "Offerte verloopt · Thomas Wilms",
        sub: "€395 · nog niet geaccepteerd",
        plaats: "",
        type: "deadline",
        klaar: false,
      },
    ],
  },
  {
    dag: "Do",
    datum: "11",
    vandaag: false,
    items: [
      {
        tijd: "09:00",
        duur: "6u",
        titel: "Klus · Familie Bakker",
        sub: "Gevel + impregnatie · €736",
        plaats: "Amersfoort",
        type: "klus",
        klaar: false,
      },
    ],
  },
  {
    dag: "Vr",
    datum: "12",
    vandaag: false,
    items: [
      {
        tijd: "10:00",
        duur: "2u",
        titel: "Klus · Zonnepanelen Van Dijk",
        sub: "Utrecht · mits akkoord",
        plaats: "Utrecht",
        type: "klus",
        klaar: false,
      },
      {
        tijd: "14:00",
        duur: "1u",
        titel: "Plaatsbezoek · K. Vermeulen",
        sub: "Oprit + terras · Soest",
        plaats: "Soest",
        type: "bezoek",
        klaar: false,
      },
    ],
  },
  {
    dag: "Za",
    datum: "13",
    vandaag: false,
    items: [],
  },
];
