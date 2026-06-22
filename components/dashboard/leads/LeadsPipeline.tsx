import { Plus } from 'lucide-react'
import { LeadCard } from './LeadCard'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { leadStage, type MobileLeadStage } from '@/components/dashboard/mobile/leads/lead-mappers'

/**
 * Vijf-koloms pipeline volgens design-spec. De kolom-indeling komt uit de
 * gedeelde `leadStage()` (zelfde bron als mobiel/v2 en de filter-tabs), zodat
 * de drie weergaves nooit uit elkaar lopen. `leadStage` regelt:
 *  - "Offerte review" = `pending_eigenaar_review` (offerte wacht op owner-
 *    goedkeuring vóór verzenden), NIET `gesprek_fase === 'onderhandelen'`.
 *  - "Offerte uit" = `gesprek_fase` 'onderhandelen' of 'offerte_besproken'
 *    (offerte is verstuurd; bij 'onderhandelen' praat de klant er nog over).
 *  - "Afgerond" wint van alles bij `dashboard_status === 'afgehandeld'`.
 * Per kolom een count-pill en een "+" snel-knop in de head.
 */
const STAGES: ReadonlyArray<{ key: MobileLeadStage; label: string }> = [
  { key: 'gesprek', label: 'In gesprek' },
  { key: 'review', label: 'Offerte review' },
  { key: 'uit', label: 'Offerte uit' },
  { key: 'gepland', label: 'Ingepland' },
  { key: 'klaar', label: 'Afgerond' },
]

export function LeadsPipeline({ leads }: { leads: LeadListItem[] }) {
  const cols = STAGES.map((stage) => ({
    ...stage,
    items: leads.filter((l) => leadStage(l) === stage.key),
  }))

  return (
    <div className="dash-pipeline-track">
      {cols.map((col) => (
        <div className="dash-pipe-col" key={col.key}>
          <div className="dash-pipe-col-head">
            <span className="dash-pipe-col-title">{col.label}</span>
            <span className="dash-pipe-col-count">{col.items.length}</span>
            <button
              type="button"
              className="dash-btn dash-btn-ghost dash-btn-sm"
              style={{ marginLeft: 'auto', padding: '4px 6px' }}
              aria-label={`Nieuwe lead in ${col.label}`}
              disabled
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="dash-pipe-col-body">
            {col.items.length === 0 ? (
              <div className="dash-pipe-col-empty">Leeg</div>
            ) : (
              col.items.map((lead) => <LeadCard key={lead.lead_id} lead={lead} />)
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
