'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { archiveLead, unarchiveLead } from '@/lib/dashboard/lead-actions'
import { LiveDot } from '@/components/dashboard/ui/LiveDot'
import { type MobileLeadCard, type MobileLeadStage } from './lead-mappers'
import { LeadsSegmentedChips, type SegmentedChip } from './LeadsSegmentedChips'
import { SwipeableLeadCard } from './SwipeableLeadCard'
import { LeadExpandedPanel } from './LeadExpandedPanel'
import { LeadsFilterSheet, type AdvFilter } from './LeadsFilterSheet'
import styles from './MobileLeads.module.css'

// ── Stage-chips configuratie (volgorde = navigatie) ───────────────────────────
const CHIPS: SegmentedChip[] = [
  { key: 'all',     label: 'Alles',    count: 0, tone: undefined },
  { key: 'gesprek', label: 'Gesprek',  count: 0, tone: 'blue' },
  { key: 'review',  label: 'Review',   count: 0, tone: 'amber' },
  { key: 'uit',     label: 'Offerte',  count: 0, tone: 'violet' },
  { key: 'gepland', label: 'Gepland',  count: 0, tone: 'green' },
  { key: 'klaar',   label: 'Klaar',    count: 0, tone: 'gray' },
  { key: 'archief', label: 'Archief',  count: 0, tone: 'gray' },
]

// ── Stage-volgorde voor sortering op fase ─────────────────────────────────────
const STAGE_ORDER: Record<MobileLeadStage, number> = {
  gesprek: 0, review: 1, uit: 2, gepland: 3, klaar: 4,
}

export interface MobileLeadsData {
  cards: MobileLeadCard[]
  /** Gearchiveerde leads (dashboard_archived=true), getoond via de Archief-chip. */
  archivedCards: MobileLeadCard[]
  /** leadId → telefoonnummer, voor swipe Bel/WA */
  telefoonById: Record<string, string>
  /** Counts per stage + 'all' + 'archief' */
  counts: {
    all: number
    gesprek: number
    review: number
    uit: number
    gepland: number
    klaar: number
    archief: number
  }
  chatbotNaam: string
}

interface Props {
  data: MobileLeadsData
}

const DEFAULT_ADV_FILTER: AdvFilter = {
  stages:     new Set<MobileLeadStage>(['gesprek', 'review', 'uit', 'gepland', 'klaar']),
  bronnen:    new Set<'wa' | 'form'>(['wa', 'form']),
  urgentOnly: false,
  sort:       'binnen',
}

/**
 * MobileLeads, client-side shell voor het mobile /leads scherm.
 *
 * State:
 *  - filter: actieve segmented chip ('all' of stage-key)
 *  - searchOpen: of de search-input zichtbaar is
 *  - search: zoekterm (naam/plaats/telefoon)
 *  - expandedId: lead-id waarvan het ExpandedPanel open staat
 *  - sheetOpen: of de LeadsFilterSheet open is
 *  - advFilter: geavanceerde filter-instellingen (stages/bron/urgent/sort)
 */
