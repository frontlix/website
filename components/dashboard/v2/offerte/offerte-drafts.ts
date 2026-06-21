// ─────────────────────────────────────────────────────────────────────
// Offerte-concepten (drafts) — client-side opslag in localStorage.
//
// De handmatige offerte-wizard maakt pas een echte lead + offerte aan bij
// "versturen". Tot die tijd is een half-afgemaakte offerte een *concept*:
// werk-in-uitvoering dat nog niet de leads-pijplijn (en dus de bot) in moet.
// Daarom bewaren we concepten lokaal in de browser i.p.v. in de database:
// instant, geen migratie, geen halve leads. Per browser/owner, niet gesynct
// over apparaten (bewuste afweging voor deze wizard-drafts).
//
// Opslagsleutel bevat één JSON-array met alle concepten, gesorteerd op
// laatst-bewerkt. Alle reads/writes zijn best-effort: bij quota- of
// privacy-mode-fouten falen we stil (een concept is geen kritieke staat).
// ─────────────────────────────────────────────────────────────────────

import type { OfferteKlant } from "./offerte-data";
import type { BtwKeuze, Kanaal, Kleur, KlantType, KortingType, VrijeRegel } from "./types";

/** Serialiseerbare momentopname van de wizard-state. Bevat alles behalve de
 *  live prijslijst (wordt opnieuw opgehaald) en de transient submit-state. */
export interface OfferteDraftState {
  stap: number;
  zoek: string;
  klant: OfferteKlant | null;
  klantType: KlantType;
  aiGebruikt: boolean;
  factuurZelfde: boolean;
  factuur: { straat: string; nr: string; postcode: string; plaats: string };
  afstandKm: number | null;
  m2: number;
  qty: { invegen: number; rollen: number };
  rolPrijs: string;
  voegzandM2: { normaal: number; onkruidwerend: number };
  voegzandZakken: { normaal: number; onkruidwerend: number };
  zandPrijzen: { normaal: string; onkruidwerend: string };
  /** Per-offerte eenheidsprijs-overrides per regel-id (rauwe invoer; leeg/afwezig
   *  = prijslijst). Keys: reinigen_dagprijs, reiniging_per_m2, invegenN, invegenO,
   *  bescherm, onkruid, reiskosten. */
  prijsOverrides?: Record<string, string>;
  diensten: Record<string, boolean>;
  bm2: number;
  om2: number;
  groeneAanslag: boolean;
  kleur: Kleur;
  korstmosConditie: boolean;
  onderhoudWeken: number;
  korstmosToeslag: boolean;
  kortingType: KortingType;
  kortingPct: string;
  kortingEuro: string;
  kortingReden: string;
  geldigDagen: number;
  btw: BtwKeuze;
  vrij: VrijeRegel[];
  volgorde: string[];
  bericht: string;
  kanaal: Kanaal;
}

/** Eén opgeslagen concept. */
export interface OfferteDraft {
  id: string;
  /** Laatst opgeslagen op (epoch ms). */
  updatedAt: number;
  /** Toonlabel: bedrijf/klantnaam, of "Naamloos concept". */
  label: string;
  /** Totaal incl. BTW op het moment van opslaan (alleen voor de lijst). */
  totaal: number;
  state: OfferteDraftState;
}

const KEY = "frontlix:v2:offerte-concepten";
/** Bovengrens zodat de lijst (en localStorage) niet ongelimiteerd groeit. */
const MAX_DRAFTS = 30;

function canUse(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/** Alle concepten, nieuwste eerst. Lege/corrupte opslag → lege lijst. */
export function listDrafts(): OfferteDraft[] {
  if (!canUse()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as OfferteDraft[])
      .filter((d) => d && typeof d.id === "string" && d.state)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function writeAll(drafts: OfferteDraft[]): void {
  if (!canUse()) return;
  try {
    const trimmed = [...drafts]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_DRAFTS);
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / privacy-mode: stil negeren, draft-opslag is best-effort */
  }
}

/** Voeg toe of werk bij (op id). */
export function upsertDraft(draft: OfferteDraft): void {
  const rest = listDrafts().filter((d) => d.id !== draft.id);
  writeAll([draft, ...rest]);
}

/** Verwijder één concept op id. */
export function removeDraft(id: string): void {
  writeAll(listDrafts().filter((d) => d.id !== id));
}

/** Genereer een uniek concept-id. */
export function makeDraftId(): string {
  if (canUse() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `d-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

/** "zojuist" / "3 min geleden" / "2 uur geleden" / datum, voor de lijst. */
export function formatLaatstBewerkt(ts: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const uur = Math.floor(min / 60);
  if (uur < 24) return `${uur} uur geleden`;
  const dag = Math.floor(uur / 24);
  if (dag === 1) return "gisteren";
  if (dag < 7) return `${dag} dagen geleden`;
  return new Date(ts).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
