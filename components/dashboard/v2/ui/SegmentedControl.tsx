"use client";

import styles from "./SegmentedControl.module.css";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Donkere ink-variant voor het actieve item (bv. BTW-keuze). */
  tone?: "light" | "ink";
}

/** Segmented control. Container #F1F3F9, actief item wit met subtiele
 *  schaduw. Port uit de design-handoff. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = "light",
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.group}>
      {options.map((opt) => {
        const active = opt.value === value;
        const activeClass = tone === "ink" ? styles.activeInk : styles.active;
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`${styles.seg} ${active ? activeClass : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
