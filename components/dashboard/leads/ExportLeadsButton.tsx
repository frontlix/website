'use client'

import { Download } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import styles from './ExportLeadsButton.module.css'

export function ExportLeadsButton() {
  const searchParams = useSearchParams()
  const qs = searchParams.toString()
  const href = qs
    ? `/api/dashboard/export/leads-csv?${qs}`
    : '/api/dashboard/export/leads-csv'
  return (
    <a href={href} className={styles.button} download>
      <Download size={14} />
      Exporteer CSV
    </a>
  )
}
