import { Pencil } from 'lucide-react'
import type { Lead } from '@/lib/dashboard/database.types'
import styles from './LeadInfoTab.module.css'

type Row = {
  label: string
  value: string | number | null
  /** Optionele tweede regel onder de waarde (subtext). */
  sub?: string | null
}

/**
 * Info-tab: "Lead-gegevens" paneel met twee-koloms layout (KLANT | WERK).
 * Per rij label links + waarde rechts (rechts-uitgelijnd). Read-only — de
 * bewerk-knop is voor toekomstige inline-edit functionaliteit.
 */
export function LeadInfoTab({ lead }: { lead: Lead }) {
  const klantRows: Row[] = [
    { label: 'Naam', value: lead.naam },
    { label: 'Bedrijf', value: lead.bedrijfsnaam ?? '—' },
    { label: 'Telefoon', value: lead.telefoon },
    { label: 'E-mail', value: lead.email },
    { label: 'Adres', value: formatAdres(lead) },
    {
      label: 'Afstand',
      value: lead.afstand_km !== null ? `${lead.afstand_km} km` : null,
      sub: lead.afstand_km !== null && lead.afstand_km <= 25 ? 'Binnen gratis radius' : null,
    },
    { label: 'Bron', value: humanizeBron(lead.bron) },
  ]

  const werkRows: Row[] = [
    { label: 'Hoofdcategorie', value: humanize(lead.hoofdcategorie) },
    {
      label: 'Diensten',
      value: lead.sub_diensten.length ? lead.sub_diensten.map(humanize).join(' + ') : null,
    },
    { label: 'Oppervlakte', value: lead.m2 !== null ? `${lead.m2} m²` : null },
    { label: 'Voegzand', value: lead.zand_kleur ? humanize(lead.zand_kleur) : null },
    { label: 'Groene aanslag', value: lead.groene_aanslag },
    { label: 'Planten', value: lead.planten },
    { label: 'Planten afschermen', value: lead.planten_afschermen },
  ]

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.title}>Lead-gegevens</h2>
        <button type="button" className={styles.editBtn} disabled>
          <Pencil size={13} />
          <span>Bewerken</span>
        </button>
      </div>

      <div className={styles.grid}>
        <Column heading="Klant" rows={klantRows} />
        <Column heading="Werk" rows={werkRows} />
      </div>

      {lead.toelichting && (
        <div className={styles.toelichting}>
          <div className={styles.toelichtingLabel}>Toelichting</div>
          <p className={styles.toelichtingText}>{lead.toelichting}</p>
        </div>
      )}
    </div>
  )
}

function Column({ heading, rows }: { heading: string; rows: Row[] }) {
  const visible = rows.filter((r) => r.value !== null && r.value !== '')
  return (
    <div className={styles.column}>
      <div className={styles.columnHeading}>{heading}</div>
      <dl className={styles.list}>
        {visible.map((row) => (
          <div key={row.label} className={styles.row}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={styles.value}>
              <span>{row.value}</span>
              {row.sub && <span className={styles.sub}>{row.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function formatAdres(lead: Lead): string {
  const street = lead.straat ? `${lead.straat} ${lead.huisnummer}`.trim() : null
  const city = `${lead.postcode} ${lead.plaats ?? ''}`.trim()
  return [street, city].filter(Boolean).join(', ')
}

function humanize(key: string | null): string {
  if (!key) return ''
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function humanizeBron(bron: string): string {
  // Verwachte waarden: 'website', 'whatsapp', 'handmatig', ...
  const map: Record<string, string> = {
    website: 'Website-formulier',
    whatsapp: 'WhatsApp',
    handmatig: 'Handmatig',
  }
  return map[bron] ?? humanize(bron)
}
