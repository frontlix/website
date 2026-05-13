import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import { formatEuro, formatRelative, gesprekFaseLabel } from '@/lib/dashboard/format'
import { DIENST_LABELS } from '@/lib/dashboard/manual-offerte-types'
import type { SubDienst } from '@/lib/dashboard/manual-offerte-types'
import styles from './LeadsTable.module.css'

type StatusMeta = { label: string; tone: 'blue' | 'amber' | 'green' | 'red' | 'gray' }

const STATUS_META: Record<string, StatusMeta> = {
  nieuw:             { label: 'Nieuw',              tone: 'blue'  },
  in_gesprek:        { label: 'In gesprek',         tone: 'blue'  },
  wacht_bevestiging: { label: 'Wacht op bevestig.', tone: 'amber' },
  info_compleet:     { label: 'Klaar voor offerte', tone: 'amber' },
  offerte_verstuurd: { label: 'Offerte verstuurd',  tone: 'amber' },
  goedgekeurd:       { label: 'Goedgekeurd',        tone: 'green' },
  afgewezen:         { label: 'Afgewezen',          tone: 'red'   },
  handoff:           { label: 'Handover',           tone: 'red'   },
}

function statusMeta(s: string | null): StatusMeta {
  if (!s) return { label: '—', tone: 'gray' }
  return STATUS_META[s] ?? { label: s.replace(/_/g, ' '), tone: 'gray' }
}

/**
 * Tabel-view voor /leads. Kolommen volgens design-spec:
 * Lead | Dienst | m² | Status | Gespreksfase | Offerte | Laatste actie | →
 */
export function LeadsTable({ leads }: { leads: LeadListItem[] }) {
  return (
    <div className={`${styles.tableWrap} dash-card`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Dienst</th>
            <th className={styles.numeric}>m²</th>
            <th>Status</th>
            <th>Gespreksfase</th>
            <th className={styles.numeric}>Offerte</th>
            <th>Laatste actie</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const meta = statusMeta(lead.status)
            const dienstLabels = (lead.sub_diensten ?? [])
              .map((d) => DIENST_LABELS[d as SubDienst] ?? humanize(d))
              .filter(Boolean)
            const dienstText = dienstLabels.join(' + ')
            const subline = [lead.lead_id, lead.plaats].filter(Boolean).join(' · ')

            return (
              <tr key={lead.lead_id} className={styles.row}>
                <td>
                  <Link href={`/leads/${lead.lead_id}`} className={styles.link}>
                    <div className={styles.leadCell}>
                      <Avatar name={lead.naam} size="sm" />
                      <div className={styles.leadCellBody}>
                        <strong className={styles.leadName}>{lead.naam}</strong>
                        {subline && (
                          <div className={styles.leadSub}>{subline}</div>
                        )}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className={styles.muted}>{dienstText || '—'}</td>
                <td className={styles.numeric}>{lead.m2 ?? '—'}</td>
                <td>
                  <Pill tone={meta.tone} dot>{meta.label}</Pill>
                </td>
                <td className={styles.muted}>
                  {lead.gesprek_fase ? gesprekFaseLabel(lead.gesprek_fase) : '—'}
                </td>
                <td className={styles.numeric}>
                  {lead.totaal_prijs ? (
                    <strong style={{ color: 'var(--primary)' }}>{formatEuro(lead.totaal_prijs)}</strong>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td className={`${styles.muted} ${styles.timeCell}`}>
                  {formatRelative(lead.bijgewerkt)}
                </td>
                <td className={styles.chevronCell}>
                  <Link
                    href={`/leads/${lead.lead_id}`}
                    aria-label={`Open ${lead.naam}`}
                    className={styles.chevronLink}
                  >
                    <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
