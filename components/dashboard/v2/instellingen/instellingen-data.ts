// ─────────────────────────────────────────────────────────────────────
// Instellingen, pagina-specifieke demo-data.
//
// Port van CInstellingen.jsx + PInstellingenV2.jsx (de uitgewerkte versie).
// Alle waarden zijn streep-vrij gehouden conform huisstijl (komma i.p.v.
// liggend streepje, geen klemtoonaccenten in zichtbare tekst).
// ─────────────────────────────────────────────────────────────────────

// ── Zijmenu-secties ──────────────────────────────────────────────────────

export type SettingsSection =
  | "Bedrijfsprofiel"
  | "Diensten & prijzen"
  | "Prijzen"
  | "Tags"
  | "Beschikbaarheid"
  | "Kanalen"
  | "Integraties"
  | "Openingsbericht"
  | "Reminders"
  | "Offertes"
  | "Team"
  | "Meldingen"
  | "Abonnement";

export const SETTINGS_MENU: SettingsSection[] = [
  "Bedrijfsprofiel",
  "Diensten & prijzen",
  "Prijzen",
  "Tags",
  "Beschikbaarheid",
  "Kanalen",
  "Integraties",
  "Openingsbericht",
  "Reminders",
  "Offertes",
  "Team",
  "Meldingen",
  "Abonnement",
];

/** Subkop onder de paneeltitel, per sectie. */
export const SETTINGS_SUBHEAD: Record<SettingsSection, string> = {
  "Bedrijfsprofiel":
    "Je gegevens, werkgebied en maanddoel, dit gebruikt Surface overal",
  "Diensten & prijzen":
    "Welke diensten biedt je aan? Schakel ze aan of uit, Surface gebruikt dit voor automatische offertes",
  "Prijzen":
    "De prijsregels die Surface gebruikt om offertes te berekenen",
  "Tags": "Categoriseer leads in je eigen woorden, gebruik in filters en zoekopdrachten",
  "Beschikbaarheid": "Surface plant bezoeken en klussen alleen binnen deze tijden",
  "Kanalen": "Waar leads, reviews en afspraken binnenkomen",
  "Integraties": "Koppel je Google Agenda zodat Surface je vrije tijden ziet en afspraken inplant",
  "Openingsbericht":
    "Het eerste bericht dat Surface stuurt bij een nieuwe lead, Meta-template, per dienst",
  "Reminders": "Automatische opvolging als een klant niet op de offerte reageert",
  "Offertes": "Standaardinstellingen voor elke offerte",
  "Team": "Wie er in Frontlix werken en wat ze mogen",
  "Meldingen": "Wanneer Frontlix je een melding stuurt",
  "Abonnement": "Je pakket en facturen",
};

// ── Bedrijfsprofiel ──────────────────────────────────────────────────────

export interface CompanyProfile {
  naam: string;
  /** Straat + huisnummer (zonder postcode/plaats, die staan apart). */
  adres: string;
  postcode: string;
  plaats: string;
  tel: string;
  mail: string;
  doel: string;
}

export const PROFILE_DEFAULT: CompanyProfile = {
  naam: "Schoon Straatje",
  adres: "Werkplaatsweg 12",
  postcode: "3812 AB",
  plaats: "Amersfoort",
  tel: "06 12 34 56 78",
  mail: "info@schoonstraatje.nl",
  doel: "25.000",
};

export const WORK_BASE_DEFAULT = "Werkplaatsweg 12, 3812 AB Amersfoort";
export const WORK_RADIUS_DEFAULT = 50;

// ── Diensten & prijzen ───────────────────────────────────────────────────

export interface Service {
  naam: string;
  bedrag: string;
  eenheid: string;
  actief: boolean;
}

export const SERVICES_DEFAULT: Service[] = [
  { naam: "Gevelreiniging", bedrag: "8,50", eenheid: "/ m²", actief: true },
  { naam: "Gevelimpregnatie", bedrag: "6,00", eenheid: "/ m²", actief: true },
  { naam: "Oprit & terras reinigen", bedrag: "4,75", eenheid: "/ m²", actief: true },
  { naam: "Zonnepanelen reinigen", bedrag: "3,50", eenheid: "/ paneel", actief: true },
  { naam: "Dakgoten reinigen", bedrag: "2,25", eenheid: "/ m", actief: false },
];

