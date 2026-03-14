import Link from 'next/link'
import styles from './Footer.module.css'

const diensten = [
  { label: 'Webdevelopment', href: '/diensten' },
  { label: 'SEO & Marketing', href: '/diensten' },
  { label: 'Web Applicaties', href: '/diensten' },
  { label: 'UI/UX Design', href: '/diensten' },
]

const bedrijf = [
  { label: 'Over ons', href: '/over-ons' },
  { label: 'Diensten', href: '/diensten' },
  { label: 'Contact', href: '/contact' },
  { label: 'Blog', href: '#' },
]

const contact = [
  { label: 'info@frontlix.nl', href: 'mailto:info@frontlix.nl' },
  { label: '+31 6 12345678', href: 'tel:+31612345678' },
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
            <p className={styles.tagline}>Digitale groei voor moderne bedrijven</p>
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
            © 2025 Frontlix. Alle rechten voorbehouden.
          </span>
          <div className={styles.legalLinks}>
            <Link href="#" className={styles.legalLink}>Privacy Policy</Link>
            <Link href="#" className={styles.legalLink}>Algemene voorwaarden</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
