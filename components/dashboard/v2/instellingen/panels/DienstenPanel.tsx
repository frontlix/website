"use client";

import { Toggle, Button } from "@/components/dashboard/v2/ui";
import type { Service } from "../instellingen-data";
import styles from "./panels.module.css";

interface DienstenPanelProps {
  diensten: Service[];
  onToggle: (naam: string, actief: boolean) => void;
}

/**
 * Diensten met aan/uit-toggle, gekoppeld aan service_offerings (dienst_key).
 *
 * Geen prijs-kolom: in v1 leven prijzen volledig apart (PrijzenEditor, gekeyd
 * op pricing_rules.rule_key) en worden service_offerings en pricing_rules
 * nooit gejoind. dienst_key en rule_key vallen niet aantoonbaar samen, dus een
 * prijs-veld hier zou stille lege prijzen tonen en een Opslaan die nooit een
 * prijs wegschrijft. We spiegelen v1 DienstenSection: alleen toggles.
 */
export function DienstenPanel({ diensten, onToggle }: DienstenPanelProps) {
  return (
    <div className={styles.list}>
      {diensten.map((d) => (
        <div key={d.naam} className={styles.row}>
          <Toggle
            value={d.actief}
            onChange={(v) => onToggle(d.naam, v)}
            aria-label={`${d.naam} aan of uit`}
          />
          <span className={`${styles.rowTitle} ${styles.rowMain} ${d.actief ? "" : styles.dim}`}>
            {d.naam}
          </span>
        </div>
      ))}
      <Button variant="secondary" size="sm" className={styles.addBtn}>
        + Dienst toevoegen
      </Button>
    </div>
  );
}
