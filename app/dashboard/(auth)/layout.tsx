import Link from 'next/link'
import Image from 'next/image'
import styles from './layout.module.css'

/**
 * Layout voor publieke auth-pagina's (/login, /signup, /wachtkamer).
 * Minimale shell: Frontlix-logo bovenin, gecentreerde content.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/logo.png"
            alt="Frontlix"
            width={120}
            height={32}
            priority
          />
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
