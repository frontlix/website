// ─────────────────────────────────────────────────────────────────────
// Frontlix Dashboard rebrand v2 — GEDEELDE demo-data.
//
// Getypeerde port van de prototype-data (RB + RB2 uit de design-handoff).
// De v2-preview draait volledig op deze demo-data zodat de nieuwe look
// snel visueel te vergelijken is; echte Supabase-koppeling is een aparte
// fase vóór de definitieve omzet.
//
// LET OP voor pagina-agents: zet PAGINA-SPECIFIEKE demo-data in je eigen
// bestand (bv. app/dashboard/v2/agenda/agenda-data.ts) en importeer hier
// alleen de gedeelde stukken uit. Zo ontstaan er geen merge-conflicten
// doordat meerdere agents tegelijk dit ene bestand bewerken.
// ─────────────────────────────────────────────────────────────────────

export type NavKey =
  | "Overzicht"
  | "Inbox"
  | "Leads"
  | "Agenda"
  | "Reviews"
  | "Analyses"
  | "Veldwerk"
  | "Instellingen";

export interface NavItem {
  label: NavKey;
  /** Pad onder /dashboard/v2 (zonder trailing slash; "" = index). */
  href: string;
  /** Getal-badge (telt iets) of tekst-badge ("binnenkort"); null = geen. */
  badge: number | string | null;
}

/** Pill-navigatie. De eerste 6 staan in de centrale pill-nav; Veldwerk en
 *  Instellingen worden apart afgehandeld (Veldwerk = "binnenkort",
 *  Instellingen opent via het avatar rechtsboven). */
export const NAV: NavItem[] = [
  { label: "Overzicht", href: "", badge: null },
  { label: "Inbox", href: "/inbox", badge: 2 },
  { label: "Leads", href: "/leads", badge: 14 },
  { label: "Agenda", href: "/agenda", badge: 4 },
  { label: "Reviews", href: "/reviews", badge: null },
  { label: "Analyses", href: "/analyses", badge: null },
  { label: "Veldwerk", href: "/veldwerk", badge: "binnenkort" },
  { label: "Instellingen", href: "/instellingen", badge: null },
];

/** De 6 items die in de centrale glas-pill-nav verschijnen. */
export const PRIMARY_NAV: NavItem[] = NAV.slice(0, 6);

export const TENANT = {
  user: "Christiaan",
  userFull: "Christiaan Tromp",
  initials: "CT",
  tenant: "Schoon Straatje",
  role: "Owner",
} as const;

export const STATUS_LINE = [
  "Surface is live",
  "2 actieve gesprekken",
  "laatste lead 2 min geleden",
] as const;

// ── Overzicht ──────────────────────────────────────────────────────────

export interface OwnerAction {
  n: number;
  title: string;
  sub: string;
  meta: string;
  hot: boolean;
}

export const BRIEF = {
  kicker: "Surface samenvatting",
  title: "Drie dingen voor de koffie",
  body: "Sinds gisteren +14 leads (vooral via WhatsApp). Twee offertes lopen vandaag af, Familie Bakker (€736) en Thomas Wilms (€395). De korstmos-toeslag bij Bakker wacht al 4 uur op je akkoord.",
  cta: "Open de 2 wachtende offertes",
} as const;

export const OWNER_ACTIONS: OwnerAction[] = [
  { n: 1, title: "Owner-review nodig", sub: "Korstmos-toeslag · €736", meta: "Wacht 4u 12m", hot: true },
  { n: 2, title: "Buiten radius, beslissen", sub: "86 km · Utrecht · €998", meta: "Wacht 8u", hot: true },
  { n: 3, title: "Klant vraagt korting", sub: "€395 · Thomas Wilms", meta: "1d open", hot: false },
  { n: 4, title: "2 reviews wachten", sub: "Anna Smit, Sandra Janssen", meta: "3d", hot: false },
  { n: 5, title: "Offerte vandaag versturen", sub: "Familie Bakker, wacht op akkoord", meta: "Vandaag", hot: false },
];

export const OMZET = {
  value: "11.903",
  delta: "+€3,1k",
  deltaSub: "vs vorige week",
  doel: "€25.000",
  pct: 51,
  rest: "€6.580",
} as const;

export interface Kpi {
  label: string;
  value: string;
  unit: string;
  delta: string;
  up: boolean;
}

export const KPIS: Kpi[] = [
  { label: "Nieuwe leads (week)", value: "14", unit: "", delta: "+22%", up: true },
  { label: "Conversie offerte→klant", value: "64", unit: "%", delta: "+8pt", up: true },
  { label: "Reactietijd (gem.)", value: "47", unit: "s", delta: "−12s", up: true },
  { label: "Offertes open", value: "7", unit: "", delta: "+2", up: true },
];

/** Sparkline-reeks voor de KPI-tegels op Overzicht. */
export const SPARK = [4, 6, 5, 8, 7, 10, 9, 12, 11, 14];

// ── Leads ───────────────────────────────────────────────────────────────

/** Status-soorten sturen de StatusPill-kleur (zie ui/StatusPill). Betekenis:
 *  hot=wacht op jou/urgent, new=nieuw, talking=in gesprek, review=onderhandelen,
 *  plan=bezoek gepland, won=goedgekeurd/afgerond, lost=afgewezen, sent=verstuurd. */
