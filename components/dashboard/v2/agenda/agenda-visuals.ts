// Visuele mapping voor afspraaktypes: accentkleur (token) + Lucide-icoon.
// Houd dit gescheiden van de data zodat de kleurlogica op een plek staat.

import { Hammer, MapPin, Clock3, Phone, type LucideIcon } from "lucide-react";
import type { AgendaType } from "./agenda-data";

/** CSS-token voor de accentkleur (ink) per type (links streepje, legenda-stip,
 *  tekst-/tijd-kleur op de gekleurde kaartjes). */
export function typeColorVar(type: AgendaType): string {
  switch (type) {
    case "klus":
      return "var(--rb-agenda-klus-ink)";
    case "bezoek":
      return "var(--rb-agenda-bezoek-ink)";
    case "deadline":
      return "var(--rb-agenda-deadline-ink)";
    default:
      // intern/belafspraak: neutraal grijs-blauw (status-sent).
      return "var(--rb-status-sent-ink)";
  }
}

/** CSS-token voor de zachte achtergrond per type (gevulde afspraak-kaartjes). */
export function typeBgVar(type: AgendaType): string {
  switch (type) {
    case "klus":
      return "var(--rb-agenda-klus-bg)";
    case "bezoek":
      return "var(--rb-agenda-bezoek-bg)";
    case "deadline":
      return "var(--rb-agenda-deadline-bg)";
    default:
      return "var(--rb-status-sent-bg)";
  }
}

/** Lucide-icoon dat de betekenis van het type draagt. */
export function typeIcon(type: AgendaType): LucideIcon {
  switch (type) {
    case "klus":
      return Hammer;
    case "bezoek":
      return MapPin;
    case "deadline":
      return Clock3;
    default:
      return Phone;
  }
}

/** Legenda-rijtjes (label + kleur) voor de kop. */
export const AGENDA_LEGENDA: { label: string; type: AgendaType }[] = [
  { label: "Klus", type: "klus" },
  { label: "Bezoek", type: "bezoek" },
  { label: "Deadline", type: "deadline" },
];
