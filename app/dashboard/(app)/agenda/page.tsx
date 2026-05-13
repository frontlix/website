import {
  parseMonthParam,
  getMonthGrid,
  buildAppointmentsByDay,
} from '@/lib/dashboard/calendar'
import { getAppointmentsForMonth } from '@/lib/dashboard/agenda-queries'
import { AgendaMonthNav } from '@/components/dashboard/agenda/AgendaMonthNav'
import { AgendaCalendar } from '@/components/dashboard/agenda/AgendaCalendar'
import { AgendaAppointmentList } from '@/components/dashboard/agenda/AgendaAppointmentList'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'

export const dynamic = 'force-dynamic'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const ref = parseMonthParam(sp)
  const grid = getMonthGrid(ref.year, ref.month)
  const appointments = await getAppointmentsForMonth(ref.year, ref.month)
  // De query filtert al op non-null afspraak_geboekt_op — safe cast.
  const byDay = buildAppointmentsByDay(
    appointments as Array<typeof appointments[0] & { afspraak_geboekt_op: string }>
  )

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Agenda</div>
          <div className="dash-section-sub">
            <LiveDot />
            <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {appointments.length} afspra{appointments.length === 1 ? 'ak' : 'ken'} in{' '}
              {grid.monthLabel.toLowerCase()}
            </span>
          </div>
        </div>
      </div>

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
    </>
  )
}
