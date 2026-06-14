"use client";

import { Avatar, Button } from "@/components/dashboard/v2/ui";
import type { TeamMember } from "../instellingen-data";
import styles from "./panels.module.css";

interface TeamPanelProps {
  /** Approved teamleden (echte data via dashboard_user_profiles), owner eerst. */
  leden: TeamMember[];
}

/** Team: wie er in Frontlix werken en welke rol ze hebben. Avatars per persoon
 *  gekleurd (gekleurde tint op naam-hash), zodat elke teamgenoot z'n eigen
 *  consistente kleur heeft; de rol-pill houdt het owner/uitvoerend-onderscheid. */
export function TeamPanel({ leden }: TeamPanelProps) {
  return (
    <div className={styles.list}>
      {leden.map((m) => (
        <div key={`${m.naam}-${m.init}`} className={styles.row}>
          <Avatar name={m.naam} initials={m.init} size={40} radius={14} />
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
      {/* Zelf teamleden uitnodigen kan nog niet (geen invite-flow). Knop op
          "binnenkort" zodat het duidelijk is; nu loopt uitnodigen via support. */}
      <Button
        variant="secondary"
        size="sm"
        className={styles.addBtn}
        disabled
        title="Binnenkort beschikbaar, uitnodigen kan nu via Frontlix-support"
      >
        + Teamlid uitnodigen (binnenkort)
      </Button>
    </div>
  );
}
