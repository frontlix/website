import { Plus } from 'lucide-react'
import { LeadCard } from './LeadCard'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'

/**
 * Vijf-koloms pipeline volgens design-spec. Mapped op een combinatie van
 * `gesprek_fase` en `dashboard_status` zodat afgeronde leads in de laatste
 * kolom verdwijnen. Per kolom een count-pill en een "+" snel-knop in de head.
 */
type StageKey = 'info' | 'review' | 'verstuurd' | 'gepland' | 'klaar'

const STAGES: ReadonlyArray<{ key: StageKey; label: string; match: (l: LeadListItem) => boolean }> = [
  {
    key: 'info',
    label: 'In gesprek',
    match: (l) => l.dashboard_status !== 'afgehandeld' && l.gesprek_fase === 'info_verzamelen',
  },
  {
    key: 'review',
    label: 'Offerte review',
    match: (l) => l.dashboard_status !== 'afgehandeld' && l.gesprek_fase === 'onderhandelen',
  },
  {
    key: 'verstuurd',
    label: 'Offerte uit',
    match: (l) => l.dashboard_status !== 'afgehandeld' && l.gesprek_fase === 'offerte_besproken',
  },
  {
    key: 'gepland',
    label: 'Ingepland',
    match: (l) =>
      l.dashboard_status !== 'afgehandeld' &&
      (l.gesprek_fase === 'datum_kiezen' || l.gesprek_fase === 'afspraak_bevestigd'),
  },
  {
    key: 'klaar',
    label: 'Afgerond',
    match: (l) => l.dashboard_status === 'afgehandeld',
  },
]

export function LeadsPipeline({ leads }: { leads: LeadListItem[] }) {
  const cols = STAGES.map((stage) => ({
    ...stage,
    items: leads.filter(stage.match),
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
