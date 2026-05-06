import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Topbar } from '@/components/dashboard/Topbar'
import styles from './layout.module.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireApprovedUser()

  // Bedrijfsnaam uit tenant_settings (v1: één rij). Fallback naar profile-naam.
  const supabase = await getDashboardSupabase()
  const { data: settingsRaw } = await supabase
    .from('tenant_settings')
    .select('bedrijfsnaam')
    .limit(1)
    .maybeSingle()

  // Cast: Supabase type-inference zonder generated DB types geeft `never`,
  // wat property-access breekt. Veilige cast omdat we expliciet alleen
  // bedrijfsnaam selecteren.
  const settings = settingsRaw as { bedrijfsnaam: string | null } | null

  const bedrijfsnaam = settings?.bedrijfsnaam ?? profile.bedrijfsnaam ?? 'Dashboard'

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar bedrijfsnaam={bedrijfsnaam} email={user.email ?? ''} />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
