// Bronnen per kanaal: kaart met aantal leads, omzet/conversie en sparkline.
// "Beste kanaal" (eerste bron) krijgt een blauwe rand + label. Elk kanaal
// heeft z'n eigen kleur-identiteit (WhatsApp groen, Telefoon cyaan, enz.).

import { Card, Sparkline } from "@/components/dashboard/v2/ui";
import type { Bron } from "./analyses-data";
import styles from "./BronnenCard.module.css";

interface BronnenCardProps {
  bron: Bron;
  best?: boolean;
}

/** Kanaal → kleur-token. WhatsApp groen, Telefoon cyaan, Website blauw; de
 *  rest valt terug op het data-viz-palet zodat elk kanaal eigen kleur heeft. */
function kanaalKleur(bron: string): string {
  const raw = bron.toLowerCase();
  if (raw.includes("whatsapp")) return "var(--rb-data-2)"; // groen
  if (raw.includes("tel") || raw.includes("bel")) return "var(--rb-data-5)"; // cyaan
  if (raw.includes("web")) return "var(--rb-data-1)"; // blauw
  if (raw.includes("insta") || raw.includes("social")) return "var(--rb-data-6)"; // koraal
  if (raw.includes("mail") || raw.includes("e-mail")) return "var(--rb-data-4)"; // paars
  return "var(--rb-data-7)"; // teal
}

export function BronnenCard({ bron, best = false }: BronnenCardProps) {
  const kleur = kanaalKleur(bron.bron);
  return (
    <Card pad="none" className={`${styles.card} ${best ? styles.cardBest : ""}`}>
      <div className={styles.head}>
        <span className={styles.naam}>
          <span
            className={styles.dot}
            style={{ background: kleur }}
            aria-hidden="true"
          />
          {bron.bron}
        </span>
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
          stroke={kleur}
          strokeWidth={2.5}
        />
      </div>
    </Card>
  );
}
