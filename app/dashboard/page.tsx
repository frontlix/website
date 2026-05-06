import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/dashboard/auth'

/**
 * Root van de dashboard-host. Niemand zou hier per ongeluk moeten landen
 * (middleware re-write `/` naar `/dashboard`), maar als het toch gebeurt
 * sturen we ze door naar /leads (ingelogd) of /login (anders).
 */
export default async function DashboardRootPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  redirect('/leads')
}
