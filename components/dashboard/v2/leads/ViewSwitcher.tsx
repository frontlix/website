"use client";

import { List, Columns3 } from "lucide-react";
import styles from "./ViewSwitcher.module.css";

export type LeadsView = "list" | "pipeline";

const OPTS: ReadonlyArray<{ k: LeadsView; l: string; Icon: typeof List }> = [
  { k: "list", l: "Lijst", Icon: List },
  { k: "pipeline", l: "Pipeline", Icon: Columns3 },
];

/** Glas-pill view-toggle met 2 views (Lijst/Pipeline). Gecontroleerd door de
 *  ouder (LeadsView) via value/onChange, zelfde v2-look als de andere
 *  glas-pills in de kop. */
export function ViewSwitcher({
  value,
  onChange,
}: {
  value: LeadsView;
  onChange: (next: LeadsView) => void;
}) {
  return (
    <div className={styles.group} role="tablist" aria-label="Weergave">
      {OPTS.map(({ k, l, Icon }) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`${styles.seg} ${on ? styles.active : ""}`}
            role="tab"
            aria-selected={on}
          >
            <Icon size={14} />
            <span>{l}</span>
          </button>
        );
      })}
    </div>
  );
}
