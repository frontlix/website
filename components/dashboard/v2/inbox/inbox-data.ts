// ─────────────────────────────────────────────────────────────────────
// Inbox, pagina-specifieke types + demo-data.
//
// De gedeelde THREADS + CHAT (Familie Bakker) komen uit demo-data.ts. Per
// gesprek hebben we hier extra context nodig: de berichtenreeks, de Surface-
// suggestie en de lead-context-velden voor het rechterpaneel. Port van
// P_CHATS uit de design-handoff (PLeadsInbox.jsx).
// ─────────────────────────────────────────────────────────────────────

import { CHAT, type ChatMessage, type StatusKind } from "../demo-data";

/** Eén tag-chip voor het lead-dossier (naam + kleur uit de tags-tabel). */
export interface LeadContextTag {
  id: string;
  naam: string;
  /** Hex-kleur uit de tags-tabel, of null voor de neutrale stijl. */
  kleur: string | null;
}

/** Velden voor het lead-context-paneel rechts (compact lead-dossier). */
export interface LeadContext {
  plaats: string;
  kanaal: string;
  dienst: string;
  waarde: string;
  /** Status-label + kleur-kind voor de status-pill. */
  statusLabel: string;
  statusKind: StatusKind;
  /** Fase-label ("Offerte besproken"), of null als er geen fase is. */
  faseLabel: string | null;
  /** Samengesteld adres (straat huisnummer, postcode plaats), of null. */
  adres: string | null;
  /** Oppervlakte in m², of null als niet ingevuld. */
  m2: number | null;
  /** Offertebedrag geformatteerd ("€ 736,00"), of null als <= 0. */
  bedrag: string | null;
  /** Lead-tags als chips, leeg als er geen tags zijn. */
  tags: LeadContextTag[];
}

/** Volledige inhoud van een gesprek in de Inbox. */
export interface InboxConversation {
  /** Ondertitel in de chat-header (kanaal · dienst · waarde). */
  sub: string;
  /** Berichtenreeks (klant links, jij/Surface rechts). */
  messages: ChatMessage[];
  /** Surface-suggestie, of null als er geen klaarstaat. */
  suggestie: string | null;
  /** Velden voor het lead-context-paneel rechts. */
  context: LeadContext;
}

/** Per thread-id de gespreksinhoud. De sleutels matchen THREADS[].id. */
export const CONVERSATIONS: Record<string, InboxConversation> = {
  bakker: {
    sub: CHAT.sub,
    messages: [...CHAT.messages],
    suggestie: CHAT.suggestie,
    context: {
      plaats: "Amersfoort",
      kanaal: "WhatsApp",
      dienst: "Gevelreiniging + impregnatie",
      waarde: "€736",
      statusLabel: "Offerte verstuurd",
      statusKind: "sent",
      faseLabel: "Offerte besproken",
      adres: "Stationsstraat 14, 3811 MK Amersfoort",
      m2: 62,
      bedrag: "€ 736,00",
      tags: [
        { id: "demo-vip", naam: "VIP", kleur: "#1a56ff" },
        { id: "demo-herhaal", naam: "Terugkerend", kleur: "#1e8a5e" },
      ],
    },
  },
  smit: {
    sub: "WhatsApp · Oprit reinigen · nieuw",
    messages: [
      { from: "klant", text: "Hoi! Hierbij de foto's van de oprit.", tijd: "08:10" },
      { from: "klant", text: "Het gaat om ongeveer 40 m², veel groene aanslag.", tijd: "08:12" },
    ],
    suggestie:
      "Maak offerte: oprit reinigen 40 m² × €4,75 = €190, inclusief voorrijden.",
    context: {
      plaats: "Zeist",
      kanaal: "WhatsApp",
      dienst: "Oprit reinigen",
      waarde: "nieuw",
      statusLabel: "Nieuw",
      statusKind: "new",
      faseLabel: "Info verzamelen",
      adres: "Dorpsweg 8, 3701 AB Zeist",
      m2: 40,
      bedrag: null,
      tags: [{ id: "demo-spoed", naam: "Spoed", kleur: "#b07408" }],
    },
  },
  vandijk: {
    sub: "Telefoon · Zonnepanelen reinigen",
    messages: [
      { from: "klant", text: "U probeerde mij te bellen over de zonnepanelen?", tijd: "07:52" },
    ],
    suggestie:
      "Bel terug voor 12:00, of stuur de 3 standaardvragen (aantal panelen, verdieping, bereikbaarheid).",
    context: {
      plaats: "Utrecht",
      kanaal: "Telefoon",
      dienst: "Zonnepanelen reinigen",
      waarde: "€310",
      statusLabel: "In gesprek",
      statusKind: "talking",
      faseLabel: "Info verzamelen",
      adres: "Maliebaan 22, 3581 CP Utrecht",
      m2: null,
      bedrag: "€ 310,00",
      tags: [],
    },
  },
  wilms: {
    sub: "WhatsApp · Dakgoot + gevel · €395",
    messages: [
      { from: "klant", text: "Is er nog iets aan de prijs te doen?", tijd: "gisteren" },
    ],
    suggestie:
      "Voorstel: 5% korting (€375) bij akkoord deze week, offerte verloopt vandaag 16:00.",
    context: {
      plaats: "Utrecht",
      kanaal: "WhatsApp",
      dienst: "Dakgoot + gevel",
      waarde: "€395",
      statusLabel: "In review",
      statusKind: "review",
      faseLabel: "Onderhandelen",
      adres: "Biltstraat 101, 3572 AP Utrecht",
      m2: 28,
      bedrag: "€ 395,00",
      tags: [{ id: "demo-korting", naam: "Kortingsverzoek", kleur: "#0b7fa8" }],
    },
  },
  janssen: {
    sub: "WhatsApp · Terras + schutting · €580",
    messages: [
      { from: "klant", text: "Top, tot donderdag!", tijd: "gisteren" },
      { from: "mij", text: "Tot donderdag, 09:00 staan we voor de deur!", tijd: "gisteren", status: "Gelezen" },
    ],
    suggestie: null,
    context: {
      plaats: "Hilversum",
      kanaal: "WhatsApp",
      dienst: "Terras + schutting",
      waarde: "€580",
      statusLabel: "Goedgekeurd",
      statusKind: "plan",
      faseLabel: "Afspraak bevestigd",
      adres: "Larenseweg 47, 1221 CL Hilversum",
      m2: 75,
      bedrag: "€ 580,00",
      tags: [{ id: "demo-afspraak", naam: "Afspraak gepland", kleur: "#0b7fa8" }],
    },
  },
};
