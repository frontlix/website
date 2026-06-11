"use client";

import { Minus, Plus } from "lucide-react";
import styles from "./Stepper.module.css";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** Achtervoegsel achter de waarde, bv. "m²" of "zakken". */
  suffix?: string;
  /** Toon met NL-duizendscheiding. */
  formatNL?: boolean;
}

/** ±-stepper met 20px knopjes. Herberekent direct via onChange. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = -Infinity,
  max = Infinity,
  suffix,
  formatNL = false,
}: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const display = formatNL ? value.toLocaleString("nl-NL") : String(value);

  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label="Verlagen"
      >
        <Minus size={13} strokeWidth={2.5} />
      </button>
      <span className={styles.value}>
        {display}
        {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
      </span>
      <button
        type="button"
        className={styles.btn}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label="Verhogen"
      >
        <Plus size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}
