import { parseWeekParam, shiftWeekKey, currentMondayKey } from '@/lib/dashboard/agenda-week'
import { getAppointmentsForRange, getAppointmentsForMonth } from '@/lib/dashboard/agenda-queries'
import { getExternalEventsForRange, getExternalEventsForMonth } from '@/lib/dashboard/external-events-queries'
import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { parseMonthParam, getMonthGrid, type MonthRef } from '@/lib/dashboard/calendar'
import { getTenantBase, DEFAULT_TENANT_BASE } from '@/lib/dashboard/tenant-base'
import { MobileAgenda, type MobileAgendaData } from '@/components/dashboard/mobile/agenda/MobileAgenda'
import type { KlantOptie } from '@/components/dashboard/v2/agenda/KlantSelect'
import { mapMonthToCells, mergeExternalIntoMonth } from '@/components/dashboard/v2/agenda/agenda-mappers'
import {
  mapAppointmentsToAgendaEvents,
  mapExternalEventsToAgendaEvents,
  buildMobileWeekDays,
  amsterdamDayKey,
  amsterdamTime,
} from '@/components/dashboard/mobile/agenda/agenda-mobile-mappers'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/** MonthRef → '?month='-key (YYYY-MM). */
function monthKey(ref: MonthRef): string {
  return `${ref.year}-${String(ref.month).padStart(2, '0')}`
}

/** Eerste letter naar hoofdletter (NL maand-label: "juni 2026" → "Juni 2026"). */
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams

  // ── Mobiele agenda: echte afspraken van de (huidige) week ──
  // Eigen fetch los van de desktop-view zodat de mobiele tak altijd de
  // week-lijst toont, ongeacht de gekozen desktop-view (week/maand/routekaart).
  const mobileWeek = parseWeekParam(sp)
  const mobileWeekDays = buildMobileWeekDays(mobileWeek.mondayKey)

  // ── Mobiele agenda: maand-pijplijn (naast de week-fetch) ──
  // Zelfde mappers als de desktop-maand: getMonthGrid → mapMonthToCells →
  // mergeExternalIntoMonth, zodat de mobiele maandweergave dezelfde data toont.
  const monthRef = parseMonthParam(sp)
  const grid = getMonthGrid(monthRef.year, monthRef.month)

  const [
    mobileAppointments,
    mobileExternal,
    leadsForPicker,
    monthAppointments,
    monthExternal,
    tenantBase,
  ] = await Promise.all([
    getAppointmentsForRange(mobileWeek.queryStart, mobileWeek.queryEnd),
    // Externe (lead-loze) Google-afspraken voor de zichtbare week (READ-ONLY).
    getExternalEventsForRange(
      mobileWeekDays[0].date,
      mobileWeekDays[mobileWeekDays.length - 1].date,
    ),
    // Bestaande leads voor de klant-keuze in "Nieuwe afspraak" (zelfde bron als
    // de desktop-agenda). Afspraak boeken is altijd aan een bestaande lead.
    getLeadsList(),
    // Afspraken + externe events voor de getoonde maand (maandweergave).
    getAppointmentsForMonth(monthRef.year, monthRef.month),
    getExternalEventsForMonth(monthRef.year, monthRef.month),
    // Werkplaats-basis voor de live routekaart (DEFAULT_TENANT_BASE-fallback).
    getTenantBase(),
  ])

  // Maand-cellen (zelfde pijplijn als desktop): afspraken + externe events.
  const monthCells = mergeExternalIntoMonth(
    mapMonthToCells(grid.cells, monthAppointments),
    monthExternal,
  )
  const base = tenantBase ?? DEFAULT_TENANT_BASE
  const nowMonthKey = monthKey(parseMonthParam({}))

  // Leads → klant-opties voor de afspraak-sheet (mirror van de v2-agenda).
  const klanten: KlantOptie[] = leadsForPicker.map((l) => ({
    leadId: l.lead_id,
    naam: l.naam,
    plaats: l.plaats ?? undefined,
    telefoon: l.telefoon ?? undefined,
    adres: [l.straat, l.huisnummer].filter(Boolean).join(' ') || undefined,
    afstandKm: l.afstand_km ?? undefined,
  }))
  const mobileNow = new Date()
  // De query haalt bewust ±1 dag buffer op (TZ-safe, zie parseWeekParam),
  // maar de mobiele week-lijst mag ALLEEN de 7 dagen van de gekozen week
  // tonen, anders verschijnt bv. een afspraak van zo 31 mei onder
  // "Deze week" (1–7 jun). Filter op de Amsterdam-day-keys van de week.
  const mobileWeekDayKeys = new Set(mobileWeekDays.map((d) => d.date))
  // Echte afspraken + externe Google-afspraken samenvoegen, beide op de
  // zichtbare week-dagen gefilterd, gesorteerd op datum + starttijd.
  const mobileEvents = [
    ...mapAppointmentsToAgendaEvents(mobileAppointments, mobileNow),
    ...mapExternalEventsToAgendaEvents(mobileExternal),
  ]
    .filter((e) => mobileWeekDayKeys.has(e.date))
    .sort((x, y) => `${x.date} ${x.start}`.localeCompare(`${y.date} ${y.start}`))
  // 'view'-param onthoudt de Week|Maand-keuze over een server-refetch heen
  // (de maand-navigatie zet ?view=maand zodat we niet terugvallen op Week).
  const rawView = Array.isArray(sp.view) ? sp.view[0] : sp.view
  const initialView = rawView === 'maand' ? 'maand' : 'week'

  const mobileData: MobileAgendaData = {
    events: mobileEvents,
    todayDate: amsterdamDayKey(mobileNow.toISOString()),
    nowTime: amsterdamTime(mobileNow.toISOString()),
    weekDays: mobileWeekDays,
    weekLabel: `Week ${mobileWeek.weekNumber} · ${mobileWeek.rangeLabel}`,
    prevWeekKey: shiftWeekKey(mobileWeek.mondayKey, -1),
    nextWeekKey: shiftWeekKey(mobileWeek.mondayKey, 1),
    isCurrentWeek: mobileWeek.mondayKey === currentMondayKey(),
    klanten,
    // Maandweergave + navigatie (zelfde mappers als desktop).
    monthCells,
    monthLabel: capitalize(grid.monthLabel),
    monthYear: monthRef.year,
    monthMonth: monthRef.month,
    prevMonthKey: monthKey(grid.prevMonth),
    nextMonthKey: monthKey(grid.nextMonth),
    isCurrentMonth: monthKey(monthRef) === nowMonthKey,
    base,
    initialView,
  }

  return (
    <>
      <div className={styles.mobileTree}>
        <MobileAgenda data={mobileData} />
      </div>
    </>
  )
}