export type StatusKind =
  | "hot"
  | "new"
  | "talking"
  | "review"
  | "plan"
  | "won"
  | "lost"
  | "sent";

export interface Lead {
  id: string;
  naam: string;
  plaats: string;
  dienst: string;
  waarde: string;
  bron: string;
  status: string;
  statusKind: StatusKind;
  tijd: string;
  initials: string;
}

export const LEAD_FILTERS = [
  "Alle (14)",
  "Nieuw (5)",
  "Offerte uit (4)",
  "Bezoek gepland (2)",
  "Wacht op jou (2)",
  "Buiten radius (1)",
];

export const LEADS: Lead[] = [
  { id: "bakker", naam: "Familie Bakker", plaats: "Amersfoort", dienst: "Gevelreiniging + impregnatie", waarde: "€736", bron: "WhatsApp", status: "Wacht op jou", statusKind: "hot", tijd: "2 min", initials: "FB" },
  { id: "smit", naam: "Anna Smit", plaats: "Zeist", dienst: "Oprit reinigen", waarde: "€240", bron: "WhatsApp", status: "Nieuw", statusKind: "new", tijd: "12 min", initials: "AS" },
  { id: "vandijk", naam: "R. van Dijk", plaats: "Utrecht", dienst: "Zonnepanelen reinigen", waarde: "€310", bron: "Telefoon", status: "Nieuw", statusKind: "new", tijd: "1 u", initials: "RD" },
  { id: "janssen", naam: "Sandra Janssen", plaats: "Hilversum", dienst: "Terras + schutting", waarde: "€580", bron: "WhatsApp", status: "Bezoek gepland", statusKind: "plan", tijd: "3 u", initials: "SJ" },
  { id: "deboer", naam: "M. de Boer", plaats: "Amersfoort", dienst: "Gevelimpregnatie", waarde: "€998", bron: "Website", status: "Buiten radius", statusKind: "hot", tijd: "8 u", initials: "MB" },
  { id: "wilms", naam: "Thomas Wilms", plaats: "Utrecht", dienst: "Dakgoot + gevel", waarde: "€395", bron: "Website", status: "Offerte uit", statusKind: "sent", tijd: "1 d", initials: "TW" },
  { id: "vermeulen", naam: "K. Vermeulen", plaats: "Soest", dienst: "Oprit + terras", waarde: "€420", bron: "WhatsApp", status: "Offerte uit", statusKind: "sent", tijd: "2 d", initials: "KV" },
];

/** Pipeline-kolommen voor de Leads-pipeline-weergave. */
export const PIPELINE_COLUMNS = [
  "Nieuw",
  "Bezoek gepland",
  "Offerte uit",
  "Ingepland",
  "Afgerond",
] as const;

// ── Inbox ────────────────────────────────────────────────────────────────

export interface Thread {
  id: string;
  naam: string;
  preview: string;
  tijd: string;
  unread: number;
  kanaal: "WhatsApp" | "Telefoon";
  initials: string;
  active?: boolean;
}

export const THREADS: Thread[] = [
  { id: "bakker", naam: "Familie Bakker", preview: "Akkoord met de toeslag, wanneer kunnen jullie beginnen?", tijd: "08:21", unread: 2, kanaal: "WhatsApp", initials: "FB", active: true },
  { id: "smit", naam: "Anna Smit", preview: "Foto's van de oprit zitten erbij", tijd: "08:12", unread: 1, kanaal: "WhatsApp", initials: "AS" },
  { id: "vandijk", naam: "R. van Dijk", preview: "Gemiste oproep, terugbellen", tijd: "07:48", unread: 0, kanaal: "Telefoon", initials: "RD" },
  { id: "wilms", naam: "Thomas Wilms", preview: "Is er nog iets aan de prijs te doen?", tijd: "gist.", unread: 0, kanaal: "WhatsApp", initials: "TW" },
  { id: "janssen", naam: "Sandra Janssen", preview: "Top, tot donderdag!", tijd: "gist.", unread: 0, kanaal: "WhatsApp", initials: "SJ" },
];

export type ChatFrom = "klant" | "mij";

export interface ChatMessage {
  from: ChatFrom;
  text: string;
  tijd: string;
  status?: string;
}

export const CHAT = {
  naam: "Familie Bakker",
  sub: "WhatsApp · Gevelreiniging + impregnatie · €736",
  initials: "FB",
  messages: [
    { from: "klant", text: "Goedemorgen! We hebben de offerte bekeken.", tijd: "08:19" },
    { from: "klant", text: "Akkoord met de korstmos-toeslag, wanneer kunnen jullie beginnen?", tijd: "08:21" },
    { from: "mij", text: "Goedemorgen! Fijn om te horen, ik plan u in. Zou donderdag 09:00 uitkomen?", tijd: "08:24", status: "Gelezen" },
    { from: "klant", text: "Donderdag is prima, top!", tijd: "08:26" },
  ] as ChatMessage[],
  suggestie:
    "Voorstel: bevestig donderdag 09:00 en stuur de aangepaste offerte (€736) ter ondertekening.",
} as const;

/** Helper: vind een lead op id (voor het dossier). */
export function findLead(id: string): Lead | undefined {
  return LEADS.find((l) => l.id === id);
}