// ── Beschikbaarheid ──────────────────────────────────────────────────────

export interface DaySlot {
  dag: string;
  aan: boolean;
  /** Begintijd (HH:MM), bewerkbaar in het Beschikbaarheid-paneel. */
  van: string;
  /** Eindtijd (HH:MM), bewerkbaar in het Beschikbaarheid-paneel. */
  tot: string;
}

export const DAYS_DEFAULT: DaySlot[] = [
  { dag: "Maandag", aan: true, van: "08:00", tot: "17:00" },
  { dag: "Dinsdag", aan: true, van: "08:00", tot: "17:00" },
  { dag: "Woensdag", aan: true, van: "08:00", tot: "17:00" },
  { dag: "Donderdag", aan: true, van: "08:00", tot: "17:00" },
  { dag: "Vrijdag", aan: true, van: "08:00", tot: "16:00" },
  { dag: "Zaterdag", aan: true, van: "09:00", tot: "13:00" },
  { dag: "Zondag", aan: false, van: "08:00", tot: "17:00" },
];

// ── Kanalen ──────────────────────────────────────────────────────────────

export interface Channel {
  naam: string;
  status: string;
  ok: boolean;
  sub: string;
}

export const CHANNELS: Channel[] = [
  {
    naam: "WhatsApp Business",
    status: "Gekoppeld",
    ok: true,
    sub: "06 12345678 · 21 leads deze maand",
  },
  {
    naam: "Google Reviews",
    status: "Gekoppeld",
    ok: true,
    sub: "Schoon Straatje · 4,9 sterren · 31 reviews",
  },
  {
    naam: "Google Agenda",
    status: "Gekoppeld",
    ok: true,
    sub: "Afspraken synchroniseren twee kanten op",
  },
  {
    naam: "Website-formulier",
    status: "Actief",
    ok: true,
    sub: "schoonstraatje.nl · 11 leads",
  },
  {
    naam: "Klusvergelijk",
    status: "Niet gekoppeld",
    ok: false,
    sub: "Koppel om aanvragen automatisch binnen te halen",
  },
];

// ── Openingsbericht (Meta-template per dienst) ───────────────────────────

export interface TemplateVariable {
  v: string;
  d: string;
}

export const OPENING_VARS: TemplateVariable[] = [
  { v: "{voornaam}", d: "Voornaam klant" },
  { v: "{bedrijf}", d: "Jouw bedrijfsnaam" },
  { v: "{bot_naam}", d: "Chatbot-naam (bv. Surface)" },
  { v: "{m2}", d: "Oppervlakte van aanvraag" },
  { v: "{hoofddienst}", d: "Bv. gevel, oprit" },
  { v: "{plaats}", d: "Plaats klant" },
];

export const REMINDER_VARS: TemplateVariable[] = [
  { v: "{voornaam}", d: "Voornaam klant" },
  { v: "{totaal}", d: "Totaalbedrag offerte" },
  { v: "{dienst}", d: "Diensten in offerte" },
  { v: "{geldig_tot}", d: "Vervaldatum offerte" },
  { v: "{bedrijf}", d: "Jouw bedrijfsnaam" },
];

export const OPENING_DEFAULTS: Record<string, string> = {
  Gevel:
    "Hoi {voornaam}\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, jullie online assistent. Ik help je in een paar berichten aan een offerte op maat voor je {hoofddienst}.\n\nKlopt het dat het gaat om ongeveer {m2} m²?",
  "Oprit & terras":
    "Hoi {voornaam}\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, ik help je snel aan een passende offerte voor het reinigen van je {hoofddienst}.\n\nKlopt het dat het gaat om ongeveer {m2} m²?",
};

// ── Reminders ────────────────────────────────────────────────────────────

export interface Reminder {
  dag: string;
  label: string;
  sub: string;
  tekst: string;
}

