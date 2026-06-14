"use client";

// Periode-keuze (Week / Maand / Kwartaal) als pill-rij. De actieve pill is
// blauw gevuld met glow, conform het prototype.

import type { PeriodeNaam } from "./analyses-data";
import { PERIODE_NAMEN } from "./analyses-data";
import styles from "./PeriodeTabs.module.css";

interface PeriodeTabsProps {
  value: PeriodeNaam;
  onChange: (p: PeriodeNaam) => void;
}

export function PeriodeTabs({ value, onChange }: PeriodeTabsProps) {
  return (
    <div className={styles.row}>
      {PERIODE_NAMEN.map((naam) => (
        <button
          key={naam}
          type="button"
          onClick={() => onChange(naam)}
          className={`${styles.pill} ${value === naam ? styles.pillActive : ""}`}
        >
          {naam}
        </button>
      ))}
    </div>
  );
}
