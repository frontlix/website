import { FileText } from 'lucide-react'
import { getLeadsList, countAllLeads } from '@/lib/dashboard/lead-queries'
import { LeadsPipeline } from '@/components/dashboard/leads/LeadsPipeline'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  // V1: geen filters/search — komen terug in een opvolg-fase wanneer
  // de pipeline live data toont. Eerst de visuele basis goedzetten.
  const [leads, total] = await Promise.all([
    getLeadsList(),
    countAllLeads(),
  ])

  const open = leads.filter((l) => l.dashboard_status !== 'afgehandeld').length

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Leads</div>
          <div className="dash-section-sub">
            <LiveDot />
            <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {open} open · {total} totaal — gesorteerd op gesprek-fase
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="/api/dashboard/export/leads-csv"
            className="dash-btn dash-btn-secondary"
          >
            <FileText size={13} />
            Export CSV
          </a>
        </div>
      </div>

      <LeadsPipeline leads={leads} />
    </>
  )
}
