// Surface-inzicht: kaart met soort-label (Sterk punt / Kans / Let op),
// titel, uitleg en acties.

import { Card } from "@/components/dashboard/v2/ui";
import type { Inzicht, InzichtKind } from "./analyses-data";
import styles from "./InzichtenCard.module.css";

interface InzichtenCardProps {
  inzicht: Inzicht;
}

const LABELS: Record<InzichtKind, string> = {
  plus: "Sterk punt",
  kans: "Kans",
  "let-op": "Let op",
};

const BADGE_CLASS: Record<InzichtKind, string> = {
  plus: styles.badgePlus,
  kans: styles.badgeKans,
  "let-op": styles.badgeLetOp,
};

export function InzichtenCard({ inzicht }: InzichtenCardProps) {
  return (
    <Card pad="none" className={styles.card}>
      <span className={`${styles.badge} ${BADGE_CLASS[inzicht.kind]}`}>
        {LABELS[inzicht.kind]}
      </span>
      <div className={styles.titel}>{inzicht.titel}</div>
      <p className={styles.tekst}>{inzicht.tekst}</p>
      <div className={styles.acties}>
        <button type="button" className={styles.actieSoft}>
          Laat zien
        </button>
        {inzicht.kind === "kans" ? (
          <button type="button" className={styles.actiePrim}>
            Pas radius aan
          </button>
        ) : null}
      </div>
    </Card>
  );
}
