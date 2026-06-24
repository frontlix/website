// Kleine afleidingen uit de afspraak-titel/sub voor de detail- en
// route-modals (port van de inline-logica in PAgenda). Wanneer de echte
// lead-context op het item gezet is (door agenda-mappers), gebruiken we die;
// anders vallen we terug op de demo-afleiding uit titel/plaats.

import type { AgendaDag, AgendaItem } from "./agenda-data";
import { EMPTY_DUUR } from "./agenda-data";
import type { AfspraakInfo } from "@/lib/dashboard/afspraak-info";

/**
 * Stabiele unieke sleutel van een item voor React-keys en selectie-/afvink-
 * matching. Live-items dragen `key` (= lead_id) vanuit de mapper; demo-items
 * vallen terug op `${dag}-${tijd}-${index}`. Niet op tijd alleen keyen: echte
 * data kan twee afspraken op dezelfde dag/tijd hebben (dubbele React-keys).
 */
export function itemKey(item: AgendaItem, dag: string, index: number): string {
  return item.key ?? `${dag}-${item.tijd}-${index}`;
}

/**
 * De afspraak van vandaag voor het "Vandaag"-paneel. Het prototype gaat uit van
 * maximaal een afspraak per dag; de echte data kan er meer hebben (en ook een
 * deadline-regel). We kiezen daarom de afspraak om naartoe te rijden: de eerste
 * nog niet afgeronde klus/bezoek. Is alles afgerond, dan de eerste niet-deadline
 * (zodat het paneel "Afgerond" toont); is er niets, dan null (lege staat).
 */
export function vandaagItem(
  week: AgendaDag[],
): { dag: AgendaDag; item: AgendaItem } | null {
  const dag = week.find((d) => d.vandaag);
  if (!dag || dag.items.length === 0) return null;
  // Externe (lead-loze) Google-afspraken (key "ext-…") zijn READ-ONLY: ze mogen
  // het "Vandaag"-paneel niet vullen (geen Afronden-knop, geen afgeleide
  // contactgegevens). We kiezen daarom alleen uit de echte/demo-afspraken.
  const eigen = dag.items.filter((it) => !isExternItem(it));
  if (eigen.length === 0) return null;
  const item =
    eigen.find((it) => !it.klaar && it.type !== "deadline") ??
    eigen.find((it) => it.type !== "deadline") ??
    eigen[0];
  return { dag, item };
}

/** True voor een extern (lead-loos) Google-agenda-item (mapper zet key "ext-…"). */
function isExternItem(item: AgendaItem): boolean {
  return typeof item.key === "string" && item.key.startsWith("ext-");
}

/** Duur-label ("3u" / "90m" / "2u30m") → minuten. EMPTY_DUUR → 0. */
function duurMinuten(duur: string): number {
  if (!duur || duur === EMPTY_DUUR) return 0;
  const u = /(\d+)\s*u/.exec(duur);
  const m = /(\d+)\s*m/.exec(duur);
  return (u ? parseInt(u[1], 10) * 60 : 0) + (m ? parseInt(m[1], 10) : 0);
}

