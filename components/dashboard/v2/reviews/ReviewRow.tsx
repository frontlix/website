import { Check } from "lucide-react";
import { Avatar } from "@/components/dashboard/v2/ui";
import { Stars } from "./Stars";
import styles from "./ReviewRow.module.css";

export interface ReviewRowData {
  naam: string;
  initials: string;
  score: number;
  bron: string;
  tijd: string;
  tekst: string;
  beantwoord: boolean;
}

interface ReviewRowProps {
  review: ReviewRowData;
  /** Hairline-divider onder de rij (niet bij de laatste). */
  border: boolean;
  /** Open de antwoord-composer voor een nog-onbeantwoorde review. */
  onAnswer: () => void;
}

/** Een review-rij in de lijst: avatar-chip, naam + sterren + meta, en
 *  rechts een Beantwoord-knop of een "Beantwoord"-badge. */
export function ReviewRow({ review, border, onAnswer }: ReviewRowProps) {
  return (
    <div className={`${styles.row} ${border ? styles.bordered : ""}`}>
      <Avatar name={review.naam} initials={review.initials} size={38} radius={14} />
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.naam}>{review.naam}</span>
          <Stars score={review.score} size={12} />
          <span className={styles.meta}>
            {review.bron} · {review.tijd}
          </span>
          {review.beantwoord ? (
            <span className={styles.badge}>
              <Check size={12} strokeWidth={3} />
              Beantwoord
            </span>
          ) : (
            <button type="button" className={styles.answerBtn} onClick={onAnswer}>
              Beantwoord
            </button>
          )}
        </div>
        <p className={styles.tekst}>{review.tekst}</p>
      </div>
    </div>
  );
}
