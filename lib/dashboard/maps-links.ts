// ─────────────────────────────────────────────────────────────────────
// Google Maps-deeplinks voor een klantlocatie (officiele Maps URL-API).
//
// Doel: vanuit het leaddossier de locatie van de klant openen in Street View
// (hoe ziet het terras/de voorkant eruit) en in satelliet/bovenaanzicht
// (handig om de m2 bestrating/terras te schatten). Bouwt op de geocode-
// coordinaten (lat/lng) als die er zijn (precies); zonder coordinaten valt 'ie
// terug op een gewone Maps-zoeklink op het tekstadres (Street View/satelliet
// laten zich niet forceren zonder coordinaten).
//
// Conventie gespiegeld van de bestaande maps-links in de codebase: officiele
// google.com/maps URL-API + encodeURIComponent. Geen API-key nodig (deeplinks).
// ─────────────────────────────────────────────────────────────────────

export interface MapsLink {
  label: string;
  href: string;
}

/** Street View (panorama) op exacte coordinaten. Null zonder coordinaten. */
export function streetViewHref(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

/** Satelliet/bovenaanzicht, ingezoomd op de coordinaten. Null zonder coordinaten. */
export function satelliteHref(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lng}&zoom=20&basemap=satellite`;
}

/** Gewone Maps-zoeklink op het tekstadres (fallback zonder coordinaten). */
export function mapsSearchHref(adres: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres)}`;
}

/**
 * De locatie-linkjes die we bij een klantadres tonen:
 *  - met coordinaten: Street View + Satelliet (precies op het pand);
 *  - zonder coordinaten maar met adres: een enkele "Open in Maps" op het adres;
 *  - zonder allebei: geen linkjes.
 */
export function locatieLinks(opts: {
  lat: number | null | undefined;
  lng: number | null | undefined;
  adres: string;
  heeftAdres: boolean;
}): MapsLink[] {
  const sv = streetViewHref(opts.lat, opts.lng);
  const sat = satelliteHref(opts.lat, opts.lng);
  if (sv && sat) {
    return [
      { label: "Street View", href: sv },
      { label: "Satelliet", href: sat },
    ];
  }
  if (opts.heeftAdres) {
    return [{ label: "Open in Maps", href: mapsSearchHref(opts.adres) }];
  }
  return [];
}
