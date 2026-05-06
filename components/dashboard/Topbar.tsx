import { UserMenu } from './UserMenu'
import styles from './Topbar.module.css'

export function Topbar({ bedrijfsnaam, email }: { bedrijfsnaam: string; email: string }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>{bedrijfsnaam}</div>
      <UserMenu email={email} />
    </header>
  )
}