export const REMINDERS_DEFAULT: Reminder[] = [
  {
    dag: "2",
    label: "Eerste herinnering",
    sub: "Vriendelijk, zonder druk",
    tekst:
      "Hoi {voornaam},\n\nIk heb de offerte van € {totaal} doorgestuurd. Heb je 'm kunnen bekijken? Stuur even een tikje als je nog vragen hebt, dan denk ik graag met je mee.\n\nGroet, {bedrijf}",
  },
  {
    dag: "5",
    label: "Tweede herinnering",
    sub: "Vraagt of klant nog interesse heeft",
    tekst:
      "Hoi {voornaam},\n\nNog even een check: is de offerte voor {dienst} duidelijk? Geen druk, laat gewoon weten of je 'm in beraad houdt of liever afmeldt.\n\nDe offerte is geldig tot {geldig_tot}.",
  },
  {
    dag: "8",
    label: "Derde herinnering",
    sub: "Laatste poging, met optie tot afmelden",
    tekst:
      "Hoi {voornaam},\n\nLaatste tikje, als ik niks hoor sluit ik de offerte automatisch af. Geen probleem als het niet doorgaat; wel fijn als je het even bevestigt voor {geldig_tot}.",
  },
];

/** Vervangt variabelen door voorbeeldwaarden voor de WhatsApp-preview. */
export function previewTemplate(txt: string): string {
  const map: Record<string, string> = {
    "{voornaam}": "Anna",
    "{naam}": "Anna Smit",
    "{bedrijf}": "Schoon Straatje",
    "{bot_naam}": "Surface",
    "{m2}": "40",
    "{hoofddienst}": "oprit",
    "{plaats}": "Zeist",
    "{totaal}": "240",
    "{dienst}": "oprit reinigen",
    "{geldig_tot}": "24 juni",
  };
  return Object.entries(map).reduce((acc, [k, v]) => acc.split(k).join(v), txt);
}

// ── Meldingen ────────────────────────────────────────────────────────────

export interface NotificationSetting {
  titel: string;
  sub: string;
  aan: boolean;
}

export const NOTIFICATIONS_DEFAULT: NotificationSetting[] = [
  {
    titel: "Nieuwe lead",
    sub: "Direct een pushmelding bij elke nieuwe aanvraag",
    aan: true,
  },
  {
    titel: "Beslissing nodig",
    sub: "Als Surface jouw akkoord nodig heeft (toeslag, korting, radius)",
    aan: true,
  },
  {
    titel: "Dagelijkse samenvatting",
    sub: "Elke ochtend om 08:00, wat er vandaag speelt",
    aan: true,
  },
  {
    titel: "Review ontvangen",
    sub: "Bij elke nieuwe review, met conceptantwoord",
    aan: true,
  },
  {
    titel: "Weekrapport",
    sub: "Maandagochtend, omzet, leads en conversie",
    aan: false,
  },
];

// ── Offertes ─────────────────────────────────────────────────────────────

export const QUOTE_DEFAULTS = {
  geldigheid: 14,
  btw: "21",
  betaaltermijn: "14",
  nummerFormaat: "SS-2026-###",
  aanbetaling: false,
} as const;

// ── Team ─────────────────────────────────────────────────────────────────

export interface TeamMember {
  naam: string;
  rol: string;
  sub: string;
  init: string;
  /** true = owner-rij (eerste); stuurt de avatar/rol-pill-styling. */
  owner: boolean;
}

export const TEAM: TeamMember[] = [
  {
    naam: "Christiaan Tromp",
    rol: "Owner",
    sub: "Alles, beslissingen, prijzen, instellingen",
    init: "CT",
    owner: true,
  },
  {
    naam: "Mike van Leeuwen",
    rol: "Uitvoerend",
    sub: "Agenda en klussen afronden, geen prijzen",
    init: "ML",
    owner: false,
  },
  {
    naam: "Daan Bos",
    rol: "Uitvoerend",
    sub: "Agenda en klussen afronden, geen prijzen",
    init: "DB",
    owner: false,
  },
];

// ── Abonnement ───────────────────────────────────────────────────────────

export const SUBSCRIPTION = {
  pakket: "Frontlix Pro",
  prijs: "49",
  periode: "/mnd",
  features: "Onbeperkt leads · Surface AI · WhatsApp Business · verlengt 1 juli 2026",
  betaalmethode: "Automatische incasso · NL12 •••• 4421",
  factuurMail: "administratie@schoonstraatje.nl",
} as const;

export const INVOICES: { maand: string; bedrag: string }[] = [
  { maand: "Mei 2026", bedrag: "€49,00" },
  { maand: "April 2026", bedrag: "€49,00" },
  { maand: "Maart 2026", bedrag: "€49,00" },
];
