"use client";

import styles from "./Toggle.module.css";

interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  "aria-label"?: string;
}

/** Pill-toggle 44×26 met 20px knob. Port van PToggle uit de handoff. */
export function Toggle({ value, onChange, "aria-label": ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => onChange(!value)}
      className={`${styles.track} ${value ? styles.on : ""}`}
    >
      <span className={styles.knob} />
    </button>
  );
}
