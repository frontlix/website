"use client";

import { Minus, Plus } from "lucide-react";
import styles from "./MiniStep.module.css";

interface MiniStepProps {
  /** "−" of "+". */
  dir: "min" | "plus";
  onClick: () => void;
  ariaLabel?: string;
}

/** Compacte 20px stepper-knop (port van POStepKnop). De gedeelde ui/Stepper
 *  is 26px en bundelt waarde + beide knoppen; in de offerte-wizard staan de
 *  knopjes los rond eigen waarde-/prijsvelden, dus een eigen mini-knop. */
export function MiniStep({ dir, onClick, ariaLabel }: MiniStepProps) {
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={onClick}
      aria-label={ariaLabel ?? (dir === "min" ? "Verlagen" : "Verhogen")}
    >
      {dir === "min" ? (
        <Minus size={12} strokeWidth={2.5} />
      ) : (
        <Plus size={12} strokeWidth={2.5} />
      )}
    </button>
  );
}
