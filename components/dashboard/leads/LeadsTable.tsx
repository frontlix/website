import Link from 'next/link'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import {
  formatEuro,
  formatRelative,
  dashboardStatusLabel,
  gesprekFaseLabel,
} from '@/lib/dashboard/format'
import styles from './LeadsTable.module.css'

export function LeadsTable({ leads }: { leads: LeadListItem[] }) {
  if (leads.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nog geen leads. Zodra de eerste binnenkomt verschijnt deze hier.</p>
      </div>
    )
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Naam</th>
            <th>Telefoon</th>
            <th>Categorie</th>
            <th className={styles.numeric}>m²</th>
            <th className={styles.numeric}>Totaal</th>
            <th>Bot-status</th>
            <th>Dashboard-status</th>
            <th>Aangemaakt</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.lead_id}>
              <td>
                <Link href={`/leads/${lead.lead_id}`} className={styles.nameLink}>
                  {lead.naam}
                </Link>
              </td>
              <td>{lead.telefoon}</td>
              <td>{lead.hoofdcategorie}</td>
              <td className={styles.numeric}>{lead.m2 ?? '—'}</td>
              <td className={styles.numeric}>{formatEuro(lead.totaal_prijs)}</td>
              <td>
                <span className={styles.botStatus}>
                  {gesprekFaseLabel(lead.gesprek_fase)}
                </span>
              </td>
              <td>
                <span className={styles.dashStatus}>
                  {dashboardStatusLabel(lead.dashboard_status)}
                </span>
              </td>
              <td>{formatRelative(lead.aangemaakt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
