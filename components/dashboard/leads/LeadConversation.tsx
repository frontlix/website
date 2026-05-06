import Image from 'next/image'
import type { Bericht } from '@/lib/dashboard/database.types'
import { formatDateTimeNL } from '@/lib/dashboard/format'
import styles from './LeadConversation.module.css'

export function LeadConversation({ berichten }: { berichten: Bericht[] }) {
  if (berichten.length === 0) {
    return <p className={styles.empty}>Nog geen berichten in dit gesprek.</p>
  }

  return (
    <ol className={styles.thread}>
      {berichten.map((b) => (
        <li
          key={b.id}
          className={`${styles.bubble} ${b.richting === 'in' ? styles.in : styles.uit}`}
        >
          <div className={styles.body}>
            {b.bericht && <p className={styles.text}>{b.bericht}</p>}
            {b.foto_url && (
              <div className={styles.image}>
                <Image
                  src={b.foto_url}
                  alt="Bijgevoegde foto"
                  width={240}
                  height={180}
                  unoptimized
                />
              </div>
            )}
            {b.type !== 'tekst' && !b.bericht && !b.foto_url && (
              <p className={styles.placeholderType}>[{b.type}]</p>
            )}
          </div>
          <time className={styles.time} dateTime={b.timestamp}>
            {formatDateTimeNL(b.timestamp)}
          </time>
        </li>
      ))}
    </ol>
  )
}
