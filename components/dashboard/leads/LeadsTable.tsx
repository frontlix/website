'use client'

import { Pill } from '@/components/dashboard/ui/Pill'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { TableToCards } from '@/components/dashboard/ui/TableToCards'
import type { Column } from '@/components/dashboard/ui/TableToCards'
import { formatEuro, formatRelative, gesprekFaseLabel } from '@/lib/dashboard/format'
import { DIENST_LABELS } from '@/lib/dashboard/manual-offerte-types'
import type { SubDienst } from '@/lib/dashboard/manual-offerte-types'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { leadStatusMeta } from '@/lib/dashboard/lead-status-meta'
import styles from './LeadsTable.module.css'

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Kolom-configuratie ────────────────────────────────────────────────────────
// Bewust buiten de component gedefinieerd zodat de array-referentie stabiel is
// (geen re-allocatie bij elke render).
const COLUMNS: Array<Column<LeadListItem>> = [
  {
    key: 'naam',
    label: 'Lead',
    mobile: 'primary',
    render: (row) => {
      const subline = [row.lead_id, row.plaats].filter(Boolean).join(' · ')
      return (
        <div className={styles.leadCell}>
          <Avatar name={row.naam} size="sm" />
          <div className={styles.leadCellBody}>
            <div className={styles.leadNameRow}>
              <strong className={styles.leadName}>{row.naam}</strong>
              {row.kanaal === 'web' && (
                <Pill tone="amber" sm>Geen WhatsApp</Pill>
              )}
            </div>
            {subline && <div className={styles.leadSub}>{subline}</div>}
          </div>
        </div>
      )
    },
  },
  {
    key: 'sub_diensten',
    label: 'Dienst',
    mobile: 'secondary',
    render: (row) => {
      const labels = (row.sub_diensten ?? [])
        .map((d) => DIENST_LABELS[d as SubDienst] ?? humanize(d))
        .filter(Boolean)
      return labels.join(', ') || '—'
    },
  },
  {
    key: 'm2',
    label: 'm²',
    mobile: 'secondary',
    align: 'right',
    render: (row) => (row.m2 != null ? `${row.m2} m²` : '—'),
  },
  {
    key: 'status',
    label: 'Status',
    mobile: 'primary',
    render: (row) => {
      const meta = leadStatusMeta(row.status)
      return (
        <Pill tone={meta.tone} dot>
          {meta.label}
        </Pill>
      )
    },
  },
  {
    key: 'gesprek_fase',
    label: 'Gespreksfase',
    mobile: 'secondary',
    render: (row) =>
      row.gesprek_fase ? gesprekFaseLabel(row.gesprek_fase) : '—',
  },
  {
    key: 'totaal_prijs',
    label: 'Offerte',
    mobile: 'primary',
    align: 'right',
    render: (row) =>
      row.totaal_prijs ? (
        <strong className={styles.priceStrong}>
          {formatEuro(row.totaal_prijs)}
        </strong>
      ) : (
        '—'
      ),
  },
  {
    key: 'bijgewerkt',
    label: 'Laatste actie',
    mobile: 'secondary',
    render: (row) => formatRelative(row.bijgewerkt),
  },
]

// ── Lege state JSX ────────────────────────────────────────────────────────────
const EMPTY_STATE = (
  <div className={styles.empty}>
    <p>Geen leads gevonden</p>
  </div>
)

// ── Component ────────────────────────────────────────────────────────────────
export function LeadsTable({ leads }: { leads: LeadListItem[] }) {
  return (
    <div className={`dash-card ${styles.wrapper}`}>
      <TableToCards<LeadListItem>
        columns={COLUMNS}
        rows={leads}
        keyField="lead_id"
        rowHref={(r) => '/leads/' + r.lead_id}
        emptyState={EMPTY_STATE}
      />
    </div>
  )
}
