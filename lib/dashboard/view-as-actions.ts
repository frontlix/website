'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getDashboardAdmin } from './supabase-admin'
import { assertSuperadmin, ACTING_TENANT_COOKIE } from './tenant-context'
import { logViewAsAudit } from './for-tenant'

export type ViewAsResult = { ok: true; bedrijfsnaam: string | null } | { ok: false; error: string }

/** Superadmin kiest een tenant om als view-as te bekijken/beheren. */
export async function startViewAs(tenantId: string): Promise<ViewAsResult> {
  const { userId } = await assertSuperadmin()
  const id = (tenantId ?? '').trim()
  if (!id) return { ok: false, error: 'Geen tenant opgegeven.' }

  // Valideer dat de tenant bestaat (admin-client, bypasst RLS, expliciet op id).
  const { data, error } = await getDashboardAdmin()
    .from('tenant_settings')
    .select('id, bedrijfsnaam')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return { ok: false, error: 'Onbekende tenant.' }

  const store = await cookies()
  store.set(ACTING_TENANT_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  await logViewAsAudit(userId, id, 'start')
  revalidatePath('/', 'layout')
  return { ok: true, bedrijfsnaam: (data.bedrijfsnaam as string | null) ?? null }
}

/** Superadmin verlaat de view-as-modus. */
export async function stopViewAs(): Promise<{ ok: true }> {
  const { userId } = await assertSuperadmin()
  const store = await cookies()
  const current = store.get(ACTING_TENANT_COOKIE)?.value ?? null
  store.delete(ACTING_TENANT_COOKIE)
  if (current) await logViewAsAudit(userId, current, 'stop')
  revalidatePath('/', 'layout')
  return { ok: true }
}

