'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'
import { postSignupNotification } from '@/lib/dashboard/slack'

export type SignupState = { error?: string; redirectTo?: string }

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = String(formData.get('email') ?? '').trim()
  const wachtwoord = String(formData.get('wachtwoord') ?? '')
  const bedrijfsnaam = String(formData.get('bedrijfsnaam') ?? '').trim()

  if (!email || !wachtwoord || !bedrijfsnaam) {
    return { error: 'Vul email, wachtwoord en bedrijfsnaam in.' }
  }
  if (wachtwoord.length < 8) {
    return { error: 'Wachtwoord moet minstens 8 tekens zijn.' }
  }

  // Maak user aan via admin.createUser met email_confirm=true. Dat omzeilt
  // Supabase's standaard "klik eerst op de bevestigingsmail"-flow, want ONZE
  // confirmation is de handmatige Frontlix-goedkeuring (tenant_status='approved').
  // Voordeel boven supabase.auth.signUp: de user is direct ingelogd-baar,
  // dus /wachtkamer ziet meteen z'n session-cookie.
  const admin = getDashboardAdmin()
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: wachtwoord,
    email_confirm: true,
  })

  if (createErr || !createData.user) {
    return { error: createErr?.message ?? 'Aanmelden mislukt.' }
  }

  // Maak de dashboard_user_profiles-rij aan met tenant_status='pending'.
  // (We doen dit hier omdat Supabase geen DDL toestaat op auth.users, zie
  // docs/superpowers/postponed.md.) UPSERT zodat retry's geen conflict geven.
  const { error: profileErr } = await admin
    .from('dashboard_user_profiles')
    .upsert(
      {
        user_id: createData.user.id,
        bedrijfsnaam,
        tenant_status: 'pending',
        is_owner: true,
      },
      { onConflict: 'user_id' }
    )

  if (profileErr) {
    // User is gemaakt maar profile niet, log voor manuele opvolging.
    // Slack-notify krijgt een vlag zodat Frontlix-admin het ziet.
    console.error('[signup] profile-upsert failed:', profileErr)
  }

  // Log de net-aangemaakte user direct in via de session-cookie client.
  // Dat zet de Supabase-session-cookie op de browser zodat /wachtkamer
  // de session herkent. Zonder deze stap zou getCurrentUserProfile() null
  // returnen en zou wachtkamer redirecten naar /login.
  const supabase = await getDashboardSupabase()
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: wachtwoord,
  })
  if (signInErr) {
    console.error('[signup] auto-signin after createUser failed:', signInErr)
  }

  await postSignupNotification(
    `🆕 Nieuwe dashboard-aanvraag: *${bedrijfsnaam}*, ${email}` +
      (profileErr ? ` ⚠️ profile-rij ontbreekt, handmatig aanmaken!` : '')
  )

  // Invalideer layout-cache (defensief, voor het geval client soft-navigeert).
  revalidatePath('/', 'layout')

  // Geen server-side redirect(), die race't met de cookie-write en triggert
  // een 404 op de eerste GET /wachtkamer. In plaats daarvan: action returnt
  // redirectTo, client doet window.location.href = ... (full page reload
  // met de net-gezette session-cookie).
  return { redirectTo: '/wachtkamer' }
}
