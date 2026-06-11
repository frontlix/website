import { Card } from "@/components/dashboard/v2/ui";
import { ReviewRow } from "./ReviewRow";
import type { ReviewRowData } from "./ReviewRow";
import styles from "./ReviewList.module.css";

export type ReviewFilter = "alle" | "open";

interface ReviewListProps {
  reviews: ReviewRowData[];
  filter: ReviewFilter;
  onFilter: (next: ReviewFilter) => void;
  /** Aantal onbeantwoorde reviews (badge bij het filter). */
  openCount: number;
  onAnswer: (naam: string) => void;
}

/** Rechterkolom: kaart met titel, filter-pills (Alle / Onbeantwoord) en
 *  de lijst van review-rijen. */
export function ReviewList({ reviews, filter, onFilter, openCount, onAnswer }: ReviewListProps) {
  const filters: { key: ReviewFilter; label: string }[] = [
    { key: "alle", label: "Alle" },
    { key: "open", label: `Onbeantwoord (${openCount})` },
  ];

  return (
    <Card pad="none" className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Alle reviews</h1>
        <div className={styles.filters}>
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilter(f.key)}
              className={`${styles.pill} ${filter === f.key ? styles.pillActive : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.list}>
        {reviews.map((r, i, arr) => (
          <ReviewRow
            key={r.naam}
            review={r}
            border={i < arr.length - 1}
            onAnswer={() => onAnswer(r.naam)}
          />
        ))}
      </div>
    </Card>
  );
}
