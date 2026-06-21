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
  | "Abonnement"
  | "Account"
  | "Privacy";

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
  "Account",
  "Privacy",
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
  "Account": "Je inloggegevens, wachtwoord en e-mailadres",
  "Privacy": "Je rechten onder de AVG, exporteer of verwijder je gegevens",
};

// ── Bedrijfsprofiel ──────────────────────────────────────────────────────

export interface CompanyProfile {
  naam: string;
  /** Bot-naam (tenant_settings.chatbot_naam). */
  botNaam: string;
  /** Straat + huisnummer (zonder postcode/plaats, die staan apart). */
  adres: string;
  postcode: string;
  plaats: string;
  /** Eigenaar-WhatsApp (tenant_settings.eigenaar_whatsapp). */
  tel: string;
  /** Spoed-telefoon (tenant_settings.eigenaar_spoed_telefoon). */
  spoedTel: string;
  mail: string;
  doel: string;
}

export const PROFILE_DEFAULT: CompanyProfile = {
  naam: "Schoon Straatje",
  botNaam: "Surface",
  adres: "Werkplaatsweg 12",
  postcode: "3812 AB",
  plaats: "Amersfoort",
  tel: "06 12 34 56 78",
  spoedTel: "06 87 65 43 21",
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

/**
 * Openingsbericht-templates: elke tab koppelt aan de echte Meta-template-key
 * (lead_intake_*), zodat een wijziging via requestTemplateChange kan worden
 * INGEDIEND (Slack-melding + Meta-goedkeuring). De keys + defaults spiegelen de
 * v1 OpeningTemplateEditor; `requestTemplateChange` accepteert alleen deze keys.
 */
export interface OpeningTemplate {
  key: string;
  label: string;
  default: string;
}

export const OPENING_TEMPLATES: OpeningTemplate[] = [
  {
    key: "lead_intake_oprit",
    label: "Oprit / Terras",
    default:
      "Hoi {voornaam}\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, jullie online assistent. Ik help je in een paar berichten aan een offerte op maat voor het reinigen en opnieuw invegen van je {hoofddienst}.\n\nKlopt het dat het gaat om ongeveer {m2} m²?",
  },
  {
    key: "lead_intake_onkruid",
    label: "Onkruidbeheersing",
    default:
      "Hoi {voornaam}\n\nBedankt voor je aanvraag bij {bedrijf}! Ik ben {bot_naam}, ik help je snel aan een passende offerte voor onkruidbeheersing op jullie locatie.\n\nKlopt het dat het gaat om ongeveer {m2} m²?",
  },
];

export const OPENING_DEFAULTS: Record<string, string> = Object.fromEntries(
  OPENING_TEMPLATES.map((t) => [t.key, t.default]),
);

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

/** Bewerkbare offerte-instellingen (echt opgeslagen op tenant_settings). */
export interface OffertesInstellingen {
  /** Geldigheid in dagen. */
  geldigheid: number;
  /** BTW-tarief als percentage-string, bv "21". */
  btw: string;
  /** Betaaltermijn in dagen als string, bv "14". */
  betaaltermijn: string;
  /** Voorvoegsel voor het doorlopende offertenummer, bv "SS" → SS-2026-001. */
  prefix: string;
}

export const OFFERTES_DEFAULT: OffertesInstellingen = {
  geldigheid: 14,
  btw: "21",
  betaaltermijn: "14",
  prefix: "SS",
};

// ── E-mailkoppeling (Integraties) ────────────────────────────────────────

/**
 * Niet-geheime e-mailkoppel-status zoals het EmailPanel hem als prop krijgt.
 * Gevuld server-side uit email_connections (getEmailConnectionStatus); bevat
 * NOOIT het wachtwoord. In de demo-fallback simpelweg { connected: false }.
 */
export interface EmailConnectionState {
  connected: boolean;
  /** Gekoppeld afzender- en login-adres. */
  email?: string;
  /** Weergavenaam in de From. */
  senderName?: string;
  /** Optioneel afwijkend reply-to. */
  replyTo?: string | null;
  /** Gekozen provider-preset (informatief). */
  provider?: string | null;
  /** ISO-tijd van de laatste geslaagde test. */
  testPassedAt?: string | null;
  /** true zodra een echte verzending op EAUTH/verbindingsfout faalde. */
  needsReconnect?: boolean;
}

export const EMAIL_CONNECTION_DEFAULT: EmailConnectionState = { connected: false };

export type EmailProviderKey =
  | "hostinger"
  | "transip"
  | "vimexx"
  | "one"
  | "google"
  | "microsoft"
  | "custom";

/** Eén provider-preset voor de UI: voorvulling van host/poort/beveiliging plus
 *  een eventuele caveat-tekst (Gmail-app-wachtwoord, domeinafhankelijke host). */
export interface EmailProviderPreset {
  label: string;
  /** null = geen vaste host (de eigenaar vult zelf in). */
  smtpHost: string | null;
  smtpPort: number;
  security: "ssl" | "starttls";
  /** Placeholder/hint voor het host-veld als de host domeinafhankelijk is. */
  hostHint?: string;
  /** Zichtbare kanttekening onder de velden, indien van toepassing. */
  caveat?: string;
}

/**
 * Provider-presets (sectie 7 van de e-mailkoppel-spec). De connect-route
 * verifieert host/poort/beveiliging nogmaals server-side; dit is alleen
 * UI-voorvulling. "Anders (handmatig)" is het vangnet voor afwijkende hosters.
 */
export const EMAIL_PROVIDERS: Record<EmailProviderKey, EmailProviderPreset> = {
  hostinger: {
    label: "Hostinger",
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    security: "ssl",
  },
  transip: {
    label: "TransIP",
    smtpHost: "smtp.transip.email",
    smtpPort: 465,
    security: "ssl",
  },
  vimexx: {
    label: "Vimexx",
    smtpHost: null,
    smtpPort: 465,
    security: "ssl",
    hostHint: "mail.jouwdomein.nl",
    caveat:
      "De SMTP-server is bij Vimexx domeinafhankelijk. Vul de host in die je hoster opgeeft, vaak mail.jouwdomein.nl.",
  },
  one: {
    label: "one.com",
    smtpHost: "send.one.com",
    smtpPort: 465,
    security: "ssl",
  },
  google: {
    label: "Google (Gmail / Workspace)",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    security: "ssl",
    caveat:
      "Zet 2FA aan en maak een app-wachtwoord aan, een gewoon wachtwoord werkt niet. Let op: een Gmail-adres tekent met gmail.com, dus de afzender-belofte geldt schoon alleen als het afzenderadres zelf het Gmail- of Workspace-adres is.",
  },
  microsoft: {
    label: "Microsoft 365 / Outlook",
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    security: "starttls",
    caveat:
      "Microsoft 365 ondersteunt geen wachtwoord-SMTP meer (sinds april 2026). Koppelen is hier niet mogelijk.",
  },
  custom: {
    label: "Anders (handmatig)",
    smtpHost: null,
    smtpPort: 465,
    security: "ssl",
    hostHint: "smtp.jouwhoster.nl",
    caveat:
      "Vul de SMTP-server, poort en beveiliging in zoals je hoster die opgeeft.",
  },
};

// ── WhatsApp-koppeling (Integraties) ─────────────────────────────────────

/**
 * Niet-geheime WhatsApp-koppel-status zoals het WhatsAppPanel hem als prop
 * krijgt. Gevuld server-side uit whatsapp_connections
 * (getWhatsAppConnectionStatus); bevat NOOIT het access-token. In de
 * demo-fallback simpelweg { connected: false }.
 */
export interface WhatsAppConnectionState {
  connected: boolean;
  /** Gekoppeld weergavenummer (display_phone_number), puur informatief. */
  displayPhoneNumber?: string | null;
  /** true zodra een echte verzending op een auth-/token-fout faalde. */
  needsReconnect?: boolean;
}

export const WHATSAPP_CONNECTION_DEFAULT: WhatsAppConnectionState = { connected: false };

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
