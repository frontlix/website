'use server'

import { redirect } from 'next/navigation'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'
import { postSignupNotification } from '@/lib/dashboard/slack'

export type SignupState = { error?: string }

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

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase.auth.signUp({ email, password: wachtwoord })

  if (error || !data.user) {
    return { error: error?.message ?? 'Aanmelden mislukt.' }
  }

  // Maak de dashboard_user_profiles-rij aan met tenant_status='pending'.
  // We doen dit hier (in plaats van via een AFTER INSERT-trigger op auth.users)
  // omdat Supabase geen DDL toestaat op auth.users — die tabel is eigendom
  // van supabase_auth_admin. Service-key bypasst RLS zodat de INSERT slaagt
  // ondanks dat de huidige session nog niet actief is.
  // UPSERT zodat een retry na fouten geen duplicate key conflict geeft.
  const admin = getDashboardAdmin()
  const { error: profileErr } = await admin
    .from('dashboard_user_profiles')
    .upsert(
      {
        user_id: data.user.id,
        bedrijfsnaam,
        tenant_status: 'pending',
        is_owner: true,
      },
      { onConflict: 'user_id' }
    )

  if (profileErr) {
    // Auth.user is gemaakt maar profile niet — log voor manuele opvolging.
    // We blokkeren de redirect niet zodat user toch de wachtkamer ziet;
    // Frontlix-admin krijgt de Slack-notify en kan handmatig de profile-rij
    // maken in Supabase Studio.
    console.error('[signup] profile-upsert failed:', profileErr)
  }

  await postSignupNotification(
    `🆕 Nieuwe dashboard-aanvraag: *${bedrijfsnaam}* — ${email}` +
      (profileErr ? ` ⚠️ profile-rij ontbreekt, handmatig aanmaken!` : '')
  )

  redirect('/wachtkamer')
}
