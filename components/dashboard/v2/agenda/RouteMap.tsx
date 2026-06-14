"use client";

import dynamic from "next/dynamic";
import { Bus } from "lucide-react";
import type { RouteBase } from "./agenda-data";
import styles from "./RouteMap.module.css";

// De live Google Maps-kaart wordt UITSLUITEND client-side geladen (ssr: false):
// @vis.gl/react-google-maps rendert niet server-side en zou anders de
// server-rendering van de agenda laten klappen. De SVG-fallback hieronder
// SSRt wél gewoon, dus de pagina rendert altijd.
const LiveRouteMap = dynamic(() => import("./LiveRouteMap"), { ssr: false });

interface RouteMapProps {
  /** Geschatte rijtijd (bv. "~25 min"). Leeg = niet tonen. */
  reistijd?: string;
  /** Reisafstand (bv. "172 km", uit afstand_km). Leeg = niet tonen. */
  afstand?: string;
  /** Klant-coördinaten (uit de lead). Ontbreekt → schematische SVG-fallback. */
  klant?: { lat: number | null | undefined; lng: number | null | undefined } | null;
  /** Vertrekadres/werkplaats. Ontbreekt → schematische SVG-fallback. */
  base?: RouteBase | null;
}

/** Mini-routekaart. Met Google Maps-config én klant/werkplaats-coördinaten:
 *  een echte, live route over de weg van de werkplaats naar de klant (client-
 *  side geladen). Anders (geen API-key/Map-ID, geen coördinaten, of demo): de
 *  schematische SVG-fallback met de afstand-chip. */
export function RouteMap({ reistijd, afstand, klant, base }: RouteMapProps) {
  const chip = [reistijd, afstand].filter(Boolean).join(" · ");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  const kLat = klant?.lat;
  const kLng = klant?.lng;
  const kanLive =
    Boolean(apiKey && mapId) &&
    typeof kLat === "number" &&
    Number.isFinite(kLat) &&
    typeof kLng === "number" &&
    Number.isFinite(kLng) &&
    !!base &&
    Number.isFinite(base.lat) &&
    Number.isFinite(base.lng);

  return (
    <div className={styles.map}>
      {kanLive ? (
        <LiveRouteMap
          apiKey={apiKey as string}
          mapId={mapId as string}
          oLat={base!.lat}
          oLng={base!.lng}
          dLat={kLat as number}
          dLng={kLng as number}
        />
      ) : (
        <RouteSvgFallback />
      )}
      <span className={styles.tagStart}>Werkplaats → klant</span>
      {chip ? (
        <span className={styles.tagRide}>
          <Bus size={12} strokeWidth={2.4} />
          {chip}
        </span>
      ) : null}
    </div>
  );
}

/** Schematische SVG-fallback: raster + gestippelde route + pin (port van
 *  PRouteKaart). Gebruikt als er geen Google Maps-config of coördinaten zijn. */
function RouteSvgFallback() {
  return (
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
  );
}