/** "HH:MM" + offset (minuten) → "HH:MM" (binnen de dag). Leeg bij geen tijd. */
function schuifTijd(tijd: string, offsetMin: number): string {
  const t = /^(\d{1,2}):(\d{2})$/.exec(tijd);
  if (!t) return "";
  const total =
    ((parseInt(t[1], 10) * 60 + parseInt(t[2], 10) + offsetMin) % (24 * 60) +
      24 * 60) %
    (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Eindtijd uit start + duur ("13:00" + "3u" → "16:00"). Leeg als niet af te
 *  leiden (geen tijd of geen duur). */
export function eindTijd(item: AgendaItem): string {
  const dur = duurMinuten(item.duur);
  if (dur <= 0) return "";
  return schuifTijd(item.tijd, dur);
}

/** Indicatieve vertrektijd vanaf de werkplaats: starttijd minus de reistijd.
 *  Placeholder zolang er geen route-service is (zie handoff). */
export function vertrekTijd(item: AgendaItem, reisMin: number): string {
  return schuifTijd(item.tijd, -reisMin);
}

/** Maps-directions deep-link naar het klantadres (opent de routebeschrijving
 *  vanaf de huidige locatie in Google Maps, web of app). */
export function mapsHref(adres: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adres)}`;
}

/**
 * Reis-chip voor de routekaart: echte afstand (km, uit het lead-veld
 * afstand_km vanaf de werkplaats) + een GESCHATTE rijtijd. Er is geen route-
 * service, dus de tijd schatten we uit de afstand bij een gemiddelde snelheid;
 * de "~" maakt zichtbaar dat het een schatting is. Geen afstand bekend (demo)
 * → null, dan toont de routekaart geen chip.
 */
const REIS_GEM_SNELHEID_KMH = 70;

function formatReistijd(min: number): string {
  const r = Math.max(5, Math.round(min / 5) * 5); // afronden op 5 min
  if (r < 60) return `~${r} min`;
  const u = Math.floor(r / 60);
  const m = r % 60;
  return m === 0 ? `~${u}u` : `~${u}u${m}m`;
}

export function reisLabel(
  afstandKm: number | null | undefined,
): { tijd: string; afstand: string } | null {
  if (afstandKm == null || !Number.isFinite(afstandKm) || afstandKm <= 0) {
    return null;
  }
  const min = (afstandKm / REIS_GEM_SNELHEID_KMH) * 60;
  return { tijd: formatReistijd(min), afstand: `${Math.round(afstandKm)} km` };
}

// ── Klus-detail-labels ─────────────────────────────────────────────────

const CATEGORIE_LABELS: Record<string, string> = {
  onkruidbeheersing_zakelijk: "Onkruidbeheersing (zakelijk)",
  onkruidbeheersing_particulier: "Onkruidbeheersing (particulier)",
  gevelreiniging_zakelijk: "Gevelreiniging (zakelijk)",
  gevelreiniging_particulier: "Gevelreiniging (particulier)",
  terrasreiniging: "Terrasreiniging",
  opritreiniging: "Opritreiniging",
  dakreiniging: "Dakreiniging",
};

const SUBDIENST_LABELS: Record<string, string> = {
  invegen: "Invegen",
  reiniging: "Reiniging",
  preventieve_onkruid: "Preventieve onkruidbeheersing",
  beschermlaag: "Beschermlaag",
  plantenafscherming: "Plantenafscherming",
  planten_afschermen: "Plantenafscherming",
  plan_4_weken: "Onderhoud 4 weken",
  plan_8_weken: "Onderhoud 8 weken",
  plan_12_weken: "Onderhoud 12 weken",
  plan_16_weken: "Onderhoud 16 weken",
};

/** Maak een nette label van een snake_case-key (fallback). */
function netLabel(key: string): string {
  const s = key.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Net label voor de hoofdcategorie van een klus. */
export function categorieLabel(key?: string): string {
  if (!key) return "";
  return CATEGORIE_LABELS[key] ?? netLabel(key);
}

/** Net label voor een sub-dienst-key. */
export function subDienstLabel(key: string): string {
  return SUBDIENST_LABELS[key] ?? netLabel(key);
}

/** Interpreteer een vrij ja/nee-veld als "aanwezig". Lege of duidelijke
 *  negatieve waarden ("nee", "geen", "nvt") tellen als niet aanwezig. */
export function isJaWaarde(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (!v) return false;
  return !["nee", "geen", "nvt", "n.v.t.", "false", "0", "onbekend"].includes(v);
}

/** Nummer naar internationaal formaat voor tel:/wa.me (NL: 06… → 316…). */
export function normalizeTel(tel: string): string {
  const digits = tel.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `31${digits.slice(1)}`;
  return digits;
}

/** Klantnaam: de gekoppelde klant indien gezet, anders afgeleid uit de titel
 *  "Klus · Naam" (deel na de punt-separator). */
export function klantNaam(item: AgendaItem): string {
  if (item.klant && item.klant.trim()) return item.klant.trim();
  return (item.titel.split("·")[1] || item.titel).trim();
}

/** Initiaal voor de klant-avatar in het detail. */
export function klantInitiaal(item: AgendaItem): string {
  return klantNaam(item).charAt(0).toUpperCase() || "K";
}

/** Plaats van de afspraak (los veld; de sub-regel zet de plaats nu eens
 *  voor, dan weer achter de punt-separator, dus niet betrouwbaar af te leiden). */
export function klantPlaats(item: AgendaItem): string {
  return item.plaats.trim();
}

/** Adres: echt adres uit de lead-context indien aanwezig, anders demo. */
export function klantAdres(item: AgendaItem): string {
  if (item.adres && item.adres.trim()) return item.adres.trim();
  const t = item.titel;
  if (t.includes("Janssen")) return "Berkenweg 8, Hilversum";
  if (t.includes("Bakker")) return "Dorpsstraat 41, Amersfoort";
  if (t.includes("Vermeulen")) return "Eikenlaan 3, Soest";
  return "Lindelaan 24, Utrecht";
}

/** Telefoon: echt nummer uit de lead-context indien aanwezig, anders demo. */
export function klantTelefoon(item: AgendaItem): string {
  if (item.telefoon && item.telefoon.trim()) return item.telefoon.trim();
  return KLANT_TELEFOON;
}

export const KLANT_TELEFOON = "06 - 98 76 54 32";

/**
 * Bouw een AfspraakInfo (voor de print-PDF) uit een agenda-item. Gebruikt de
 * echte lead-context die de mapper op het item zet; de datum komt uit de
 * UTC-instant (item.iso), weergegeven in Amsterdamse tijd. Het volledige adres
 * staat in item.adres (plaats blijft dus leeg, anders dubbel). Geen demo-
 * fallbacks: ontbrekende velden worden leeg gelaten i.p.v. verzonnen.
 */
export function afspraakInfoFromItem(item: AgendaItem): AfspraakInfo {
  const reis = reisLabel(item.afstandKm);
  const k = item.klusInfo;

  let datumLang = "";
  let datumKort = "";
  if (item.iso) {
    const d = new Date(item.iso);
    if (Number.isFinite(d.getTime())) {
      const lang = new Intl.DateTimeFormat("nl-NL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Amsterdam",
      }).format(d);
      datumLang = lang.charAt(0).toUpperCase() + lang.slice(1);
      datumKort = new Intl.DateTimeFormat("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Europe/Amsterdam",
      })
        .format(d)
        .replace(/\//g, "-");
    }
  }

  return {
    gepland: Boolean(item.iso || item.adres || k),
    klantNaam: klantNaam(item),
    datumLang,
    datumKort,
    tijd: item.tijd ?? "",
    dienst: k?.categorie ? categorieLabel(k.categorie) : "",
    subDiensten: (k?.subDiensten ?? []).filter(Boolean).map(subDienstLabel).join(", "),
    oppervlakte: k?.m2 != null ? `${k.m2} m²` : "",
    adres: item.adres?.trim() ?? "",
    plaats: "",
    telefoon: item.telefoon?.trim() ?? "",
    reisAfstand: reis?.afstand ?? "",
    reisTijd: reis?.tijd ?? "",
    groeneAanslag: Boolean(k?.groeneAanslag),
    plantenAfschermen: Boolean(k?.plantenAfschermen),
    geboektOp: "",
    // Agenda-items dragen geen lead-notities; die komen alleen via het
    // leaddossier (Afspraak-tab) op de print.
    notities: [],
  };
}
