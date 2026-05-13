import type { Lead } from '@/lib/dashboard/database.types'
import styles from './LeadInfoTab.module.css'

/**
 * Info-tab: dichte tabel met klantgegevens, dienst-specs en optionele
 * toelichting. Read-only — bewerken loopt via de bot zelf.
 */
export function LeadInfoTab({ lead }: { lead: Lead }) {
  const rows: Array<{ label: string; value: string | number | null }> = [
    { label: 'Telefoon',       value: lead.telefoon },
    { label: 'E-mail',         value: lead.email },
    { label: 'Adres',          value: formatAdres(lead) },
    { label: 'Hoofdcategorie', value: humanize(lead.hoofdcategorie) },
    { label: 'Sub-diensten',   value: lead.sub_diensten.length ? lead.sub_diensten.map(humanize).join(', ') : null },
    { label: 'Oppervlakte',    value: lead.m2 !== null ? `${lead.m2} m²` : null },
    { label: 'Planten',        value: lead.planten },
    { label: 'Voegzand kleur', value: lead.zand_kleur },
    { label: 'Groene aanslag', value: lead.groene_aanslag },
    { label: 'Aangemaakt',     value: formatDate(lead.aangemaakt) },
    { label: 'Bijgewerkt',     value: formatDate(lead.bijgewerkt) },
    { label: 'Afstand',        value: lead.afstand_km !== null ? `${lead.afstand_km} km` : null },
  ]

  return (
    <div className={styles.wrap}>
      <dl className={styles.list}>
        {rows.map((row) =>
          row.value !== null && row.value !== '' ? (
            <div key={row.label} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ) : null,
        )}
      </dl>

      {lead.toelichting && (
        <div className={styles.toelichting}>
          <div className={styles.label}>Toelichting</div>
          <p className={styles.toelichtingText}>{lead.toelichting}</p>
        </div>
      )}
    </div>
  )
}

function formatAdres(lead: Lead): string {
  const parts = [
    lead.straat ? `${lead.straat} ${lead.huisnummer}`.trim() : null,
    `${lead.postcode} ${lead.plaats ?? ''}`.trim(),
  ].filter(Boolean)
  return parts.join(', ') || ''
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
