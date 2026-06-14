// Trechter "van lead naar klant": een rij gestapelde balken met percentage.
// De balkbreedte (pct) is dynamische geometrie en mag inline.

import type { FunnelStap } from "./analyses-data";
import styles from "./FunnelChart.module.css";

interface FunnelChartProps {
  data: FunnelStap[];
}

/** Kleurklasse per trechter-stap: elke stap z'n eigen data-viz-kleur, zodat
 *  de trechter levendig is in plaats van één tint blauw. Cyclt door 1..8. */
function toneClass(i: number): string {
  return styles[`barData${(i % 8) + 1}`] ?? styles.barData1;
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
