import Link from 'next/link'
import {
  ChevronLeft,
  Mail,
  Phone,
  StickyNote,
  Archive,
  Send,
} from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { Lead } from '@/lib/dashboard/database.types'
import styles from './LeadDetailHeader.module.css'

/**
 * Bovenste strook van het lead-detail scherm: back-link, avatar+naam+
 * bedrijf, contact-shortcuts, status-pill. Houdt het stil — de echte
 * acties (status wijzigen, archiveren) staan in de rechter-tabs.
 */
export function LeadDetailHeader({ lead }: { lead: Lead }) {
  const adres = [lead.straat, `${lead.postcode} ${lead.plaats ?? ''}`.trim()]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={styles.wrap}>
      <Link href="/leads" className={styles.back}>
        <ChevronLeft size={16} />
        <span>Leads</span>
      </Link>

      <div className={styles.body}>
        <Avatar name={lead.naam} size="lg" />
        <div className={styles.identity}>
          <h1 className={styles.naam}>{lead.naam}</h1>
          <div className={styles.sub}>
            {lead.bedrijfsnaam && <span>{lead.bedrijfsnaam} ·</span>}
            <span>{adres || 'Adres onbekend'}</span>
          </div>
        </div>

        <div className={styles.contactBlock}>
          <a href={`tel:${lead.telefoon}`} className={styles.contactBtn}>
            <Phone size={14} />
            <span>{lead.telefoon}</span>
          </a>
          <a href={`mailto:${lead.email}`} className={styles.contactBtn}>
            <Mail size={14} />
            <span>{lead.email}</span>
          </a>
        </div>

        <div className={styles.statusBlock}>
          <Pill tone={statusTone(lead.dashboard_status)} dot>
            {statusLabel(lead.dashboard_status)}
          </Pill>
        </div>
      </div>

      {/* Quick-action buttons — gaan naar de juiste tab voor de detail-actie */}
      <div className={styles.actions}>
        <Link
          href={`/leads/${lead.lead_id}?tab=notities`}
          className={styles.actionBtn}
        >
          <StickyNote size={14} />
          <span>Notitie</span>
        </Link>
        <Link
          href={`/leads/${lead.lead_id}?tab=offerte`}
          className={styles.actionBtn}
        >
          <Send size={14} />
          <span>Offerte versturen</span>
        </Link>
        <Link
          href={`/leads/${lead.lead_id}?tab=notities`}
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
        >
          <Archive size={14} />
          <span>Archiveren</span>
        </Link>
      </div>
    </div>
  )
}

function statusTone(status: Lead['dashboard_status']): 'blue' | 'green' | 'gray' | 'amber' | 'red' {
  switch (status) {
    case 'afgehandeld':     return 'green'
    case 'opgevolgd':        return 'blue'
    case 'no_show':          return 'amber'
    case 'geen_interesse':   return 'red'
    case 'archief':          return 'gray'
    default:                 return 'blue'  // 'open'
  }
}

function statusLabel(status: Lead['dashboard_status']): string {
  const labels: Record<NonNullable<Lead['dashboard_status']>, string> = {
    open:           'Open',
    opgevolgd:      'Opgevolgd',
    afgehandeld:    'Afgehandeld',
    no_show:        'No show',
    geen_interesse: 'Geen interesse',
    archief:        'Gearchiveerd',
  }
  return status ? labels[status] : 'Open'
}
