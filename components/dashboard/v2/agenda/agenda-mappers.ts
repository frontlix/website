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
import type { GridCell } from "@/lib/dashboard/calendar";
import {
  estimateDurationMinutes,
  formatHHmm,
  formatM2,
} from "@/lib/dashboard/agenda-event";
import type { AgendaDag, AgendaItem, AgendaType, AgendaMaandCel, KlusInfo } from "./agenda-data";
import { EMPTY_DUUR, AGENDA_MONTH, AGENDA_WEEK } from "./agenda-data";
import { isJaWaarde } from "./agenda-derive";

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

/** Klus-details (m², soort, conditie) uit de lead. Undefined als er niets is. */
function buildKlusInfo(a: Appointment): KlusInfo | undefined {
  const m2 =
    a.m2 != null && Number.isFinite(Number(a.m2)) ? Number(a.m2) : undefined;
  const subDiensten =
    Array.isArray(a.sub_diensten) && a.sub_diensten.length
      ? a.sub_diensten
      : undefined;
  const categorie = a.hoofdcategorie || undefined;
  const groeneAanslag = isJaWaarde(a.groene_aanslag) || undefined;
  const plantenAfschermen = isJaWaarde(a.planten_afschermen) || undefined;

  if (!categorie && !m2 && !subDiensten && !groeneAanslag && !plantenAfschermen) {
    return undefined;
  }
  return { categorie, m2, subDiensten, groeneAanslag, plantenAfschermen };
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
    afstandKm:
      a.afstand_km != null && Number.isFinite(Number(a.afstand_km))
        ? Number(a.afstand_km)
        : undefined,
    // Klant-coördinaten voor de live routekaart (de query levert lat/lng al).
    lat: a.lat ?? null,
    lng: a.lng ?? null,
    klusInfo: buildKlusInfo(a),
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

/**
 * Demo-week voor de dev-preview (geen sessie): bouwt de 7 dagen uit het
 * navigeerbare week-param (echte datums + vandaag-markering) en legt de
 * demo-afspraken alleen op de week die vandaag bevat. Zo werkt de week-
 * navigatie ook zonder sessie zichtbaar (andere weken zijn leeg, met de juiste
 * datums + label). AGENDA_WEEK is Ma..Za (index 0..5); zondag blijft leeg.
 */
export function buildDemoWeek(mondayKey: string): AgendaDag[] {
  const days = buildWeekDays(mondayKey);
  const bevatVandaag = days.some((d) => d.isToday);
  return days.map((d, i) => ({
    dag: WEEKDAY_SHORT[d.date.getDay()],
    datum: String(d.date.getDate()),
    vandaag: d.isToday,
    items: bevatVandaag ? AGENDA_WEEK[i]?.items ?? [] : [],
  }));
}

/** Zondag = vrije dag (toont het "Vrij"-label in het maandrooster). De dateKey
 *  is een UTC-dag (uit getMonthGrid), dus getUTCDay() geeft de juiste weekdag. */
function isVrijeDag(dateKey: string): boolean {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay() === 0;
}

/**
 * Map de maand-grid-cellen (getMonthGrid) + de maand-afspraken naar
 * AgendaMaandCel[]. Afspraken komen op hun Amsterdam-dagkey in de juiste cel
 * en worden op tijd gesorteerd. Cellen buiten de getoonde maand blijven leeg
 * (gedimd voor-/naloop), net als in het ontwerp.
 */
export function mapMonthToCells(
  cells: GridCell[],
  appointments: Appointment[],
): AgendaMaandCel[] {
  const byKey = new Map<string, AgendaItem[]>();
  for (const a of appointments) {
    if (!a.afspraak_geboekt_op) continue;
    const key = toAmsterdamDayKey(a.afspraak_geboekt_op);
    const list = byKey.get(key) ?? [];
    list.push(mapAppointmentToItem(a));
    byKey.set(key, list);
  }
  for (const list of byKey.values()) {
    list.sort((x, y) => x.tijd.localeCompare(y.tijd));
  }

  return cells.map((c) => ({
    dateKey: c.dateKey,
    dag: c.dayOfMonth,
    inMaand: c.isCurrentMonth,
    vandaag: c.isToday,
    verleden: c.isPast,
    vrij: isVrijeDag(c.dateKey),
    items: c.isCurrentMonth ? byKey.get(c.dateKey) ?? [] : [],
  }));
}

/**
 * Demo-variant van mapMonthToCells: legt de AGENDA_MONTH-demo (op dag-van-de-
 * maand) over de in-maand-cellen. Gebruikt in de dev-preview zonder sessie.
 */
export function buildDemoMonthCells(cells: GridCell[]): AgendaMaandCel[] {
  return cells.map((c) => ({
    dateKey: c.dateKey,
    dag: c.dayOfMonth,
    inMaand: c.isCurrentMonth,
    vandaag: c.isToday,
    verleden: c.isPast,
    vrij: isVrijeDag(c.dateKey),
    items: c.isCurrentMonth ? AGENDA_MONTH[c.dayOfMonth] ?? [] : [],
  }));
}
