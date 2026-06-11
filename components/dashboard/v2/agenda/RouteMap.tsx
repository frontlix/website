import { Bus } from "lucide-react";
import styles from "./RouteMap.module.css";

interface RouteMapProps {
  reistijd: string;
}

/** Mini-routekaart: raster + gestippelde route + pin (port van PRouteKaart).
 *  De SVG-geometrie is statisch, dus geen inline style nodig. */
export function RouteMap({ reistijd }: RouteMapProps) {
  return (
    <div className={styles.map}>
      <svg viewBox="0 0 480 170" width="100%" height="170" className={styles.svg}>
        <defs>
          <pattern id="agenda-route-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M 26 0 L 0 0 0 26" fill="none" stroke="rgba(33,42,69,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="480" height="170" fill="url(#agenda-route-grid)" />
        <path
          d="M 40 130 Q 150 105 240 85 Q 330 65 440 35"
          fill="none"
          stroke="var(--rb-blue)"
          strokeWidth="3"
          strokeDasharray="5 7"
          opacity="0.85"
          strokeLinecap="round"
        />
        <circle cx="40" cy="130" r="7" fill="#fff" stroke="var(--rb-blue)" strokeWidth="3" />
        <circle cx="440" cy="35" r="11" fill="var(--rb-blue)" />
        <circle cx="440" cy="35" r="11" fill="none" stroke="#fff" strokeWidth="2.5" />
        <path d="M 440 24 L 443 33 L 440 42 L 437 33 Z" fill="#fff" />
      </svg>
      <span className={styles.tagStart}>Werkplaats → klant</span>
      <span className={styles.tagRide}>
        <Bus size={12} strokeWidth={2.4} />
        {reistijd} · 24 km
      </span>
    </div>
  );
}
