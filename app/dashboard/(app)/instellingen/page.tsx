import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import {
  SettingsNav,
  type SettingsSection,
} from '@/components/dashboard/instellingen/SettingsNav'
import { BotRefreshButton } from '@/components/dashboard/bot-actions/BotRefreshButton'
import {
  BedrijfSection,
  PrijzenSection,
  DienstenSection,
  TagsSection,
  OpeningSection,
  RemindersSection,
  NotificatiesSection,
  TeamSection,
  AccountWrapper,
  AvgWrapper,
  type TenantSettings,
  type PricingRule,
  type ServiceOffering,
  type TeamMember,
} from '@/components/dashboard/instellingen/SettingSections'
import { getPricingImpactBaseline } from '@/lib/dashboard/pricing-impact-queries'
import { getTagsWithCounts, type TagWithCount } from '@/lib/dashboard/tags-queries'
import { getRecentTemplateAanvragen, type TemplateAanvraag } from '@/lib/dashboard/template-queries'
import { getAllPrefs } from '@/lib/dashboard/notifications/queries'
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
  'account',
  'avg',
] as const satisfies readonly SettingsSection[]

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
        'bedrijfsnaam, chatbot_naam, eigenaar_email, eigenaar_whatsapp, eigenaar_spoed_telefoon, plaats, postcode, adres, offerte_geldigheid_dagen, radius_max_km, reminder_dag_1, reminder_dag_2, reminder_dag_3, calendar_link, base_huisnummer, base_label, base_lat, base_lng, daily_digest_tijd, omzet_doel_maand',
      )
      .limit(1)
      .maybeSingle(),
    // Prijzen: altijd ophalen — desktop-sectie én mobiele Prijzen-scherm gebruiken ze.
    supabase
      .from('pricing_rules')
      .select('rule_key, label, waarde, eenheid, sort_order')
      .order('sort_order', { ascending: true }),
    // Services/Team/Tags/Prefs: altijd ophalen — zowel desktop-sectie als
    // mobiele hub gebruiken ze.
    supabase
      .from('service_offerings')
      .select('dienst_key, label, actief, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('dashboard_user_profiles')
      .select('user_id, bedrijfsnaam, is_owner, tenant_status')
      .eq('tenant_status', 'approved'),
    section === 'prijzen' ? getPricingImpactBaseline(30) : Promise.resolve(null),
    getTagsWithCounts(),
    section === 'opening' || section === 'reminders'
      ? getRecentTemplateAanvragen(20)
      : Promise.resolve([] as TemplateAanvraag[]),
    getAllPrefs(),
  ])

  const tenant = tenantRaw.data as TenantSettings | null
  const pricing = (pricingRaw.data as PricingRule[] | null) ?? []
  const services = (servicesRaw.data as ServiceOffering[] | null) ?? []
  const team = (teamRaw.data as TeamMember[] | null) ?? []
  const tags = tagsRaw as TagWithCount[]
  const templateAanvragen = aanvragenRaw as TemplateAanvraag[]

  return (
    <>
      <div className={styles.desktopTree}>
        <div className="dash-section-head">
          <div>
            <div className="dash-section-title">Instellingen</div>
            <div className="dash-section-sub">
              Bedrijf · Prijzen · Diensten · Openingsbericht · Reminders · Team
            </div>
          </div>
          <BotRefreshButton />
        </div>

        <div className={styles.layout}>
          <SettingsNav />
          <div className={styles.content}>
            {section === 'bedrijf' && <BedrijfSection tenant={tenant} />}
            {section === 'prijzen' && <PrijzenSection pricing={pricing} baseline={baselineRaw} />}
            {section === 'diensten' && <DienstenSection services={services} />}
            {section === 'tags' && <TagsSection tags={tags} />}
            {section === 'opening' && (
              <OpeningSection
                bedrijfsnaam={tenant?.bedrijfsnaam ?? 'Schoon Straatje'}
                chatbot={tenant?.chatbot_naam ?? 'Surface'}
                aanvragen={templateAanvragen}
              />
            )}
            {section === 'reminders' && (
              <RemindersSection tenant={tenant} aanvragen={templateAanvragen} />
            )}
            {section === 'notificaties' && (
              <NotificatiesSection
                prefs={notifPrefs}
                digestTijd={tenant?.daily_digest_tijd ?? '08:00'}
              />
            )}
            {section === 'team' && <TeamSection members={team} />}
            {section === 'account' && <AccountWrapper email={user?.email ?? ''} />}
            {section === 'avg' && <AvgWrapper />}
          </div>
        </div>
      </div>

      <div className={styles.mobileTree}>
        {/* Echte Supabase-data wordt doorgesluisd naar elk mobiel detailscherm
            (geen mock meer). sp.section (rauw) opent het juiste detail bij een
            deeplink (bv. ?section=bedrijf). */}
        <MobileInstellingen
          tenant={tenant}
          pricing={pricing}
          services={services}
          team={team}
          tags={tags}
          notifPrefs={notifPrefs}
          initialSection={sp.section}
        />
      </div>
    </>
  )
}
