// Klus-details als gekleurde chips: soort werk, m², sub-diensten en conditie
// (groene aanslag, planten afschermen). Gedeeld door het Vandaag-paneel en de
// Route & contact-modal. Toont alleen wat bekend is.

import { SprayCan, Ruler, Wrench, Sprout, Leaf } from "lucide-react";
import type { KlusInfo } from "./agenda-data";
import { categorieLabel, subDienstLabel } from "./agenda-derive";
import styles from "./KlusDetails.module.css";

export function KlusDetails({ info }: { info: KlusInfo }) {
  const heeftIets =
    info.categorie ||
    info.m2 ||
    (info.subDiensten && info.subDiensten.length) ||
    info.groeneAanslag ||
    info.plantenAfschermen;
  if (!heeftIets) return null;

  return (
    <div className={styles.wrap}>
      {info.categorie ? (
        <span className={`${styles.chip} ${styles.chipBlue}`}>
          <SprayCan size={13} strokeWidth={2.2} />
          {categorieLabel(info.categorie)}
        </span>
      ) : null}

      {info.m2 ? (
        <span className={styles.chip}>
          <Ruler size={13} strokeWidth={2.2} />
          {info.m2} m²
        </span>
      ) : null}

      {(info.subDiensten ?? []).map((s) => (
        <span key={s} className={styles.chip}>
          <Wrench size={13} strokeWidth={2.2} />
          {subDienstLabel(s)}
        </span>
      ))}

      {info.groeneAanslag ? (
        <span className={`${styles.chip} ${styles.chipGreen}`}>
          <Sprout size={13} strokeWidth={2.2} />
          Groene aanslag
        </span>
      ) : null}

      {info.plantenAfschermen ? (
        <span className={`${styles.chip} ${styles.chipGreen}`}>
          <Leaf size={13} strokeWidth={2.2} />
          Planten afschermen
        </span>
      ) : null}
    </div>
  );
}
