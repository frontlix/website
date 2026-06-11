// ─────────────────────────────────────────────────────────────────────
// Verdeling-balken (rebrand v2). Port van components/dashboard/stats/
// DistributionBars.tsx naar de v2-look (var(--rb-*), Card-primitive).
// Toont een verdeling (status of categorie) als percentage-balken.
//
// Prop-vorm is identiek aan de v1-component (title + rows{label,count}),
// zodat de bestaande statusVerdeling()/categorieVerdeling()-data er
// ongewijzigd in past. Balkbreedte (pct) is dynamische geometrie en mag
// inline (zoals TopDiensten).
// ─────────────────────────────────────────────────────────────────────

import { Card } from "@/components/dashboard/v2/ui";
import styles from "./DistributionBars.module.css";

interface DistributionBarsProps {
  title: string;
  rows: Array<{ label: string; count: number }>;
}

export function DistributionBars({ title, rows }: DistributionBarsProps) {
  const total = rows.reduce((a, b) => a + b.count, 0);

  return (
    <Card pad="none" className={styles.card}>
      <span className={styles.title}>{title}</span>
      {rows.length === 0 ? (
        <p className={styles.empty}>Geen data in deze periode.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => {
            const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
            return (
              <li key={row.label} className={styles.row}>
                <div className={styles.rowHeader}>
                  <span className={styles.rowLabel}>{row.label}</span>
                  <span className={styles.rowMeta}>
                    {row.count} <span className={styles.pct}>· {pct}%</span>
                  </span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.bar}
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
