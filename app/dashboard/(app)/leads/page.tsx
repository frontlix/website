import { FileText, Filter, Plus } from 'lucide-react'
import { getLeadsList, countAllLeads, type LeadListItem } from '@/lib/dashboard/lead-queries'
import { LeadsPipeline } from '@/components/dashboard/leads/LeadsPipeline'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'
import { LeadsKaarten } from '@/components/dashboard/leads/LeadsKaarten'
import { LeadsFilterTabs } from '@/components/dashboard/leads/LeadsFilterTabs'
import { LeadsRealtimeToast } from '@/components/dashboard/leads/LeadsRealtimeToast'
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
  searchParams: Promise<{ filter?: string; q?: string; view?: string }>
}) {
  const sp = await searchParams
  const activeFilter = (
    ['all', 'in_gesprek', 'review', 'offerte_uit', 'ingepland', 'afgerond'].includes(
      sp.filter ?? '',
    )
      ? sp.filter
      : 'all'
  ) as FilterKey
  const view = (['pipeline', 'tabel', 'kaarten'].includes(sp.view ?? '')
    ? sp.view
    : 'pipeline') as 'pipeline' | 'tabel' | 'kaarten'
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
    displayed = displayed.filter((l) => {
      const adres = [l.straat, l.huisnummer, l.postcode, l.plaats]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (
        l.naam.toLowerCase().includes(search) ||
        adres.includes(search) ||
        l.telefoon.toLowerCase().includes(search)
      )
    })
  }

  const actief = allLeads.filter((l) => l.dashboard_status !== 'afgehandeld').length

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Leads</div>
          <div className="dash-section-sub">
            <LiveDot />
            <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
              {actief} actief · {total} totaal
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href="/leads?export=1"
            className="dash-btn dash-btn-secondary"
          >
            <FileText size={13} />
            Export
          </a>
          <button type="button" className="dash-btn dash-btn-secondary" disabled>
            <Filter size={13} />
            Filters
          </button>
          <a
            href="/leads?nieuwe-offerte=1"
            className="dash-btn dash-btn-primary"
          >
            <Plus size={13} />
            Nieuwe offerte
          </a>
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
      ) : view === 'tabel' ? (
        <LeadsTable leads={displayed} />
      ) : view === 'kaarten' ? (
        <LeadsKaarten leads={displayed} />
      ) : (
        <LeadsPipeline leads={displayed} />
      )}

      <LeadsRealtimeToast />
    </>
  )
}

import { LeadsSearchBar } from '@/components/dashboard/leads/LeadsSearchBar'
function SearchBar({ initial }: { initial: string }) {
  return <LeadsSearchBar initial={initial} />
}
