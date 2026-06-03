import Link from 'next/link'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import { toAmsterdamDayKey } from '@/lib/dashboard/calendar'
import { dashboardStatusLabel } from '@/lib/dashboard/format'
import styles from './AgendaAppointmentList.module.css'

const NL_WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

function formatDayHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekday = NL_WEEKDAYS[date.getUTCDay()]
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${d}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AgendaAppointmentList({
  appointments,
  monthLabel,
}: {
  appointments: Appointment[]
  monthLabel: string
}) {
  // Filter out appointments without a timestamp
  const validAppointments = appointments.filter((a) => a.afspraak_geboekt_op != null)

  if (validAppointments.length === 0) {
    return (
      <div id="agenda-list" className={styles.section}>
        <h2 className={styles.heading}>Alle afspraken, {monthLabel}</h2>
        <p className={styles.empty}>Geen afspraken in deze maand.</p>
      </div>
    )
  }

  const byDay = new Map<string, Appointment[]>()
  for (const a of validAppointments) {
    // We know a.afspraak_geboekt_op is not null here due to filter above
    const key = toAmsterdamDayKey(a.afspraak_geboekt_op as string)
    const list = byDay.get(key) ?? []
    list.push(a)
    byDay.set(key, list)
  }
  const sortedKeys = [...byDay.keys()].sort()

  return (
    <div id="agenda-list" className={styles.section}>
      <h2 className={styles.heading}>Alle afspraken, {monthLabel}</h2>
      {sortedKeys.map((key) => (
        <div key={key} className={styles.day}>
          <h3 className={styles.dayLabel}>{formatDayHeader(key)}</h3>
          <ul className={styles.list}>
            {byDay.get(key)!.map((a) => (
              <li key={a.lead_id} className={styles.item}>
                <Link href={`/leads/${a.lead_id}`} className={styles.link}>
                  <span className={styles.tijd}>
                    {formatTime(a.afspraak_geboekt_op as string)}
                  </span>
                  <span className={styles.naam}>{a.naam ?? 'Onbekend'}</span>
                  {a.dashboard_status && (
                    <span className={styles.status}>
                      {dashboardStatusLabel(a.dashboard_status)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
