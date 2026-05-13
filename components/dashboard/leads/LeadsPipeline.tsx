import { LeadCard } from './LeadCard'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import type { GesprekFase } from '@/lib/dashboard/database.types'

/**
 * Vijf-kolommen pipeline gemapped op `gesprek_fase` DB-enum. Volgorde
 * matcht de natuurlijke flow door een gesprek heen.
 *
 * Leads zonder gesprek_fase (heel oud) verdwijnen in de "info verzamelen"
 * kolom — onkundige defaults.
 */
const STAGES: ReadonlyArray<{ key: GesprekFase; label: string }> = [
  { key: 'info_verzamelen',    label: 'Info verzamelen' },
  { key: 'offerte_besproken',  label: 'Offerte verstuurd' },
  { key: 'onderhandelen',      label: 'In onderhandeling' },
  { key: 'datum_kiezen',       label: 'Datum kiezen' },
  { key: 'afspraak_bevestigd', label: 'Bevestigd' },
]

export function LeadsPipeline({ leads }: { leads: LeadListItem[] }) {
  // Bucket per stage. Onbekende fase → info_verzamelen.
  const byStage = new Map<GesprekFase, LeadListItem[]>()
  for (const stage of STAGES) byStage.set(stage.key, [])
  for (const lead of leads) {
    const fase = (lead.gesprek_fase ?? 'info_verzamelen') as GesprekFase
    const bucket = byStage.get(fase) ?? byStage.get('info_verzamelen')!
    bucket.push(lead)
  }

  return (
    <div className="dash-pipeline-track">
      {STAGES.map((stage) => {
        const items = byStage.get(stage.key) ?? []
        return (
          <div className="dash-pipe-col" key={stage.key}>
            <div className="dash-pipe-col-head">
              <span className="dash-pipe-col-title">{stage.label}</span>
              <span className="dash-pipe-col-count">{items.length}</span>
            </div>
            <div className="dash-pipe-col-body">
              {items.length === 0 ? (
                <div className="dash-pipe-col-empty">Leeg</div>
              ) : (
                items.map((lead) => <LeadCard key={lead.lead_id} lead={lead} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
