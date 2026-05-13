import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Topbar } from '@/components/dashboard/Topbar'
import styles from './layout.module.css'
// Globale dashboard design-system classes — alleen actief in deze layout.
import '@/styles/dashboard.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireApprovedUser()

  const supabase = await getDashboardSupabase()

  // Parallel fetchen: tenant-info + sidebar-counts (open leads, komende
  // afspraken). Counts vullen de badges in de Sidebar — geven de klant
  // direct zicht op werk-in-uitvoering zonder elke pagina te openen.
  const [settingsRes, openLeadsRes, upcomingApptsRes] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select('bedrijfsnaam')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .eq('dashboard_archived', false)
      .neq('dashboard_status', 'afgehandeld'),
    supabase
      .from('leads')
      .select('lead_id', { count: 'exact', head: true })
      .not('afspraak_geboekt_op', 'is', null)
      .gte('afspraak_geboekt_op', new Date().toISOString()),
  ])

  // Cast: Supabase type-inference zonder generated DB types geeft `never`.
  const settings = settingsRes.data as { bedrijfsnaam: string | null } | null
  const bedrijfsnaam = settings?.bedrijfsnaam ?? profile.bedrijfsnaam ?? 'Dashboard'

  const counts = {
    leads: openLeadsRes.count ?? 0,
    agenda: upcomingApptsRes.count ?? 0,
    // Inbox + Reviews: nog geen aparte unread/pending state in DB —
    // toon geen badge zolang we niet weten wat er actief is.
  }

  return (
    <div className={`${styles.shell} density-cozy`}>
      <Sidebar
        bedrijfsnaam={bedrijfsnaam}
        email={user.email ?? ''}
        counts={counts}
      />
      <div className={styles.main}>
        <Topbar />
        <main className={styles.content}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  )
}