export function MobileLeads({ data }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [filter,     setFilter]     = useState<string>('all')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search,     setSearch]     = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [advFilter,  setAdvFilter]  = useState<AdvFilter>(DEFAULT_ADV_FILTER)
  // Welke kaart momenteel open-geveegd is, zodat een nieuwe veeg de vorige sluit.
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null)
  const handleSwipeOpen = useCallback((id: string) => setSwipeOpenId(id), [])

  // ── Verwerkte chips met live counts ──────────────────────────────────────────
  const chips: SegmentedChip[] = CHIPS.map((c) => ({
    ...c,
    count: c.key === 'all'
      ? data.counts.all
      : data.counts[c.key as keyof typeof data.counts] ?? 0,
  }))

  // ── Filteren (zonder sorteren) ───────────────────────────────────────────────
  // Gedeelde helper voor zowel de zichtbare lijst als de live-telling in de
  // filter-sheet, zodat beide gegarandeerd hetzelfde resultaat geven. Past de
  // segmented-chip + de meegegeven geavanceerde filter + de zoekterm toe.
  const filterCards = useCallback(
    (f: AdvFilter): MobileLeadCard[] => {
      // Archief-chip toont de gearchiveerde set; de stage-chips de actieve.
      const isArchief = filter === 'archief'
      let list = isArchief ? data.archivedCards : data.cards
      // Segmented-chip filter (overslaan in archief: 'archief' is geen stage)
      if (!isArchief && filter !== 'all') {
        list = list.filter((c) => c.stage === filter)
      }
      // Advanced filter: stages
      list = list.filter((c) => f.stages.has(c.stage))
      // Advanced filter: bronnen
      list = list.filter((c) => f.bronnen.has(c.bron))
      // Advanced filter: urgentOnly
      if (f.urgentOnly) list = list.filter((c) => c.urgent)
      // Client-side zoeken: naam / plaats (telefoon via swipe-acties, geen tekst in card)
      if (search) {
        const q = search.toLowerCase()
        list = list.filter(
          (c) =>
            c.naam.toLowerCase().includes(q) ||
            c.plaats.toLowerCase().includes(q) ||
            (data.telefoonById[c.id] ?? '').includes(q),
        )
      }
      return list
    },
    [data.cards, data.archivedCards, data.telefoonById, filter, search],
  )

  // ── Gefilterd + gesorteerde kaarten ──────────────────────────────────────────
  const visible = useMemo(() => {
    const list = filterCards(advFilter)
    // Sortering (verandert het aantal niet, alleen de volgorde)
    return [...list].sort((a, b) => {
      switch (advFilter.sort) {
        case 'prijs':
          return (b.prijs ?? 0) - (a.prijs ?? 0)
        case 'naam':
          return a.naam.localeCompare(b.naam, 'nl')
        case 'fase':
          return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]
        case 'binnen':
        default:
          return 0 // server levert al in aankomsstvolgorde
      }
    })
  }, [filterCards, advFilter])

  // Live aantal voor de "Toon X leads"-knop: telt op basis van een (concept-)
  // filter, zodat de sheet het juiste aantal toont vóór toepassen.
  const countFor = useCallback((f: AdvFilter) => filterCards(f).length, [filterCards])

  // Actieve geavanceerde filters tellen (voor badge + strip)
  const advCount =
    (advFilter.stages.size < 5 ? 1 : 0) +
    (advFilter.bronnen.size < 2 ? 1 : 0) +
    (advFilter.urgentOnly ? 1 : 0) +
    (advFilter.sort !== 'binnen' ? 1 : 0)

  // Collapse expanded card bij filter-wijziging
  function handleFilter(key: string) {
    setFilter(key)
    setExpandedId(null)
    setSwipeOpenId(null)
  }

  function handleToggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function handleOpenLead(id: string) {
    router.push(`/leads/${id}`)
  }

  function handleArchive(id: string) {
    // Geen bevestiging: de lead verschijnt direct onder de Archief-chip en is
    // daar met één veeg/knop ("Herstel") terug te halen.
    startTransition(async () => {
      await archiveLead(id)
      // Server-data herladen zodat de gearchiveerde lead uit de lijst valt
      router.refresh()
    })
  }

  function handleUnarchive(id: string) {
    // Herstel zet de lead terug in de pipeline; verdwijnt dan uit het archief.
    startTransition(async () => {
      await unarchiveLead(id)
      router.refresh()
    })
  }

  function handleToggleSearch() {
    setSearchOpen((v) => {
      if (v) setSearch('')
      return !v
    })
  }

  return (
    <div className={styles.root}>
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header className={styles.header}>
        {searchOpen ? (
          /* Inline search-bar */
          <div className={styles.searchBar}>
            <div className={styles.searchInput}>
              {/* Search icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                type="search"
                placeholder="Zoek naam, plaats, telefoon…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInputEl}
                aria-label="Zoek leads"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className={styles.searchClear} aria-label="Wis zoekopdracht">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <button type="button" className={styles.searchClose} onClick={handleToggleSearch}>
              Sluit
            </button>
          </div>
        ) : (
          /* Normale header */
          <div className={styles.headerInner}>
            <div className={styles.titleBlock}>
              <h1 className={styles.title}>Leads</h1>
              <p className={styles.subtitle}>
                <LiveDot />
                <span>
                  {visible.length} van{' '}
                  {filter === 'archief' ? data.counts.archief : data.counts.all} zichtbaar
                </span>
              </p>
            </div>
            <div className={styles.actions}>
              {/* Search button */}
              <button
                type="button"
                className={styles.actionBtn}
                onClick={handleToggleSearch}
                aria-label="Zoeken"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              {/* Filter button met badge */}
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setSheetOpen(true)}
                aria-label="Filters"
                aria-haspopup="dialog"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {advCount > 0 && (
                  <span className={styles.filterBadge} aria-label={`${advCount} actieve filters`}>
                    {advCount}
                  </span>
                )}
              </button>
              {/* Nieuwe offerte, accent gradient */}
              <Link
                href="/leads?nieuwe-offerte=1"
                className={styles.actionBtnPrimary}
                aria-label="Nieuwe offerte aanmaken"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Sticky segmented chips ─────────────────────────────────────────── */}
      <div className={styles.chipsWrap}>
        <LeadsSegmentedChips
          active={filter}
          chips={chips}
          onSelect={handleFilter}
        />
      </div>

      {/* ── Actieve-filter strip (conditioneel) ───────────────────────────── */}
      {advCount > 0 && (
        <div className={styles.filterStripWrap}>
          <div className={styles.filterStrip}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className={styles.filterStripText}>
              {advCount} actief filter{advCount === 1 ? '' : 's'} · {visible.length} resultaten
            </span>
            <button
              type="button"
              className={styles.filterStripWis}
              onClick={() => setAdvFilter(DEFAULT_ADV_FILTER)}
            >
              Wis
            </button>
          </div>
        </div>
      )}

      {/* ── Lead-lijst ────────────────────────────────────────────────────── */}
      <div className={styles.list}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            <svg className={styles.emptyIcon} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>Geen leads die matchen, wis filters of zoekterm.</p>
          </div>
        ) : (
          visible.map((lead) => (
            <div key={lead.id}>
              <SwipeableLeadCard
                lead={lead}
                telefoon={data.telefoonById[lead.id] ?? ''}
                expanded={expandedId === lead.id}
                onToggleExpand={handleToggleExpand}
                onArchive={handleArchive}
                archived={filter === 'archief'}
                onUnarchive={handleUnarchive}
                swipeOpenId={swipeOpenId}
                onSwipeOpen={handleSwipeOpen}
              />
              {expandedId === lead.id && (
                <LeadExpandedPanel
                  lead={lead}
                  onClose={() => setExpandedId(null)}
                  onOpenLead={handleOpenLead}
                  archived={filter === 'archief'}
                  onUnarchive={handleUnarchive}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Filter sheet ──────────────────────────────────────────────────── */}
      <LeadsFilterSheet
        open={sheetOpen}
        value={advFilter}
        countFor={countFor}
        onApply={setAdvFilter}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
