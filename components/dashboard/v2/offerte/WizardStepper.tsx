"use client";

import { Check, ChevronRight } from "lucide-react";
import { Fragment } from "react";
import styles from "./WizardStepper.module.css";

interface StepperProps {
  stappen: readonly string[];
  stap: number;
  klantOk: boolean;
  onJump: (i: number) => void;
}

/** Klikbare stepper Klant › Werk › Offerte › Versturen. Stappen 2 t/m 4 zijn
 *  pas aanklikbaar zodra er een klant(naam) is. */
export function Stepper({ stappen, stap, klantOk, onJump }: StepperProps) {
  return (
    <div className={styles.row}>
      {stappen.map((s, i) => {
        const done = i < stap;
        const actief = i === stap;
        const kan = i === 0 || klantOk;
        return (
          <Fragment key={s}>
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={!kan}
              aria-current={actief ? "step" : undefined}
              className={`${styles.step} ${actief ? styles.active : ""} ${
                done ? styles.done : ""
              } ${kan ? "" : styles.locked}`}
            >
              <span className={styles.badge}>
                {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {s}
            </button>
            {i < stappen.length - 1 ? (
              <ChevronRight size={14} className={styles.sep} aria-hidden="true" />
            ) : null}
          </Fragment>
        );
      })}
      <span className={styles.hint}>
        Klik op een stap om te springen · <strong>Esc</strong> sluiten
      </span>
    </div>
  );
}
