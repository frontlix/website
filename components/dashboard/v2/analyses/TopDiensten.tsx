// Top-diensten: eenvoudige horizontale bar-verdeling (aandeel per dienst).
// Balkbreedte (pct) is dynamische geometrie en mag inline.

import type { DienstAandeel } from "./analyses-data";
import styles from "./TopDiensten.module.css";

interface TopDienstenProps {
  data: DienstAandeel[];
}

export function TopDiensten({ data }: TopDienstenProps) {
  const max = Math.max(...data.map((d) => d.pct));
  return (
    <div className={styles.list}>
      {data.map((d, i) => (
        <div key={d.naam} className={styles.item}>
          <div className={styles.row}>
            <span className={styles.naam}>
              <span
                className={`${styles.dot} ${styles[`dotData${(i % 8) + 1}`] ?? ""}`}
                aria-hidden="true"
              />
              {d.naam}
            </span>
            <span className={styles.omzet}>
              {d.omzet} <span className={styles.pct}>· {d.pct}%</span>
            </span>
          </div>
          <div className={styles.track}>
            <div
              className={`${styles.bar} ${styles[`barData${(i % 8) + 1}`] ?? ""}`}
              style={{ width: `${(d.pct / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
