"use client";

import { Button } from "@/components/dashboard/v2/ui";
import type { TeamMember } from "../instellingen-data";
import styles from "./panels.module.css";

interface TeamPanelProps {
  /** Approved teamleden (echte data via dashboard_user_profiles), owner eerst. */
  leden: TeamMember[];
}

/** Team: wie er in Frontlix werken en welke rol ze hebben. */
export function TeamPanel({ leden }: TeamPanelProps) {
  return (
    <div className={styles.list}>
      {leden.map((m) => (
        <div key={`${m.naam}-${m.init}`} className={styles.row}>
          <span
            className={`${styles.memberAvatar} ${m.owner ? styles.memberOwner : styles.memberStaff}`}
          >
            {m.init}
          </span>
          <div className={styles.rowMain}>
            <div className={styles.rowTitle}>{m.naam}</div>
            <div className={styles.rowSub}>{m.sub}</div>
          </div>
          <span className={`${styles.rolePill} ${m.owner ? styles.roleOwner : styles.roleStaff}`}>
            {m.rol}
          </span>
        </div>
      ))}
      {leden.length === 0 && (
        <div className={styles.empty}>Geen approved teamleden gevonden.</div>
      )}
      <Button variant="secondary" size="sm" className={styles.addBtn}>
        + Teamlid uitnodigen
      </Button>
    </div>
  );
}
