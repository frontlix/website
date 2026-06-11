"use client";

import { useState } from "react";
import { Camera, Check } from "lucide-react";
import type { DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import styles from "./FotosTab.module.css";

interface FotosTabProps {
  /** Voegt een Surface-bericht aan de chat toe ("vraag om meer foto's"). */
  onVraagFotos: () => void;
  /** Echte dossier-data; zonder = demo-fallback (DOSSIER). */
  data?: DossierData;
}

/** Foto's-tab: 2x2 grid + de "vraag om meer foto's"-link die eenmalig een
 *  Surface-bericht naar de chat stuurt. */
export function FotosTab({ onVraagFotos, data = DOSSIER }: FotosTabProps) {
  const [gevraagd, setGevraagd] = useState(false);

  const vraag = () => {
    if (gevraagd) return;
    onVraagFotos();
    setGevraagd(true);
  };

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className="rb-section-label">Foto&apos;s van de klant · uit WhatsApp</span>
        {gevraagd ? (
          <span className={styles.verstuurd}>
            <Check size={13} strokeWidth={2.6} />
            Verzoek verstuurd via WhatsApp
          </span>
        ) : (
          <button type="button" className={styles.vraagBtn} onClick={vraag}>
            <Camera size={13} strokeWidth={2.2} />
            Vraag om meer foto&apos;s
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {data.fotos.map((f) => (
          <PhotoPlaceholder key={f} tag={f} height={130} />
        ))}
      </div>

      <div className={styles.hint}>Foto&apos;s komen automatisch op de offerte te staan.</div>
    </div>
  );
}
