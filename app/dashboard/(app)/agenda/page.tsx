import Link from 'next/link'
import { Calendar, MapPin, Plus } from 'lucide-react'
import {
  parseMonthParam,
  getMonthGrid,
  buildAppointmentsByDay,
} from '@/lib/dashboard/calendar'
import { parseWeekParam, shiftWeekKey } from '@/lib/dashboard/agenda-week'
import {
  getAppointmentsForMonth,
  getAppointmentsForRange,
} from '@/lib/dashboard/agenda-queries'
import { AgendaMonthNav } from '@/components/dashboard/agenda/AgendaMonthNav'
import { AgendaCalendar } from '@/components/dashboard/agenda/AgendaCalendar'
import { AgendaWeekGrid } from '@/components/dashboard/agenda/AgendaWeekGrid'
import {
  AgendaUpcomingList,
  AgendaFollowupList,
} from '@/components/dashboard/agenda/AgendaUpcomingList'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type ViewMode = 'week' | 'maand'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const view: ViewMode = sp.view === 'maand' ? 'maand' : 'week'

  return view === 'week' ? (
    <WeekView sp={sp} />
  ) : (
    <MonthView sp={sp} />
  )
}

/* ── Week-view (primair) ─────────────────────────────── */
async function WeekView({
  sp,
}: {
  sp: { [k: string]: string | string[] | undefined }
}) {
  const week = parseWeekParam(sp)
  const appointments = await getAppointmentsForRange(week.queryStart, week.queryEnd)

  const prevWeek = shiftWeekKey(week.mondayKey, -1)
  const nextWeek = shiftWeekKey(week.mondayKey, 1)

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Agenda</div>
          <div className="dash-section-sub">
            Week {week.weekNumber} · {week.rangeLabel}
          </div>
        </div>
        <div className={styles.actions}>
          <ViewToggle current="week" />
          <Link href={`/agenda?week=${prevWeek}`} className="dash-btn dash-btn-secondary">
            ←
          </Link>
          <Link href="/agenda" className="dash-btn dash-btn-secondary">
            <Calendar size={13} />
            Vandaag
          </Link>
          <Link href={`/agenda?week=${nextWeek}`} className="dash-btn dash-btn-secondary">
            →
          </Link>
          <button type="button" className="dash-btn dash-btn-primary" disabled>
            <Plus size={13} />
            Afspraak
          </button>
        </div>
      </div>

      <div className={styles.weekGrid}>
        <AgendaWeekGrid mondayKey={week.mondayKey} appointments={appointments} />
        <div className={styles.sidebar}>
          <AgendaUpcomingList appointments={appointments} />
          <AgendaFollowupList />
        </div>
      </div>
    </>
  )
}

/* ── Month-view (alternatief) ────────────────────────── */
async function MonthView({
  sp,
}: {
  sp: { [k: string]: string | string[] | undefined }
}) {
  const ref = parseMonthParam(sp)
  const grid = getMonthGrid(ref.year, ref.month)
  const appointments = await getAppointmentsForMonth(ref.year, ref.month)
  const byDay = buildAppointmentsByDay(
    appointments as Array<typeof appointments[0] & { afspraak_geboekt_op: string }>,
  )

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Agenda</div>
          <div className="dash-section-sub">{grid.monthLabel}</div>
        </div>
        <div className={styles.actions}>
          <ViewToggle current="maand" />
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
    </>
  )
}

/* ── View toggle: Week / Maand (Routekaart komt later) ── */
function ViewToggle({ current }: { current: ViewMode }) {
  return (
    <div className="dash-seg">
      <Link
        href="/agenda"
        className={`dash-seg-btn ${current === 'week' ? 'active' : ''}`}
      >
        <Calendar size={13} /> Week
      </Link>
      <Link
        href="/agenda?view=maand"
        className={`dash-seg-btn ${current === 'maand' ? 'active' : ''}`}
      >
        <MapPin size={13} /> Maand
      </Link>
    </div>
  )
}
