import Link from 'next/link'
import { Square } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import { DIENST_LABELS } from '@/lib/dashboard/manual-offerte-types'
import type { SubDienst } from '@/lib/dashboard/manual-offerte-types'

/**
 * Pipeline-card — layout:
 *  - head: avatar + naam + plaats (links), prijs OF m²-pill (rechts)
 *  - meta: m² + eerste dienst-label + "+N" voor extra diensten
 *  - foot: bron-pill + tijd
 *
 * Klikbaar via Next Link naar /leads/{lead_id}.
 */
export function LeadCard({ lead }: { lead: LeadListItem }) {
  const heeftPrijs = lead.totaal_prijs !== null && lead.totaal_prijs > 0
  const dienstLabels = (lead.sub_diensten ?? [])
    .map((d) => DIENST_LABELS[d as SubDienst] ?? humanize(d))
    .filter(Boolean)

  return (
    <Link href={`/leads/${lead.lead_id}`} className="dash-pipe-card">
      <div className="dash-pipe-card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Avatar name={lead.naam} size="sm" />
          <div style={{ minWidth: 0 }}>
            <div className="dash-pipe-card-name dash-truncate">{lead.naam}</div>
            <div
              className="dash-truncate"
              style={{ fontSize: 11, color: 'var(--fg-muted)' }}
            >
              {lead.plaats ?? lead.postcode ?? '—'}
            </div>
          </div>
        </div>
        {heeftPrijs ? (
          <div
            className="dash-tabular"
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}
          >
            {formatEuro(lead.totaal_prijs!)}
          </div>
        ) : lead.m2 !== null ? (
          <Pill tone="gray" sm>{lead.m2}m²</Pill>
        ) : null}
      </div>

      <div className="dash-pipe-card-meta">
        {lead.m2 !== null && (
          <span>
            <Square size={11} style={{ verticalAlign: '-2px', marginRight: 2 }} />
            {lead.m2}m²
          </span>
        )}
        {dienstLabels[0] && (
          <span className="dash-truncate" style={{ flex: 1, minWidth: 0 }}>
            {dienstLabels[0]}
          </span>
        )}
        {dienstLabels.length > 1 && (
          <span style={{ color: 'var(--fg-muted)' }}>+{dienstLabels.length - 1}</span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
          flexWrap: 'wrap',
        }}
      >
        {lead.bron && <Pill tone="gray" sm>{formatBron(lead.bron)}</Pill>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-muted)' }}>
          {relativeTime(lead.aangemaakt)}
        </span>
      </div>
    </Link>
  )
}

function formatEuro(v: number): string {
  return '€ ' + Math.round(v).toLocaleString('nl-NL')
}

function formatBron(bron: string): string {
  const map: Record<string, string> = {
    formulier: 'Formulier',
    website: 'Formulier',
    whatsapp: 'WhatsApp',
    handmatig: 'Handmatig',
  }
  return map[bron] ?? humanize(bron)
}

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function relativeTime(iso: string): string {
  // Compacte relatieve tijd: "nu", "5 min", "2 u", "3 d".
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'nu'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} u`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
