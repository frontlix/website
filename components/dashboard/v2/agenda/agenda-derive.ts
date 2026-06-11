// Kleine afleidingen uit de afspraak-titel/sub voor de detail- en
// route-modals (port van de inline-logica in PAgenda). Wanneer de echte
// lead-context op het item gezet is (door agenda-mappers), gebruiken we die;
// anders vallen we terug op de demo-afleiding uit titel/plaats.

import type { AgendaItem } from "./agenda-data";

/**
 * Stabiele unieke sleutel van een item voor React-keys en selectie-/afvink-
 * matching. Live-items dragen `key` (= lead_id) vanuit de mapper; demo-items
 * vallen terug op `${dag}-${tijd}-${index}`. Niet op tijd alleen keyen: echte
 * data kan twee afspraken op dezelfde dag/tijd hebben (dubbele React-keys).
 */
export function itemKey(item: AgendaItem, dag: string, index: number): string {
  return item.key ?? `${dag}-${item.tijd}-${index}`;
}

/** Klantnaam uit de titel "Klus · Naam" (deel na de punt-separator). */
export function klantNaam(item: AgendaItem): string {
  return (item.titel.split("·")[1] || item.titel).trim();
}

/** Initiaal voor de klant-avatar in het detail. */
export function klantInitiaal(item: AgendaItem): string {
  const naam = (item.titel.split("·")[1] || "K").trim();
  return naam.charAt(0) || "K";
}

/** Plaats van de afspraak (los veld; de sub-regel zet de plaats nu eens
 *  voor, dan weer achter de punt-separator, dus niet betrouwbaar af te leiden). */
export function klantPlaats(item: AgendaItem): string {
  return item.plaats.trim();
}

/** Adres: echt adres uit de lead-context indien aanwezig, anders demo. */
export function klantAdres(item: AgendaItem): string {
  if (item.adres && item.adres.trim()) return item.adres.trim();
  const t = item.titel;
  if (t.includes("Janssen")) return "Berkenweg 8, Hilversum";
  if (t.includes("Bakker")) return "Dorpsstraat 41, Amersfoort";
  if (t.includes("Vermeulen")) return "Eikenlaan 3, Soest";
  return "Lindelaan 24, Utrecht";
}

/** Telefoon: echt nummer uit de lead-context indien aanwezig, anders demo. */
export function klantTelefoon(item: AgendaItem): string {
  if (item.telefoon && item.telefoon.trim()) return item.telefoon.trim();
  return KLANT_TELEFOON;
}

export const KLANT_TELEFOON = "06 - 98 76 54 32";
