import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'
import { resolveReceiveEmail } from '@/lib/dashboard/owner-contact'

/**
 * Ontvangadres voor een dashboard-melding: het ingestelde meldingen-adres
 * (meldingen_email ?? eigenaar_email), anders het login-account-adres van de
 * user als laatste vangnet. Single-tenant: een tenant_settings-rij.
 */
export async function resolveNotificationRecipient(userId: string): Promise<string> {
  const admin = getDashboardAdmin()
  const { data: tenantRow } = await admin
    .from('tenant_settings')
    .select('meldingen_email, eigenaar_email')
    .limit(1)
    .maybeSingle()

  const configured = resolveReceiveEmail(
    tenantRow?.meldingen_email ?? null,
    tenantRow?.eigenaar_email ?? null,
  )
  if (configured) return configured

  const { data: userRes, error } = await admin.auth.admin.getUserById(userId)
  if (error || !userRes?.user?.email) {
    throw new Error(`Geen ontvangadres voor user ${userId}: ${error?.message}`)
  }
  return userRes.user.email
}
