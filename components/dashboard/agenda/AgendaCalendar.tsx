import type { GridCell } from '@/lib/dashboard/calendar'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import { AgendaAppointmentBlock } from './AgendaAppointmentBlock'
import styles from './AgendaCalendar.module.css'

const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MAX_VISIBLE_PER_DAY = 3

export function AgendaCalendar({
  cells,
  appointmentsByDay,
}: {
  cells: GridCell[]
  appointmentsByDay: Map<string, Appointment[]>
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.weekdays}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={styles.weekday}>
            {d}
          </div>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map((cell) => {
          const appointments = appointmentsByDay.get(cell.dateKey) ?? []
          const visible = appointments.slice(0, MAX_VISIBLE_PER_DAY)
          const overflow = appointments.length - visible.length

          return (
            <div
              key={cell.dateKey}
              className={`${styles.cell} ${
                cell.isCurrentMonth ? styles.cellInMonth : styles.cellOutOfMonth
              }`}
            >
              <div className={styles.cellHeader}>
                <span
                  className={`${styles.day} ${cell.isToday ? styles.today : ''}`}
                >
                  {cell.dayOfMonth}
                </span>
              </div>
              <div className={styles.events}>
                {visible.map((a) => (
                  <AgendaAppointmentBlock
                    key={a.lead_id}
                    appointment={a}
                    isPast={cell.isPast}
                  />
                ))}
                {overflow > 0 && (
                  <a
                    href="#agenda-list"
                    className={styles.more}
                  >
                    +{overflow} meer
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
