import { getLeadsList, getLastInboundByLeadIds, type LeadListItem } from '@/lib/dashboard/lead-queries'
import { MobileLeads } from '@/components/dashboard/mobile/leads/MobileLeads'
import {
  mapLeadToCard,
  leadStage,
  isLeadUrgent,
  type MobileLeadStage,
} from '@/components/dashboard/mobile/leads/lead-mappers'
import { getAllTags, getTagIdsByLeadIds } from '@/lib/dashboard/tag-queries'
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

// Eén bron van waarheid voor de fase-indeling: `leadStage()` (dezelfde functie
// die mobiel/v2 én de pipeline gebruiken). Dit voorkomt drift waarbij de
// desktop-tabs op rauwe `gesprek_fase` keken terwijl de pipeline/mobiel op
// `leadStage` keken. Belangrijk: "Offerte review" hangt aan
// `pending_eigenaar_review` (offerte wacht op owner-goedkeuring), NIET aan
// `gesprek_fase === 'onderhandelen'` — die laatste betekent "offerte al
// verstuurd, klant onderhandelt" en hoort dus bij "Offerte uit".
const FILTER_TO_STAGE: Record<
  Exclude<FilterKey, 'all' | 'archief'>,
  MobileLeadStage
> = {
  in_gesprek: 'gesprek',
  review: 'review',
  offerte_uit: 'uit',
  ingepland: 'gepland',
  afgerond: 'klaar',
}

function matchesFilter(lead: LeadListItem, key: FilterKey): boolean {
  switch (key) {
    case 'all':
      return true
    case 'archief':
      // Archief-leads worden via een aparte query opgehaald, dus matcht alles wat
      // door de query heen komt (al gefilterd op dashboard_archived=true).
      return true
    default:
      return leadStage(lead) === FILTER_TO_STAGE[key]
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

  const search = (sp.q ?? '').trim().toLowerCase()
  const kanaalFilter = sp.kanaal === 'web' ? 'web' : null

  // Voor de archief-tab vragen we een aparte query op (dashboard_archived=true);
  // anders zou matchesFilter('archief') altijd 0 leads tonen want de standaard
  // query filtert die juist weg.
  const [allLeads, archivedLeads] = await Promise.all([
    getLeadsList(),
    getLeadsList(undefined, { archived: true }),
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

  // chatbotNaam: default 'Surface' (geen extra query om race-conditions te vermijden;
  // de naam is puur cosmetic in de mobile UI)
  const chatbotNaam = 'Surface'

  // Laatste klant-interactie (laatste inkomende bericht) per getoonde lead, voor
  // de "binnen"-indicator op de mobiele kaart. Bewust niet leads.bijgewerkt (zie
  // getLastInboundByLeadIds). Eén query, gescoped op de zichtbare + gearchiveerde
  // leads (de mobiele UI toont beide sets, geschakeld via de Archief-chip).
  const shownIds = [
    ...displayed.map((l) => l.lead_id),
    ...archivedLeads.map((l) => l.lead_id),
  ]
  const lastInboundById = await getLastInboundByLeadIds(shownIds)
  const [tagIdsByLead, allTags] = await Promise.all([
    getTagIdsByLeadIds(shownIds),
    getAllTags(),
  ])
  const nowMs = Date.now()

  return (
    <div className={styles.mobileTree}>
      <MobileLeads
        data={{
          cards: displayed.map((l) =>
            mapLeadToCard(l, nowMs, lastInboundById.get(l.lead_id) ?? null, tagIdsByLead.get(l.lead_id) ?? []),
          ),
          // Gearchiveerde leads voor de Archief-chip (client-side geschakeld,
          // net als de stage-chips). Eigen query, dashboard_archived=true.
          archivedCards: archivedLeads.map((l) =>
            mapLeadToCard(l, nowMs, lastInboundById.get(l.lead_id) ?? null, tagIdsByLead.get(l.lead_id) ?? []),
          ),
          telefoonById: Object.fromEntries(
            [...displayed, ...archivedLeads].map((l) => [l.lead_id, l.telefoon ?? '']),
          ),
          counts: {
            all:     counts.all,
            gesprek: counts.in_gesprek,
            review:  counts.review,
            uit:     counts.offerte_uit,
            gepland: counts.ingepland,
            klaar:   counts.afgerond,
            archief: counts.archief,
          },
          chatbotNaam,
          allTags,
        }}
      />
    </div>
  )
}
