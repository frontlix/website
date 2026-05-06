'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import {
  parseLeadsFilters,
  serializeLeadsFilters,
  countActiveFilters,
  type LeadsFilters,
} from '@/lib/dashboard/lead-filters'
import {
  dashboardStatusLabel,
  gesprekFaseLabel,
  formatDateNL,
} from '@/lib/dashboard/format'
import type { Tag } from '@/lib/dashboard/database.types'
import { LeadsFilterPanel } from './LeadsFilterPanel'
import styles from './LeadsFilterBar.module.css'

const SEARCH_DEBOUNCE_MS = 300

export function LeadsFilterBar({ allTags }: { allTags: Tag[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [panelOpen, setPanelOpen] = useState(false)

  const filters = parseLeadsFilters(
    Object.fromEntries(searchParams.entries())
  )
  const [searchValue, setSearchValue] = useState(filters.q ?? '')

  // Debounced search → URL update (300ms delay)
  useEffect(() => {
    if (searchValue === (filters.q ?? '')) return
    const t = setTimeout(() => {
      updateFilters({ ...filters, q: searchValue || undefined })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  const updateFilters = (next: LeadsFilters) => {
    const qs = serializeLeadsFilters(next)
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  // Individual chip remove handlers
  const removeStatus = () =>
    updateFilters({ ...filters, status: undefined })
  const removeTags = () =>
    updateFilters({ ...filters, tags: undefined })
  const removeDate = () =>
    updateFilters({
      ...filters,
      dateField: undefined,
      from: undefined,
      to: undefined,
    })
  const removeFase = () => updateFilters({ ...filters, fase: undefined })

  const tagsById = new Map(allTags.map((t) => [t.id, t]))
  const count = countActiveFilters(filters)

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            placeholder="Zoek naam of telefoon…"
            className={styles.search}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Zoek leads"
          />
        </div>
        <button
          type="button"
          className={`${styles.filterBtn} ${
            panelOpen ? styles.filterBtnOpen : ''
          }`}
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          <SlidersHorizontal size={14} />
          Filters{count > 0 && <span className={styles.count}>({count})</span>}
        </button>
      </div>

      {panelOpen && (
        <LeadsFilterPanel
          filters={filters}
          allTags={allTags}
          onApply={(next) => {
            setPanelOpen(false)
            updateFilters(next)
          }}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {/* Active filter chips — shown only when at least one filter is set */}
      {count > 0 && (
        <div className={styles.chips}>
          {filters.status && (
            <span className={styles.chip}>
              Status: {dashboardStatusLabel(filters.status)}
              <button
                type="button"
                onClick={removeStatus}
                aria-label="Status-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.tags && filters.tags.length > 0 && (
            <span className={styles.chip}>
              Tags:{' '}
              {filters.tags
                .map((id) => tagsById.get(id)?.naam ?? id)
                .join(', ')}
              <button
                type="button"
                onClick={removeTags}
                aria-label="Tag-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {(filters.from || filters.to) && (
            <span className={styles.chip}>
              {filters.dateField === 'bijgewerkt' ? 'Bijgewerkt' : 'Aangemaakt'}
              {filters.from ? ` van ${formatDateNL(filters.from)}` : ''}
              {filters.to ? ` t/m ${formatDateNL(filters.to)}` : ''}
              <button
                type="button"
                onClick={removeDate}
                aria-label="Datum-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.fase && (
            <span className={styles.chip}>
              Fase: {gesprekFaseLabel(filters.fase)}
              <button
                type="button"
                onClick={removeFase}
                aria-label="Fase-filter verwijderen"
                className={styles.chipRemove}
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
