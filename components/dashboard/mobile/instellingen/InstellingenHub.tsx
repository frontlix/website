'use client'

import { useMemo, useState } from 'react'
import { Search, X, ChevronRight } from 'lucide-react'
import { InstGroupCard, InstSectionIcon } from './InstAtoms'
import { matchSections } from './inst-helpers'
import { type InstSection, type InstGroup } from './instellingen-mock'
import styles from './InstellingenHub.module.css'

/**
 * Mobiele Instellingen-hub. `groups` bevat de gegroepeerde secties (met echte
 * counts in de subtitels) — die voedt zowel het zoekresultaat als de grid.
 */
export function InstellingenHub({
  groups,
  onOpen,
}: {
  groups: InstGroup[]
  onOpen: (key: string) => void
}) {
  const [q, setQ] = useState('')
  // Platte lijst voor de zoekfilter (alle secties over alle groepen heen).
  const allSections = useMemo<InstSection[]>(
    () => groups.flatMap((g) => g.items),
    [groups],
  )
  const matches = matchSections(allSections, q)

  return (
    <div className={styles.hub}>
      <div className={styles.searchWrap}>
        <div className={styles.search}>
          <Search size={16} aria-hidden="true" className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek een instelling…"
          />
          {q && (
            <button type="button" className={styles.clear} onClick={() => setQ('')} aria-label="Wis zoekopdracht">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {q ? (
        <div className={styles.results}>
          <InstGroupCard>
            {matches.length === 0 && <div className={styles.empty}>Niets gevonden</div>}
            {matches.map((it) => (
              <SearchRow key={it.k} item={it} onOpen={onOpen} />
            ))}
          </InstGroupCard>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.group} className={styles.group}>
            <h2 className={styles.groupLabel}>{g.group}</h2>
            <div className={styles.grid}>
              {g.items.map((it) => (
                <button key={it.k} type="button" className={styles.card} onClick={() => onOpen(it.k)}>
                  <InstSectionIcon name={it.icon} tint={it.tint} size={19} />
                  <div className={styles.cardText}>
                    <div className={styles.cardTitle}>{it.l}</div>
                    <div className={styles.cardSub}>{it.s}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function SearchRow({ item, onOpen }: { item: InstSection; onOpen: (k: string) => void }) {
  return (
    <button type="button" className={styles.searchRow} onClick={() => onOpen(item.k)}>
      <InstSectionIcon name={item.icon} tint={item.tint} size={16} small />
      <div className={styles.searchRowText}>
        <div className={styles.cardTitle}>{item.l}</div>
        <div className={styles.cardSub}>{item.s}</div>
      </div>
      <ChevronRight size={16} aria-hidden="true" className={styles.chev} />
    </button>
  )
}
