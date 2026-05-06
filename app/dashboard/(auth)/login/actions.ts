'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export type LoginState = { error?: string }

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const wachtwoord = String(formData.get('wachtwoord') ?? '')

  if (!email || !wachtwoord) {
    return { error: 'Vul email en wachtwoord in.' }
  }

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: wachtwoord,
  })

  if (error || !data.user) {
    return { error: 'E-mail of wachtwoord onjuist.' }
  }

  // Check tenant_status — pending → wachtkamer, rejected → foutmelding,
  // approved → /leads.
  const { data: profile } = await supabase
    .from('dashboard_user_profiles')
    .select('tenant_status')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!profile) {
    // Profile-rij ontbreekt — Auth Hook zou dit hebben moeten vangen.
    // Forceer logout om geen geldige session in een ongeldige state te laten.
    await supabase.auth.signOut()
    return { error: 'Account-configuratie ontbreekt. Neem contact op met Frontlix.' }
  }

  if (profile.tenant_status === 'rejected') {
    await supabase.auth.signOut()
    return { error: 'Aanvraag afgewezen.' }
  }

  // Invalideer de layout-cache zodat /wachtkamer en /leads na de redirect
  // de net-gezette session-cookie gebruiken in plaats van een stale render.
  // Zonder deze call zien gebruikers soms een 404 op /leads direct na login,
  // omdat Next.js de layout-tree had gerendered zonder de nieuwe cookies.
  revalidatePath('/', 'layout')

  if (profile.tenant_status === 'pending') {
    redirect('/wachtkamer')
  }

  redirect('/leads')
}
