import Link from 'next/link'
import Image from 'next/image'
import styles from './demo-layout.module.css'

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.wrapper}>
      <header className={styles.navbar}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/logo.png"
              alt="Frontlix logo"
              width={44}
              height={44}
              className={styles.logoImage}
              priority
            />
            <span>Front<span className={styles.logoIx}>lix</span></span>
          </Link>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>
          Powered by{' '}
          <Link href="/" className={styles.footerLink}>
            Frontlix
          </Link>
        </p>
      </footer>
    </div>
  )
}
