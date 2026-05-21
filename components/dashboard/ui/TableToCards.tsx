'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './TableToCards.module.css'

export type MobilePriority = 'primary' | 'secondary' | 'hidden'

export interface Column<T> {
  key: string
  label: string
  /** Custom render-functie (default: `String(row[key])`). */
  render?: (row: T) => React.ReactNode
  /**
   * Op mobile: primary = grote regel bovenaan, secondary = grid eronder.
   * hidden = compleet verborgen op ALLE viewports (niet alleen mobile).
   */
  mobile?: MobilePriority
  /** Optionele rechter-uitlijning (bv. bedragen). */
  align?: 'left' | 'right'
}

export interface TableToCardsProps<T> {
  columns: Array<Column<T>>
  rows: T[]
  keyField: keyof T
  /** Maakt elke rij een Next.js Link naar deze href. */
  rowHref?: (row: T) => string
  emptyState?: React.ReactNode
}

export function TableToCards<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  rowHref,
  emptyState,
}: TableToCardsProps<T>) {
  const router = useRouter()

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  // Eenmalig berekend buiten alle loops — stabiel voor elke rij.
  const primaries = columns.filter((c) => c.mobile === 'primary')
  // Alles wat niet primary of hidden is, telt als secondary in de card-grid.
  const secondaries = columns.filter(
    (c) => c.mobile === 'secondary' || c.mobile === undefined,
  )

  return (
    <>
      {/* Desktop: tabel — hidden-kolommen worden ook hier uitgesloten */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns
                .filter((col) => col.mobile !== 'hidden')
                .map((col) => (
                  <th
                    key={col.key}
                    className={col.align === 'right' ? styles.alignRight : undefined}
                  >
                    {col.label}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = String(row[keyField])
              const handleClick = rowHref
                ? () => router.push(rowHref(row))
                : undefined
              return (
                <tr
                  key={key}
                  className={rowHref ? styles.row : undefined}
                  onClick={handleClick}
                  // Keyboard-accessibility: Enter/Space activeren de navigatie.
                  tabIndex={rowHref ? 0 : undefined}
                  role={rowHref ? 'link' : undefined}
                  onKeyDown={
                    rowHref
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleClick?.()
                          }
                        }
                      : undefined
                  }
                >
                  {columns
                    .filter((col) => col.mobile !== 'hidden')
                    .map((col) => (
                      <td
                        key={col.key}
                        className={col.align === 'right' ? styles.alignRight : undefined}
                      >
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards — schakelaar is puur CSS (geen client-side branching) */}
      <div className={styles.cards}>
        {rows.map((row) => {
          const key = String(row[keyField])
          const inner = (
            <>
              {primaries.length > 0 && (
                <div className={styles.cardPrimaryRow}>
                  {primaries.map((col) => (
                    <div key={col.key} className={styles.cardPrimary}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </div>
                  ))}
                </div>
              )}
              {secondaries.length > 0 && (
                <div className={styles.cardSecondaryGrid}>
                  {secondaries.map((col) => (
                    <div key={col.key} className={styles.cardSecondaryItem}>
                      <div className={styles.cardSecondaryLabel}>{col.label}</div>
                      <div className={styles.cardSecondaryValue}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
          // Link-variant voor cards: right-click → open in new tab werkt correct.
          return rowHref ? (
            <Link key={key} href={rowHref(row)} className={styles.card}>
              {inner}
            </Link>
          ) : (
            <div key={key} className={styles.card}>{inner}</div>
          )
        })}
      </div>
    </>
  )
}
