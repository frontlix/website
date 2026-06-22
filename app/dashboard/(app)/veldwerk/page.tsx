import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { MobileVeldwerk } from '@/components/dashboard/mobile/veldwerk/MobileVeldwerk'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/**
 * Veldwerk-overzicht: vandaag's afspraken voor monteurs op locatie.
 * Desktop toont het overzicht met grote hit-targets; per kaart navigeer
 * je naar /veldwerk/[lead_id] voor de phase-tracker (onderweg → klaar).
 * Op mobiel is de feature nog in aanbouw: daar rendert MobileVeldwerk
 * een nette aankondiging (zelfde desktopTree/mobileTree-patroon als
 * statistieken en reviews).
 */
export default async function VeldwerkPage() {
  await requireApprovedUser()

  return (
    <div className={styles.mobileTree}>
      <MobileVeldwerk />
    </div>
  )
}
