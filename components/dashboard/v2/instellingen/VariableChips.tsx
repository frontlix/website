"use client";

import type { TemplateVariable } from "./instellingen-data";
import styles from "./VariableChips.module.css";

interface VariableChipsProps {
  vars: TemplateVariable[];
  onInsert: (variable: string) => void;
  /** Compacte variant (kleinere chips, geen omkaderd blok) voor reminders. */
  compact?: boolean;
}

/** Klikbare variabelen-chips die een placeholder invoegen in een veld. */
export function VariableChips({ vars, onInsert, compact = false }: VariableChipsProps) {
  if (compact) {
    return (
      <div className={styles.compactRow}>
        {vars.map((t) => (
          <button
            key={t.v}
            type="button"
            title={t.d}
            onClick={() => onInsert(t.v)}
            className={`${styles.chip} ${styles.chipSm}`}
          >
            {t.v}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        Variabelen <span className={styles.hint}>· klik om in te voegen</span>
      </div>
      <div className={styles.row}>
        {vars.map((t) => (
          <button
            key={t.v}
            type="button"
            title={t.d}
            onClick={() => onInsert(t.v)}
            className={styles.chip}
          >
            {t.v}
          </button>
        ))}
      </div>
    </div>
  );
}
