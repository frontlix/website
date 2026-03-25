import Link from 'next/link'
import styles from './Footer.module.css'

const diensten = [
  { label: 'Automatische lead opvolging', href: '/diensten' },
  { label: 'AI WhatsApp assistent', href: '/diensten' },
  { label: 'Offerte automatisering', href: '/diensten' },
]

const bedrijf = [
  { label: 'Over ons', href: '/over-ons' },
  { label: 'Diensten', href: '/diensten' },
  { label: 'Contact', href: '/contact' },
]

const contact = [
  { label: 'info@frontlix.nl', href: 'mailto:info@frontlix.nl' },
  { label: '+31 6 24965270', href: 'tel:+31624965270' },
  { label: 'Nederland', href: '#' },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.topRow}>
          {/* Brand */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              Frontl<span className={styles.logoIx}>ix</span>
            </Link>
            <p className={styles.tagline}>Automatische leadopvolging via WhatsApp</p>
          </div>

          {/* Columns */}
          <div className={styles.columns}>
            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Diensten</h3>
              <nav className={styles.columnLinks}>
                {diensten.map((link) => (
                  <Link key={link.label} href={link.href} className={styles.columnLink}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Bedrijf</h3>
              <nav className={styles.columnLinks}>
                {bedrijf.map((link) => (
                  <Link key={link.label} href={link.href} className={styles.columnLink}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className={styles.column}>
              <h3 className={styles.columnTitle}>Contact</h3>
              <nav className={styles.columnLinks}>
                {contact.map((link) => (
                  <Link key={link.label} href={link.href} className={styles.columnLink}>
                    {link.label}
                  </Link>
                ))}
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
