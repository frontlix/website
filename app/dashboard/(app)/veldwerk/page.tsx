import Link from 'next/link'
import { ChevronRight, MapPin, Phone } from 'lucide-react'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getAppointmentsForRange } from '@/lib/dashboard/agenda-queries'
import { toAmsterdamDayKey } from '@/lib/dashboard/calendar'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { MobileVeldwerk } from '@/components/dashboard/mobile/veldwerk/MobileVeldwerk'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/**
 * Veldwerk-overzicht: vandaag's afspraken voor monteurs op locatie.
 * Desktop toont het overzicht met grote hit-targets; per kaart navigeer
 * je naar /veldwerk/[lead_id] voor de phase-tracker (onderweg → klaar).
 * Op mobiel is de feature nog in aanbouw: daar rendert MobileVeldwerk
 * een nette aankondiging (zelfde desktopTree/mobileTree-patroon als
 * statistieken en reviews).
 */
export default async function VeldwerkPage() {
  await requireApprovedUser()

  // Pak een ruime range rond vandaag (− 12u / + 36u) zodat we zeker geen
  // afspraken missen door tijdzone-conversie.
  const now = new Date()
  const start = new Date(now.getTime() - 12 * 3600_000).toISOString()
  const end = new Date(now.getTime() + 36 * 3600_000).toISOString()

  const allAppts = await getAppointmentsForRange(start, end)
  const todayKey = toAmsterdamDayKey(now.toISOString())
  const todayAppts = allAppts.filter(
    (a) => a.afspraak_geboekt_op && toAmsterdamDayKey(a.afspraak_geboekt_op) === todayKey,
  )

  return (
    <>
      <div className={styles.desktopTree}>
        <div className="dash-section-head">
          <div>
            <div className="dash-section-title">Veldwerk vandaag</div>
            <div className="dash-section-sub">
              {todayAppts.length === 0
                ? 'Geen afspraken vandaag'
                : `${todayAppts.length} ${todayAppts.length === 1 ? 'klus' : 'klussen'} ingepland`}
            </div>
          </div>
        </div>

        {todayAppts.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Vrije dag</div>
            <div className={styles.emptySub}>
              Er staan geen afspraken in de agenda voor vandaag. Check de{' '}
              <Link href="/agenda">agenda</Link> voor komende klussen.
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {todayAppts.map((a) => (
              <VeldwerkCard key={a.lead_id} appt={a} />
            ))}
          </div>
        )}
      </div>

      <div className={styles.mobileTree}>
        <MobileVeldwerk />
      </div>
    </>
  )
}

type Appt = Awaited<ReturnType<typeof getAppointmentsForRange>>[number]

function VeldwerkCard({ appt }: { appt: Appt }) {
  const dt = appt.afspraak_geboekt_op ? new Date(appt.afspraak_geboekt_op) : null
  const tijdNL = dt
    ? new Intl.DateTimeFormat('nl-NL', {
        timeZone: 'Europe/Amsterdam',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dt)
    : '—'

  return (
    <Link href={`/veldwerk/${appt.lead_id}`} className={styles.card}>
      <div className={styles.timeBlock}>
        <div className={styles.time}>{tijdNL}</div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <Avatar name={appt.naam} size="md" />
          <div>
            <div className={styles.naam}>{appt.naam}</div>
            <div className={styles.phone}>
              <Phone size={11} /> {appt.telefoon}
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <span className={styles.actionPill}>
            <MapPin size={12} /> Open route
          </span>
          <ChevronRight size={18} className={styles.chevron} />
        </div>
      </div>
    </Link>
  )
}
