import React from 'react'
import Link from 'next/link'
import { Calendar, CalendarDays, MapPin, Plus } from 'lucide-react'
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
import { AgendaWeekGrid } from '@/components/dashboard/agenda/AgendaWeekGrid'
import { AgendaCalendar } from '@/components/dashboard/agenda/AgendaCalendar'
import {
  AgendaUpcomingList,
  AgendaFollowupList,
} from '@/components/dashboard/agenda/AgendaUpcomingList'
import { AgendaRouteMap } from '@/components/dashboard/agenda/AgendaRouteMap'
import { getTenantBase, DEFAULT_TENANT_BASE } from '@/lib/dashboard/tenant-base'
import { MobileAgenda } from '@/components/dashboard/mobile/agenda/MobileAgenda'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type ViewMode = 'week' | 'maand' | 'routekaart'

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const view: ViewMode =
    sp.view === 'maand'
      ? 'maand'
      : sp.view === 'routekaart'
        ? 'routekaart'
        : 'week'

  let desktopContent: React.ReactNode
  if (view === 'maand') desktopContent = <MonthView sp={sp} />
  else if (view === 'routekaart') desktopContent = <RouteView sp={sp} />
  else desktopContent = <WeekView sp={sp} />

  return (
    <>
      <div className={styles.desktopTree}>{desktopContent}</div>
      <div className={styles.mobileTree}>
        <MobileAgenda />
      </div>
    </>
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
          <button
            type="button"
            className="dash-btn dash-btn-primary"
            disabled
            title="Handmatige afspraak — binnenkort beschikbaar (Surface plant nu automatisch in via WhatsApp)"
            aria-label="Afspraak inplannen — binnenkort beschikbaar"
          >
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

/* ── Maand-view (overzicht) ──────────────────────────── */
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

  const prevMonth = `/agenda?view=maand&month=${grid.prevMonth.year}-${pad2(grid.prevMonth.month)}`
  const nextMonth = `/agenda?view=maand&month=${grid.nextMonth.year}-${pad2(grid.nextMonth.month)}`

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Agenda</div>
          <div className="dash-section-sub">{grid.monthLabel}</div>
        </div>
        <div className={styles.actions}>
          <ViewToggle current="maand" />
          <Link href={prevMonth} className="dash-btn dash-btn-secondary">
            ←
          </Link>
          <Link href="/agenda?view=maand" className="dash-btn dash-btn-secondary">
            <Calendar size={13} />
            Vandaag
          </Link>
          <Link href={nextMonth} className="dash-btn dash-btn-secondary">
            →
          </Link>
        </div>
      </div>

      <AgendaCalendar
        cells={grid.cells}
        appointmentsByDay={byDay as Map<string, typeof appointments>}
      />
    </>
  )
}

/* ── Routekaart-view ─────────────────────────────────── */
async function RouteView({
  sp,
}: {
  sp: { [k: string]: string | string[] | undefined }
}) {
  const week = parseWeekParam(sp)
  const [appointments, tenantBase] = await Promise.all([
    getAppointmentsForRange(week.queryStart, week.queryEnd),
    getTenantBase(),
  ])

  const prevWeek = shiftWeekKey(week.mondayKey, -1)
  const nextWeek = shiftWeekKey(week.mondayKey, 1)
  const focusRaw = Array.isArray(sp.dag) ? sp.dag[0] : sp.dag
  const focusDay = focusRaw && /^\d{4}-\d{2}-\d{2}$/.test(focusRaw) ? focusRaw : null
  const base = tenantBase ?? DEFAULT_TENANT_BASE

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
          <ViewToggle current="routekaart" />
          <Link
            href={`/agenda?view=routekaart&week=${prevWeek}`}
            className="dash-btn dash-btn-secondary"
          >
            ←
          </Link>
          <Link
            href="/agenda?view=routekaart"
            className="dash-btn dash-btn-secondary"
          >
            <Calendar size={13} />
            Vandaag
          </Link>
          <Link
            href={`/agenda?view=routekaart&week=${nextWeek}`}
            className="dash-btn dash-btn-secondary"
          >
            →
          </Link>
          <button
            type="button"
            className="dash-btn dash-btn-primary"
            disabled
            title="Handmatige afspraak — binnenkort beschikbaar (Surface plant nu automatisch in via WhatsApp)"
            aria-label="Afspraak inplannen — binnenkort beschikbaar"
          >
            <Plus size={13} />
            Afspraak
          </button>
        </div>
      </div>

      <AgendaRouteMap
        mondayKey={week.mondayKey}
        appointments={appointments}
        focusDay={focusDay}
        base={base}
      />
    </>
  )
}

/* ── View toggle: Week / Maand / Routekaart ─────────── */
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
        <CalendarDays size={13} /> Maand
      </Link>
      <Link
        href="/agenda?view=routekaart"
        className={`dash-seg-btn ${current === 'routekaart' ? 'active' : ''}`}
      >
        <MapPin size={13} /> Routekaart
      </Link>
    </div>
  )
}
