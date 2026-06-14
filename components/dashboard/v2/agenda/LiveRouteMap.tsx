"use client";

import { useEffect } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import styles from "./RouteMap.module.css";

export interface LiveRouteMapProps {
  apiKey: string;
  mapId: string;
  /** Werkplaats (origin) + klant (destination), beide gevalideerde coords. */
  oLat: number;
  oLng: number;
  dLat: number;
  dLng: number;
}

/** De échte Google Maps-route (werkplaats → klant). Wordt UITSLUITEND client-side
 *  geladen (next/dynamic ssr:false in RouteMap), want @vis.gl/react-google-maps
 *  rendert niet server-side. */
export default function LiveRouteMap({ apiKey, mapId, oLat, oLng, dLat, dLng }: LiveRouteMapProps) {
  return (
    <APIProvider apiKey={apiKey}>
      <GoogleMap
        mapId={mapId}
        defaultCenter={{ lat: (oLat + dLat) / 2, lng: (oLng + dLng) / 2 }}
        defaultZoom={9}
        gestureHandling="cooperative"
        disableDefaultUI
        className={styles.live}
      >
        <RouteLine oLat={oLat} oLng={oLng} dLat={dLat} dLng={dLng} />
      </GoogleMap>
    </APIProvider>
  );
}

/** Tekent één echte route (werkplaats → klant) over de weg via de Directions-
 *  service van Google en past de viewport aan. */
function RouteLine({
  oLat,
  oLng,
  dLat,
  dLng,
}: {
  oLat: number;
  oLng: number;
  dLat: number;
  dLng: number;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  useEffect(() => {
    if (!map || !routesLib) return;
    const service = new routesLib.DirectionsService();
    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: "#1a56ff",
        strokeWeight: 4,
        strokeOpacity: 0.9,
      },
    });

    service.route(
      {
        origin: { lat: oLat, lng: oLng },
        destination: { lat: dLat, lng: dLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          renderer.setDirections(result);
        }
      },
    );

    return () => {
      renderer.setMap(null);
    };
  }, [map, routesLib, oLat, oLng, dLat, dLng]);

  return null;
}
