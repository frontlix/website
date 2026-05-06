import Link from 'next/link'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import styles from './AgendaAppointmentBlock.module.css'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AgendaAppointmentBlock({
  appointment,
  isPast,
}: {
  appointment: Appointment
  isPast: boolean
}) {
  const naam = appointment.naam ?? 'Onbekend'
  const tijd = formatTime(appointment.afspraak_geboekt_op as string)
  const title = `${naam} • ${tijd}${
    appointment.dashboard_status ? ` • ${appointment.dashboard_status}` : ''
  }`

  return (
    <Link
      href={`/leads/${appointment.lead_id}`}
      className={`${styles.block} ${isPast ? styles.past : styles.future}`}
      title={title}
    >
      <span className={styles.tijd}>{tijd}</span>
      <span className={styles.naam}>{naam}</span>
    </Link>
  )
}
