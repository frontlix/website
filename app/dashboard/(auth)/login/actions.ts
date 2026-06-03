'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export type LoginState = { error?: string; redirectTo?: string }

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

  // Check tenant_status, pending → wachtkamer, rejected → foutmelding,
  // approved → / (Overzicht).
  const { data: profile } = await supabase
    .from('dashboard_user_profiles')
    .select('tenant_status')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!profile) {
    // Profile-rij ontbreekt, Auth Hook zou dit hebben moeten vangen.
    // Forceer logout om geen geldige session in een ongeldige state te laten.
    await supabase.auth.signOut()
    return { error: 'Account-configuratie ontbreekt. Neem contact op met Frontlix.' }
  }

  if (profile.tenant_status === 'rejected') {
    await supabase.auth.signOut()
    return { error: 'Aanvraag afgewezen.' }
  }

  // Invalideer de layout-cache (defensief: voor het geval client soft-navigeert).
  revalidatePath('/', 'layout')

  // Geen server-side redirect(), die race't met de cookie-write en triggert
  // een 404 op de eerste GET /leads. In plaats daarvan returnt de action
  // een redirectTo string; de client doet window.location.href = ... wat
  // een full page reload is en de net-gezette session-cookie wel ziet.
  if (profile.tenant_status === 'pending') {
    return { redirectTo: '/wachtkamer' }
  }
  // Landen op het Overzicht (root van de app-host), niet op /leads.
  return { redirectTo: '/' }
}
