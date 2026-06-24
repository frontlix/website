// ─────────────────────────────────────────────────────────────────────
// Gedeelde afleiding van afspraak-info uit een lead-rij. Gebruikt door zowel
// de print-pagina (app/dashboard/(print)/afspraak-preview) als de Afspraak-tab
// in het lead-dossier (components/dashboard/v2/dossier/AfspraakTab), zodat beide
// exact dezelfde velden en labels tonen.
//
// Spiegelt de labels uit de agenda (categorie/sub-dienst) en de reistijd-schatting
// uit agenda-derive, maar zonder afhankelijkheid van de UI-modules (dit is een
// pure lib-helper). Streep-vrij conform huisstijl (komma/middelpunt i.p.v.
// liggend streepje; geen klemtoonaccenten in zichtbare tekst).
// ─────────────────────────────────────────────────────────────────────

/** De velden die we van een lead-rij nodig hebben om de afspraak af te leiden.
 *  Structureel getypt zodat zowel de volledige Lead-rij (select *) als een
 *  Pick<Lead, ...> hier inpassen. */
export interface AfspraakLeadFields {
  naam: string | null;
  bedrijfsnaam: string | null;
  afspraak_datum: string | null;
  afspraak_starttijd: string | null;
  afspraak_geboekt_op: string | null;
  hoofdcategorie: string | null;
  sub_diensten: string[] | null;
  m2: number | null;
  straat: string | null;
  huisnummer: string | null;
  postcode: string | null;
  plaats: string | null;
  telefoon: string | null;
  telefoon_offerte?: string | null;
  afstand_km: number | null;
  groene_aanslag: string | null;
  planten_afschermen: string | null;
}

/** Afgeleide, presentatie-klare afspraak-info voor de print-pagina en de tab. */
export interface AfspraakInfo {
  /** Is er daadwerkelijk een afspraak ingepland (afspraak_datum gezet)? */
  gepland: boolean;
  /** Klantnaam (bedrijfsnaam als die er is, anders naam). */
  klantNaam: string;
  /** "Donderdag 26 juni 2026" (lege string zonder datum). */
  datumLang: string;
  /** "26-06-2026" (lege string zonder datum). */
  datumKort: string;
  /** "10:00" (lege string zonder tijd). */
  tijd: string;
  /** Hoofddienst-label, bv. "Onkruidbeheersing (zakelijk)". */
  dienst: string;
  /** Sub-diensten-labels, bv. "Onderhoud 4 weken". Lege string als geen. */
  subDiensten: string;
  /** "33 m²" (lege string zonder m²). */
  oppervlakte: string;
  /** Straat + huisnummer, bv. "Han Stijkelplein 22". */
  adres: string;
  /** Postcode + plaats, bv. "2596 's-Gravenhage". */
  plaats: string;
  /** Telefoonnummer (telefoon_offerte als die er is, anders telefoon). */
  telefoon: string;
  /** "157 km" (lege string zonder afstand). */
  reisAfstand: string;
  /** "~2u15m" geschatte reistijd vanaf de werkplaats (lege string zonder afstand). */
  reisTijd: string;
  /** True als er groene aanslag aanwezig is. */
  groeneAanslag: boolean;
  /** True als planten afgeschermd moeten worden. */
  plantenAfschermen: boolean;
  /** "22 juni 2026" wanneer de afspraak geboekt is (lege string zonder). */
  geboektOp: string;
}

// ── Labels (lokale kopie van de agenda-labels, zodat deze lib zelfstandig is) ──

const CATEGORIE_LABELS: Record<string, string> = {
  onkruidbeheersing_zakelijk: "Onkruidbeheersing (zakelijk)",
  onkruidbeheersing_particulier: "Onkruidbeheersing (particulier)",
  gevelreiniging_zakelijk: "Gevelreiniging (zakelijk)",
  gevelreiniging_particulier: "Gevelreiniging (particulier)",
  oprit_terras_terrein: "Oprit / terras / terrein",
  terrasreiniging: "Terrasreiniging",
  opritreiniging: "Opritreiniging",
  dakreiniging: "Dakreiniging",
};

