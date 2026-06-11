import styles from "./PhotoPlaceholder.module.css";

interface PhotoPlaceholderProps {
  /** Mono-label rechtsonder in de placeholder. */
  tag: string;
  /** Hoogte in px (chart-geometrie, dus inline). */
  height?: number;
}

/** Gestreepte foto-placeholder met mono-label (port van DosFoto). Vervangt
 *  later echte klantfoto's uit de uploads. */
export function PhotoPlaceholder({ tag, height = 88 }: PhotoPlaceholderProps) {
  return (
    <div className={styles.photo} style={{ height }}>
      <span className={styles.tag}>{tag}</span>
    </div>
  );
}
