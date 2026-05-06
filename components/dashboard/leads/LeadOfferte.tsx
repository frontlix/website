import { ExternalLink } from 'lucide-react'
import type { Offerte, Prijsregel } from '@/lib/dashboard/database.types'
import { formatEuro, formatDateNL } from '@/lib/dashboard/format'
import styles from './LeadOfferte.module.css'

export function LeadOfferte({
  offertes,
  prijsregels,
}: {
  offertes: Offerte[]
  prijsregels: Prijsregel[]
}) {
  if (offertes.length === 0 && prijsregels.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.heading}>Offerte</h3>
        <p className={styles.empty}>Nog geen offerte voor deze lead.</p>
      </div>
    )
  }

  const huidige = offertes[0]  // versie DESC, dus eerste is de laatste

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Offerte</h3>

      {huidige && (
        <div className={styles.huidige}>
          <div className={styles.totaalRow}>
            <span className={styles.totaalLabel}>Totaal incl. BTW</span>
            <span className={styles.totaalAmount}>{formatEuro(huidige.totaal_incl)}</span>
          </div>
          {huidige.korting_pct > 0 && (
            <div className={styles.kortingRow}>
              <span>Korting</span>
              <span>{huidige.korting_pct}%</span>
            </div>
          )}
          <div className={styles.metaRow}>
            <span>Versie {huidige.versie}</span>
            <span>{formatDateNL(huidige.aangemaakt_op)}</span>
          </div>
          <a href={huidige.pdf_url} target="_blank" rel="noopener" className={styles.pdfLink}>
            Bekijk PDF <ExternalLink size={14} />
          </a>
        </div>
      )}

      {prijsregels.length > 0 && (
        <div className={styles.regels}>
          <h4 className={styles.subheading}>Prijsregels</h4>
          <table className={styles.regelsTable}>
            <thead>
              <tr>
                <th>Omschrijving</th>
                <th className={styles.numeric}>Aantal</th>
                <th className={styles.numeric}>Stukprijs</th>
                <th className={styles.numeric}>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {prijsregels.map((r) => (
                <tr key={r.id}>
                  <td>{r.omschrijving}</td>
                  <td className={styles.numeric}>
                    {r.aantal != null ? `${r.aantal} ${r.eenheid ?? ''}` : '—'}
                  </td>
                  <td className={styles.numeric}>{formatEuro(r.stukprijs)}</td>
                  <td className={styles.numeric}>{formatEuro(r.totaal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {offertes.length > 1 && (
        <details className={styles.history}>
          <summary>Vorige versies ({offertes.length - 1})</summary>
          <ul>
            {offertes.slice(1).map((o) => (
              <li key={o.id}>
                v{o.versie} — {formatEuro(o.totaal_incl)} —{' '}
                <a href={o.pdf_url} target="_blank" rel="noopener">PDF</a>{' '}
                ({formatDateNL(o.aangemaakt_op)})
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
