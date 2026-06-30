import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { type SettingsSection } from '@/components/dashboard/instellingen/SettingsNav'
import type { TenantSettings, PricingRule, ServiceOffering, TeamMember } from '@/components/dashboard/instellingen/setting-types'
import { getConnectionStatus } from '@/lib/dashboard/calendar-connection-queries'
import { getEmailConnectionStatus } from '@/lib/dashboard/email-connection-queries'
import { getGmailConnectionStatus } from '@/lib/dashboard/gmail-connection-queries'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import type { DagBeschikbaarheid } from '@/lib/dashboard/beschikbaarheid-actions'
import { getPricingImpactBaseline } from '@/lib/dashboard/pricing-impact-queries'
import { getTagsWithCounts, type TagWithCount } from '@/lib/dashboard/tags-queries'
import { getRecentTemplateAanvragen, type TemplateAanvraag } from '@/lib/dashboard/template-queries'
import { getAllPrefs } from '@/lib/dashboard/notifications/queries'
import { getKlusStatusMelden } from '@/lib/dashboard/tenant-base'
import { MobileInstellingen } from '@/components/dashboard/mobile/instellingen/MobileInstellingen'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

const ALLOWED_SECTIONS = [
  'bedrijf',
  'prijzen',
  'diensten',
  'tags',
  'opening',
  'reminders',
  'notificaties',
  'team',
  'integraties',
  'account',
  'avg',
] as const satisfies readonly SettingsSection[]

// Standaard-werkweek voor het mobiele Beschikbaarheid-scherm als de tenant nog
// niets heeft ingesteld (Ma..Vr werkdagen 08:00-17:00, weekend uit).
const DEFAULT_BESCHIKBAARHEID: DagBeschikbaarheid[] = [
  { dag: 'Maandag', aan: true, van: '08:00', tot: '17:00' },
  { dag: 'Dinsdag', aan: true, van: '08:00', tot: '17:00' },
  { dag: 'Woensdag', aan: true, van: '08:00', tot: '17:00' },
  { dag: 'Donderdag', aan: true, van: '08:00', tot: '17:00' },
  { dag: 'Vrijdag', aan: true, van: '08:00', tot: '17:00' },
  { dag: 'Zaterdag', aan: false, van: '09:00', tot: '13:00' },
  { dag: 'Zondag', aan: false, van: '09:00', tot: '13:00' },
]

