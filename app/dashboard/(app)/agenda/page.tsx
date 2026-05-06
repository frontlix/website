import {
  parseMonthParam,
  getMonthGrid,
  buildAppointmentsByDay,
} from '@/lib/dashboard/calendar'
import { getAppointmentsForMonth } from '@/lib/dashboard/agenda-queries'
import { AgendaMonthNav } from '@/components/dashboard/agenda/AgendaMonthNav'
import { AgendaCalendar } from '@/components/dashboard/agenda/AgendaCalendar'
import { AgendaAppointmentList } from '@/components/dashboard/agenda/AgendaAppointmentList'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const ref = parseMonthParam(sp)
  const grid = getMonthGrid(ref.year, ref.month)
  const appointments = await getAppointmentsForMonth(ref.year, ref.month)
  // The query filters for non-null afspraak_geboekt_op, so cast safely
  const byDay = buildAppointmentsByDay(
    appointments as Array<typeof appointments[0] & { afspraak_geboekt_op: string }>
  )

  return (
    <div>
      <AgendaMonthNav
        prevMonth={grid.prevMonth}
        nextMonth={grid.nextMonth}
        monthLabel={grid.monthLabel}
      />
      <AgendaCalendar
        cells={grid.cells}
        appointmentsByDay={byDay as Map<string, typeof appointments>}
      />
      <AgendaAppointmentList
        appointments={appointments}
        monthLabel={grid.monthLabel}
      />
    </div>
  )
}
