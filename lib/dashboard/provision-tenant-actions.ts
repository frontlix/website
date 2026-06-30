'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { assertSuperadmin } from './tenant-context'

export type ProvisionResult = { ok: true; tenantId: string } | { ok: false; error: string }

/**
 * Maakt een nieuwe tenant via public.provision_tenant (tenant_settings +
 * owner-koppeling + notif-prefs + kostprijzen). Alleen de superadmin.
 * De owner-rij (dashboard_user_profiles) moet al bestaan en tenant_id NULL
 * hebben (zie signup/uitnodiging-flow).
 */
export async function provisionTenant(input: {
  bedrijfsnaam: string
  chatbotNaam: string | null
  ownerUserId: string
}): Promise<ProvisionResult> {
  await assertSuperadmin()
  const bedrijfsnaam = input.bedrijfsnaam.trim()
  if (!bedrijfsnaam) return { ok: false, error: 'Bedrijfsnaam is verplicht.' }
  if (!input.ownerUserId) return { ok: false, error: 'Owner ontbreekt.' }

  const { data, error } = await getDashboardAdmin().rpc('provision_tenant', {
    p_bedrijfsnaam: bedrijfsnaam,
    p_chatbot_naam: input.chatbotNaam,
    p_owner_user_id: input.ownerUserId,
  })
  if (error) {
    console.error('[provisionTenant] rpc faalde:', error)
    return { ok: false, error: error.message }
  }
  revalidatePath('/', 'layout')
  return { ok: true, tenantId: data as string }
}

/**
 * Superadmin keurt een pending owner goed en provisiont in een stap: de RPC zet
 * tenant_status='approved' + is_owner=true + koppelt tenant_id. De
 * bedrijfsnaam komt uit de pending profiel-rij tenzij expliciet meegegeven.
 */
export async function approveTenantOwner(input: {
  ownerUserId: string
  bedrijfsnaam?: string
  chatbotNaam?: string | null
}): Promise<ProvisionResult> {
  await assertSuperadmin()
  const admin = getDashboardAdmin()
  const { data: prof, error: profErr } = await admin
    .from('dashboard_user_profiles')
    .select('user_id, bedrijfsnaam, tenant_id')
    .eq('user_id', input.ownerUserId)
    .maybeSingle()
  if (profErr || !prof) return { ok: false, error: 'Owner-profiel niet gevonden.' }
  if (prof.tenant_id) return { ok: false, error: 'Owner is al aan een tenant gekoppeld.' }

  return provisionTenant({
    bedrijfsnaam: input.bedrijfsnaam ?? (prof.bedrijfsnaam as string | null) ?? '',
    chatbotNaam: input.chatbotNaam ?? null,
    ownerUserId: input.ownerUserId,
  })
}

