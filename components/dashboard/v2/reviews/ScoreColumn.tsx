import { Star } from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import { Stars } from "./Stars";
import type { BronScore, ReviewStats } from "./reviews-data";
import styles from "./ScoreColumn.module.css";

interface ScoreColumnProps {
  stats: ReviewStats;
  bronScores: BronScore[];
  /** Aantal reviews dat nog op een antwoord wacht. */
  wachtend: number;
}

/** Stabiele kleur per kanaal uit het data-viz-palet (zelfde kanaal = zelfde
 *  kleur), zodat elk kanaal z'n eigen accent krijgt. */
function kanaalKleur(bron: string): string {
  let h = 0;
  for (let i = 0; i < bron.length; i++) {
    h = (h * 31 + bron.charCodeAt(i)) | 0;
  }
  return `var(--rb-data-${(Math.abs(h) % 8) + 1})`;
}

/** Linkerkolom (340px): gemiddelde-score-header in blauwe gradient,
 *  verdeling per sterklasse en gemiddelde per kanaal. */
export function ScoreColumn({ stats, bronScores, wachtend }: ScoreColumnProps) {
  return (
    <div className={styles.column}>
      <div className={styles.scoreHeader}>
        <div className={styles.headerLabel}>Gemiddelde score</div>
        <div className={styles.scoreRow}>
          <span className={styles.scoreValue}>{stats.gem}</span>
          <Stars score={5} size={18} onDark />
        </div>
        <div className={styles.scoreMeta}>
          {stats.totaal} reviews · {wachtend} wachten op antwoord
        </div>
      </div>

      <Card pad="none" className={styles.block}>
        <div className={styles.blockTitle}>Verdeling</div>
        <div className={styles.bars}>
          {stats.verdeling.map(([ster, n]) => (
            <div key={ster} className={styles.barRow}>
              <span className={styles.barStar}>
                {ster}
                <Star size={11} strokeWidth={0} className={styles.barStarIcon} />
              </span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${styles[`barFill${ster}`]}`}
                  style={{ width: `${(n / stats.verdelingMax) * 100}%` }}
                />
              </div>
              <span className={styles.barCount}>{n}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card pad="none" className={`${styles.block} ${styles.kanaalBlock}`}>
        <div className={styles.blockTitle}>Per kanaal</div>
        <div className={styles.kanaalList}>
          {bronScores.map((b) => (
            <div key={b.bron} className={styles.kanaalRow}>
              <span
                className={styles.kanaalDot}
                style={{ background: kanaalKleur(b.bron) }}
                aria-hidden
              />
              <span className={styles.kanaalNaam}>{b.bron}</span>
              <span className={styles.kanaalScore} style={{ color: kanaalKleur(b.bron) }}>
                {b.score}
              </span>
              <span className={styles.kanaalAantal}>({b.aantal})</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
