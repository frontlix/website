import Image from 'next/image'
import Link from 'next/link'
import styles from './Footer.module.css'

const bedrijf = [
  { label: 'Over ons', href: '/over-ons' },
  { label: 'Diensten', href: '/diensten' },
  { label: 'Contact', href: '/contact' },
]

const contact = [
  { label: 'info@frontlix.com', href: 'mailto:info@frontlix.com' },
  { label: '+31 6 24965270', href: 'tel:+31624965270' },
  { label: 'Den Haag, Nederland', href: null },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          {/* Brand */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logoLink}>
              <Image
                src="/logo.png"
                alt="Frontlix logo"
                width={36}
                height={36}
                className={styles.logoImage}
              />
              <span className={styles.logoText}>
                Frontl<span className={styles.logoIx}>ix</span>
              </span>
            </Link>
            <p className={styles.tagline}>Automatische leadopvolging via WhatsApp</p>
          </div>

          {/* Columns */}
          <div className={styles.columns}>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Bedrijf</h3>
              <nav className={styles.columnLinks} aria-label="Bedrijf">
                {bedrijf.map((link) => (
                  <Link key={link.label} href={link.href} className={styles.columnLink}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Contact</h3>
              <nav className={styles.columnLinks} aria-label="Contact">
                {contact.map((link) =>
                  link.href ? (
                    <Link key={link.label} href={link.href} className={styles.columnLink}>
                      {link.label}
                    </Link>
                  ) : (
                    <span key={link.label} className={styles.columnLink}>
                      {link.label}
                    </span>
                  )
                )}
              </nav>
            </div>
          </div>
        </div>

        <div className={styles.bottomRow}>
          <span className={styles.copyright}>
            © 2026 Frontlix. Alle rechten voorbehouden.
          </span>
          <div className={styles.legalLinks}>
            <Link href="/privacy-policy" className={styles.legalLink}>Privacy Policy</Link>
            <Link href="/algemene-voorwaarden" className={styles.legalLink}>Algemene voorwaarden</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
