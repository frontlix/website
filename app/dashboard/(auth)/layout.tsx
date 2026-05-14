import Link from 'next/link'
import Image from 'next/image'
import styles from './layout.module.css'

/**
 * Auth-layout — split-screen: form-card links, brand-story rechts
 * met gradient + tagline. Op smalle schermen valt de brand-story weg.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      {/* Linkerhelft: form */}
      <div className={styles.formPane}>
        <div className={styles.formHeader}>
          <Link href="/" className={styles.logoLink}>
            <Image
              src="/logo-trans.png"
              alt="Frontlix"
              width={32}
              height={32}
              priority
            />
            <span className={styles.logoText}>
              Frontl<span className={styles.logoAccent}>ix</span>
            </span>
          </Link>
        </div>
        <div className={styles.formInner}>{children}</div>
      </div>

      {/* Rechterhelft: brand-story (verborgen op mobiel) */}
      <aside className={styles.brandPane}>
        <div className={styles.brandContent}>
          <div className={styles.brandEyebrow}>FRONTLIX</div>
          <h2 className={styles.brandHeadline}>
            AI-gestuurde leads,
            <br />
            <span className={styles.brandAccent}>strakke offertes.</span>
          </h2>
          <p className={styles.brandSub}>
            Surface verzamelt automatisch info via WhatsApp en stelt
            offertes op die je met één klik verstuurt.
          </p>

          <div className={styles.brandFeatures}>
            <Feature title="Live WhatsApp-gesprekken" sub="Surface praat met klanten, jij ziet alles terug." />
            <Feature title="Automatische offertes" sub="Van foto tot PDF in minder dan 60 seconden." />
            <Feature title="Volledig inzicht" sub="Pipeline, conversie en omzet in één dashboard." />
          </div>
        </div>
      </aside>
    </div>
  )
}

function Feature({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureDot} />
      <div>
        <div className={styles.featureTitle}>{title}</div>
        <div className={styles.featureSub}>{sub}</div>
      </div>
    </div>
  )
}
