import Link from 'next/link'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { Pill } from '@/components/dashboard/ui/Pill'
import { formatEuro, formatRelative, gesprekFaseLabel } from '@/lib/dashboard/format'
import styles from './LeadsTable.module.css'

/**
 * Compacte data-tabel — alternatief voor de pipeline-view. Klikbare rij
 * navigeert naar lead-detail. Density-classes op de root passen automatisch
 * de row-height aan via dashboard.css.
 */
export function LeadsTable({ leads }: { leads: LeadListItem[] }) {
  return (
    <div className={`${styles.tableWrap} dash-card`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Klant</th>
            <th>Telefoon</th>
            <th>Dienst</th>
            <th className={styles.numeric}>m²</th>
            <th className={styles.numeric}>Waarde</th>
            <th>Fase</th>
            <th className={styles.numeric}>Aangemaakt</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.lead_id} className={styles.row}>
              <td>
                <Link href={`/leads/${lead.lead_id}`} className={styles.link}>
                  <strong>{lead.naam}</strong>
                </Link>
              </td>
              <td className={styles.muted}>{lead.telefoon}</td>
              <td className={styles.muted}>{lead.hoofdcategorie}</td>
              <td className={styles.numeric}>{lead.m2 ?? '—'}</td>
              <td className={styles.numeric}>
                {lead.totaal_prijs ? (
                  <strong style={{ color: 'var(--primary)' }}>{formatEuro(lead.totaal_prijs)}</strong>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <Pill tone={toneFor(lead.gesprek_fase)}>
                  {lead.gesprek_fase ? gesprekFaseLabel(lead.gesprek_fase) : 'Onbekend'}
                </Pill>
              </td>
              <td className={`${styles.numeric} ${styles.muted}`}>{formatRelative(lead.aangemaakt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
