// ─────────────────────────────────────────────────────────────────────
// Top-tags-lijst (rebrand v2). Port van components/dashboard/stats/
// TopTagsList.tsx naar de v2-look (var(--rb-*), Card-primitive).
// Toont de top-N tags als eenvoudige naam + count-lijst.
//
// Prop-vorm is identiek aan de v1-component (rows{naam,count}), zodat de
// bestaande topTags()-data er ongewijzigd in past.
// ─────────────────────────────────────────────────────────────────────

import { Card } from "@/components/dashboard/v2/ui";
import styles from "./TopTagsList.module.css";

interface TopTagsListProps {
  rows: Array<{ naam: string; count: number }>;
}

export function TopTagsList({ rows }: TopTagsListProps) {
  return (
    <Card pad="none" className={styles.card}>
      <span className={styles.title}>Top tags</span>
      {rows.length === 0 ? (
        <p className={styles.empty}>Nog geen tags toegekend.</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row, i) => (
            <li key={row.naam} className={styles.row}>
              <span
                className={`${styles.chip} ${styles[`chipData${(i % 8) + 1}`] ?? ""}`}
              >
                {row.naam}
              </span>
              <span className={styles.count}>{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
