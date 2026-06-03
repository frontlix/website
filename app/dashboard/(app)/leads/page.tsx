import { cookies } from 'next/headers'
import { FileText, Plus } from 'lucide-react'
import { getLeadsList, countAllLeads, type LeadListItem } from '@/lib/dashboard/lead-queries'
import { LeadsPipeline } from '@/components/dashboard/leads/LeadsPipeline'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'
import { LeadsKaarten } from '@/components/dashboard/leads/LeadsKaarten'
import { LeadsFilterTabs } from '@/components/dashboard/leads/LeadsFilterTabs'
import { WebChatToggle } from '@/components/dashboard/leads/WebChatToggle'
import { LeadsFilterPanel } from '@/components/dashboard/leads/LeadsFilterPanel'
import { MobileFiltersSheet } from '@/components/dashboard/leads/MobileFiltersSheet'
import { LeadsRealtimeToast } from '@/components/dashboard/leads/LeadsRealtimeToast'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { MobileLeads } from '@/components/dashboard/mobile/leads/MobileLeads'
import {
  mapLeadToCard,
  leadStage,
  isLeadUrgent,
  type MobileLeadStage,
} from '@/components/dashboard/mobile/leads/lead-mappers'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type FilterKey = 'all' | 'in_gesprek' | 'review' | 'offerte_uit' | 'ingepland' | 'afgerond' | 'archief'

