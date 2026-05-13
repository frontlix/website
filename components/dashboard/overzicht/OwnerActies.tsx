import Link from 'next/link'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import styles from './OwnerActies.module.css'

/**
 * Lijst van leads die wachten op owner-actie (onderhandelen-fase).
 * Toont top 3 — geeft direct gevoel "wat moet ik nu doen?"
 */
export function OwnerActies({ leads }: { leads: LeadListItem[] }) {
  const items = leads.slice(0, 3)

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div className="dash-card-title">Owner-acties open</div>
        {leads.length > 0 ? (
          <Pill tone="amber">{leads.length}</Pill>
        ) : (
          <Pill tone="green">0</Pill>
        )}
      </div>
      <div className={styles.body}>
        {items.length === 0 && (
          <div className={styles.empty}>
            Geen openstaande acties. Surface handelt alles zelf af.
          </div>
        )}
        {items.map((lead) => (
          <Link key={lead.lead_id} href={`/leads/${lead.lead_id}`} className={styles.row}>
            <div className={styles.rowBody}>
              <div className={styles.naam}>{lead.naam}</div>
              <div className={styles.reden}>
                {redenForLead(lead)}
              </div>
            </div>
            <Pill tone="amber">Review</Pill>
          </Link>
        ))}
      </div>
    </div>
  )
}

function redenForLead(lead: LeadListItem): string {
  // V1: geen owner_review_reden kolom in onze types; afgeleid op
  // gesprek_fase + offerteprijs. Zodra reden_owner_review beschikbaar
  // is, gebruiken die.
  if (lead.gesprek_fase === 'onderhandelen') {
    return lead.totaal_prijs
      ? `Onderhandeling op offerte van €${Math.round(lead.totaal_prijs).toLocaleString('nl-NL')}`
      : 'Klant in onderhandeling'
  }
  return 'Wacht op owner-besluit'
}