export default async function InstellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const sp = await searchParams
  const section: SettingsSection = (ALLOWED_SECTIONS as readonly string[]).includes(
    sp.section ?? '',
  )
    ? (sp.section as SettingsSection)
    : 'bedrijf'

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // De desktop-tree rendert alléén de actieve sectie en heeft dus genoeg aan
  // de sectie-specifieke fetches. De mobiele tree daarentegen toont één hub met
  // álle secties (de detailschermen worden client-side getoond na een tik), dus
  // die heeft de volledige dataset nodig. We detecteren mobiel niet server-side;
  // daarom halen we de data op die óf de desktop-sectie óf de mobiele hub nodig
  // heeft. De lichte queries (services/team/tags/prefs) draaien altijd zodat de
  // mobiele schermen echte data + counts krijgen i.p.v. mock.
  const [tenantRaw, pricingRaw, servicesRaw, teamRaw, baselineRaw, tagsRaw, aanvragenRaw, notifPrefs] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select(
        'bedrijfsnaam, chatbot_naam, eigenaar_email, eigenaar_naam, eigenaar_whatsapp, eigenaar_spoed_telefoon, plaats, postcode, adres, offerte_geldigheid_dagen, radius_max_km, radius_min_m2_buiten_straal, reminder_dag_1, reminder_dag_2, reminder_dag_3, calendar_link, base_huisnummer, base_label, base_lat, base_lng, daily_digest_tijd, omzet_doel_maand, beschikbaarheid',
      )
      .limit(1)
      .maybeSingle(),
    // Prijzen: altijd ophalen, desktop-sectie én mobiele Prijzen-scherm gebruiken ze.
    supabase
      .from('pricing_rules')
      .select('rule_key, label, waarde, eenheid, sort_order')
      .order('sort_order', { ascending: true }),
    // Services/Team/Tags/Prefs: altijd ophalen, zowel desktop-sectie als
    // mobiele hub gebruiken ze.
    supabase
      .from('service_offerings')
      .select('dienst_key, label, actief, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('dashboard_user_profiles')
      .select('user_id, bedrijfsnaam, is_owner, tenant_status')
      .eq('tenant_status', 'approved'),
    // Wat-als-baseline (laatste 30 leads): altijd ophalen. De mobiele Prijzen-
    // sectie wordt client-side geopend (zonder ?section=prijzen), dus we kunnen
    // server-side niet weten of 'ie nodig is. Desktop gebruikt 'm alleen bij
    // section==='prijzen'; de meerkost is één begrensde leads-query.
    getPricingImpactBaseline(30),
    getTagsWithCounts(),
    // Template-aanvragen altijd ophalen: de mobiele Opening/Reminders-schermen
    // worden client-side geopend (zonder ?section=), dus we kunnen server-side
    // niet weten of ze nodig zijn. Lichte query (limit 20), zelfde afweging als
    // de pricing-baseline hierboven.
    getRecentTemplateAanvragen(20),
    getAllPrefs(),
  ])

  const tenant = tenantRaw.data as TenantSettings | null
  const pricing = (pricingRaw.data as PricingRule[] | null) ?? []
  const services = (servicesRaw.data as ServiceOffering[] | null) ?? []
  const team = (teamRaw.data as TeamMember[] | null) ?? []
  const tags = tagsRaw as TagWithCount[]
  const templateAanvragen = aanvragenRaw as TemplateAanvraag[]

  // Agenda-koppeling: zowel de desktop-sectie 'integraties' als het mobiele
  // Agenda-detailscherm (client-side geopend, zonder ?section=) gebruiken deze
  // status, dus altijd ophalen (lichte service-role read, zonder het token).
  // Tenant van de ingelogde user; de koppel-statussen zijn per tenant. Bij de
  // superadmin (geen eigen tenant) tonen we 'niet gekoppeld'.
  const koppelProfile = await getCurrentUserProfile()
  const koppelTenantId = koppelProfile?.tenant_id ?? null

  const gcalStatus = koppelTenantId
    ? await getConnectionStatus(koppelTenantId)
    : { connected: false, googleEmail: null, calendarId: null, connectedAt: null }

  // E-mailkoppel-status (zonder wachtwoord) voor het mobiele E-mailkoppeling-scherm.
  const emailStatus = koppelTenantId
    ? await getEmailConnectionStatus(koppelTenantId)
    : { connected: false }

  // Gmail-label-koppelstatus voor het Gmail-koppelblok in het Bedrijfsprofiel.
  const gmailStatus = koppelTenantId
    ? await getGmailConnectionStatus(koppelTenantId)
    : { connected: false, googleEmail: null, labelName: null }

  // "Klus afronden"-toggle (063): defensieve helper (ontbrekende migratie-kolom
  // → default true) voor het mobiele Meldingen-scherm.
  const klusStatusMelden = await getKlusStatusMelden()

  // Beschikbaarheid (werkdagen + tijden) voor het mobiele Beschikbaarheid-scherm.
  // Uit tenant_settings.beschikbaarheid; valt terug op een standaard-werkweek als
  // de kolom (nog) leeg is, zodat het scherm altijd 7 dagen toont.
  const beschRaw = (
    tenantRaw.data as { beschikbaarheid?: DagBeschikbaarheid[] | null } | null
  )?.beschikbaarheid
  const beschikbaarheid: DagBeschikbaarheid[] =
    Array.isArray(beschRaw) && beschRaw.length === 7 ? beschRaw : DEFAULT_BESCHIKBAARHEID

  return (
    <>
      <div className={styles.mobileTree}>
        {/* Echte Supabase-data wordt doorgesluisd naar elk mobiel detailscherm
            (geen mock meer). sp.section (rauw) opent het juiste detail bij een
            deeplink (bv. ?section=bedrijf). */}
        <MobileInstellingen
          tenant={tenant}
          pricing={pricing}
          baseline={baselineRaw}
          services={services}
          team={team}
          tags={tags}
          notifPrefs={notifPrefs}
          klusStatusMelden={klusStatusMelden}
          templateAanvragen={templateAanvragen}
          gcalStatus={gcalStatus}
          beschikbaarheid={beschikbaarheid}
          emailStatus={emailStatus}
          gmailStatus={gmailStatus}
          userEmail={user?.email ?? ''}
          initialSection={sp.section}
        />
      </div>
    </>
  )
}
