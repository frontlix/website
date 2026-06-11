import { Sparkles, Pause } from "lucide-react";
import styles from "./SurfaceStrip.module.css";

interface SurfaceStripProps {
  /** Fase-label (UPPERCASE) achter "Surface ·". */
  fase: string;
  /** Wat Surface nu doet. */
  actie: string;
  /** Pauzeer-klik (zet Surface uit voor dit gesprek). */
  onPause?: () => void;
}

/** Surface-statusstrip met gradient-rand. Toont de fase + de actie en een
 *  pauzeer-knop (port van DosSurface, compacte variant). */
export function SurfaceStrip({ fase, actie, onPause }: SurfaceStripProps) {
  return (
    <div className={styles.strip}>
      <div className={styles.icon}>
        <Sparkles size={15} strokeWidth={2.4} />
      </div>
      <div className={styles.body}>
        <div className={styles.kicker}>Surface · {fase}</div>
        <div className={styles.actie}>{actie}</div>
      </div>
      <button type="button" className={styles.pause} onClick={onPause}>
        <Pause size={12} strokeWidth={2.4} />
        Pauzeer
      </button>
    </div>
  );
}
