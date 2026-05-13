'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState } from 'react'
import { X, Download, FileSpreadsheet, FileText } from 'lucide-react'
import styles from './ExportsModal.module.css'

type ExportType = 'leads' | 'offertes' | 'reviews'
type ExportFormat = 'csv' | 'xlsx' | 'pdf'
type ExportPeriod = '7d' | '30d' | '90d' | 'all'

const TYPES: ReadonlyArray<{ k: ExportType; l: string; sub: string }> = [
  { k: 'leads',    l: 'Leads',    sub: 'Alle leads met fase, m², waarde, tags' },
  { k: 'offertes', l: 'Offertes', sub: 'Aangemaakte offertes incl. prijsregels' },
  { k: 'reviews',  l: 'Reviews',  sub: 'NPS-scores en feedback per klant' },
]

const FORMATS: ReadonlyArray<{ k: ExportFormat; l: string; Icon: typeof FileText }> = [
  { k: 'csv',  l: 'CSV',  Icon: FileText },
  { k: 'xlsx', l: 'Excel', Icon: FileSpreadsheet },
  { k: 'pdf',  l: 'PDF',  Icon: FileText },
]

const PERIODS: ReadonlyArray<{ k: ExportPeriod; l: string }> = [
  { k: '7d',  l: '7 dagen' },
  { k: '30d', l: '30 dagen' },
  { k: '90d', l: '90 dagen' },
  { k: 'all', l: 'Alles' },
]

/**
 * Modal voor data-export. Geactiveerd via ?export=1 in de URL. Bij submit:
 * - leads + CSV → bestaande /api/dashboard/export/leads-csv route
 * - alle andere combinaties: nog niet bedraad, toont een vriendelijke "binnenkort"
 */
export function ExportsModal() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const open = searchParams.get('export') === '1'

  const [type, setType] = useState<ExportType>('leads')
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [period, setPeriod] = useState<ExportPeriod>('30d')
  const [info, setInfo] = useState<string | null>(null)

  if (!open) return null

  const close = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('export')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const download = () => {
    if (type === 'leads' && format === 'csv') {
      window.location.href = `/api/dashboard/export/leads-csv?period=${period}`
      close()
      return
    }
    setInfo('Deze export-combinatie komt binnenkort beschikbaar. Voor nu kan je leads als CSV downloaden.')
  }

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Data exporteren</div>
            <div className={styles.sub}>Kies wat je wil downloaden.</div>
          </div>
          <button type="button" onClick={close} className={styles.closeBtn} aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>

        <Section label="Type">
          <div className={styles.grid3}>
            {TYPES.map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setType(t.k)}
                className={`${styles.optCard} ${type === t.k ? styles.optCardActive : ''}`}
              >
                <strong>{t.l}</strong>
                <span>{t.sub}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Format">
          <div className={styles.formatRow}>
            {FORMATS.map((f) => (
              <button
                key={f.k}
                type="button"
                onClick={() => setFormat(f.k)}
                className={`${styles.formatBtn} ${format === f.k ? styles.formatBtnActive : ''}`}
              >
                <f.Icon size={14} /> {f.l}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Periode">
          <div className={styles.formatRow}>
            {PERIODS.map((p) => (
              <button
                key={p.k}
                type="button"
                onClick={() => setPeriod(p.k)}
                className={`${styles.formatBtn} ${period === p.k ? styles.formatBtnActive : ''}`}
              >
                {p.l}
              </button>
            ))}
          </div>
        </Section>

        {info && <div className={styles.info}>{info}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={close} className={styles.btnGhost}>Annuleren</button>
          <button type="button" onClick={download} className={styles.btnPrimary}>
            <Download size={13} /> Download
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      {children}
    </div>
  )
}
