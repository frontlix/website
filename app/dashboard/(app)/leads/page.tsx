import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'

export default async function LeadsPage() {
  const leads = await getLeadsList()

  return (
    <div>
      <h1>Leads</h1>
      <p>{leads.length} {leads.length === 1 ? 'lead' : 'leads'} — niet gearchiveerd, nieuwste eerst.</p>
      <LeadsTable leads={leads} />
    </div>
  )
}
