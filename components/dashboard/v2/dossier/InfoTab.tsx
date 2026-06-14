import { Check } from "lucide-react";
import type { DossierData, InfoRow } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import styles from "./InfoTab.module.css";

interface InfoTabProps {
  /** Hoofd-dienst van de lead (uit findLead). Behouden voor signatuur-compat. */
  dienst: string;
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
}

/** Eén kolom met een sectiekop + gegevensrijen (label / waarde / chip / sub).
 *  `tone` geeft de sectiekop een eigen kleur-accent (Klant=blauw, Werk=teal). */
function InfoColumn({
  titel,
  rijen,
  tone,
}: {
  titel: string;
  rijen: InfoRow[];
  tone: "klant" | "werk";
}) {
  return (
    <div>
      <div className={`rb-section-label ${styles.colHead} ${styles[tone]}`}>{titel}</div>
      <div className={styles.rows}>
        {rijen.map((row) => (
          <div key={row.label} className={styles.row}>
            <div className={styles.rowMain}>
              <div className={styles.rowLabel}>{row.label}</div>
              <div className={styles.rowValue}>{row.waarde}</div>
              {row.sub ? <div className={styles.rowSub}>{row.sub}</div> : null}
            </div>
            {row.chip ? (
              <span className={styles.waChip}>
                <Check size={11} strokeWidth={3} />
                {row.chip}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Info-tab: 2-koloms klant- en werk-gegevens, daaronder de fotostrip. */
export function InfoTab({ data = DOSSIER }: InfoTabProps) {
  return (
    <div className={styles.root}>
      <div className={styles.cols}>
        <InfoColumn titel="Klant" rijen={data.klant} tone="klant" />
        <InfoColumn titel="Werk" rijen={data.werk} tone="werk" />
      </div>

      <div className={`rb-section-label ${styles.spaced}`}>Foto&apos;s van de klant</div>
      <div className={styles.fotoStrip}>
        {data.fotos.map((f, i) => (
          <PhotoPlaceholder key={i} tag={f.tag} url={f.url} height={70} />
        ))}
      </div>
    </div>
  );
}
