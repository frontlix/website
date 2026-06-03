'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { getDashboardSupabase } from './supabase-server'

export type AccountActionResult = { ok: true; message?: string } | { ok: false; error: string }

export async function updatePasswordAction(formData: FormData): Promise<AccountActionResult> {
  const huidig = String(formData.get('huidig') ?? '')
  const nieuw = String(formData.get('nieuw') ?? '')
  const herhaal = String(formData.get('herhaal') ?? '')

  if (nieuw.length < 8) return { ok: false, error: 'Nieuw wachtwoord moet minimaal 8 karakters zijn.' }
  if (nieuw !== herhaal) return { ok: false, error: 'De twee nieuwe wachtwoorden komen niet overeen.' }

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Niet ingelogd.' }

  // Verifieer huidig wachtwoord op een WEGWERP-client met de anon-key,   // signInWithPassword op de live SSR-client zou de actieve cookie-sessie
  // muteren (token-rotatie / overschrijven). Deze client persist niets en
  // raakt de cookies dus niet aan; alleen de credential-check telt.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD
  if (!url || !anonKey) {
    return { ok: false, error: 'Supabase niet geconfigureerd op deze server.' }
  }
  const reauthClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: reauthErr } = await reauthClient.auth.signInWithPassword({
    email: user.email,
    password: huidig,
  })
  if (reauthErr) return { ok: false, error: 'Huidig wachtwoord is onjuist.' }

  // De daadwerkelijke wijziging blijft op de live SSR-client (die de
  // ingelogde sessie/cookies beheert).
  const { error } = await supabase.auth.updateUser({ password: nieuw })
  if (error) return { ok: false, error: error.message }

  return { ok: true, message: 'Wachtwoord bijgewerkt.' }
}

export async function updateEmailAction(formData: FormData): Promise<AccountActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { ok: false, error: 'Vul een e-mailadres in.' }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase.auth.updateUser({ email })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/instellingen')
  return {
    ok: true,
    message: 'Bevestigingsmail gestuurd. Klik de link in beide mailboxen (oud + nieuw) om de wijziging te bevestigen.',
  }
}
