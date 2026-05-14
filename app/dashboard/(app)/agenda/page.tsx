import Link from 'next/link'
import { Calendar, MapPin, Plus } from 'lucide-react'
import { parseWeekParam, shiftWeekKey } from '@/lib/dashboard/agenda-week'
import { getAppointmentsForRange } from '@/lib/dashboard/agenda-queries'
import { AgendaWeekGrid } from '@/components/dashboard/agenda/AgendaWeekGrid'
import {
  AgendaUpcomingList,
  AgendaFollowupList,
} from '@/components/dashboard/agenda/AgendaUpcomingList'
import { AgendaRouteMap } from '@/components/dashboard/agenda/AgendaRouteMap'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type ViewMode = 'week' | 'routekaart'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const view: ViewMode = sp.view === 'routekaart' ? 'routekaart' : 'week'

  return view === 'week' ? (
    <WeekView sp={sp} />
  ) : (
    <RouteView sp={sp} />
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

/* ── Routekaart-view ─────────────────────────────────── */
async function RouteView({
  sp,
}: {
  sp: { [k: string]: string | string[] | undefined }
}) {
  const week = parseWeekParam(sp)
  const appointments = await getAppointmentsForRange(week.queryStart, week.queryEnd)

  const prevWeek = shiftWeekKey(week.mondayKey, -1)
  const nextWeek = shiftWeekKey(week.mondayKey, 1)
  const focusRaw = Array.isArray(sp.dag) ? sp.dag[0] : sp.dag
  const focusDay = focusRaw && /^\d{4}-\d{2}-\d{2}$/.test(focusRaw) ? focusRaw : null

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
          <button type="button" className="dash-btn dash-btn-primary" disabled>
            <Plus size={13} />
            Afspraak
          </button>
        </div>
      </div>

      <AgendaRouteMap
        mondayKey={week.mondayKey}
        appointments={appointments}
        focusDay={focusDay}
      />
    </>
  )
}

/* ── View toggle: Week / Routekaart ─────────────────── */
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
        href="/agenda?view=routekaart"
        className={`dash-seg-btn ${current === 'routekaart' ? 'active' : ''}`}
      >
        <MapPin size={13} /> Routekaart
      </Link>
    </div>
  )
}
