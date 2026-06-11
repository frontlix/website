// ─────────────────────────────────────────────────────────────────────
// Mappers: echte afspraken (Appointment uit de leads-tabel) → de v2
// Agenda-component-props (AgendaDag[] / AgendaItem). Vervangt de
// AGENDA_WEEK-demo op de lees-kant. Hergebruikt exact de bestaande
// agenda-helpers (agenda-week, agenda-event, appointment-instant) zodat de
// dag-keys, tijden en duur-schatting identiek zijn aan de (app)-agenda.
//
// Prop-vormen van de componenten blijven gelijk: AgendaItem krijgt alleen
// extra OPTIONELE velden (leadId/telefoon/adres) die de demo-componenten
// negeren, maar die de detail-/route-modal gebruiken om naar de echte lead
// te linken en de echte contactgegevens te tonen.
// ─────────────────────────────────────────────────────────────────────

import type { Appointment } from "@/lib/dashboard/agenda-queries";
import { buildWeekDays, toAmsterdamDayKey } from "@/lib/dashboard/agenda-week";
import {
  estimateDurationMinutes,
  formatHHmm,
  formatM2,
} from "@/lib/dashboard/agenda-event";
import type { AgendaDag, AgendaItem, AgendaType } from "./agenda-data";
import { EMPTY_DUUR } from "./agenda-data";

/** Korte NL-weekdag (zelfde stijl als de demo: Ma/Di/Wo …). */
const WEEKDAY_SHORT = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

/** Duur (minuten) → compact label "1u" / "90m" / "2u30m". */
function durationLabel(minutes: number): string {
  if (minutes <= 0) return EMPTY_DUUR;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}u`;
  return `${h}u${m}m`;
}

/**
 * Type/accentkleur van een afspraak. De leads-tabel kent geen
 * plaatsbezoek/klus-onderscheid, dus we mappen op dashboard_status:
 * afgehandeld → klus (groen, klaar), no_show → intern (grijs), anders →
 * bezoek (cyaan, open). Dit volgt de tone-logica van appointmentTone().
 */
function appointmentType(a: Appointment): AgendaType {
  if (a.dashboard_status === "no_show") return "intern";
  return "klus";
}

/** Adres uit straat/huisnummer/plaats (alleen aanwezige delen). */
function appointmentAdres(a: Appointment): string {
  const parts: string[] = [];
  if (a.straat && a.huisnummer) parts.push(`${a.straat} ${a.huisnummer}`);
  else if (a.straat) parts.push(a.straat);
  if (a.plaats) parts.push(a.plaats);
  return parts.join(", ");
}

/** Sub-regel: plaats + m² + hoofdcategorie, zoals de upcoming-card. */
function subLabel(a: Appointment): string {
  const bits: string[] = [];
  if (a.plaats) bits.push(a.plaats);
  const m2 = formatM2(a.m2);
  if (m2) bits.push(m2);
  if (a.hoofdcategorie) bits.push(a.hoofdcategorie);
  return bits.join(" · ");
}

/** Eén echte afspraak → AgendaItem (met optionele lead-context). */
export function mapAppointmentToItem(a: Appointment): AgendaItem {
  const iso = a.afspraak_geboekt_op as string; // gegarandeerd door caller-filter
  const tijd = formatHHmm(iso);
  const durMin = estimateDurationMinutes(a);
  const naam = a.naam ?? "Onbekend";

  return {
    tijd,
    duur: durationLabel(durMin),
    titel: `Klus · ${naam}`,
    sub: subLabel(a) || naam,
    plaats: a.plaats ?? "",
    type: appointmentType(a),
    klaar: a.dashboard_status === "afgehandeld",
    // Extra (optioneel) — de detail/route-modal gebruikt deze voor de echte
    // lead-link en contactgegevens; de demo-componenten negeren ze.
    leadId: a.lead_id,
    telefoon: a.telefoon ?? "",
    adres: appointmentAdres(a),
  };
}

/**
 * Map de afspraken van een week (UTC-range met buffer) naar exact 7
 * AgendaDag-kolommen (ma–zo), gefilterd op de Amsterdam-dagkeys van de week.
 * Items per dag op tijd gesorteerd.
 */
export function mapWeekToAgendaDays(
  mondayKey: string,
  appointments: Appointment[],
): AgendaDag[] {
  const days = buildWeekDays(mondayKey);
  const byKey = new Map<string, AgendaItem[]>();
  for (const day of days) byKey.set(day.key, []);

  for (const a of appointments) {
    if (!a.afspraak_geboekt_op) continue;
    const dayKey = toAmsterdamDayKey(a.afspraak_geboekt_op);
    const bucket = byKey.get(dayKey);
    if (!bucket) continue; // valt buiten de 7 zichtbare dagen (buffer-rij)
    bucket.push(mapAppointmentToItem(a));
  }

  return days.map((day) => {
    const items = (byKey.get(day.key) ?? []).sort((x, y) =>
      x.tijd.localeCompare(y.tijd),
    );
    return {
      dag: WEEKDAY_SHORT[day.date.getDay()],
      datum: String(day.date.getDate()),
      vandaag: day.isToday,
      items,
    };
  });
}
