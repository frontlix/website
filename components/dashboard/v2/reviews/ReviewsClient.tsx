"use client";

// ─────────────────────────────────────────────────────────────────────
// Dunne client-wrapper voor de reviews-pagina. Houdt de interactieve
// state (filter, antwoord-composer, beantwoord-markering) en krijgt alle
// weergave-data via props van de server-component (page.tsx). Zo blijft
// het databron-ophalen + tenant-scoping server-side, terwijl de knoppen
// client-side blijven werken zoals in het goedgekeurde v2-ontwerp.
//
// LET OP: er bestaat nog geen reviews-tabel en dus geen server-action /
// API-route om een antwoord te persisteren (zie data-contract). Het
// versturen markeert de review daarom (net als in het oorspronkelijke v2)
// in sessie-state als beantwoord. Zodra `reviews-actions.ts:sendReviewReply`
// bestaat, vervangt een startTransition-aanroep deze regel.
// ─────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { ScoreColumn } from "@/components/dashboard/v2/reviews/ScoreColumn";
import { ReviewList } from "@/components/dashboard/v2/reviews/ReviewList";
import type { ReviewFilter } from "@/components/dashboard/v2/reviews/ReviewList";
import type { ReviewRowData } from "@/components/dashboard/v2/reviews/ReviewRow";
import { ReplyComposer } from "@/components/dashboard/v2/reviews/ReplyComposer";
import type {
  ReviewStats,
  BronScore,
  WaitingReview,
} from "@/components/dashboard/v2/reviews/reviews-data";
import styles from "@/app/dashboard/v2/reviews/page.module.css";

export interface ReviewsClientProps {
  stats: ReviewStats;
  bronScores: BronScore[];
  /** Wachtende reviews (onbeantwoord); voeden de composer-concepten. */
  wachtend: WaitingReview[];
  /** Volledige rij-lijst (wachtend → recent) voor de lijstkaart. */
  rows: ReviewRowData[];
}

export function ReviewsClient({ stats, bronScores, wachtend, rows }: ReviewsClientProps) {
  // Welke wachtende reviews zijn (in deze sessie) al beantwoord.
  const [beantwoord, setBeantwoord] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<ReviewFilter>("alle");
  // De review waarvoor de antwoord-composer open staat.
  const [open, setOpen] = useState<WaitingReview | null>(null);

  const wachtendCount = wachtend.filter((r) => !beantwoord[r.naam]).length;

  // Rij-lijst met sessie-status erin verwerkt; gefilterd op de actieve
  // filter en afgekapt op 6 (zoals het v2-ontwerp).
  const lijst = useMemo<ReviewRowData[]>(() => {
    const metStatus = rows.map((r) =>
      beantwoord[r.naam] ? { ...r, beantwoord: true } : r,
    );
    const zichtbaar =
      filter === "alle" ? metStatus : metStatus.filter((r) => !r.beantwoord);
    return zichtbaar.slice(0, 6);
  }, [beantwoord, filter, rows]);

  function openAntwoord(naam: string) {
    const review = wachtend.find((r) => r.naam === naam);
    if (review) setOpen(review);
  }

  function verstuur(naam: string) {
    // Sessie-state; geen DB-actie beschikbaar (zie kop-comment).
    setBeantwoord((b) => ({ ...b, [naam]: true }));
    setOpen(null);
  }

  return (
    <div className={styles.page}>
      <ScoreColumn stats={stats} bronScores={bronScores} wachtend={wachtendCount} />
      <ReviewList
        reviews={lijst}
        filter={filter}
        onFilter={setFilter}
        openCount={wachtendCount}
        onAnswer={openAntwoord}
      />
      <ReplyComposer review={open} onClose={() => setOpen(null)} onSend={verstuur} />
    </div>
  );
}
