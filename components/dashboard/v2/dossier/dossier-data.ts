// ─────────────────────────────────────────────────────────────────────
// Lead-dossier (split view) — PAGINA-SPECIFIEKE demo-data.
//
// Port van de prototype-objecten DOS (CDosData.jsx) + de chat- en
// notitie-state uit PDossier.jsx. De gedeelde lead-velden (naam, plaats,
// dienst, bron, tijd, initialen) komen uit demo-data.ts via findLead();
// hier staan alleen de dossier-details die het prototype extra toont
// (contactrijen, Surface-checklist, bijzonderheden, foto-placeholders,
// offertes-preview, beginchat en beginnotities).
//
// Streep-vrij gehouden conform de Frontlix-huisstijl (komma i.p.v. liggend
// streepje; geen klemtoonaccenten in zichtbare tekst).
// ─────────────────────────────────────────────────────────────────────

/** Een contactrij in de Info-tab (telefoon / e-mail / adres). */
export interface ContactRow {
  /** Welk Lucide-icoon, gekozen door de component. */
  kind: "telefoon" | "email" | "adres";
  label: string;
  waarde: string;
  /** Optionele groene mint-chip rechts (bv. "WhatsApp"). */
  chip: string | null;
}

/** Een checklist-regel van Surface (vraag + of die afgerond is). */
export interface ChecklistItem {
  vraag: string;
  done: boolean;
}

/** Een bijzonderheden-tegel (label boven, waarde eronder). */
export interface BijzonderTegel {
  label: string;
  waarde: string;
}

/** Een offerte in de Offertes-tab. */
export interface DossierOfferte {
  nr: string;
  label: string;
  totaal: string;
  sub: string;
  /** Concept = blauwe rand + "Open"-knop, opent de offerte-wizard. */
  concept: boolean;
}

/** Een regel in de concept-offerte-preview. */
export interface OfferteRegel {
  naam: string;
  calc: string;
  bedrag: string;
}

/** Een notitie (team-zichtbaar geel kaartje). */
export interface DossierNotitie {
  wie: string;
  tijd: string;
  tekst: string;
}

export type ChatVan = "klant" | "bot" | "mij";

/** Een WhatsApp-bericht in de rechterkaart. */
export interface DossierBericht {
  van: ChatVan;
  tekst: string;
  tijd: string;
  /** True = bijgevoegde fotostrip onder het bericht. */
  fotos?: boolean;
}

export interface DossierData {
  /** Telefoon-nummer in de chatheader-subregel. */
  tel: string;
  /** Afstand-label bij het adres. */
  afstand: string;
  /** "laatste bericht <binnen>" in de metaregel. */
  binnen: string;
  /** Oppervlakte-chip in de Dienst & werk-kolom. */
  m2: number;
  /** Werk-chips naast de dienst (groene vinkjes). */
  sub: string[];
  contact: ContactRow[];
  checklist: ChecklistItem[];
  bijzonder: BijzonderTegel[];
  /** Foto-placeholder-labels (mono-tag). */
  fotos: string[];
  surface: { fase: string; actie: string };
  offertes: DossierOfferte[];
  offerteRegels: OfferteRegel[];
  offerteTotaal: string;
  notities: DossierNotitie[];
  chat: DossierBericht[];
}

/** De dossier-details. Eén set voor de demo (gekoppeld aan elke lead die je
 *  opent); in productie komt dit per lead uit de API. */
export const DOSSIER: DossierData = {
  tel: "06 24 96 52 70",
  afstand: "18 km",
  binnen: "8 min geleden",
  m2: 145,
  sub: ["Voegen invegen", "Beschermlaag aanbrengen"],
  contact: [
    { kind: "telefoon", label: "Telefoon", waarde: "06 24 96 52 70", chip: "WhatsApp" },
    { kind: "email", label: "E-mail", waarde: "jeroen.devries@gmail.com", chip: null },
    { kind: "adres", label: "Adres · 18 km", waarde: "Lindenlaan 14, Delft", chip: null },
  ],
  checklist: [
    { vraag: "Foto's ontvangen", done: true },
    { vraag: "Voegkleur gekozen", done: true },
    { vraag: "Planten afgestemd", done: true },
    { vraag: "Oppervlakte bevestigd", done: false },
  ],
  bijzonder: [
    { label: "Planten langs de rand", waarde: "Ja, afschermen met folie" },
    { label: "Groene aanslag", waarde: "Ja, aanwezig" },
    { label: "Korstmos", waarde: "Nee" },
    { label: "Voegzand", waarde: "Onkruidwerend · antraciet" },
  ],
  fotos: ["Oprit · overzicht", "Probleemgebied", "Voegen close-up", "Plantenrand"],
  surface: {
    fase: "Info verzamelen",
    actie: "Vraagt om bevestiging van de m², offerte staat daarna klaar",
  },
  offertes: [
    {
      nr: "SS-2026-051",
      label: "Concept, nog niet verstuurd",
      totaal: "€1.871,57",
      sub: "4 regels · vandaag opgesteld",
      concept: true,
    },
    {
      nr: "SS-2024-012",
      label: "Geaccepteerd",
      totaal: "€380,00",
      sub: "Terras reiniging · mei 2024",
      concept: false,
    },
  ],
  offerteRegels: [
    { naam: "Reiniging oprit", calc: "145 m² × €3,95", bedrag: "€572,75" },
    { naam: "Voegen invegen (onkruidwerend)", calc: "145 m² × €4,50", bedrag: "€652,50" },
    { naam: "Beschermlaag", calc: "145 m² × €2,10", bedrag: "€304,50" },
    { naam: "Planten afschermen", calc: "2 rollen × €8,50", bedrag: "€17,00" },
  ],
  offerteTotaal: "€1.871,57",
  notities: [
    {
      wie: "Christiaan",
      tijd: "gisteren 16:20",
      tekst: "Klant wil starten voor eind juni. Let op: smalle doorgang achterom.",
    },
    {
      wie: "Surface",
      tijd: "vandaag 09:42",
      tekst: "Noemde buurman Jan de Vries als referentie, mogelijk kortingsafspraak.",
    },
  ],
  chat: [
    {
      van: "bot",
      tekst:
        "Hoi Jeroen! Bedankt voor je aanvraag. Klopt het dat het om de oprit gaat, circa 145 m²?",
      tijd: "09:12",
    },
    { van: "klant", tekst: "Hoi! Ja, ongeveer 145 m² inderdaad.", tijd: "09:28" },
    {
      van: "bot",
      tekst:
        "Top! Kun je een paar recente foto's sturen? En welke voegkleur heeft je voorkeur, naturel of antraciet?",
      tijd: "09:42",
    },
    {
      van: "klant",
      tekst: "Antraciet graag. Foto's komen eraan.",
      tijd: "10:02",
      fotos: true,
    },
  ],
};
