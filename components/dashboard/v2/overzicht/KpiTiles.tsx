"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Card, Sparkline } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { KPIS, SPARK, type Kpi } from "@/components/dashboard/v2/demo-data";
import styles from "./KpiTiles.module.css";

/** Metriek-kleur per tegel (vaste volgorde zoals de mapper ze levert:
 *  leads, conversie, reactietijd, offertes). Kleur = betekenis per KPI. */
const TILE_ACCENTS = [
  "var(--rb-metric-leads)",
  "var(--rb-metric-conversie)",
  "var(--rb-metric-reactie)",
  "var(--rb-metric-offertes)",
];

/** 4 KPI-tegels (2x2) met de Sparkline-primitive. Elke tegel klikt door
 *  naar Analyses, conform het prototype. Elke tegel krijgt een eigen
 *  metriek-kleur (top-accent + sparkline) zodat kleur de KPI markeert. */
export function KpiTiles({
  kpis = KPIS,
  spark = SPARK,
}: {
  kpis?: Kpi[];
  spark?: number[];
}) {
  const router = useRouter();

  return (
    <div className={styles.grid}>
      {kpis.map((k, i) => {
        const accent = TILE_ACCENTS[i % TILE_ACCENTS.length];
        return (
          <Card
            key={k.label}
            pad="none"
            className={styles.tile}
            style={{ "--rb-tile-accent": accent } as CSSProperties}
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
            <div className={styles.label}>{k.label}</div>
            <div className={styles.valueRow}>
              <span className={styles.value}>
                {k.value}
                {k.unit ? <span className={styles.unit}>{k.unit}</span> : null}
              </span>
              <span className={`${styles.delta} ${k.up ? styles.deltaUp : styles.deltaDown}`}>
                {k.delta}
              </span>
            </div>
            <Sparkline data={spark} width={150} height={30} stroke={accent} opacity={0.9} />
          </Card>
        );
      })}
    </div>
  );
}
