"use client";

import { useState } from "react";
import { FileText, ChevronRight, ChevronDown } from "lucide-react";
import type { DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { OfferteEditor } from "./OfferteEditor";
import styles from "./OffertesTab.module.css";

interface OffertesTabProps {
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
  /** Echte lead_id ⇒ de inline editor slaat live op. Zonder = demo (inert). */
  leadId?: string;
}

/** Opent de losse nieuwe-offerte-wizard via het gedeelde event. Alleen voor
 *  een NIEUWE offerte (header-link), niet meer voor het concept bewerken. */
function openOfferteWizard() {
  window.dispatchEvent(new CustomEvent("rb:new-offerte"));
}

/** Offertes-tab: lijst met offertes (concept = blauwe rand + Open-knop) en,
 *  uitgeklapt onder het concept, de inline OfferteEditor om de regels, korting
 *  en geldigheid te bewerken. De preview-regels blijven herkenbaar dezelfde
 *  layout/plek wanneer de editor dicht is. */
export function OffertesTab({ data = DOSSIER, leadId }: OffertesTabProps) {
  // Is er een bewerkbaar concept? De editor laadt de huidige lead-staat (=
  // de inhoud van de offerte die nu bij de klant ligt); aanpassen + opslaan
  // schrijft naar het concept (de nieuwe versie).
  const hasConcept = data.offertes.some((o) => o.concept);
  // Het concept staat STANDAARD uitgeklapt, zodat de huidige offerte meteen
  // bewerkbaar in beeld is (de gebruiker hoeft niet eerst "Open" te klikken).
  const [open, setOpen] = useState(true);
  // Live totaal uit de editor, zodat de concept-rij hetzelfde bedrag toont als
  // wat de editor berekent (i.p.v. het €0 van een vers concept-record).
  const [liveTotaal, setLiveTotaal] = useState<string | null>(null);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className="rb-section-label">Offertes voor deze lead</span>
        <button
          type="button"
          className={styles.newLink}
          onClick={openOfferteWizard}
          disabled
          title="Binnenkort beschikbaar"
          style={{ opacity: 0.5, cursor: "not-allowed" }}
        >
          + Nieuwe offerte (binnenkort)
        </button>
      </div>

      {data.offertes.map((o) => {
        const isConcept = o.concept;
        // Kleur-toon per offerte: concept = blauw, archief (geweigerd/verlopen)
        // = grijs, anders verstuurd = groen. Valt terug op `concept` zodat de
        // demo-data (zonder `tone`) ongewijzigd correct kleurt.
        const tone = o.tone ?? (isConcept ? "concept" : "verstuurd");
        const tagClass =
          tone === "concept"
            ? styles.tagConcept
            : tone === "archief"
              ? styles.tagArchief
              : styles.tagDone;
        const iconClass =
          tone === "concept"
            ? styles.docIconConcept
            : tone === "archief"
              ? styles.docIconArchief
              : styles.docIconDone;
        const toggle = isConcept ? () => setOpen((v) => !v) : undefined;
        return (
          <div key={o.nr}>
            <div
              className={`${styles.row} ${isConcept ? styles.concept : ""}`}
              onClick={toggle}
              role={isConcept ? "button" : undefined}
              tabIndex={isConcept ? 0 : undefined}
              aria-expanded={isConcept ? open : undefined}
              onKeyDown={
                isConcept
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen((v) => !v);
                      }
                    }
                  : undefined
              }
            >
              <span className={`${styles.docIcon} ${iconClass}`}>
                <FileText size={18} strokeWidth={2} />
              </span>
              <div className={styles.rowMain}>
                <div className={styles.rowTop}>
                  <span className={styles.nr}>{o.nr}</span>
                  <span className={`${styles.tag} ${tagClass}`}>{o.label}</span>
                </div>
                <div className={styles.rowSub}>{o.sub}</div>
              </div>
              <span className={styles.totaal}>
                {isConcept && liveTotaal ? liveTotaal : o.totaal}
              </span>
              {isConcept ? (
                <span className={styles.openBtn}>
                  {open ? "Sluit" : "Open"}
                  {open ? (
                    <ChevronDown size={14} strokeWidth={2.6} />
                  ) : (
                    <ChevronRight size={14} strokeWidth={2.6} />
                  )}
                </span>
              ) : null}
            </div>

            {/* Concept uitgeklapt: de inline editor (bewerkt regels/korting/
                geldigheid en slaat debounced op via saveOfferteForm). */}
            {isConcept && open ? (
              <OfferteEditor
                leadId={leadId}
                form={data.offerteForm}
                onTotaal={setLiveTotaal}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
