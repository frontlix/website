// lib/dashboard/for-tenant.ts
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase query-builder return types zijn niet praktisch precies te typen; de wrapper stampt/filtert veilig op tenant. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getDashboardAdmin } from './supabase-admin'
import {
  getTenantContext,
  getCurrentTenantId,
  getEffectiveTenantId,
  assertSuperadmin,
} from './tenant-context'

/** Tabellen waar de tenant-sleutel een andere kolom dan tenant_id is. */
const TENANT_KEY_BY_TABLE: Record<string, string> = {
  tenant_settings: 'id',
}
function tenantCol(table: string): string {
  return TENANT_KEY_BY_TABLE[table] ?? 'tenant_id'
}

type Row = Record<string, unknown>

export interface TenantScopedDb {
  /** De tenant waarop alle queries gescoped zijn. */
  readonly tenantId: string
  /** SELECT met automatische tenant-filter; chainbaar (.eq/.maybeSingle/...). */
  selectFrom(table: string, columns?: string): ReturnType<SupabaseClient['from']>['select'] extends never ? never : any
  /** INSERT: stempelt de tenant-kolom op elke rij. */
  insertInto(table: string, rows: Row | Row[]): any
  /** UPSERT: stempelt de tenant-kolom op elke rij. */
  upsertInto(table: string, rows: Row | Row[], options?: { onConflict?: string }): any
  /** UPDATE met automatische tenant-filter. */
  updateIn(table: string, values: Row): any
  /** DELETE met automatische tenant-filter. */
  deleteFrom(table: string): any
  /** Escape-hatch: kale admin-client (ALLEEN voor bewust cross-tenant superadmin-werk). */
  readonly raw: SupabaseClient
}

/** Bouw een tenant-gescopete wrapper rond de admin-client. */
export function forTenant(tenantId: string): TenantScopedDb {
  if (!tenantId) throw new Error('forTenant() vereist een geldige tenantId')
  const admin = getDashboardAdmin()
  const stamp = (table: string, rows: Row | Row[]): Row[] => {
    const key = tenantCol(table)
    const list = Array.isArray(rows) ? rows : [rows]
    return list.map((r) => ({ ...r, [key]: tenantId }))
  }
  return {
    tenantId,
    raw: admin,
    selectFrom(table, columns = '*') {
      return admin.from(table).select(columns).eq(tenantCol(table), tenantId)
    },
    insertInto(table, rows) {
      return admin.from(table).insert(stamp(table, rows))
    },
    upsertInto(table, rows, options) {
      return admin.from(table).upsert(stamp(table, rows), options)
    },
    updateIn(table, values) {
      return admin.from(table).update(values).eq(tenantCol(table), tenantId)
    },
    deleteFrom(table) {
      return admin.from(table).delete().eq(tenantCol(table), tenantId)
    },
  }
}

/** Scoped op de eigen tenant van de ingelogde (approved, niet-superadmin) user. */
export async function forCurrentTenant(): Promise<TenantScopedDb> {
  return forTenant(await getCurrentTenantId())
}

/**
 * Scoped op de EFFECTIEVE tenant (eigen tenant, of de view-as-tenant van de
 * superadmin). Bij superadmin-view-as wordt optioneel een audit-regel geschreven.
 * Geef { audit: true } mee voor gevoelige schrijf-acties.
 */
export async function forEffectiveTenant(opts?: { audit?: boolean; action?: string }): Promise<TenantScopedDb> {
  const ctx = await getTenantContext()
  if (!ctx) throw new Error('Niet ingelogd of niet approved')
  const tenantId = await getEffectiveTenantId()
  if (opts?.audit && ctx.isSuperadmin && ctx.actingTenantId) {
    await logViewAsAudit(ctx.userId, tenantId, opts.action ?? 'write')
  }
  return forTenant(tenantId)
}

/** Schrijf een view-as audit-regel (best-effort; faalt nooit hard). */
export async function logViewAsAudit(
  superadminUserId: string,
  actingTenantId: string,
  action: string,
  detail?: unknown,
): Promise<void> {
  try {
    await getDashboardAdmin().from('superadmin_view_as_audit').insert({
      superadmin_user_id: superadminUserId,
      acting_tenant_id: actingTenantId,
      action,
      detail: detail ?? null,
    })
  } catch (e) {
    console.error('[view-as-audit] schrijven faalde:', e)
  }
}

export { assertSuperadmin }

