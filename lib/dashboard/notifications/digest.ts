import { getDashboardAdmin } from '../supabase-admin'
import type { StatsPeriod } from '../period'

/**
 * Bouwt de inhoud van de "Dagelijkse samenvatting"-notificatie.
 *
 * Periode: gisteren (00:00–23:59 Europe/Amsterdam). Geeft een titel + body
 * + payload terug, klaar om door create_notification_for_all_users() in
 * de DB te worden geïnsert.
 *
 * Service-role queries, draait via cron, geen ingelogde user.
 */

export interface DigestContent {
  titel: string
  body: string
  payload: Record<string, unknown>
  /** Of er überhaupt iets te melden was, false = skip de notificatie. */
  hasActivity: boolean
}

export async function buildDigestContent(now: Date = new Date()): Promise<DigestContent> {
  // Gisteren in UTC (DB-waarden staan in UTC; voor de label-tekst doen we
  // Europe/Amsterdam formatting).
  const gisteren = new Date(now)
  gisteren.setUTCDate(gisteren.getUTCDate() - 1)
  const period = dayWindow(gisteren)

  // Hergebruik bestaande stat-queries; deze gebruiken al de user-supabase
  // wrapper. Voor cron-context willen we eigenlijk service-role, maar de
  // queries zijn read-only en `leads` heeft een RLS-policy die approved
  // users alle leads laat zien (single-tenant). Voor cron-veiligheid
  // wrappen we 'm wel met getDashboardAdmin via een aparte query path.
  const [leads, offertes, akkoorden, omzet] = await Promise.all([
    countLeadsAdmin(period),
    countOffertesAdmin(period),
    countAkkoordAdmin(period),
    sumOmzetAdmin(period),
  ])

  const datumLabel = gisteren.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
  })

  const titel = `Dagrapport ${datumLabel}`

  // Body, alleen relevante zinnen tonen (skip "0 ..." regels).
  const zinnen: string[] = []
  if (leads > 0) zinnen.push(`${leads} ${plural(leads, 'nieuwe lead', 'nieuwe leads')}`)
  if (offertes > 0) zinnen.push(`${offertes} ${plural(offertes, 'offerte verstuurd', 'offertes verstuurd')}`)
  if (akkoorden > 0) zinnen.push(`${akkoorden} ${plural(akkoorden, 'akkoord', 'akkoorden')}`)
  if (omzet > 0) zinnen.push(`€${Math.round(omzet).toLocaleString('nl-NL')} omzet`)

  const hasActivity = zinnen.length > 0
  const body = hasActivity
    ? `Gisteren: ${zinnen.join(' · ')}.`
    : 'Gisteren was er geen activiteit op je dashboard.'

  return {
    titel,
    body,
    payload: { leads, offertes, akkoorden, omzet, datum: gisteren.toISOString() },
    hasActivity,
  }
}

function plural(n: number, een: string, meer: string): string {
  return n === 1 ? een : meer
}

function dayWindow(date: Date): StatsPeriod {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  const d = date.getUTCDate()
  return {
    from: new Date(Date.UTC(y, m, d)).toISOString(),
    to: new Date(Date.UTC(y, m, d + 1)).toISOString(),
  }
}

/* ── Admin-versies van de stat-queries ──────────────────────
   Bestaande stats-queries gebruiken getDashboardSupabase() (user-scoped).
   Voor cron-context bestaat geen user-sessie; we gebruiken hier de
   service-role client direct. De counts blijven gelijk omdat de queries
   geen RLS-afhankelijke filters bevatten. */

async function countLeadsAdmin(period: StatsPeriod): Promise<number> {
  const admin = getDashboardAdmin()
  let q = admin.from('leads').select('*', { count: 'exact', head: true })
  if (period.from) q = q.gte('aangemaakt', period.from)
  if (period.to) q = q.lt('aangemaakt', period.to)
  const { count, error } = await q
  if (error) return 0
  return count ?? 0
}

async function countOffertesAdmin(period: StatsPeriod): Promise<number> {
  const admin = getDashboardAdmin()
  let q = admin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .not('offerte_verstuurd_op', 'is', null)
  if (period.from) q = q.gte('offerte_verstuurd_op', period.from)
  if (period.to) q = q.lt('offerte_verstuurd_op', period.to)
  const { count, error } = await q
  if (error) return 0
  return count ?? 0
}

async function countAkkoordAdmin(period: StatsPeriod): Promise<number> {
  const admin = getDashboardAdmin()
  let q = admin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .not('akkoord_op', 'is', null)
  if (period.from) q = q.gte('akkoord_op', period.from)
  if (period.to) q = q.lt('akkoord_op', period.to)
  const { count, error } = await q
  if (error) return 0
  return count ?? 0
}

async function sumOmzetAdmin(period: StatsPeriod): Promise<number> {
  const admin = getDashboardAdmin()
  let q = admin
    .from('leads')
    .select('totaal_prijs')
    .not('akkoord_op', 'is', null)
    .not('totaal_prijs', 'is', null)
  if (period.from) q = q.gte('akkoord_op', period.from)
  if (period.to) q = q.lt('akkoord_op', period.to)
  const { data, error } = await q
  if (error) return 0
  const rows = (data as { totaal_prijs: number | null }[] | null) ?? []
  return rows.reduce((s, r) => s + (r.totaal_prijs ?? 0), 0)
}

