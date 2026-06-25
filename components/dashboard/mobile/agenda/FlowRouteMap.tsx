'use client'

// FlowRouteMap, mobiele routekaart voor de afspraak-details. Toont een ECHTE
// Google Maps-route (werkplaats → klant) wanneer dat kan (env-keys gezet +
// klant-coördinaten + werkplaats-coördinaten, exact dezelfde kanLive-conditie
// als de desktop RouteMap). Anders valt het terug op het bestaande statische
// SVG-kaartje (FMiniMap). De live LiveRouteMap-component wordt hergebruikt van
// de desktop (die hangt niet aan v2-UI), met een eigen mobiele wrapper/hoogte.

import dynamic from 'next/dynamic'
import type { RouteBase } from '@/components/dashboard/v2/agenda/agenda-data'
import { FMiniMap } from './FlowAtoms'
import styles from './FlowRouteMap.module.css'

// De live kaart laadt UITSLUITEND client-side (ssr:false): @vis.gl/react-google-
// maps rendert niet server-side. De SVG-fallback rendert wél altijd.
const LiveRouteMap = dynamic(
  () => import('@/components/dashboard/v2/agenda/LiveRouteMap'),
  { ssr: false },
)

type FlowRouteMapProps = {
  /** Label voor de SVG-fallback-chip (bv. "6 km" of "6 km · 9 min"). */
  label: string
  /** Klant-coördinaten (uit de lead). Ontbreken → SVG-fallback. */
  lat?: number | null
  lng?: number | null
  /** Werkplaats-basis. Ontbreekt → SVG-fallback. */
  base?: RouteBase | null
}

export function FlowRouteMap({ label, lat, lng, base }: FlowRouteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

  const kanLive =
    Boolean(apiKey && mapId) &&
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    !!base &&
    Number.isFinite(base.lat) &&
    Number.isFinite(base.lng)

  if (!kanLive) {
    // Geen live-route mogelijk → het bestaande statische kaartje.
    return <FMiniMap label={label} />
  }

  return (
    <div className={styles.map}>
      <LiveRouteMap
        apiKey={apiKey as string}
        mapId={mapId as string}
        oLat={base!.lat}
        oLng={base!.lng}
        dLat={lat as number}
        dLng={lng as number}
      />
      {label ? <div className={styles.label}>{label}</div> : null}
    </div>
  )
}
