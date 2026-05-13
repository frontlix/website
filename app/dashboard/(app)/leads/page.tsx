import { FileText, Filter } from 'lucide-react'
import { getLeadsList, countAllLeads, type LeadListItem } from '@/lib/dashboard/lead-queries'
import { LeadsPipeline } from '@/components/dashboard/leads/LeadsPipeline'
import { LeadsFilterTabs } from '@/components/dashboard/leads/LeadsFilterTabs'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type FilterKey = 'all' | 'in_gesprek' | 'review' | 'offerte_uit' | 'ingepland' | 'afgerond'

function matchesFilter(lead: LeadListItem, key: FilterKey): boolean {
  switch (key) {
    case 'all':
      return true
    case 'in_gesprek':
      return lead.gesprek_fase === 'info_verzamelen'
    case 'review':
      return lead.gesprek_fase === 'onderhandelen'
    case 'offerte_uit':
      return lead.gesprek_fase === 'offerte_besproken'
    case 'ingepland':
      return (
        lead.gesprek_fase === 'datum_kiezen' ||
        lead.gesprek_fase === 'afspraak_bevestigd'
      )
    case 'afgerond':
      return lead.dashboard_status === 'afgehandeld'
  }
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>
}) {
  const sp = await searchParams
  const activeFilter = (
    ['all', 'in_gesprek', 'review', 'offerte_uit', 'ingepland', 'afgerond'].includes(
      sp.filter ?? '',
    )
      ? sp.filter
      : 'all'
  ) as FilterKey
  const search = (sp.q ?? '').trim().toLowerCase()

  const [allLeads, total] = await Promise.all([
    getLeadsList(),
    countAllLeads(),
  ])

  // Counts per tab — over ALLE leads (niet de gefilterde view) zodat de
  // counts stabiel blijven terwijl je tussen tabs schakelt.
  const counts: Record<FilterKey, number> = {
    all:         allLeads.length,
    in_gesprek:  allLeads.filter((l) => matchesFilter(l, 'in_gesprek')).length,
    review:      allLeads.filter((l) => matchesFilter(l, 'review')).length,
    offerte_uit: allLeads.filter((l) => matchesFilter(l, 'offerte_uit')).length,
    ingepland:   allLeads.filter((l) => matchesFilter(l, 'ingepland')).length,
    afgerond:    allLeads.filter((l) => matchesFilter(l, 'afgerond')).length,
  }

  // Eerst filter, dan search — beide cumulatief.
  let displayed = allLeads.filter((l) => matchesFilter(l, activeFilter))
  if (search) {
    displayed = displayed.filter(
      (l) =>
        l.naam.toLowerCase().includes(search) ||
        l.telefoon.toLowerCase().includes(search),
    )
  }

  const open = allLeads.filter((l) => l.dashboard_status !== 'afgehandeld').length

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
            Export
          </a>
          <button type="button" className="dash-btn dash-btn-secondary" disabled>
            <Filter size={13} />
            Filters
          </button>
        </div>
      </div>

      {/* Filter-tabs bovenin */}
      <div className={styles.filterRow}>
        <LeadsFilterTabs counts={counts} />
        <SearchBar initial={search} />
      </div>

      {displayed.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Geen leads gevonden</div>
          <div className={styles.emptySub}>
            {search || activeFilter !== 'all'
              ? 'Wis filters of search om alle leads te zien.'
              : "Zodra een aanvraag binnenkomt verschijnt 'ie hier in de pipeline."}
          </div>
        </div>
      ) : (
        <LeadsPipeline leads={displayed} />
      )}
    </>
  )
}

import { LeadsSearchBar } from '@/components/dashboard/leads/LeadsSearchBar'
function SearchBar({ initial }: { initial: string }) {
  return <LeadsSearchBar initial={initial} />
}
