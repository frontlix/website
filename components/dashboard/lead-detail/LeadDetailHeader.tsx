import Link from 'next/link'
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Clock,
  StickyNote,
  Archive,
  Send,
} from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { Lead } from '@/lib/dashboard/database.types'
import styles from './LeadDetailHeader.module.css'

/**
 * Bovenste strook van het lead-detail scherm: back-link, avatar+naam met
 * status-pill inline, één regel meta-info onder de naam, en de quick-action
 * knoppen rechts in dezelfde card.
 */
export function LeadDetailHeader({ lead }: { lead: Lead }) {
  const adres = [lead.straat ? `${lead.straat} ${lead.huisnummer ?? ''}`.trim() : null, `${lead.postcode ?? ''} ${lead.plaats ?? ''}`.trim()]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={styles.wrap}>
      <Link href="/leads" className={styles.back}>
        <ChevronLeft size={16} />
        <span>Terug naar leads</span>
      </Link>

      <div className={styles.body}>
        <Avatar name={lead.naam} size="lg" />

        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <h1 className={styles.naam}>{lead.naam}</h1>
            <Pill tone={statusTone(lead.dashboard_status)} dot>
              {statusLabel(lead.dashboard_status)}
            </Pill>
          </div>
          <div className={styles.metaRow}>
            {adres && (
              <span className={styles.metaItem}>
                <MapPin size={13} />
                <span>{adres}</span>
              </span>
            )}
            {lead.telefoon && (
              <a href={`tel:${lead.telefoon}`} className={styles.metaItem}>
                <Phone size={13} />
                <span>{lead.telefoon}</span>
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className={styles.metaItem}>
                <Mail size={13} />
                <span>{lead.email}</span>
              </a>
            )}
            <span className={styles.metaItem}>
              <Clock size={13} />
              <span>{formatRelative(lead.bijgewerkt ?? lead.aangemaakt ?? '')}</span>
            </span>
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
            href={`/leads/${lead.lead_id}?tab=notities`}
            className={styles.actionBtn}
          >
            <Archive size={14} />
            <span>Archief</span>
          </Link>
          <Link
            href={`/leads/${lead.lead_id}?tab=offerte`}
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
          >
            <Send size={14} />
            <span>Offerte versturen</span>
          </Link>
        </div>
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
    default:                 return 'green'  // 'open' → "In gesprek"
  }
}

function statusLabel(status: Lead['dashboard_status']): string {
  const labels: Record<NonNullable<Lead['dashboard_status']>, string> = {
    open:           'In gesprek',
    opgevolgd:      'Opgevolgd',
    afgehandeld:    'Afgehandeld',
    no_show:        'No show',
    geen_interesse: 'Geen interesse',
    archief:        'Gearchiveerd',
  }
  return status ? labels[status] : 'In gesprek'
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Net'
  if (min < 60) return `${min} min geleden`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} uur geleden`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days} dag${days > 1 ? 'en' : ''} geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}
