"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Card } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { BRIEF, STATUS_LINE, TENANT } from "@/components/dashboard/v2/demo-data";
import type { BriefData } from "./overzicht-mappers";
import styles from "./BriefCard.module.css";

/** Demo-fallback (dev-preview zonder login): zelfde vorm als de echte data. */
const DEMO_BRIEF: BriefData = {
  statusLine: [...STATUS_LINE],
  greeting: "Goedemorgen",
  voornaam: TENANT.user,
  body: BRIEF.body,
  cta: BRIEF.cta,
};

/** Surface-samenvatting bovenaan Overzicht: statusregel + begroeting + de
 *  briefing-body en een CTA die naar Leads navigeert (de wachtende offertes). */
export function BriefCard({ brief = DEMO_BRIEF }: { brief?: BriefData }) {
  const router = useRouter();

  return (
    <Card pad="none" className={styles.card}>
      <span className={styles.glow} aria-hidden="true" />
      <div className={styles.body}>
        <div className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          {brief.statusLine.join(" · ")}
        </div>
        <h1 className={styles.greeting}>
          {brief.greeting}, {brief.voornaam}
        </h1>
        <p className={styles.text}>{brief.body}</p>
        <div className={styles.ctaRow}>
          <button
            type="button"
            className={styles.cta}
            onClick={() => router.push(`${V2_BASE}/leads`)}
          >
            {brief.cta}
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className={styles.dagBtn}
            onClick={() => router.push(`${V2_BASE}?dagrapport=1`, { scroll: false })}
          >
            <BarChart3 size={15} strokeWidth={2.25} />
            Bekijk dagrapport
          </button>
        </div>
      </div>
    </Card>
  );
}
