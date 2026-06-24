"use client";

import { useState } from "react";
import { Check, MapPin } from "lucide-react";
import type { DossierData, InfoRow } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import { PhotoLightbox } from "./PhotoLightbox";
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
              {row.links && row.links.length > 0 ? (
                <div className={styles.rowLinks}>
                  {row.links.map((link) => (
                    <a
                      key={link.label}
                      className={styles.rowLink}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin size={12} strokeWidth={2.4} aria-hidden="true" />
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
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
  /** Index van de foto die groot in de lightbox open staat (null = dicht). */
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const open = openIndex !== null ? data.fotos[openIndex] : null;

  return (
    <div className={styles.root}>
      <div className={styles.cols}>
        <InfoColumn titel="Klant" rijen={data.klant} tone="klant" />
        <InfoColumn titel="Werk" rijen={data.werk} tone="werk" />
      </div>

      <div className={`rb-section-label ${styles.spaced}`}>Foto&apos;s van de klant</div>
      <div className={styles.fotoStrip}>
        {data.fotos.map((f, i) =>
          f.url ? (
            <button
              key={i}
              type="button"
              className={styles.stripTile}
              onClick={() => setOpenIndex(i)}
              aria-label={`Foto ${f.tag} groot bekijken`}
            >
              <PhotoPlaceholder tag={f.tag} url={f.url} height={70} fit="cover" />
            </button>
          ) : (
            <PhotoPlaceholder key={i} tag={f.tag} url={f.url} height={70} fit="cover" />
          ),
        )}
      </div>

      <PhotoLightbox url={open?.url} alt={open?.tag} onClose={() => setOpenIndex(null)} />
    </div>
  );
}
