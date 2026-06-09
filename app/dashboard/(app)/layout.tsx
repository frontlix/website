import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from '@/lib/dashboard/notification-queries'
import { toAmsterdamDayKey } from '@/lib/dashboard/calendar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopbarServer } from '@/components/dashboard/TopbarServer'
import { ManualOfferteController } from '@/components/dashboard/offerte/ManualOfferteController'
import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard'
import { ExportsModal } from '@/components/dashboard/ExportsModal'
import { DashboardChrome } from '@/components/dashboard/mobile/DashboardChrome'
import styles from './layout.module.css'
// Globale dashboard design-system classes, alleen actief in deze layout.
import '@/styles/dashboard.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireApprovedUser()

  const supabase = await getDashboardSupabase()

  // Parallel fetchen: tenant-info + sidebar-counts (open leads, komende
  // afspraken). Counts vullen de badges in de Sidebar, geven de klant
  // direct zicht op werk-in-uitvoering zonder elke pagina te openen.
  const [settingsRes, openLeadsRes, upcomingApptsRes, notifications, unreadCount] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select('bedrijfsnaam')
      .limit(1)
      .maybeSingle(),
    // Badge = aantal ACTIEVE leads: niet-gearchiveerd en niet 'afgehandeld'.
    // LET OP: een kale .neq('dashboard_status','afgehandeld') sluit in PostgREST
    // óók de rijen met NULL-status uit (NULL <> x is 'unknown', niet true),
    // terwijl die leads wél actief zijn (de leads-pagina telt ze ook mee).
    // Daarom expliciet: status IS NULL OF status <> 'afgehandeld'. Zo matcht de
    // badge het aantal op de leads-pagina, en zakt 'ie zodra een lead op
    // 'afgehandeld' (Afgerond) komt te staan.
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .eq('dashboard_archived', false)
      .or('dashboard_status.is.null,dashboard_status.neq.afgehandeld'),
    // Komende afspraken = afspraken vanaf vandaag, op de ECHTE afspraakdatum
    // (afspraak_datum), niet op het boekmoment.
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .not('afspraak_datum', 'is', null)
      .gte('afspraak_datum', toAmsterdamDayKey(new Date().toISOString())),
    // Bel-feed + ongelezen-badge voor de mobiele shell-header (zelfde
    // queries als de desktop-Topbar). Desktop heeft z'n eigen TopbarServer.
    getRecentNotifications(15),
    getUnreadNotificationCount(),
  ])

  // Cast: Supabase type-inference zonder generated DB types geeft `never`.
  const settings = settingsRes.data as { bedrijfsnaam: string | null } | null
  const bedrijfsnaam = settings?.bedrijfsnaam ?? profile.bedrijfsnaam ?? 'Dashboard'

  const counts = {
    leads: openLeadsRes.count ?? 0,
    agenda: upcomingApptsRes.count ?? 0,
    // Inbox + Reviews: nog geen aparte unread/pending state in DB,     // toon geen badge zolang we niet weten wat er actief is.
  }

  // Desktop-chrome: bestaande sidebar+topbar+main structure ongewijzigd.
  // Wordt via DashboardChrome alleen op ≥641px gerenderd.
  const desktopChrome = (
    <div className={`${styles.shell} density-cozy`}>
      <Sidebar
        bedrijfsnaam={bedrijfsnaam}
        email={user.email ?? ''}
        counts={counts}
      />
      <div className={styles.main}>
        <TopbarServer />
        <main className={styles.content}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  )

  // User-display deriveren voor mobile MeerSheet. `dashboard_user_profiles`
  // heeft (nog) geen naam/display_name kolom, dus we vallen terug op de
  // email-prefix. Voorbeeld: 'frontlixx@gmail.com' → userName 'Frontlixx',
  // userInitials 'FR'. Wordt later vervangen zodra profile.naam bestaat.
  const emailPrefix = (user.email ?? '').split('@')[0] || 'Gebruiker'
  const userName =
    emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1).toLowerCase()
  // Eerste 1-2 letters van de prefix; uppercase voor avatar-look.
  const userInitials = emailPrefix.slice(0, 2).toUpperCase() || 'U'

  // `dashboard-theme-root` is de gedeelde wrapper waar de ThemeToggle
  // `.dark` op zet. Hij omvat BEIDE chrome-bomen (desktop + mobiel) zodat
  // dark mode op elk viewport werkt. `display:contents` (in dashboard.css)
  // maakt 'm layout-transparant, identiek gedrag aan het vorige fragment.
  return (
    <div className="dashboard-theme-root">
      <DashboardChrome
        desktop={desktopChrome}
        bedrijfsnaam={bedrijfsnaam}
        userInitials={userInitials}
        userName={userName}
        notifications={notifications}
        unreadCount={unreadCount}
        counts={{ leads: counts.leads }}
      >
        {children}
      </DashboardChrome>
      <ManualOfferteController />
      <ExportsModal />
      {!profile.onboarding_voltooid_op && <OnboardingWizard />}
      {/* Portal-target voor de Dagrapport-drawer. Zit binnen de theme-root
          (erft de :root-tokens én de .dark-overrides) maar buiten de mobiele
          .main-scroller, zodat de position:fixed drawer op iOS niet desynct
          tijdens scrollen (fixed-in-overflow-scroller bug). */}
      <div id="dagrapport-portal-root" />
    </div>
  )
}
