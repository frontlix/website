import { Phone, Mail, MapPin, Check } from "lucide-react";
import type { ContactRow, DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import styles from "./InfoTab.module.css";

interface InfoTabProps {
  /** Hoofd-dienst van de lead (uit findLead). */
  dienst: string;
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
}

function ContactIcon({ kind }: { kind: ContactRow["kind"] }) {
  if (kind === "telefoon") return <Phone size={15} strokeWidth={2.1} />;
  if (kind === "email") return <Mail size={15} strokeWidth={2.1} />;
  return <MapPin size={15} strokeWidth={2.1} />;
}

/** Info-tab: 2-koloms contact + dienst/checklist, daaronder bijzonderheden
 *  en de fotostrip. */
export function InfoTab({ dienst, data = DOSSIER }: InfoTabProps) {
  return (
    <div className={styles.root}>
      <div className={styles.cols}>
        <div>
          <div className="rb-section-label">Contact</div>
          <div className={styles.contact}>
            {data.contact.map((row) => (
              <div key={row.label} className={styles.contactRow}>
                <span className={styles.contactIcon}>
                  <ContactIcon kind={row.kind} />
                </span>
                <div className={styles.contactMain}>
                  <div className={styles.contactLabel}>{row.label}</div>
                  <div className={styles.contactValue}>{row.waarde}</div>
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

        <div>
          <div className="rb-section-label">Dienst &amp; werk</div>
          <div className={styles.dienst}>{dienst}</div>
          <div className={styles.chips}>
            {data.sub.map((s) => (
              <span key={s} className={styles.werkChip}>
                <Check size={11} strokeWidth={3} />
                {s}
              </span>
            ))}
            <span className={styles.m2Chip}>{data.m2} m²</span>
          </div>

          <div className={`rb-section-label ${styles.spaced}`}>Checklist van Surface</div>
          <div className={styles.checklist}>
            {data.checklist.map((c) => (
              <div key={c.vraag} className={styles.checkRow}>
                <span className={`${styles.checkDot} ${c.done ? styles.checkDone : ""}`}>
                  {c.done ? <Check size={10} strokeWidth={3.2} /> : null}
                </span>
                <span className={`${styles.checkText} ${c.done ? styles.checkTextDone : ""}`}>
                  {c.vraag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`rb-section-label ${styles.spaced}`}>Bijzonderheden</div>
      <div className={styles.bijzonder}>
        {data.bijzonder.map((b) => (
          <div key={b.label} className={styles.tegel}>
            <div className={styles.tegelLabel}>{b.label}</div>
            <div className={styles.tegelValue}>{b.waarde}</div>
          </div>
        ))}
      </div>

      <div className={`rb-section-label ${styles.spaced}`}>Foto&apos;s van de klant</div>
      <div className={styles.fotoStrip}>
        {data.fotos.map((f) => (
          <PhotoPlaceholder key={f} tag={f} height={70} />
        ))}
      </div>
    </div>
  );
}
