'use client'

// AgendaMonth, compacte 7-koloms maandweergave voor de mobiele agenda.
// Consumeert AgendaMaandCel[] (zelfde mappers als de desktop-maand, NIET het
// mobiele AgendaEvent-type). Per dag: dagnummer + telling-puntje als er
// afspraken zijn; "vandaag" gemarkeerd; dagen buiten de maand gedimd. Tik op
// een dag → toont de afspraken van die dag in een lijstje onder de grid.
// Maand vorige/volgende-navigatie via ?month=YYYY-MM (Link, server-fetch).

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react'
import type { AgendaMaandCel, AgendaItem, AgendaType } from '@/components/dashboard/v2/agenda/agenda-data'
import { MonthPickerSheet } from './MonthPickerSheet'
import styles from './AgendaMonth.module.css'

const WEEKDAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

/** Accentkleur per afspraaktype, in MOBIELE --color-* tokens (geen v2 --rb-*). */
function typeTone(type: AgendaType): string {
  switch (type) {
    case 'klus':
      return 'var(--color-primary)'
    case 'bezoek':
      return 'var(--color-warning)'
    case 'deadline':
      return 'var(--color-warning-strong)'
    default:
      // intern/belafspraak → neutraal.
      return 'var(--color-text-muted)'
  }
}

interface AgendaMonthProps {
  cells: AgendaMaandCel[]
  /** Maand-label, bv. "Juni 2026". */
  monthLabel: string
  /** Jaar van de getoonde maand (voor de maand/jaar-kiezer). */
  monthYear: number
  /** Maand (1-12) van de getoonde maand (voor de maand/jaar-kiezer). */
  monthMonth: number
  /** ?month=YYYY-MM-key van de vorige maand. */
  prevMonthKey: string
  /** ?month=YYYY-MM-key van de volgende maand. */
  nextMonthKey: string
  /** True → "Deze maand"-knop inactief (we staan al op de huidige maand). */
  isCurrentMonth: boolean
  /** Tik op een afspraak → opent het detail (zelfde drilldown als de week).
   *  `dateKey` is de dag van de afspraak (YYYY-MM-DD). */
  onOpenItem?: (item: AgendaItem, dateKey: string) => void
}

export function AgendaMonth({
  cells,
  monthLabel,
  monthYear,
  monthMonth,
  prevMonthKey,
  nextMonthKey,
  isCurrentMonth,
  onOpenItem,
}: AgendaMonthProps) {
  // Maand/jaar-kiezer (bottom-sheet): tik op de maandnaam-kop opent 'm.
  const [pickerOpen, setPickerOpen] = useState(false)
  // Geselecteerde dag (dateKey). Default: vandaag als die in de maand valt,
  // anders de eerste in-maand-dag met afspraken, anders niets.
  const today = cells.find((c) => c.vandaag && c.inMaand)
  const eersteMetItems = cells.find((c) => c.inMaand && c.items.length > 0)
  const [selKey, setSelKey] = useState<string | null>(
    today?.dateKey ?? eersteMetItems?.dateKey ?? null,
  )

  const selCel = cells.find((c) => c.dateKey === selKey) ?? null

  return (
    <div className={styles.root}>
      {/* Maand-navigatie */}
      <nav className={styles.nav} aria-label="Maand-navigatie">
        <Link
          href={`/agenda?view=maand&month=${prevMonthKey}`}
          className={styles.arrow}
          aria-label="Vorige maand"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>

        <button
          type="button"
          className={styles.label}
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
        >
          <span className={styles.labelText}>{monthLabel}</span>
          <ChevronDown size={15} className={styles.labelChev} aria-hidden="true" />
        </button>

        <Link
          href={`/agenda?view=maand&month=${nextMonthKey}`}
          className={styles.arrow}
          aria-label="Volgende maand"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </Link>

        {isCurrentMonth ? (
          <span className={styles.today} data-disabled="true" aria-disabled="true">
            Nu
          </span>
        ) : (
          <Link href="/agenda?view=maand" className={styles.today}>
            Nu
          </Link>
        )}
      </nav>

      {/* Weekdag-kop */}
      <div className={styles.weekHead}>
        {WEEKDAGEN.map((d) => (
          <span key={d} className={styles.weekHeadCell}>
            {d}
          </span>
        ))}
      </div>

      {/* Maand-grid */}
      <div className={styles.grid}>
        {cells.map((c) => {
          const aantal = c.items.length
          const heeftItems = c.inMaand && aantal > 0
          const isSel = c.dateKey === selKey
          return (
            <button
              key={c.dateKey}
              type="button"
              className={styles.cell}
              data-out={!c.inMaand || undefined}
              data-today={c.vandaag || undefined}
              data-past={(c.verleden && c.inMaand) || undefined}
              data-sel={isSel || undefined}
              onClick={() => c.inMaand && setSelKey(c.dateKey)}
              disabled={!c.inMaand}
              aria-label={`${c.dag}${heeftItems ? `, ${aantal} afspra${aantal === 1 ? 'ak' : 'ken'}` : ''}`}
            >
              <span className={styles.dayNum}>{c.dag}</span>
              {heeftItems && (
                <span className={styles.dots} aria-hidden="true">
                  {aantal <= 3 ? (
                    c.items.slice(0, 3).map((it, i) => (
                      <span
                        key={i}
                        className={styles.dot}
                        style={{ '--dot': typeTone(it.type) } as React.CSSProperties}
                      />
                    ))
                  ) : (
                    <span className={styles.count}>{aantal}</span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Afspraken van de geselecteerde dag */}
      <div className={styles.dayList}>
        {selCel && selCel.items.length > 0 ? (
          selCel.items.map((it, i) => (
            <button
              key={it.key ?? `${selCel.dateKey}-${it.tijd}-${i}`}
              type="button"
              className={styles.dayItem}
              style={{ '--tone': typeTone(it.type) } as React.CSSProperties}
              onClick={() => onOpenItem?.(it, selCel.dateKey)}
              data-klaar={it.klaar || undefined}
            >
              <span className={styles.itemTijd}>{it.tijd || '—'}</span>
              <span className={styles.itemBody}>
                <span className={styles.itemTitel}>
                  {it.klaar && <Check size={12} className={styles.itemCheck} aria-hidden="true" />}
                  {it.titel}
                </span>
                {it.sub && <span className={styles.itemSub}>{it.sub}</span>}
              </span>
            </button>
          ))
        ) : (
          <p className={styles.empty}>
            {selCel ? 'Geen afspraken op deze dag.' : 'Kies een dag in de maand.'}
          </p>
        )}
      </div>

      <MonthPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentYear={monthYear}
        currentMonth={monthMonth}
      />
    </div>
  )
}
