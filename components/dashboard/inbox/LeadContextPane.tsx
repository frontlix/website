import Link from 'next/link'
import { Phone, Mail, MapPin, Square, ArrowUpRight } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { InboxLeadContext } from '@/lib/dashboard/inbox-queries'
import styles from './LeadContextPane.module.css'

/**
 * Rechterkolom van Inbox — compacte lead-info bij het actieve gesprek.
 * "Open volledig" link naar /leads/[id] voor de volledige detail-flow.
 */
export function LeadContextPane({ lead }: { lead: InboxLeadContext }) {
  const adres = [
    lead.straat ? `${lead.straat} ${lead.huisnummer}`.trim() : null,
    `${lead.postcode} ${lead.plaats ?? ''}`.trim(),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={styles.pane}>
      <div className={styles.head}>
        <Avatar name={lead.naam} size="lg" />
        <div className={styles.headBody}>
          <div className={styles.naam}>{lead.naam}</div>
          <Pill tone={statusTone(lead.dashboard_status)} dot>
            {statusLabel(lead.dashboard_status)}
          </Pill>
        </div>
      </div>

      <Link href={`/leads/${lead.lead_id}`} className={styles.openLink}>
        Open lead-detail
        <ArrowUpRight size={14} />
      </Link>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Contact</div>
        <ContactRow Icon={Phone} value={lead.telefoon} href={`tel:${lead.telefoon}`} />
        <ContactRow Icon={Mail} value={lead.email} href={`mailto:${lead.email}`} />
        {adres && <ContactRow Icon={MapPin} value={adres} />}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Aanvraag</div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Dienst</span>
          <span className={styles.metaValue}>{humanize(lead.hoofdcategorie)}</span>
        </div>
        {lead.m2 !== null && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Oppervlakte</span>
            <span className={styles.metaValue}>
              <Square size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />
              {lead.m2}m²
            </span>
          </div>
        )}
        {lead.totaal_prijs && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Offerte</span>
            <span className={styles.metaValue} style={{ color: 'var(--primary)', fontWeight: 700 }}>
              € {Math.round(lead.totaal_prijs).toLocaleString('nl-NL')}
            </span>
          </div>
        )}
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Binnen</span>
          <span className={styles.metaValue}>
            {new Date(lead.aangemaakt).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

function ContactRow({
  Icon,
  value,
  href,
}: {
  Icon: typeof Phone
  value: string
  href?: string
}) {
  const inner = (
    <>
      <Icon size={14} className={styles.contactIcon} />
      <span>{value}</span>
    </>
  )
  return href ? (
    <a href={href} className={styles.contactRow}>
      {inner}
    </a>
  ) : (
    <div className={styles.contactRow}>{inner}</div>
  )
}

function statusTone(status: InboxLeadContext['dashboard_status']): 'blue' | 'green' | 'gray' | 'amber' | 'red' {
  switch (status) {
    case 'afgehandeld': return 'green'
    case 'opgevolgd':   return 'blue'
    case 'no_show':     return 'amber'
    case 'geen_interesse': return 'red'
    case 'archief':     return 'gray'
    default:            return 'blue'
  }
}

function statusLabel(status: InboxLeadContext['dashboard_status']): string {
  const labels: Record<NonNullable<InboxLeadContext['dashboard_status']>, string> = {
    open: 'Open',
    opgevolgd: 'Opgevolgd',
    afgehandeld: 'Afgehandeld',
    no_show: 'No show',
    geen_interesse: 'Geen interesse',
    archief: 'Gearchiveerd',
  }
  return status ? labels[status] : 'Open'
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
