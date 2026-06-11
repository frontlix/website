"use client";

import { Minus, Plus } from "lucide-react";
import { Toggle } from "@/components/dashboard/v2/ui";
import { Field } from "../Field";
import styles from "./panels.module.css";

interface OffertesPanelProps {
  geldigheid: number;
  onGeldigheid: (next: number) => void;
}

/** Offertes: standaardinstellingen zoals geldigheid, BTW, betaaltermijn,
 *  nummerformaat en aanbetaling. De aanbetaling staat op een statische
 *  demo-waarde (nog niet aan echte opslag gekoppeld). */
export function OffertesPanel({ geldigheid, onGeldigheid }: OffertesPanelProps) {
  // Statische demo-waarde: de aanbetaling is nog niet aan opslag gekoppeld,
  // de toggle is daarom uitgeschakeld en wijzigt geen echte instelling.
  const aanbetalingDemo = true;

  return (
    <>
      <div className={`${styles.grid2} ${styles.gridTop}`}>
        <div>
          <div className={styles.fieldLabel}>Geldigheid</div>
          <div className={styles.geldigStepper}>
            <button
              type="button"
              className={styles.geldigBtn}
              onClick={() => onGeldigheid(Math.max(7, geldigheid - 7))}
              disabled={geldigheid <= 7}
              aria-label="Geldigheid verlagen"
            >
              <Minus size={15} strokeWidth={2.5} />
            </button>
            <span className={styles.geldigValue}>{geldigheid} dagen</span>
            <button
              type="button"
              className={styles.geldigBtn}
              onClick={() => onGeldigheid(Math.min(30, geldigheid + 7))}
              disabled={geldigheid >= 30}
              aria-label="Geldigheid verhogen"
            >
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <Field label="BTW-tarief" value="21" suffix="%" />
        <Field label="Betaaltermijn" value="14" suffix="dagen na afronding" />
        <Field label="Offertenummer-formaat" value="SS-2026-###" />
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.rowMain}>
          <div className={styles.rowTitle}>
            Aanbetaling vragen{" "}
            <span className={styles.demoBadge}>Demo</span>
          </div>
          <div className={styles.rowSub}>
            25% vooraf bij klussen boven €750, deze instelling werken we binnenkort uit
          </div>
        </div>
        <Toggle
          value={aanbetalingDemo}
          onChange={() => {}}
          aria-label="Aanbetaling vragen, demo"
        />
      </div>
    </>
  );
}
