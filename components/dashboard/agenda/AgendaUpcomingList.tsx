import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { Appointment } from '@/lib/dashboard/agenda-queries'
import {
  appointmentTone,
  estimateDurationMinutes,
  formatHHmm,
  formatM2,
} from '@/lib/dashboard/agenda-event'
import {
  getOwnerFollowups,
  getStaleOfferteFollowups,
} from '@/lib/dashboard/agenda-followups'
import styles from './AgendaUpcomingList.module.css'

const MINUTES_PER_HOUR = 60

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function totalWorkHours(appointments: Appointment[]): number {
  const totalMin = appointments.reduce(
    (sum, a) => sum + estimateDurationMinutes(a),
    0,
  )
  return Math.round(totalMin / MINUTES_PER_HOUR)
}

/**
 * Sidebar-card "Komende 7 dagen", toont alle afspraken in de week
 * chronologisch met kleurband links, naam, datum + tijd-range, en
 * (indien beschikbaar) plaats + m².
 */
export function AgendaUpcomingList({ appointments }: { appointments: Appointment[] }) {
  const count = appointments.length
  const workHours = totalWorkHours(appointments)

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">Komende 7 dagen</div>
          <div className="dash-card-sub">
            {count} afspra{count === 1 ? 'ak' : 'ken'}
            {workHours > 0 ? ` · ${workHours} uur werk` : ''}
          </div>
        </div>
      </div>
      <div className={styles.list}>
        {count === 0 && (
          <div className={styles.empty}>Geen afspraken in deze week.</div>
        )}
        {appointments.map((a) => {
          if (!a.afspraak_geboekt_op) return null
          const tone = appointmentTone(a)
          const duration = estimateDurationMinutes(a)
          const startLabel = formatHHmm(a.afspraak_geboekt_op)
          const endLabel = formatHHmm(
            new Date(
              new Date(a.afspraak_geboekt_op).getTime() + duration * 60_000,
            ).toISOString(),
          )
          const m2 = formatM2(a.m2)

          return (
            <Link
              key={a.lead_id}
              href={`/leads/${a.lead_id}`}
              className={styles.item}
            >
              <span className={`${styles.stripe} ${styles[`stripe_${tone}`]}`} />
              <div className={styles.body}>
                <div className={styles.name}>{a.naam}</div>
                <div className={styles.meta}>
                  {formatLongDate(a.afspraak_geboekt_op)} · {startLabel}–{endLabel}
                </div>
                {(a.plaats || m2) && (
                  <div className={styles.meta}>
                    <MapPin
                      size={10}
                      style={{ verticalAlign: '-1px', marginRight: 3 }}
                    />
                    {a.plaats ?? ''}
                    {a.plaats && m2 ? ' · ' : ''}
                    {m2 ?? ''}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * "Op te volgen", leads die wachten op actie.
 * Bronnen: oude offertes (`offerte_verstuurd > 3 dagen` zonder akkoord)
 * en owner-reviews (`pending_eigenaar_review` not null).
 */
export async function AgendaFollowupList() {
  const [owner, stale] = await Promise.all([
    getOwnerFollowups(5),
    getStaleOfferteFollowups(5),
  ])
  const items = [...owner, ...stale].slice(0, 6)

  return (
    <div className="dash-card" style={{ marginTop: 16 }}>
      <div className="dash-card-head">
        <div className="dash-card-title">Op te volgen</div>
      </div>
      <div className={styles.followups}>
        {items.length === 0 && (
          <div className={styles.followupEmpty}>
            Geen leads die wachten op actie.{' '}
            <Link href="/leads?filter=review" style={{ color: 'var(--primary)' }}>
              Bekijk owner-review
            </Link>
          </div>
        )}
        {items.map((f) => (
          <Link
            key={f.lead_id}
            href={`/leads/${f.lead_id}`}
            className={styles.followupItem}
          >
            <div className={styles.followupHead}>
              <div className={styles.followupName}>{f.naam}</div>
              <span className={styles.followupBadge}>Open</span>
            </div>
            <div className={styles.followupReason}>{f.reden}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
