// Visuele mapping voor afspraaktypes: accentkleur (token) + Lucide-icoon.
// Houd dit gescheiden van de data zodat de kleurlogica op een plek staat.

import { Hammer, MapPin, Clock3, Phone, type LucideIcon } from "lucide-react";
import type { AgendaType } from "./agenda-data";

/** CSS-token voor de accentkleur per type (links streepje + legenda-stip). */
export function typeColorVar(type: AgendaType): string {
  switch (type) {
    case "klus":
      return "var(--rb-success)";
    case "bezoek":
      return "var(--rb-cyan)";
    case "deadline":
      return "var(--rb-blue)";
    default:
      return "var(--rb-muted)";
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
