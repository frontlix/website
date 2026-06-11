// Trechter "van lead naar klant": een rij gestapelde balken met percentage.
// De balkbreedte (pct) is dynamische geometrie en mag inline.

import type { FunnelStap } from "./analyses-data";
import styles from "./FunnelChart.module.css";

interface FunnelChartProps {
  data: FunnelStap[];
}

/** Kleurklasse per stap: eerste twee mint, dan cyaan, dan blauw. */
function toneClass(i: number): string {
  if (i < 2) return styles.barSuccess;
  if (i < 4) return styles.barCyan;
  return styles.barBlue;
}

export function FunnelChart({ data }: FunnelChartProps) {
  return (
    <div className={styles.list}>
      {data.map((f, i) => (
        <div key={f.stap}>
          <div className={styles.row}>
            <span className={styles.stap}>{f.stap}</span>
            <span className={styles.n}>
              {f.n} <span className={styles.pct}>({f.pct}%)</span>
            </span>
          </div>
          <div className={styles.track}>
            <div
              className={`${styles.bar} ${toneClass(i)}`}
              style={{ width: `${f.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