const SUBDIENST_LABELS: Record<string, string> = {
  invegen: "Invegen",
  reiniging: "Reiniging",
  preventieve_onkruid: "Preventieve onkruidbeheersing",
  preventieve_onkruidbeheersing: "Preventieve onkruidbeheersing",
  beschermlaag: "Beschermlaag",
  plantenafscherming: "Plantenafscherming",
  planten_afschermen: "Plantenafscherming",
  plan_4_weken: "Onderhoud 4 weken",
  plan_8_weken: "Onderhoud 8 weken",
  plan_12_weken: "Onderhoud 12 weken",
  plan_16_weken: "Onderhoud 16 weken",
};

/** Net label van een snake_case-key (fallback wanneer niet in de map staat). */
function netLabel(key: string): string {
  const s = key.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function categorieLabel(key: string | null | undefined): string {
  if (!key) return "";
  return CATEGORIE_LABELS[key] ?? netLabel(key).replace(/\//g, " / ");
}

function subDienstLabel(key: string): string {
  return SUBDIENST_LABELS[key] ?? netLabel(key);
}

/** Interpreteer een vrij ja/nee-veld als "aanwezig". Lege of negatieve waarden
 *  ("nee", "geen", "nvt") tellen als niet aanwezig. Spiegelt agenda-derive. */
function isJaWaarde(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return !["nee", "geen", "nvt", "n.v.t.", "false", "0", "onbekend"].includes(v);
}

/** "YYYY-MM-DD" -> "Donderdag 26 juni 2026" (UTC-noon zodat de dag niet schuift). */
function formatDatumLang(datum: string | null): string {
  if (!datum) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(datum);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  const s = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "YYYY-MM-DD" -> "26-06-2026". */
function formatDatumKort(datum: string | null): string {
  if (!datum) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(datum);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** "HH:MM" of "HH:MM:SS" -> "HH:MM". */
function formatTijd(tijd: string | null): string {
  if (!tijd) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(tijd);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** ISO-timestamp -> "22 juni 2026" (Amsterdam-dag). */
function formatGeboektOp(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(ms));
}

// Geschatte reistijd: zelfde aanname als agenda-derive (geen route-service,
// dus schatten we de tijd uit de afstand bij een gemiddelde snelheid; de "~"
// maakt zichtbaar dat het een schatting is).
const REIS_GEM_SNELHEID_KMH = 70;

function formatReistijd(min: number): string {
  const r = Math.max(5, Math.round(min / 5) * 5); // afronden op 5 min
  if (r < 60) return `~${r} min`;
  const u = Math.floor(r / 60);
  const m = r % 60;
  return m === 0 ? `~${u}u` : `~${u}u${m}m`;
}

/** Bouw de presentatie-klare afspraak-info uit een lead-rij. */
export function buildAfspraakInfo(lead: AfspraakLeadFields): AfspraakInfo {
  const sub = (lead.sub_diensten ?? []).filter(Boolean);
  const adres = [lead.straat, lead.huisnummer].filter(Boolean).join(" ").trim();
  const plaats = [lead.postcode, lead.plaats].filter(Boolean).join(" ").trim();

  let reisAfstand = "";
  let reisTijd = "";
  if (lead.afstand_km != null && Number.isFinite(lead.afstand_km) && lead.afstand_km > 0) {
    reisAfstand = `${Math.round(lead.afstand_km)} km`;
    reisTijd = formatReistijd((lead.afstand_km / REIS_GEM_SNELHEID_KMH) * 60);
  }

  return {
    gepland: Boolean(lead.afspraak_datum),
    klantNaam: (lead.bedrijfsnaam || lead.naam || "Klant").trim(),
    datumLang: formatDatumLang(lead.afspraak_datum),
    datumKort: formatDatumKort(lead.afspraak_datum),
    tijd: formatTijd(lead.afspraak_starttijd),
    dienst: categorieLabel(lead.hoofdcategorie),
    subDiensten: sub.map(subDienstLabel).join(", "),
    oppervlakte: lead.m2 != null ? `${lead.m2} m²` : "",
    adres,
    plaats,
    telefoon: (lead.telefoon_offerte || lead.telefoon || "").trim(),
    reisAfstand,
    reisTijd,
    groeneAanslag: isJaWaarde(lead.groene_aanslag),
    plantenAfschermen: isJaWaarde(lead.planten_afschermen),
    geboektOp: formatGeboektOp(lead.afspraak_geboekt_op),
  };
}
