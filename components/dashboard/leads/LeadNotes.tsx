import type { LeadNote } from '@/lib/dashboard/database.types'
import { formatRelative } from '@/lib/dashboard/format'
import styles from './LeadNotes.module.css'

export function LeadNotes({ notes }: { notes: LeadNote[] }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Notities</h3>
      {notes.length === 0 ? (
        <p className={styles.empty}>Geen notities. (Toevoegen komt in een volgende release.)</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((n) => (
            <li key={n.id} className={styles.note}>
              <p className={styles.tekst}>{n.tekst}</p>
              <span className={styles.meta}>
                {n.auteur ? 'Medewerker' : 'Onbekend'} · {formatRelative(n.aangemaakt_op)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
