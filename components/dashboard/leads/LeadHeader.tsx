import type { Lead } from '@/lib/dashboard/database.types'
import styles from './LeadHeader.module.css'

export function LeadHeader({ lead }: { lead: Lead }) {
  const adres = [lead.straat, `${lead.postcode} ${lead.plaats ?? ''}`.trim()]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={styles.header}>
      <h2 className={styles.naam}>{lead.naam}</h2>
      {lead.bedrijfsnaam && <p className={styles.bedrijf}>{lead.bedrijfsnaam}</p>}

      <dl className={styles.contact}>
        <dt>Telefoon</dt>
        <dd>
          <a href={`tel:${lead.telefoon}`}>{lead.telefoon}</a>
        </dd>

        <dt>E-mail</dt>
        <dd>
          <a href={`mailto:${lead.email}`}>{lead.email}</a>
        </dd>

        <dt>Adres</dt>
        <dd>{adres || '—'}</dd>

        {lead.toelichting && (
          <>
            <dt>Toelichting</dt>
            <dd>{lead.toelichting}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
