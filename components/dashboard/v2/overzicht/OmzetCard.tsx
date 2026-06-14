"use client";

import { useRouter } from "next/navigation";
import { Ring } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { OMZET } from "@/components/dashboard/v2/demo-data";
import type { OmzetData } from "./overzicht-mappers";
import styles from "./OmzetCard.module.css";

/** Demo-fallback (dev-preview zonder login): zelfde vorm als de echte data. */
const DEMO_OMZET: OmzetData = {
  value: OMZET.value,
  delta: OMZET.delta,
  deltaSub: OMZET.deltaSub,
  doel: OMZET.doel,
  pct: OMZET.pct,
};

/** Omzet-deze-maand-kaart: blauwe gradient met de voortgangsring (% van
 *  het doel). Klik navigeert naar Analyses. */
export function OmzetCard({ omzet = DEMO_OMZET }: { omzet?: OmzetData }) {
  const router = useRouter();

  return (
    <div
      className={styles.card}
      onClick={() => router.push(`${V2_BASE}/analyses`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`${V2_BASE}/analyses`);
        }
      }}
    >
      <div className={styles.label}>Omzet deze maand</div>
      <div className={styles.valueRow}>
        <div className={styles.value}>€{omzet.value}</div>
        <Ring
          pct={omzet.pct}
          size={86}
          stroke={9}
          color="var(--rb-metric-omzet)"
          track="rgba(255,255,255,0.22)"
          label={`${omzet.pct}%`}
          labelColor="#fff"
        />
      </div>
      <div className={styles.delta}>
        <strong>{omzet.delta}</strong> {omzet.deltaSub} · doel {omzet.doel}
      </div>
    </div>
  );
}
