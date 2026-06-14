// ─────────────────────────────────────────────────────────────────────
// Lead-dossier (split view) — PAGINA-SPECIFIEKE demo-data.
//
// Port van de prototype-objecten DOS (CDosData.jsx) + de chat- en
// notitie-state uit PDossier.jsx. De gedeelde lead-velden (naam, plaats,
// dienst, bron, tijd, initialen) komen uit demo-data.ts via findLead();
// hier staan alleen de dossier-details die het prototype extra toont
// (klant- en werk-rijen, foto-placeholders, offertes-preview, beginchat
// en beginnotities).
//
// Streep-vrij gehouden conform de Frontlix-huisstijl (komma i.p.v. liggend
// streepje; geen klemtoonaccenten in zichtbare tekst).
// ─────────────────────────────────────────────────────────────────────

/** Een gegevensrij in de Info-tab (label boven, waarde eronder). Optioneel
 *  een chip rechts (bv. groene "WhatsApp"-chip) of een sub-regel onder de
 *  waarde (bv. "Binnen gratis radius"). */
export interface InfoRow {
  label: string;
  waarde: string;
  /** Optionele chip rechts (bv. "WhatsApp"); mint-stijl. */
  chip?: string | null;
  /** Optionele sub-regel onder de waarde (bv. "Binnen gratis radius"). */
  sub?: string | null;
}

/** Een foto in het dossier: echte Supabase public_url (of null, dan toont de
 *  strip de gestreepte placeholder) plus een mono-tag-label. */
export interface DossierFoto {
  url: string | null;
  tag: string;
}

/** Kleur-toon van een offerte-tag (concept=blauw, verstuurd=groen, archief=grijs). */
export type OfferteTone = "concept" | "verstuurd" | "archief";

/** Een offerte in de Offertes-tab. */
export interface DossierOfferte {
  nr: string;
  label: string;
  totaal: string;
  sub: string;
  /** Concept = blauwe rand + "Open"-knop, opent de offerte-wizard. */
  concept: boolean;
  /** Tag-kleur. Zonder = afgeleid uit `concept` (concept=blauw, anders groen). */
  tone?: OfferteTone;
}

/** Een regel in de concept-offerte-preview. */
export interface OfferteRegel {
  naam: string;
  calc: string;
  bedrag: string;
}

// Het bewerkbare concept (inline OfferteEditor) gebruikt het echte
// offerte-datamodel + de prijslijst, zodat het exact via de bestaande
// server-action (saveOfferteForm) opslaat. In demo-modus is dit louter
// inert voorbeeld-input.
import { DEFAULTS } from "@/lib/dashboard/manual-offerte-types";
import { FALLBACK_PRICING } from "@/lib/dashboard/pricing-types";
import type { OfferteFormData } from "./OfferteEditor";

export type { OfferteFormData };

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
  /** Linker Info-kolom: klantgegevens (naam, bedrijf, telefoon, e-mail, adres, bron). */
  klant: InfoRow[];
  /** Rechter Info-kolom: werk (hoofddienst, diensten, oppervlakte, voegzand, ...). */
  werk: InfoRow[];
  /** Foto-placeholder-labels (mono-tag). */
  fotos: DossierFoto[];
  surface: { fase: string; actie: string };
  offertes: DossierOfferte[];
  offerteRegels: OfferteRegel[];
  offerteTotaal: string;
  /** Bewerkbaar concept voor de inline OfferteEditor (echt model + pricing). */
  offerteForm: OfferteFormData;
  notities: DossierNotitie[];
  chat: DossierBericht[];
}

/** De dossier-details. Eén set voor de demo (gekoppeld aan elke lead die je
 *  opent); in productie komt dit per lead uit de API. */
export const DOSSIER: DossierData = {
  tel: "06 24 96 52 70",
  afstand: "18 km",
  binnen: "8 min geleden",
  klant: [
    { label: "Naam", waarde: "Jeroen de Vries" },
    { label: "Bedrijf", waarde: "De Vries Tuinen" },
    { label: "Telefoon", waarde: "06 24 96 52 70", chip: "WhatsApp" },
    { label: "E-mail", waarde: "jeroen.devries@gmail.com" },
    { label: "Adres", waarde: "Lindenlaan 14, Delft · 18 km", sub: "Binnen gratis radius" },
    { label: "Bron", waarde: "WhatsApp" },
  ],
  werk: [
    { label: "Hoofddienst", waarde: "Oprit / terras / terrein" },
    { label: "Diensten", waarde: "Voegen invegen + Nieuwe beschermlaag" },
    { label: "Oppervlakte", waarde: "145 m²" },
    { label: "Voegzand", waarde: "Onkruidwerend · antraciet" },
    { label: "Groene aanslag", waarde: "Ja, aanwezig" },
    { label: "Planten", waarde: "Ja, afschermen" },
  ],
  fotos: [
    { url: null, tag: "Oprit · overzicht" },
    { url: null, tag: "Probleemgebied" },
    { url: null, tag: "Voegen close-up" },
    { url: null, tag: "Plantenrand" },
  ],
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
  // Demo-concept voor de inline editor: realistische invoer, maar inert
  // (zonder leadId slaat de editor niets op). Gebruikt het echte model.
  offerteForm: {
    data: {
      ...DEFAULTS,
      naam: "Jeroen de Vries",
      bedrijf: "De Vries Tuinen",
      email: "jeroen.devries@gmail.com",
      telefoon: "06 24 96 52 70",
      sub: ["invegen", "beschermlaag"],
      m2: 145,
      groene_aanslag: "ja",
      voegzand_onkruidwerend_actief: true,
      voegzand_onkruidwerend_zakken: 29,
      voegzand_onkruidwerend_m2: 145,
      kleur_antraciet: true,
      planten_afschermen_actief: true,
      afstand_km: 18,
    },
    pricing: FALLBACK_PRICING,
    geldigheidDagen: 14,
  },
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
