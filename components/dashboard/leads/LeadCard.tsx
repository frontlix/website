import Link from 'next/link'
import { Square } from 'lucide-react'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { Pill } from '@/components/dashboard/ui/Pill'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'

/**
 * Pipeline-card — compact, klikbaar. Toont:
 *  - avatar + naam + plaats (uit telefoon-veld? nee, postcode)
 *  - prijs OF m² als badge
 *  - meta-regel met m² + hoofdcategorie
 *  - "binnengekomen" relatieve tijd onderaan rechts
 */
export function LeadCard({ lead }: { lead: LeadListItem }) {
  const heeftPrijs = lead.totaal_prijs !== null && lead.totaal_prijs > 0

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
              {formatTelefoon(lead.telefoon)}
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
          <Pill tone="gray">{lead.m2}m²</Pill>
        ) : null}
      </div>

      <div className="dash-pipe-card-meta">
        {lead.m2 !== null && (
          <span>
            <Square size={11} style={{ verticalAlign: '-2px', marginRight: 2 }} />
            {lead.m2}m²
          </span>
        )}
        <span className="dash-truncate" style={{ flex: 1, minWidth: 0 }}>
          {formatHoofdcategorie(lead.hoofdcategorie)}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-muted)' }}>
          {relativeTime(lead.aangemaakt)}
        </span>
      </div>
    </Link>
  )
}

function formatEuro(v: number): string {
  return '€ ' + Math.round(v).toLocaleString('nl-NL')
}

function formatTelefoon(t: string): string {
  // 31624965270 → 06 24 96 52 70 (snel parse-baar voor NL-nummers)
  if (t.startsWith('31') && t.length === 11) {
    const local = '0' + t.slice(2)
    return `${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8)}`
  }
  return t
}

function formatHoofdcategorie(c: string): string {
  // Database-keys → user-vriendelijk
  const labels: Record<string, string> = {
    oprit_terras_terrein: 'Oprit/terras',
    onkruidbeheersing: 'Onkruid',
    onkruidbeheersing_zakelijk: 'Onkruid zakelijk',
  }
  return labels[c] ?? c.replace(/_/g, ' ')
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
