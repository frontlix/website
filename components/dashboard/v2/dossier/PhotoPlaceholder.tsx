import Image from "next/image";
import styles from "./PhotoPlaceholder.module.css";

interface PhotoPlaceholderProps {
  /** Mono-label rechtsonder in de foto/placeholder. */
  tag: string;
  /** Echte Supabase public_url; ontbreekt, dan blijft alleen de streep. */
  url?: string | null;
  /** Hoogte in px (chart-geometrie, dus inline). */
  height?: number;
  /** Hoe de foto de tegel vult. "cover" (default) snijdt bij, "contain" toont
   *  de hele foto met letterboxing. */
  fit?: "cover" | "contain";
}

/** Foto-tegel: toont de echte klantfoto (Supabase public_url) over een
 *  gestreepte placeholder-achtergrond. Zonder url blijft alleen de streep,
 *  zodat nog-niet-geladen of ontbrekende foto's netjes ogen. */
export function PhotoPlaceholder({ tag, url, height = 88, fit = "cover" }: PhotoPlaceholderProps) {
  return (
    <div className={styles.photo} style={{ height }}>
      {url ? (
        // unoptimized: zelfde aanpak als het oude dashboard en de mobiele
        // dossier, zodat geen next/image-domeinconfig (images.remotePatterns)
        // nodig is voor de Supabase-storage-URL's.
        <Image
          src={url}
          alt={tag}
          fill
          sizes="(max-width: 900px) 50vw, 220px"
          unoptimized
          className={styles.photoImg}
          style={{ objectFit: fit }}
        />
      ) : null}
      <span className={styles.tag}>{tag}</span>
    </div>
  );
}
