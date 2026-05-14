'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Plus } from 'lucide-react'
import type { Offerte, Prijsregel, Lead } from '@/lib/dashboard/database.types'
import { formatEuro, formatDateNL } from '@/lib/dashboard/format'
import { OfferteCreateForm } from './OfferteCreateForm'
import { ApproveQuoteButton } from '@/components/dashboard/bot-actions/ApproveQuoteButton'
import { ModifyQuoteForm } from '@/components/dashboard/bot-actions/ModifyQuoteForm'
import styles from './LeadOfferte.module.css'

export function LeadOfferte({
  leadId,
  offertes,
  prijsregels,
  lead,
}: {
  leadId: string
  offertes: Offerte[]
  prijsregels: Prijsregel[]
  lead: Lead
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(offertes.length === 0)

  const huidige = offertes[0]  // versie DESC, dus eerste is de laatste
  const heeftOfferte = offertes.length > 0

  const handleSaved = () => {
    setShowForm(false)
    router.refresh()
  }

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <h3 className={styles.heading}>Offerte</h3>
        {heeftOfferte && !showForm && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ApproveQuoteButton leadId={leadId} versie={huidige.versie} />
            <ModifyQuoteForm lead={lead} />
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className={styles.newVersionBtn}
            >
              <Plus size={13} />
              Nieuwe versie
            </button>
          </div>
        )}
      </div>

      {!heeftOfferte && !showForm && (
        <p className={styles.empty}>Nog geen offerte voor deze lead.</p>
      )}

      {showForm && (
        <OfferteCreateForm
          leadId={leadId}
          onSaved={handleSaved}
          onCancel={heeftOfferte ? () => setShowForm(false) : undefined}
          existingVersie={huidige?.versie}
        />
      )}

      {huidige && !showForm && (
        <div className={styles.huidige}>
          <div className={styles.totaalRow}>
            <span className={styles.totaalLabel}>Totaal incl. BTW</span>
            <span className={styles.totaalAmount}>{formatEuro(huidige.totaal_incl)}</span>
          </div>
          {(huidige.korting_pct ?? 0) > 0 && (
            <div className={styles.kortingRow}>
              <span>Korting</span>
              <span>{huidige.korting_pct ?? 0}%</span>
            </div>
          )}
          <div className={styles.metaRow}>
            <span>Versie {huidige.versie}</span>
            <span>{formatDateNL(huidige.aangemaakt_op)}</span>
          </div>
          {huidige.pdf_url && (
            <a
              href={huidige.pdf_url}
              target="_blank"
              rel="noopener"
              className={styles.pdfLink}
            >
              Bekijk PDF <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}

      {prijsregels.length > 0 && !showForm && (
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

      {offertes.length > 1 && !showForm && (
        <details className={styles.history}>
          <summary>Vorige versies ({offertes.length - 1})</summary>
          <ul>
            {offertes.slice(1).map((o) => (
              <li key={o.id}>
                v{o.versie} — {formatEuro(o.totaal_incl)}
                {o.pdf_url && (
                  <>
                    {' — '}
                    <a href={o.pdf_url} target="_blank" rel="noopener">PDF</a>
                  </>
                )}{' '}
                ({formatDateNL(o.aangemaakt_op)})
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
