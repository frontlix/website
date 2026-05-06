import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'
import { ExportLeadsButton } from '@/components/dashboard/leads/ExportLeadsButton'
import styles from './page.module.css'

export default async function LeadsPage() {
  const leads = await getLeadsList()

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Leads</h1>
          <p>{leads.length} {leads.length === 1 ? 'lead' : 'leads'} — niet gearchiveerd, nieuwste eerst.</p>
        </div>
        <ExportLeadsButton />
      </div>
      <LeadsTable leads={leads} />
    </div>
  )
}
