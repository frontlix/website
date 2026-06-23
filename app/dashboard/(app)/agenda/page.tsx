import { parseWeekParam, shiftWeekKey, currentMondayKey } from '@/lib/dashboard/agenda-week'
import { getAppointmentsForRange } from '@/lib/dashboard/agenda-queries'
import { getExternalEventsForRange } from '@/lib/dashboard/external-events-queries'
import { MobileAgenda, type MobileAgendaData } from '@/components/dashboard/mobile/agenda/MobileAgenda'
import {
  mapAppointmentsToAgendaEvents,
  mapExternalEventsToAgendaEvents,
  buildMobileWeekDays,
  amsterdamDayKey,
  amsterdamTime,
} from '@/components/dashboard/mobile/agenda/agenda-mobile-mappers'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

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
  const [mobileAppointments, mobileExternal] = await Promise.all([
    getAppointmentsForRange(mobileWeek.queryStart, mobileWeek.queryEnd),
    // Externe (lead-loze) Google-afspraken voor de zichtbare week (READ-ONLY).
    getExternalEventsForRange(
      mobileWeekDays[0].date,
      mobileWeekDays[mobileWeekDays.length - 1].date,
    ),
  ])
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
  const mobileData: MobileAgendaData = {
    events: mobileEvents,
    todayDate: amsterdamDayKey(mobileNow.toISOString()),
    nowTime: amsterdamTime(mobileNow.toISOString()),
    weekDays: mobileWeekDays,
    weekLabel: `Week ${mobileWeek.weekNumber} · ${mobileWeek.rangeLabel}`,
    prevWeekKey: shiftWeekKey(mobileWeek.mondayKey, -1),
    nextWeekKey: shiftWeekKey(mobileWeek.mondayKey, 1),
    isCurrentWeek: mobileWeek.mondayKey === currentMondayKey(),
  }

  return (
    <>
      <div className={styles.mobileTree}>
        <MobileAgenda data={mobileData} />
      </div>
    </>
  )
}
