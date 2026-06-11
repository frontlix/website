"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { OWNER_ACTIONS } from "@/components/dashboard/v2/demo-data";
import type { ActionRow } from "./overzicht-mappers";
import styles from "./ActionList.module.css";

/** Demo-fallback (dev-preview zonder login): geen lead-id, dus klik gaat
 *  naar de leads-lijst zoals in het prototype. */
const DEMO_ACTIONS: ActionRow[] = OWNER_ACTIONS.map((a) => ({ ...a, leadId: "" }));

/** "Eerst dit doen": de owner-review-actielijst. Hot-items krijgen een
 *  blauwe accent-rij + blauwe meta-tekst (niet-hot meta is muted); klik
 *  navigeert naar het lead-dossier (of de leads-lijst als er geen id is). */
export function ActionList({ actions = DEMO_ACTIONS }: { actions?: ActionRow[] }) {
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);

  const hotCount = actions.filter((a) => a.hot).length;
  const warmCount = actions.length - hotCount;

  const go = (a: ActionRow) =>
    router.push(a.leadId ? `${V2_BASE}/leads/${a.leadId}` : `${V2_BASE}/leads`);

  return (
    <Card pad="none" className={styles.card}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Eerst dit doen</h2>
          <div className={styles.sub}>
            {actions.length} acti{actions.length === 1 ? "e" : "es"} · gesorteerd op
            urgentie &amp; waarde
          </div>
        </div>
        <div className={styles.counts}>
          {hotCount > 0 && <span className={styles.countHot}>{hotCount} hot</span>}
          {warmCount > 0 && <span className={styles.countWarm}>{warmCount} warm</span>}
        </div>
      </div>

      <ul className={styles.list}>
        {actions.map((a) => (
          <li
            key={a.n}
            className={`${styles.row} ${a.hot ? styles.rowHot : ""}`}
            style={{ transform: hover === a.n ? "translateX(4px)" : undefined }}
            onMouseEnter={() => setHover(a.n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => go(a)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                go(a);
              }
            }}
          >
            <span className={`${styles.badge} ${a.hot ? styles.badgeHot : ""}`}>{a.n}</span>
            <div className={styles.main}>
              <span className={styles.rowTitle}>{a.title}</span>
              <span className={styles.rowSub}>{a.sub}</span>
            </div>
            <span className={`${styles.meta} ${a.hot ? styles.metaHot : ""}`}>
              {a.meta}
            </span>
            <ArrowRight
              size={14}
              className={styles.chev}
              style={{ opacity: hover === a.n ? 1 : 0.4 }}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
