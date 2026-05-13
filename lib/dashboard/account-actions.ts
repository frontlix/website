'use server'

import { revalidatePath } from 'next/cache'
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

  // Verifieer huidig wachtwoord door opnieuw te authenticeren.
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: huidig,
  })
  if (reauthErr) return { ok: false, error: 'Huidig wachtwoord is onjuist.' }

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
