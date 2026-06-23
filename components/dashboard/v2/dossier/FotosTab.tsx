"use client";

import { useState } from "react";
import { Camera, Check } from "lucide-react";
import type { DossierData } from "./dossier-data";
import { DOSSIER } from "./dossier-data";
import { PhotoPlaceholder } from "./PhotoPlaceholder";
import { PhotoLightbox } from "./PhotoLightbox";
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
  /** Index van de foto die groot in de lightbox open staat (null = dicht). */
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const vraag = () => {
    if (gevraagd) return;
    onVraagFotos();
    setGevraagd(true);
  };

  const open = openIndex !== null ? data.fotos[openIndex] : null;

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
          <button
            type="button"
            className={styles.vraagBtn}
            onClick={vraag}
            disabled
            title="Binnenkort beschikbaar"
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          >
            <Camera size={13} strokeWidth={2.2} />
            Vraag om meer foto&apos;s (binnenkort)
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {data.fotos.map((f, i) =>
          f.url ? (
            <button
              key={i}
              type="button"
              className={styles.tile}
              onClick={() => setOpenIndex(i)}
              aria-label={`Foto ${f.tag} groot bekijken`}
            >
              <PhotoPlaceholder tag={f.tag} url={f.url} height={180} fit="contain" />
            </button>
          ) : (
            <PhotoPlaceholder key={i} tag={f.tag} url={f.url} height={180} fit="contain" />
          ),
        )}
      </div>

      <div className={styles.hint}>Foto&apos;s komen automatisch op de offerte te staan.</div>

      <PhotoLightbox url={open?.url} alt={open?.tag} onClose={() => setOpenIndex(null)} />
    </div>
  );
}
