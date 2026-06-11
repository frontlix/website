// ─────────────────────────────────────────────────────────────────────
// Inbox, pagina-specifieke types + demo-data.
//
// De gedeelde THREADS + CHAT (Familie Bakker) komen uit demo-data.ts. Per
// gesprek hebben we hier extra context nodig: de berichtenreeks, de Surface-
// suggestie en de lead-context-velden voor het rechterpaneel. Port van
// P_CHATS uit de design-handoff (PLeadsInbox.jsx).
// ─────────────────────────────────────────────────────────────────────

import { CHAT, type ChatMessage } from "../demo-data";

/** Velden voor het lead-context-paneel rechts (compact lead-dossier). */
export interface LeadContext {
  plaats: string;
  kanaal: string;
  dienst: string;
  waarde: string;
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
    },
  },
};
