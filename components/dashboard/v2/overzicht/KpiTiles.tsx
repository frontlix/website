"use client";

import { useRouter } from "next/navigation";
import { Card, Sparkline } from "@/components/dashboard/v2/ui";
import { V2_BASE } from "@/components/dashboard/v2/ui/Shell";
import { KPIS, SPARK, type Kpi } from "@/components/dashboard/v2/demo-data";
import styles from "./KpiTiles.module.css";

/** 4 KPI-tegels (2x2) met de Sparkline-primitive. Elke tegel klikt door
 *  naar Analyses, conform het prototype. */
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
      {kpis.map((k) => (
        <Card
          key={k.label}
          pad="none"
          className={styles.tile}
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
          <Sparkline
            data={spark}
            width={150}
            height={30}
            stroke={k.up ? "var(--rb-mint-ink)" : "var(--rb-muted)"}
            opacity={0.85}
          />
        </Card>
      ))}
    </div>
  );
}
