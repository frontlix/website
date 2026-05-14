'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import type { DashboardStatus } from './database.types'

const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set([
  'open',
  'opgevolgd',
  'afgehandeld',
  'no_show',
  'geen_interesse',
  'archief',
])

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Wijzigt leads.dashboard_status. De BEFORE/AFTER UPDATE trigger
 * (migratie 025) logt automatisch naar lead_status_history.
 *
 * `null` is toegestaan om de status leeg te maken.
 */
export async function setDashboardStatus(
  leadId: string,
  status: DashboardStatus | null
): Promise<ActionResult> {
  if (status !== null && !VALID_STATUSES.has(status)) {
    return { ok: false, error: 'Ongeldige status-waarde' }
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_status: status })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Markeert een lead als gearchiveerd. getLeadsList filtert deze automatisch
 * weg, dus de lead verdwijnt uit de hoofdlijst.
 */
export async function archiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_archived: true })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Maakt een gearchiveerde lead weer zichtbaar in de hoofdlijst.
 */
export async function unarchiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_archived: false })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Markeert een gesprek als "gelezen" door de owner — zet
 * leads.inbox_gelezen_op = now(). Wordt aangeroepen vanuit de inbox
 * zodra een lead geselecteerd wordt (?lead=...). Verandert daarmee de
 * "Ongelezen" count in de filter-tabs.
 *
 * Idempotent: meerdere calls achter elkaar overschrijven gewoon de
 * timestamp. Bij DB-fouten falen we silent (return ok:false) — de inbox
 * werkt door, alleen de unread-count update niet.
 */
export async function markInboxRead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ inbox_gelezen_op: new Date().toISOString() })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/inbox')
  return { ok: true }
}
