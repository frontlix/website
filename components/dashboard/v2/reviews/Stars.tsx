import { Star } from "lucide-react";
import styles from "./Stars.module.css";

interface StarsProps {
  /** Aantal volle sterren (0 t/m 5). */
  score: number;
  /** Pixelgrootte per ster. */
  size?: number;
  /** Toon op een donkere (gradient) achtergrond: lege sterren lichter. */
  onDark?: boolean;
}

/** Vijf-sterren-rij; volle sterren amber, lege gedimd. Vervangt de
 *  ster-glyphs uit het prototype door het Lucide Star-icoon. */
export function Stars({ score, size = 14, onDark = false }: StarsProps) {
  return (
    <span className={styles.row} aria-label={`${score} van de 5 sterren`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const full = i < score;
        return (
          <Star
            key={i}
            size={size}
            strokeWidth={0}
            className={full ? styles.full : onDark ? styles.emptyDark : styles.empty}
          />
        );
      })}
    </span>
  );
}
