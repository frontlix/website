"use client";

import Image from "next/image";
import { Modal } from "@/components/dashboard/v2/ui";
import styles from "./PhotoLightbox.module.css";

interface PhotoLightboxProps {
  /** Supabase public_url van de te tonen foto; null/leeg = dicht. */
  url?: string | null;
  /** Alt-tekst (mono-tag van de foto). */
  alt?: string;
  /** Sluiten (overlay-klik, Esc of kruisje, afgehandeld door Modal). */
  onClose: () => void;
}

/** Lightbox voor een klantfoto: dunne wrapper rond de v2-Modal die de foto
 *  groot en volledig (object-fit: contain) gecentreerd toont. Hergebruikt de
 *  overlay, klik-ernaast, Esc en het kruisje van Modal. */
export function PhotoLightbox({ url, alt = "Foto", onClose }: PhotoLightboxProps) {
  const open = Boolean(url);

  return (
    <Modal open={open} onClose={onClose} width={1100} label={alt}>
      {url ? (
        <div className={styles.frame}>
          {/* unoptimized: zelfde aanpak als PhotoPlaceholder, zodat geen
              next/image-domeinconfig nodig is voor de Supabase-URL's. De
              .img-CSS begrenst echt op 85vw/85vh met object-fit: contain. */}
          <Image
            src={url}
            alt={alt}
            width={1600}
            height={1200}
            unoptimized
            className={styles.img}
          />
        </div>
      ) : null}
    </Modal>
  );
}
