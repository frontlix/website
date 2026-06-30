// lib/dashboard/tenant-context.ts
import { cache } from 'react'
import { cookies } from 'next/headers'
import { getCurrentUser, getCurrentUserProfile } from './auth'

/** Cookie waarin de superadmin de actieve view-as-tenant bewaart (httpOnly). */
export const ACTING_TENANT_COOKIE = 'frontlix_acting_tenant'

export interface TenantContext {
  userId: string
  /** Eigen tenant van de user. NULL voor de superadmin (Chris). */
  ownTenantId: string | null
  isSuperadmin: boolean
  /** Door de superadmin gekozen view-as-tenant (cookie), of null. */
  actingTenantId: string | null
  /**
   * Tenant waarop lees/schrijf moet landen:
   *  - gewone user        -> ownTenantId
   *  - superadmin+view-as  -> actingTenantId
   *  - superadmin zonder view-as -> null (geen tenant geselecteerd)
   */
  effectiveTenantId: string | null
}

/** Leest de view-as-cookie (alleen betekenisvol voor de superadmin). */
export async function readActingTenantCookie(): Promise<string | null> {
  const store = await cookies()
  const v = store.get(ACTING_TENANT_COOKIE)?.value?.trim()
  return v || null
}

/** Request-gescopete tenant-context (cache() dedupliceert binnen 1 render). */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const user = await getCurrentUser()
  if (!user) return null
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') return null

  const isSuperadmin = profile.platform_role === 'superadmin'
  const ownTenantId = profile.tenant_id ?? null
  const actingTenantId = isSuperadmin ? await readActingTenantCookie() : null
  const effectiveTenantId = isSuperadmin ? actingTenantId : ownTenantId

  return { userId: user.id, ownTenantId, isSuperadmin, actingTenantId, effectiveTenantId }
})

/** Eigen tenant-id van de ingelogde approved user. Gooit voor de superadmin (geen eigen tenant). */
export async function getCurrentTenantId(): Promise<string> {
  const ctx = await getTenantContext()
  if (!ctx) throw new Error('Niet ingelogd of niet approved')
  if (!ctx.ownTenantId) {
    throw new Error('Geen eigen tenant (superadmin); gebruik getEffectiveTenantId()/forEffectiveTenant()')
  }
  return ctx.ownTenantId
}

/** Backwards-compat alias voor de oude single-tenant getTenantId(). */
export const getTenantIdForCurrentUser = getCurrentTenantId

/** Effectieve tenant (eigen tenant, of view-as-tenant voor de superadmin). */
export async function getEffectiveTenantId(): Promise<string> {
  const ctx = await getTenantContext()
  if (!ctx) throw new Error('Niet ingelogd of niet approved')
  if (!ctx.effectiveTenantId) {
    throw new Error(
      ctx.isSuperadmin
        ? 'Superadmin zonder actieve view-as-tenant; selecteer eerst een bedrijf.'
        : 'Geen tenant gekoppeld aan deze gebruiker.',
    )
  }
  return ctx.effectiveTenantId
}

export async function isSuperadmin(): Promise<boolean> {
  const ctx = await getTenantContext()
  return ctx?.isSuperadmin ?? false
}

/** Gate voor superadmin-only acties (provisioning, view-as schakelen). */
export async function assertSuperadmin(): Promise<{ userId: string }> {
  const ctx = await getTenantContext()
  if (!ctx || !ctx.isSuperadmin) throw new Error('Alleen de superadmin mag deze actie uitvoeren.')
  return { userId: ctx.userId }
}

