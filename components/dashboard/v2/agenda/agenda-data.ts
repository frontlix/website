// ─────────────────────────────────────────────────────────────────────
// Demo-data voor de Agenda-pagina (rebrand v2).
// Bron: design-handoff `CData3.jsx` (object C3.week + C3.route).
// Week ma 8 - za 13 juni, vandaag = wo 10 juni.
// Eigen pagina-data: bewerk demo-data.ts niet (zie AGENTS-CONTRACT.md).
// ─────────────────────────────────────────────────────────────────────

/** Soort afspraak; stuurt de accentkleur en het icoon. */
export type AgendaType = "klus" | "bezoek" | "deadline" | "intern";

/** Klus-details uit de lead (m², soort werk, conditie), getoond in het paneel. */
export interface KlusInfo {
  /** hoofdcategorie-key, bv. "onkruidbeheersing_zakelijk". */
  categorie?: string;
  /** Oppervlakte in m². */
  m2?: number;
  /** Gekozen sub-diensten (keys), bv. ["invegen", "beschermlaag"]. */
  subDiensten?: string[];
  /** Groene aanslag aanwezig. */
  groeneAanslag?: boolean;
  /** Planten moeten worden afgeschermd. */
  plantenAfschermen?: boolean;
}

/** Vertrekadres/werkplaats voor de routekaart (tenant_settings base_lat/lng). */
export interface RouteBase {
  lat: number;
  lng: number;
  label: string;
}

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
  /** Gekoppelde klantnaam (handmatig ingevoerd in "Nieuwe afspraak"). Wanneer
   *  gezet, gebruikt de UI deze i.p.v. de naam uit de titel af te leiden. */
  klant?: string;
  /** Reisafstand (km) vanaf de werkplaats naar de klant (lead-veld afstand_km,
   *  zoals ook voor de reiskosten gebruikt). Voedt de routekaart-chip. Demo/
   *  zonder waarde: dan toont de routekaart geen afstand. */
  afstandKm?: number;
  /** Klant-coördinaten (lead lat/lng) voor de live routekaart; ontbreken ze,
   *  dan valt de routekaart terug op de schematische SVG. */
  lat?: number | null;
  lng?: number | null;
  /** Klus-details (m², soort, conditie) uit de lead, voor het detailpaneel. */
  klusInfo?: KlusInfo;
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

/** Eén cel in het maandrooster (7 kolommen Ma..Zo, 5 of 6 rijen). Bevat ook
 *  de aangrenzende-maand-dagen (inMaand=false, gedimd) zodat het rooster vol is. */
export interface AgendaMaandCel {
  /** YYYY-MM-DD, stabiele sleutel + datum-afleiding. */
  dateKey: string;
  /** Dag-van-de-maand (1..31). */
  dag: number;
  /** True als de cel in de getoonde maand valt (anders gedimd voor- of naloop). */
  inMaand: boolean;
  /** True voor vandaag (blauwe markering). */
  vandaag: boolean;
  /** True voor een dag die al geweest is (vóór vandaag): wordt gedimd. */
  verleden: boolean;
  /** True voor een vrije dag (zondag): toont het "Vrij"-label. */
  vrij: boolean;
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
        afstandKm: 12,
      },
      {
        tijd: "13:00",
        duur: "3u",
        titel: "Klus · Gevelreiniging Pietersen",
        sub: "Utrecht · 2 man",
        plaats: "Utrecht",
        type: "klus",
        klaar: false,
        afstandKm: 28,
        klusInfo: {
          categorie: "gevelreiniging_zakelijk",
          m2: 95,
          subDiensten: ["reiniging"],
          groeneAanslag: true,
        },
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
        klusInfo: {
          categorie: "gevelreiniging_particulier",
          m2: 120,
          subDiensten: ["reiniging", "beschermlaag"],
          groeneAanslag: true,
          plantenAfschermen: true,
        },
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

/**
 * Demo-afspraken voor de maandweergave, gekoppeld op dag-van-de-maand (1..31).
 * Wordt in de dev-preview (geen sessie) over het rooster van de huidige maand
 * gelegd, zodat de maandweergave ook zonder Supabase gevuld is. Live komt de
 * data uit getAppointmentsForMonth + mapMonthToCells.
 */
export const AGENDA_MONTH: Record<number, AgendaItem[]> = {
  2: [{ tijd: "09:00", duur: "4u", titel: "Klus · Terras Jacobs", sub: "Soest · 2 man", plaats: "Soest", type: "klus", klaar: true }],
  4: [{ tijd: "14:00", duur: "1u", titel: "Plaatsbezoek · M. Visser", sub: "Amersfoort", plaats: "Amersfoort", type: "bezoek", klaar: true }],
  5: [{ tijd: "08:30", duur: "4u", titel: "Klus · Oprit Koster", sub: "Utrecht · 2 man", plaats: "Utrecht", type: "klus", klaar: true }],
  8: [{ tijd: "13:00", duur: "3u", titel: "Klus · Oprit De Vries", sub: "Soest · 2 man", plaats: "Soest", type: "klus", klaar: true }],
  9: [{ tijd: "08:30", duur: "4u", titel: "Klus · Gevel Hendriks", sub: "Utrecht · 2 man", plaats: "Utrecht", type: "klus", klaar: true }],
  10: [{ tijd: "13:00", duur: "3u", titel: "Klus · Gevelreiniging Pietersen", sub: "Utrecht · 2 man", plaats: "Utrecht", type: "klus", klaar: false }],
  11: [{ tijd: "09:00", duur: "6u", titel: "Klus · Familie Bakker", sub: "Gevel + impregnatie · €736", plaats: "Amersfoort", type: "klus", klaar: false }],
  12: [{ tijd: "14:00", duur: "1u", titel: "Plaatsbezoek · K. Vermeulen", sub: "Oprit + terras · Soest", plaats: "Soest", type: "bezoek", klaar: false }],
  15: [{ tijd: "09:00", duur: "2u", titel: "Klus · Zonnepanelen Van Dijk", sub: "Utrecht · mits akkoord", plaats: "Utrecht", type: "klus", klaar: false }],
  17: [{ tijd: "13:30", duur: "1u", titel: "Plaatsbezoek · T. Mulder", sub: "Hilversum", plaats: "Hilversum", type: "bezoek", klaar: false }],
  19: [{ tijd: "08:30", duur: "4u", titel: "Klus · Gevel De Groot", sub: "Soest · 2 man", plaats: "Soest", type: "klus", klaar: false }],
  23: [{ tijd: "10:00", duur: "2u", titel: "Klus · Oprit Willems", sub: "Zeist · 2 man", plaats: "Zeist", type: "klus", klaar: false }],
  25: [{ tijd: "15:00", duur: "1u", titel: "Plaatsbezoek · S. de Jong", sub: "Utrecht", plaats: "Utrecht", type: "bezoek", klaar: false }],
  29: [{ tijd: "09:00", duur: "3u", titel: "Klus · Dakgoten Peters", sub: "Amersfoort · 2 man", plaats: "Amersfoort", type: "klus", klaar: false }],
};
