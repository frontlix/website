import Link from 'next/link'
import { Square, MapPin, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { formatEuro, formatRelative } from '@/lib/dashboard/format'
import { DIENST_LABELS } from '@/lib/dashboard/manual-offerte-types'
import type { SubDienst } from '@/lib/dashboard/manual-offerte-types'
import styles from './LeadsKaarten.module.css'

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
  if (!s) return { label: 'In gesprek', tone: 'blue' }
  return STATUS_META[s] ?? { label: s.replace(/_/g, ' '), tone: 'gray' }
}

/**
 * Kaarten-view: ruimere kanban-stijl cards in een auto-fill grid.
 * Iedere card heeft een lichte gradient header-band met status-pill +
 * lead-ID, dan avatar+naam+adres, en een body met m²/afstand/diensten/prijs.
 */
export function LeadsKaarten({ leads }: { leads: LeadListItem[] }) {
  return (
    <div className={styles.grid}>
      {leads.map((lead) => {
        const meta = statusMeta(lead.status)
        const adres = formatAdres(lead)
        const dienstText = (lead.sub_diensten ?? [])
          .map((d) => DIENST_LABELS[d as SubDienst] ?? humanize(d))
          .filter(Boolean)
          .join(' · ')

        return (
          <Link
            key={lead.lead_id}
            href={`/leads/${lead.lead_id}`}
            className={`${styles.card} dash-card`}
          >
            <div className={styles.head}>
              <div className={styles.headTop}>
                <Pill tone={meta.tone} dot>{meta.label}</Pill>
                <span className={styles.leadId}>{lead.lead_id}</span>
              </div>
              <div className={styles.headBody}>
                <Avatar name={lead.naam} size="md" />
                <div className={styles.headIdentity}>
                  <div className={styles.naam}>{lead.naam}</div>
                  <div className={styles.adres}>{adres || '—'}</div>
                </div>
              </div>
            </div>

            <div className={styles.body}>
              <div className={styles.metaRow}>
                {lead.m2 != null && (
                  <span className={styles.metaItem}>
                    <Square size={12} /> {lead.m2}m²
                  </span>
                )}
                {lead.afstand_km != null && (
                  <span className={styles.metaItem}>
                    <MapPin size={12} /> {lead.afstand_km}km
                  </span>
                )}
              </div>

              {dienstText && (
                <div className={styles.dienst}>
                  <span className={styles.dienstLabel}>Diensten:</span> {dienstText}
                </div>
              )}

              <div className={styles.foot}>
                <span className={styles.tijd}>
                  <MessageCircle size={12} /> {formatRelative(lead.bijgewerkt)}
                </span>
                {lead.totaal_prijs ? (
                  <span className={styles.prijs}>{formatEuro(lead.totaal_prijs)}</span>
                ) : (
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function formatAdres(lead: LeadListItem): string {
  const street = lead.straat ? `${lead.straat} ${lead.huisnummer ?? ''}`.trim() : null
  const city = `${lead.postcode ?? ''} ${lead.plaats ?? ''}`.trim()
  return [street, city].filter(Boolean).join(', ')
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
