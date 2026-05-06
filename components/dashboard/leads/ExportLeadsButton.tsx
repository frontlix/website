import { Download } from 'lucide-react'
import styles from './ExportLeadsButton.module.css'

export function ExportLeadsButton() {
  return (
    <a
      href="/api/dashboard/export/leads-csv"
      className={styles.button}
      download
    >
      <Download size={14} />
      Exporteer CSV
    </a>
  )
}
