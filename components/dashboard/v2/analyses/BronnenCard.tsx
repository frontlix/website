// Bronnen per kanaal: kaart met aantal leads, omzet/conversie en sparkline.
// "Beste kanaal" (eerste bron) krijgt een blauwe rand + label.

import { Card, Sparkline } from "@/components/dashboard/v2/ui";
import type { Bron } from "./analyses-data";
import styles from "./BronnenCard.module.css";

interface BronnenCardProps {
  bron: Bron;
  best?: boolean;
}

export function BronnenCard({ bron, best = false }: BronnenCardProps) {
  return (
    <Card pad="none" className={`${styles.card} ${best ? styles.cardBest : ""}`}>
      <div className={styles.head}>
        <span className={styles.naam}>{bron.bron}</span>
        {best ? <span className={styles.badge}>Beste kanaal</span> : null}
      </div>
      <div className={styles.body}>
        <div>
          <div className={styles.leads}>
            {bron.leads} <span className={styles.leadsUnit}>leads</span>
          </div>
          <div className={styles.meta}>
            {bron.omzet} omzet · {bron.conv} conversie
          </div>
        </div>
        <Sparkline
          data={bron.spark}
          width={110}
          height={44}
          stroke="var(--rb-blue)"
          strokeWidth={2.5}
        />
      </div>
    </Card>
  );
}
