"use client";

import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { V2_BASE } from "../ui/Shell";
import type { LeadContext as LeadContextFields } from "./inbox-data";
import styles from "./LeadContext.module.css";

interface LeadContextProps {
  leadId: string;
  naam: string;
  initials: string;
  context: LeadContextFields;
}

/** Rechterkolom (330px): compact lead-dossier naast het gesprek. Avatar,
 *  plaats, dienst- en waarde-tegel, en de twee acties "Open in Leads" en
 *  "Plan in agenda". */
export function LeadContext({ leadId, naam, initials, context }: LeadContextProps) {
  const leadHref = `${V2_BASE}/leads/${leadId}`;

  return (
    <div className={styles.card}>
      <div className="rb-section-label">Lead-dossier</div>

      <div className={styles.head}>
        <span className={styles.avatar}>{initials}</span>
        <div className={styles.headBody}>
          <div className={styles.naam}>{naam}</div>
          <div className={styles.plaats}>
            {context.plaats} · {context.kanaal}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.tile}>
          <div className={styles.tileLabel}>Dienst</div>
          <div className={styles.tileValue}>{context.dienst}</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileLabel}>Waarde</div>
          <div className={styles.tileValue}>{context.waarde}</div>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href={leadHref} className={styles.primary}>
          Open in Leads
        </Link>
        <Link href={`${V2_BASE}/agenda`} className={styles.secondary}>
          <CalendarPlus size={15} strokeWidth={2.5} />
          Plan in agenda
        </Link>
      </div>
    </div>
  );
}
