import Link from 'next/link'
import {
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Navigation,
  Truck,
} from 'lucide-react'
import styles from './MobileVeldwerk.module.css'

/**
 * MobileVeldwerk, mobiele weergave van /veldwerk zolang de feature in
 * aanbouw is. Desktop toont het echte veldwerk-overzicht (page.tsx,
 * .desktopTree); op mobiel staat hier een nette aankondiging met een
 * route-illustratie en een verwijzing naar de agenda.
 */
export function MobileVeldwerk() {
  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <div className={styles.scene} aria-hidden="true">
          <svg className={styles.route} viewBox="0 0 280 56" fill="none" preserveAspectRatio="none">
            <path
              className={styles.routeLine}
              d="M10 44 C 70 44, 95 12, 150 12 S 240 38, 270 22"
            />
          </svg>
          <span className={styles.truckTile}>
            <Truck size={18} strokeWidth={2.2} />
          </span>
          <span className={styles.pinTile}>
            <MapPin size={14} strokeWidth={2.4} />
          </span>
        </div>

        <span className={styles.badge}>In aanbouw</span>
        <h2 className={styles.title}>Veldwerk komt eraan</h2>
        <p className={styles.sub}>
          We bouwen aan een veldwerk-modus speciaal voor onderweg: je
          dagplanning, navigatie naar de klus en afronden op locatie, alles
          op je telefoon.
        </p>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Wat kun je straks?</h3>
        <ul className={styles.list}>
          <li className={styles.item}>
            <span className={styles.itemIcon}>
              <CalendarCheck size={16} aria-hidden="true" />
            </span>
            <span className={styles.itemText}>
              Je klussen van vandaag op een rij
            </span>
          </li>
          <li className={styles.item}>
            <span className={styles.itemIcon}>
              <Navigation size={16} aria-hidden="true" />
            </span>
            <span className={styles.itemText}>
              Met één tik de route naar je klant starten
            </span>
          </li>
          <li className={styles.item}>
            <span className={styles.itemIcon}>
              <ClipboardCheck size={16} aria-hidden="true" />
            </span>
            <span className={styles.itemText}>
              De klus ter plekke afronden, de klant krijgt automatisch bericht
            </span>
          </li>
        </ul>
      </section>

      <Link href="/agenda" className={styles.cta}>
        <span>Tot die tijd staan je afspraken in de agenda</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}
