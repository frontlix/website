import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import styles from './AgendaUpcomingList.module.css'

/**
 * Sidebar-card "Komende 7 dagen" — toont alle afspraken in de week
 * chronologisch met kleurband links (status-coded) + datum/tijd + adres.
 */
export function AgendaUpcomingList({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">Komende 7 dagen</div>
          <div className="dash-card-sub">
            {appointments.length} afspra{appointments.length === 1 ? 'ak' : 'ken'}
          </div>
        </div>
      </div>
      <div className={styles.list}>
        {appointments.length === 0 && (
          <div className={styles.empty}>Geen afspraken in deze week.</div>
        )}
        {appointments.map((a) => {
          const tone =
            a.dashboard_status === 'afgehandeld'
              ? 'green'
              : a.dashboard_status === 'no_show'
                ? 'amber'
                : 'blue'
          const start = a.afspraak_geboekt_op
            ? new Date(a.afspraak_geboekt_op).toLocaleString('nl-NL', {
                timeZone: 'Europe/Amsterdam',
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''

          return (
            <Link
              key={a.lead_id}
              href={`/leads/${a.lead_id}`}
              className={styles.item}
            >
              <span className={`${styles.stripe} ${styles[`stripe_${tone}`]}`} />
              <div className={styles.body}>
                <div className={styles.name}>{a.naam}</div>
                <div className={styles.meta}>{start}</div>
                <div className={styles.meta}>
                  <MapPin
                    size={10}
                    style={{ verticalAlign: '-1px', marginRight: 2 }}
                  />
                  {a.telefoon}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * "Op te volgen" card — leads die nog wachten op actie. Voor V1 stub-data
 * tot we een query hebben voor "stale offerte > 3 dagen" en "owner_review_reden".
 */
export function AgendaFollowupList() {
  return (
    <div className="dash-card" style={{ marginTop: 16 }}>
      <div className="dash-card-head">
        <div className="dash-card-title">Op te volgen</div>
      </div>
      <div className={styles.list}>
        <div className={styles.followupEmpty}>
          Surface signaleert hier leads die wachten op actie zodra deze
          query live is.{' '}
          <Link href="/leads?filter=review" style={{ color: 'var(--primary)' }}>
            Bekijk owner-review
          </Link>
        </div>
      </div>
    </div>
  )
}
