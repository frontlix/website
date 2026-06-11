"use client";

import { FileText, ChevronRight } from "lucide-react";
import type { DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import styles from "./OffertesTab.module.css";

interface OffertesTabProps {
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
}

/** Opent de offerte-wizard via het gedeelde event. */
function openOfferteWizard() {
  window.dispatchEvent(new CustomEvent("rb:new-offerte"));
}

/** Offertes-tab: lijst met offertes (concept = blauwe rand + Open-knop) en
 *  een regels-preview met totaal van het concept. */
export function OffertesTab({ data = DOSSIER }: OffertesTabProps) {
  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className="rb-section-label">Offertes voor deze lead</span>
        <button type="button" className={styles.newLink} onClick={openOfferteWizard}>
          + Nieuwe offerte
        </button>
      </div>

      {data.offertes.map((o) => (
        <div
          key={o.nr}
          className={`${styles.row} ${o.concept ? styles.concept : ""}`}
          onClick={o.concept ? openOfferteWizard : undefined}
          role={o.concept ? "button" : undefined}
          tabIndex={o.concept ? 0 : undefined}
          onKeyDown={
            o.concept
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openOfferteWizard();
                  }
                }
              : undefined
          }
        >
          <span className={`${styles.docIcon} ${o.concept ? styles.docIconConcept : ""}`}>
            <FileText size={18} strokeWidth={2} />
          </span>
          <div className={styles.rowMain}>
            <div className={styles.rowTop}>
              <span className={styles.nr}>{o.nr}</span>
              <span className={`${styles.tag} ${o.concept ? styles.tagConcept : styles.tagDone}`}>
                {o.label}
              </span>
            </div>
            <div className={styles.rowSub}>{o.sub}</div>
          </div>
          <span className={styles.totaal}>{o.totaal}</span>
          {o.concept ? (
            <span className={styles.openBtn}>
              Open
              <ChevronRight size={14} strokeWidth={2.6} />
            </span>
          ) : null}
        </div>
      ))}

      <div className={`rb-section-label ${styles.spaced}`}>Regels in het concept</div>
      <div className={styles.regels}>
        {data.offerteRegels.map((r) => (
          <div key={r.naam} className={styles.regel}>
            <span>
              {r.naam} <span className={styles.calc}>· {r.calc}</span>
            </span>
            <span className={styles.bedrag}>{r.bedrag}</span>
          </div>
        ))}
        <div className={styles.totaalRow}>
          <span>Totaal incl. BTW</span>
          <span>{data.offerteTotaal}</span>
        </div>
      </div>
    </div>
  );
}
