"use client";

import type { RefObject } from "react";
import { FileText } from "lucide-react";
import type { DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import type { OfferteEditorApi } from "./OfferteEditor";
import dynamic from "next/dynamic";
import styles from "./OffertesTab.module.css";

// De OfferteEditor (~1100 regels, client-only) lazy laden, zodat hij niet in de
// initiële JS-bundle van de (zware) dossier-pagina zit. ssr:false: de editor
// rendert toch al client-side, zo verschijnt het dossier sneller en laadt de
// editor in een apart chunk erna.
const OfferteEditor = dynamic(
  () => import("./OfferteEditor").then((m) => m.OfferteEditor),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: "16px", opacity: 0.6, fontSize: "13px" }}>
        Editor laden…
      </div>
    ),
  },
);

interface OffertesTabProps {
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
  /** Echte lead_id ⇒ de inline editor slaat live op. Zonder = demo (inert). */
  leadId?: string;
  /** Ref voor de editor-flush, doorgegeven aan de "Offerte versturen"-knop in
   *  de dossier-kop (zodat die de laatste wijzigingen kan wegschrijven). */
  offerteApiRef?: RefObject<OfferteEditorApi | null>;
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
export function OffertesTab({ data = DOSSIER, leadId, offerteApiRef }: OffertesTabProps) {
  // De editor staat ALTIJD onderaan (gelijk aan mobiel): hij laadt de huidige
  // offerte-inhoud en bewerken+opslaan schrijft naar het concept (nieuwe
  // versie), ook als er nu nog geen concept maar alleen een verstuurde offerte
  // is. In de lijst erboven tonen we daarom alleen de NIET-concept-offertes
  // (verstuurd/archief) als alleen-lezen versie-rijen; het concept zelf is de
  // editor.
  const lijst = data.offertes.filter((o) => !o.concept);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className="rb-section-label">Offertes voor deze lead</span>
        <button
          type="button"
          className={styles.newLink}
          onClick={openOfferteWizard}
        >
          + Nieuwe offerte
        </button>
      </div>

      {lijst.map((o) => {
        // Kleur-toon per offerte: archief (geweigerd/verlopen) = grijs, anders
        // verstuurd = groen. Concepten staan niet in deze lijst.
        const tone = o.tone ?? "verstuurd";
        const tagClass = tone === "archief" ? styles.tagArchief : styles.tagDone;
        const iconClass =
          tone === "archief" ? styles.docIconArchief : styles.docIconDone;
        return (
          <div key={o.nr} className={styles.row}>
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
            <span className={styles.totaal}>{o.totaal}</span>
          </div>
        );
      })}

      {/* De editor staat altijd onderaan en bewerkt het (te maken) concept. */}
      <OfferteEditor
        leadId={leadId}
        form={data.offerteForm}
        offertes={data.offertes}
        fotosCount={data.fotos.length}
        apiRef={offerteApiRef}
      />
    </div>
  );
}
