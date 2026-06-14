// ─────────────────────────────────────────────────────────────────────
// Reviews-mappers: DB-rij → bestaande v2-component-props.
//
// BELANGRIJK (zie data-contract reviews.md "Valkuilen"): er bestaat nog
// GEEN reviews-tabel in Supabase. De (app)-pagina en v2 draaien beide op
// 100% demo-data; de enige echte, tenant-gescopete query is
// `tenant_settings.bedrijfsnaam` (zelfde als de bestaande (app)-pagina).
//
// Daarom mappen we hier de demo-bron naar de v2-props die de componenten
// al verwachten, zónder hun prop-vormen te wijzigen. Zodra de bot via
// Surface review-vragen verstuurt en een `reviews`-tabel vult, hoeven
// alleen de `*FromRows`-mappers hieronder met echte rijen gevoed te worden
// (de component-props blijven gelijk). De NPS/score-logica volgt exact het
// contract: score ≥ 4.5 = promoter, 3 t/m <4.5 = passive, <3 = detractor.
// ─────────────────────────────────────────────────────────────────────

import type {
  ReviewStats,
  BronScore,
  WaitingReview,
  AnsweredReview,
} from "./reviews-data";
import type { ReviewRowData } from "./ReviewRow";

/**
 * Vorm van een toekomstige `reviews`-rij (zoals beschreven in het
 * data-contract). Nog niet in gebruik omdat de tabel ontbreekt; dient als
 * het doel-type voor de `*FromRows`-mappers zodra de tabel landt.
 */
export interface ReviewRow {
  id: string;
  lead_id: string | null;
  naam: string | null;
  score: number | null;
  bron: string | null;
  tekst: string | null;
  beantwoord: boolean | null;
  /** Voorgevuld conceptantwoord van Surface. */
  concept_antwoord: string | null;
  /** Wanneer de review binnenkwam (voor de "tijd"-weergave). */
  tijd: string | null;
}

/** NL-notatie (komma) voor een gemiddelde-score, 1 decimaal. */
export function formatScoreNL(score: number): string {
  return score.toFixed(1).replace(".", ",");
}

/** Initialen uit een naam (eerste letter van max. twee woorden). */
export function initialsFromName(naam: string): string {
  const parts = naam.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

/** NPS-categorie van een score, conform het data-contract. */
export function npsCategory(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 4.5) return "promoter";
  if (score >= 3) return "passive";
  return "detractor";
}

/**
 * Bouw één lijst van review-rijen (wachtend → recent) voor <ReviewList>.
 * `beantwoord`-vlag per rij volgt de bron: wachtende reviews zijn (nog)
 * onbeantwoord, recente reviews zijn beantwoord. De client-wrapper kan
 * sessie-status hierop laten meebewegen.
 */
export function toReviewRows(
  wachtend: WaitingReview[],
  recent: AnsweredReview[],
): ReviewRowData[] {
  return [
    ...wachtend.map((r) => ({
      naam: r.naam,
      initials: r.initials,
      score: r.score,
      bron: r.bron,
      tijd: r.tijd,
      tekst: r.tekst,
      beantwoord: false,
    })),
    ...recent.map((r) => ({
      naam: r.naam,
      initials: r.initials,
      score: r.score,
      bron: r.bron,
      tijd: r.tijd,
      tekst: r.tekst,
      beantwoord: true,
    })),
  ];
}

// ── Toekomstige DB-mappers (klaar voor de echte `reviews`-tabel) ────────
// Niet aangeroepen zolang de tabel ontbreekt, maar ze fixeren de
// rij→prop-afbeelding zodat de overstap straks alleen de query toevoegt.

/** DB-rij → WaitingReview (voor de antwoord-composer + wachtlijst). */
export function toWaitingReview(row: ReviewRow): WaitingReview {
  const naam = row.naam ?? "Onbekend";
  return {
    naam,
    initials: initialsFromName(naam),
    score: row.score ?? 0,
    bron: row.bron ?? "Onbekend",
    tijd: row.tijd ?? "",
    tekst: row.tekst ?? "",
    concept: row.concept_antwoord ?? "",
  };
}

/** DB-rij → AnsweredReview (voor de reeds-beantwoord-lijst). */
export function toAnsweredReview(row: ReviewRow): AnsweredReview {
  const naam = row.naam ?? "Onbekend";
  return {
    naam,
    initials: initialsFromName(naam),
    score: row.score ?? 0,
    bron: row.bron ?? "Onbekend",
    tijd: row.tijd ?? "",
    tekst: row.tekst ?? "",
    beantwoord: true,
  };
}

/** DB-rijen → ReviewStats (gemiddelde + sterverdeling) voor <ScoreColumn>. */
export function toReviewStats(rows: ReviewRow[]): ReviewStats {
  const scores = rows
    .map((r) => r.score)
    .filter((s): s is number => typeof s === "number");
  const totaal = scores.length;
  const gem =
    totaal > 0 ? formatScoreNL(scores.reduce((a, b) => a + b, 0) / totaal) : "0,0";

  // Sterklasse-telling op afgeronde score, hoog → laag.
  const perSter = new Map<number, number>([
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
  ]);
  for (const s of scores) {
    const ster = Math.min(5, Math.max(1, Math.round(s)));
    perSter.set(ster, (perSter.get(ster) ?? 0) + 1);
  }
  const verdeling: [number, number][] = [5, 4, 3, 2, 1].map((ster) => [
    ster,
    perSter.get(ster) ?? 0,
  ]);
  const verdelingMax = Math.max(1, ...verdeling.map(([, n]) => n));

  return { gem, totaal, verdeling, verdelingMax };
}

/** DB-rijen → BronScore[] (gemiddelde + aantal per kanaal) voor <ScoreColumn>. */
export function toBronScores(rows: ReviewRow[]): BronScore[] {
  const perBron = new Map<string, { som: number; aantal: number }>();
  for (const r of rows) {
    if (typeof r.score !== "number") continue;
    const bron = r.bron ?? "Onbekend";
    const acc = perBron.get(bron) ?? { som: 0, aantal: 0 };
    acc.som += r.score;
    acc.aantal += 1;
    perBron.set(bron, acc);
  }
  return [...perBron.entries()].map(([bron, { som, aantal }]) => ({
    bron,
    score: formatScoreNL(aantal > 0 ? som / aantal : 0),
    aantal,
  }));
}
