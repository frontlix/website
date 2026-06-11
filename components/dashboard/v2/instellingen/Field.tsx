"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import styles from "./Field.module.css";

interface FieldProps {
  label: string;
  value: string;
  onChange?: (next: string) => void;
  /** Beslaat de volle breedte van een 2-koloms grid. */
  breed?: boolean;
  /** Prefix in het veld, bv. "€". */
  prefix?: ReactNode;
  /** Suffix achter de waarde, bv. "%" of "per maand". */
  suffix?: ReactNode;
  /**
   * Toont de waarde als niet-bewerkbaar (spiegelt v1 ReadOnlyField): geen
   * input meer maar een vaste waarde met een Read-only-pill. Lege waarde
   * valt terug op de betekenis-glyph "—".
   */
  readOnly?: boolean;
}

/** Bewerkbaar tekstveld met uppercase-label erboven. Port van PInput. */
export function Field({
  label,
  value,
  onChange,
  breed = false,
  prefix,
  suffix,
  readOnly = false,
}: FieldProps) {
  if (readOnly) {
    return (
      <div className={breed ? styles.wide : undefined}>
        <div className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          <span className={styles.roPill}>
            <Lock size={11} strokeWidth={2.5} />
            Read-only
          </span>
        </div>
        <div className={`${styles.box} ${styles.boxReadOnly}`}>
          {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
          <span className={styles.readValue}>{value || "—"}</span>
          {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={breed ? styles.wide : undefined}>
      <div className={styles.label}>{label}</div>
      <div className={styles.box}>
        {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
        <input
          className={styles.input}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
        {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
      </div>
    </div>
  );
}
