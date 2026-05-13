import Link from 'next/link'
import { Square, Phone } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { formatEuro, formatRelative, gesprekFaseLabel } from '@/lib/dashboard/format'
import styles from './LeadsKaarten.module.css'

/**
 * Kaarten-view (kanban-stijl): meer visuele info per lead dan tabel,
 * minder dichtgepakt dan pipeline. 3-koloms grid op desktop.
 */
export function LeadsKaarten({ leads }: { leads: LeadListItem[] }) {
  return (
    <div className={styles.grid}>
      {leads.map((lead) => (
        <Link key={lead.lead_id} href={`/leads/${lead.lead_id}`} className={`${styles.card} dash-card`}>
          <div className={styles.head}>
            <Avatar name={lead.naam} size="md" />
            <div className={styles.headBody}>
              <div className={styles.naam}>{lead.naam}</div>
              <div className={styles.phone}>
                <Phone size={11} /> {lead.telefoon}
              </div>
            </div>
            {lead.totaal_prijs ? (
              <div className={styles.prijs}>{formatEuro(lead.totaal_prijs)}</div>
            ) : null}
          </div>

          <div className={styles.meta}>
            <Pill tone="gray">{lead.hoofdcategorie}</Pill>
            {lead.m2 != null && (
              <span className={styles.metaItem}>
                <Square size={12} /> {lead.m2} m²
              </span>
            )}
          </div>

          <div className={styles.footer}>
            <Pill tone={toneFor(lead.gesprek_fase)}>
              {lead.gesprek_fase ? gesprekFaseLabel(lead.gesprek_fase) : 'Onbekend'}
            </Pill>
            <span className={styles.time}>{formatRelative(lead.aangemaakt)}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

function toneFor(fase: string | null): 'blue' | 'amber' | 'green' | 'gray' {
  switch (fase) {
    case 'info_verzamelen':    return 'blue'
    case 'offerte_besproken':  return 'amber'
    case 'onderhandelen':      return 'amber'
    case 'datum_kiezen':       return 'green'
    case 'afspraak_bevestigd': return 'green'
    default:                   return 'gray'
  }
}