// Stage-volgorde voor de "Sorteer op fase"-optie (zelfde als mobile MobileLeads).
const STAGE_ORDER: Record<MobileLeadStage, number> = {
  gesprek: 0,
  review: 1,
  uit: 2,
  gepland: 3,
  klaar: 4,
}

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
    case 'archief':
      // Archief-leads worden via een aparte query opgehaald, dus matcht alles wat
      // door de query heen komt (al gefilterd op dashboard_archived=true).
      return true
  }
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string
    q?: string
    view?: string
    kanaal?: string
    bron?: string
    urgent?: string
    sort?: string
  }>
}) {
  const sp = await searchParams

  const activeFilter = (
    ['all', 'in_gesprek', 'review', 'offerte_uit', 'ingepland', 'afgerond', 'archief'].includes(
      sp.filter ?? '',
    )
      ? sp.filter
      : 'all'
  ) as FilterKey

  // View-resolutie: expliciete `?view=` wint, anders fallback op de
  // `leads_view` cookie (geschreven door LeadsViewSwitcher). We doen GEEN
  // redirect: dat zou een extra round-trip toevoegen waardoor je een
  // korte flash van de pipeline-view ziet (Next router-cache toont eerst
  // de oude RSC voor /leads voordat de redirect doorzet). Door direct te
  // renderen vanaf de cookie is er één request en geen flash.
  let view: 'pipeline' | 'tabel' | 'kaarten' = 'pipeline'
  if (sp.view === 'pipeline' || sp.view === 'tabel' || sp.view === 'kaarten') {
    view = sp.view
  } else {
    const cookieStore = await cookies()
    const stored = cookieStore.get('leads_view')?.value
    if (stored === 'tabel' || stored === 'kaarten' || stored === 'pipeline') {
      view = stored
    }
  }

  const search = (sp.q ?? '').trim().toLowerCase()
  const kanaalFilter = sp.kanaal === 'web' ? 'web' : null

  // Voor de archief-tab vragen we een aparte query op (dashboard_archived=true);
  // anders zou matchesFilter('archief') altijd 0 leads tonen want de standaard
  // query filtert die juist weg.
  const [allLeads, archivedLeads, total] = await Promise.all([
    getLeadsList(),
    getLeadsList(undefined, { archived: true }),
    countAllLeads(),
  ])

  // Counts per tab, over ALLE leads (niet de gefilterde view) zodat de
  // counts stabiel blijven terwijl je tussen tabs schakelt.
  const counts: Record<FilterKey, number> = {
    all:         allLeads.length,
    in_gesprek:  allLeads.filter((l) => matchesFilter(l, 'in_gesprek')).length,
    review:      allLeads.filter((l) => matchesFilter(l, 'review')).length,
    offerte_uit: allLeads.filter((l) => matchesFilter(l, 'offerte_uit')).length,
    ingepland:   allLeads.filter((l) => matchesFilter(l, 'ingepland')).length,
    afgerond:    allLeads.filter((l) => matchesFilter(l, 'afgerond')).length,
    archief:     archivedLeads.length,
  }

  // Bron-lijst: voor archief gebruiken we de aparte set, anders de standaard.
  const sourceLeads = activeFilter === 'archief' ? archivedLeads : allLeads

  // Web-chat count over ALLE niet-gearchiveerde leads, los van actieve filters.
  const webCount = allLeads.filter((l) => l.kanaal === 'web').length

  // Eerst tab-filter, dan kanaal-filter, dan search, alle cumulatief.
  let displayed = sourceLeads.filter((l) => matchesFilter(l, activeFilter))
  if (kanaalFilter) {
    displayed = displayed.filter((l) => l.kanaal === kanaalFilter)
  }
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

  // ── Geavanceerde filters (LeadsFilterPanel), bron / urgent / sortering ──
  // Bron: Formulier = kanaal 'web'; WhatsApp = al het andere (incl. null),
  // zelfde semantiek als de mobile bron-filter.
  const bronFilter = sp.bron === 'wa' || sp.bron === 'form' ? sp.bron : null
  if (bronFilter === 'form') {
    displayed = displayed.filter((l) => l.kanaal === 'web')
  } else if (bronFilter === 'wa') {
    displayed = displayed.filter((l) => l.kanaal !== 'web')
  }

  if (sp.urgent === '1') {
    displayed = displayed.filter((l) => isLeadUrgent(l))
  }

  // Sortering, 'binnen' (default) behoudt de server-volgorde (aangemaakt DESC).
  const sortKey = sp.sort
  if (sortKey === 'prijs') {
    displayed = [...displayed].sort(
      (a, b) => (b.totaal_prijs ?? 0) - (a.totaal_prijs ?? 0),
    )
  } else if (sortKey === 'naam') {
    displayed = [...displayed].sort((a, b) =>
      (a.naam ?? '').localeCompare(b.naam ?? '', 'nl'),
    )
  } else if (sortKey === 'fase') {
    displayed = [...displayed].sort(
      (a, b) => STAGE_ORDER[leadStage(a)] - STAGE_ORDER[leadStage(b)],
    )
  }

  // Of er geavanceerde filters actief zijn (voor de empty-state copy).
  const advFiltersActive = bronFilter !== null || sp.urgent === '1'

  const actief = allLeads.filter((l) => l.dashboard_status !== 'afgehandeld').length

  // chatbotNaam: default 'Surface' (geen extra query om race-conditions te vermijden;
  // de naam is puur cosmetic in de mobile UI)
  const chatbotNaam = 'Surface'

  return (
    <>
      {/* ── Desktop tree (verborgen op ≤ 640px) ──────────────────────────── */}
      <div className={styles.desktopTree}>
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
            <LeadsFilterPanel />
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
          {/* Desktop-filters: verborgen op ≤ 640px; mobiel toont MobileFiltersSheet */}
          <div className={styles.desktopFilters}>
            <LeadsFilterTabs counts={counts} />
            <WebChatToggle count={webCount} />
          </div>
          {/* Mobile-only filter-trigger */}
          <MobileFiltersSheet
            filterTabs={{ counts }}
            webChat={{ count: webCount }}
          />
          <SearchBar initial={search} />
        </div>

        {displayed.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Geen leads gevonden</div>
            <div className={styles.emptySub}>
              {search || activeFilter !== 'all' || advFiltersActive
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
      </div>

      {/* ── Mobile tree (alleen zichtbaar op ≤ 640px) ─────────────────────── */}
      <div className={styles.mobileTree}>
        <MobileLeads
          data={{
            cards: displayed.map((l) => mapLeadToCard(l)),
            telefoonById: Object.fromEntries(
              displayed.map((l) => [l.lead_id, l.telefoon ?? '']),
            ),
            counts: {
              all:     counts.all,
              gesprek: counts.in_gesprek,
              review:  counts.review,
              uit:     counts.offerte_uit,
              gepland: counts.ingepland,
              klaar:   counts.afgerond,
            },
            chatbotNaam,
          }}
        />
      </div>
    </>
  )
}

import { LeadsSearchBar } from '@/components/dashboard/leads/LeadsSearchBar'
function SearchBar({ initial }: { initial: string }) {
  return <LeadsSearchBar initial={initial} />
}
