import { Lock } from 'lucide-react'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { Pill } from '@/components/dashboard/ui/Pill'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import {
  SettingsNav,
  type SettingsSection,
} from '@/components/dashboard/instellingen/SettingsNav'
import { AccountSection } from '@/components/dashboard/instellingen/AccountSection'
import { AvgSection } from '@/components/dashboard/instellingen/AvgSection'
import { TenantBaseForm } from '@/components/dashboard/instellingen/TenantBaseForm'
import { ServiceOfferingToggle } from '@/components/dashboard/instellingen/ServiceOfferingToggle'
import { TagsManager } from '@/components/dashboard/instellingen/TagsManager'
import { BotRefreshButton } from '@/components/dashboard/bot-actions/BotRefreshButton'
import { PrijzenEditor } from '@/components/dashboard/instellingen/PrijzenEditor'
import { OpeningTemplateEditor } from '@/components/dashboard/instellingen/OpeningTemplateEditor'
import { RemindersEditor } from '@/components/dashboard/instellingen/RemindersEditor'
import { getPricingImpactBaseline } from '@/lib/dashboard/pricing-impact-queries'
import { getTagsWithCounts, type TagWithCount } from '@/lib/dashboard/tags-queries'
import { getRecentTemplateAanvragen, type TemplateAanvraag } from '@/lib/dashboard/template-queries'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

type TenantSettings = {
  bedrijfsnaam: string | null
  chatbot_naam: string | null
  eigenaar_email: string | null
  eigenaar_whatsapp: string | null
  eigenaar_spoed_telefoon: string | null
  plaats: string | null
  postcode: string | null
  adres: string | null
  offerte_geldigheid_dagen: number | null
  radius_max_km: number | null
  reminder_dag_1: number | null
  reminder_dag_2: number | null
  reminder_dag_3: number | null
  calendar_link: string | null
  base_huisnummer: string | null
  base_label: string | null
  base_lat: number | null
  base_lng: number | null
}

type PricingRule = {
  rule_key: string
  label: string
  waarde: number
  eenheid: string | null
  sort_order: number
}

type ServiceOffering = {
  dienst_key: string
  label: string
  actief: boolean
  sort_order: number
}

type TeamMember = {
  user_id: string
  bedrijfsnaam: string | null
  is_owner: boolean
  tenant_status: 'pending' | 'approved' | 'rejected'
}

export default async function InstellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const sp = await searchParams
  const section = (
    ['bedrijf', 'prijzen', 'diensten', 'tags', 'opening', 'reminders', 'notificaties', 'team', 'account', 'avg'].includes(
      sp.section ?? '',
    )
      ? sp.section
      : 'bedrijf'
  ) as SettingsSection

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch alleen wat de gekozen sectie nodig heeft (kleine optimalisatie).
  const [tenantRaw, pricingRaw, servicesRaw, teamRaw, baselineRaw, tagsRaw, aanvragenRaw] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select(
        'bedrijfsnaam, chatbot_naam, eigenaar_email, eigenaar_whatsapp, eigenaar_spoed_telefoon, plaats, postcode, adres, offerte_geldigheid_dagen, radius_max_km, reminder_dag_1, reminder_dag_2, reminder_dag_3, calendar_link, base_huisnummer, base_label, base_lat, base_lng',
      )
      .limit(1)
      .maybeSingle(),
    section === 'prijzen'
      ? supabase
          .from('pricing_rules')
          .select('rule_key, label, waarde, eenheid, sort_order')
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    section === 'diensten'
      ? supabase
          .from('service_offerings')
          .select('dienst_key, label, actief, sort_order')
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    section === 'team'
      ? supabase
          .from('dashboard_user_profiles')
          .select('user_id, bedrijfsnaam, is_owner, tenant_status')
          .eq('tenant_status', 'approved')
      : Promise.resolve({ data: [] }),
    section === 'prijzen' ? getPricingImpactBaseline(30) : Promise.resolve(null),
    section === 'tags' ? getTagsWithCounts() : Promise.resolve([] as TagWithCount[]),
    section === 'opening' || section === 'reminders'
      ? getRecentTemplateAanvragen(20)
      : Promise.resolve([] as TemplateAanvraag[]),
  ])

  const tenant = tenantRaw.data as TenantSettings | null
  const pricing = (pricingRaw.data as PricingRule[] | null) ?? []
  const services = (servicesRaw.data as ServiceOffering[] | null) ?? []
  const team = (teamRaw.data as TeamMember[] | null) ?? []
  const baseline = baselineRaw
  const tags = tagsRaw as TagWithCount[]
  const templateAanvragen = aanvragenRaw as TemplateAanvraag[]

  return (
    <>
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
          {section === 'prijzen' && <PrijzenSection pricing={pricing} baseline={baseline} />}
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
            <RemindersSection
              tenant={tenant}
              bedrijfsnaam={tenant?.bedrijfsnaam ?? 'Schoon Straatje'}
              chatbot={tenant?.chatbot_naam ?? 'Surface'}
              aanvragen={templateAanvragen}
            />
          )}
          {section === 'notificaties' && <NotificatiesSection />}
          {section === 'team' && <TeamSection members={team} />}
          {section === 'account' && <AccountSection email={user?.email ?? ''} />}
          {section === 'avg' && <AvgSection />}
        </div>
      </div>
    </>
  )
}

/* ── BEDRIJFSGEGEVENS ──────────────────────────────────── */
function BedrijfSection({ tenant }: { tenant: TenantSettings | null }) {
  const fields = [
    { label: 'Bedrijfsnaam', value: tenant?.bedrijfsnaam, full: false },
    { label: 'Bot-naam', value: tenant?.chatbot_naam, full: false },
    { label: 'Adres', value: tenant?.adres, full: true },
    { label: 'Postcode', value: tenant?.postcode, full: false },
    { label: 'Plaats', value: tenant?.plaats, full: false },
    { label: 'Eigenaar e-mail', value: tenant?.eigenaar_email, full: false },
    { label: 'Eigenaar WhatsApp', value: tenant?.eigenaar_whatsapp, full: false },
    { label: 'Spoed-telefoon', value: tenant?.eigenaar_spoed_telefoon, full: false },
    { label: 'Calendar afspraak-link', value: tenant?.calendar_link, full: true },
  ]
  return (
    <>
      <SectionCard
        title="Bedrijfsgegevens"
        sub="Contactgegevens en vestiging"
      >
        <div className={styles.fieldGrid}>
          {fields.map((f) => (
            <ReadOnlyField key={f.label} label={f.label} value={f.value} full={f.full} />
          ))}
        </div>
      </SectionCard>

      <div className="dash-card" style={{ marginTop: 16 }}>
        <div className="dash-card-head">
          <div>
            <div className="dash-card-title">Thuisbasis voor routekaart</div>
            <div className="dash-card-sub">
              Vertrekpunt voor alle dag-routes in de agenda. Bij opslaan wordt
              de exacte locatie automatisch opgezocht via postcode.tech.
            </div>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <TenantBaseForm
            initialPostcode={tenant?.postcode ?? ''}
            initialHuisnummer={tenant?.base_huisnummer ?? ''}
            initialLabel={tenant?.base_label ?? 'BASIS'}
            hasCoords={
              typeof tenant?.base_lat === 'number' &&
              typeof tenant?.base_lng === 'number'
            }
            currentLat={tenant?.base_lat ?? null}
            currentLng={tenant?.base_lng ?? null}
          />
        </div>
      </div>
    </>
  )
}

/* ── PRIJZEN ───────────────────────────────────────────── */
function PrijzenSection({
  pricing,
  baseline,
}: {
  pricing: PricingRule[]
  baseline: Awaited<ReturnType<typeof getPricingImpactBaseline>> | null
}) {
  // Fallback baseline als de query (om welke reden ook) niet liep.
  const safeBaseline = baseline ?? {
    leadCount: 0,
    periodStart: null,
    periodEnd: new Date().toISOString(),
    baselineRevenue: 0,
    baselineConversion: 0,
    volumes: {},
  }
  return (
    <SectionCard
      title="Prijzen"
      sub={`${pricing.length} prijsregels — gebruikt door Surface voor offerte-berekening`}
      readOnly={false}
    >
      <PrijzenEditor rules={pricing} baseline={safeBaseline} />
    </SectionCard>
  )
}

/* ── DIENSTEN AANBOD ───────────────────────────────────── */
function DienstenSection({ services }: { services: ServiceOffering[] }) {
  return (
    <SectionCard
      title="Diensten aanbod"
      sub="Welke diensten biedt je bedrijf aan? Schakel ze aan of uit met de toggle."
      readOnly={false}
    >
      <div className={styles.servicesList}>
        {services.map((s) => (
          <div key={s.dienst_key} className={styles.serviceRow}>
            <div className={styles.serviceLabel}>{s.label}</div>
            <ServiceOfferingToggle
              dienstKey={s.dienst_key}
              label={s.label}
              initialActief={s.actief}
            />
          </div>
        ))}
        {services.length === 0 && (
          <div className={styles.empty}>Geen diensten gevonden.</div>
        )}
      </div>
    </SectionCard>
  )
}

/* ── TAGS ───────────────────────────────────────────────── */
function TagsSection({ tags }: { tags: TagWithCount[] }) {
  return (
    <SectionCard
      title="Tags"
      sub="Categoriseer leads in je eigen woorden — gebruik in filters en zoekopdrachten"
      readOnly={false}
    >
      <TagsManager initialTags={tags} />
    </SectionCard>
  )
}

/* ── OPENINGSBERICHT ───────────────────────────────────── */
function OpeningSection({
  bedrijfsnaam,
  chatbot,
  aanvragen,
}: {
  bedrijfsnaam: string
  chatbot: string
  aanvragen: TemplateAanvraag[]
}) {
  return (
    <SectionCard
      title="Openingsbericht via WhatsApp"
      sub={`Het eerste bericht dat ${chatbot} stuurt zodra een lead binnenkomt — Meta-template`}
      readOnly={false}
    >
      <div className={styles.metaWarning}>
        ⚠ <strong>Let op:</strong> Meta keurt elke wijziging handmatig goed
        (kan 24-48u duren). Tot Meta de nieuwe versie goedkeurt blijft de oude
        versie actief. Variabelen zoals <code>{'{voornaam}'}</code> moeten{' '}
        <strong>exact</strong> overeenkomen met de template-parameters bij Meta.
      </div>
      <OpeningTemplateEditor
        bedrijfsnaam={bedrijfsnaam}
        chatbotNaam={chatbot}
        aanvragen={aanvragen}
      />
    </SectionCard>
  )
}

/* ── REMINDERS ────────────────────────────────────────── */
function RemindersSection({
  tenant,
  bedrijfsnaam,
  chatbot,
  aanvragen,
}: {
  tenant: TenantSettings | null
  bedrijfsnaam: string
  chatbot: string
  aanvragen: TemplateAanvraag[]
}) {
  return (
    <SectionCard
      title="Reminders"
      sub="Surface stuurt deze berichten automatisch wanneer een klant niet reageert op de offerte"
    >
      <RemindersEditor
        bedrijfsnaam={bedrijfsnaam}
        chatbotNaam={chatbot}
        initialDays={{
          1: tenant?.reminder_dag_1 ?? 2,
          2: tenant?.reminder_dag_2 ?? 5,
          3: tenant?.reminder_dag_3 ?? 8,
        }}
        aanvragen={aanvragen}
      />
    </SectionCard>
  )
}

/* ── NOTIFICATIES ────────────────────────────────────── */
function NotificatiesSection() {
  const events = [
    { label: 'Nieuwe lead binnen',       sub: 'iemand vult het formulier in' },
    { label: 'Owner-review nodig',       sub: 'Surface wacht op jouw goedkeuring' },
    { label: 'Klant vraagt korting',     sub: 'Onderhandelingsmoment' },
    { label: 'Offerte goedgekeurd',      sub: 'Klant gaat akkoord' },
    { label: 'Offerte afgewezen',        sub: 'Klant haakt af' },
    { label: 'Afspraak ingepland',       sub: 'Klant kiest een datum' },
    { label: 'Nieuwe review ontvangen',  sub: 'Klant scoort de klus' },
    { label: 'Dagelijkse samenvatting',  sub: 'Elke ochtend 08:00 — wat ging er gisteren' },
  ]
  const channels = ['In-app', 'E-mail', 'Push', 'SMS']
  return (
    <SectionCard
      title="Notificatie-voorkeuren"
      sub="Per type event kies je welke kanalen je gebruikt"
    >
      <div className={styles.notifTable}>
        <div className={styles.notifHead}>
          <div>Event</div>
          {channels.map((c) => (
            <div key={c} className={styles.notifCol}>
              {c}
            </div>
          ))}
        </div>
        {events.map((e) => (
          <div key={e.label} className={styles.notifRow}>
            <div>
              <div className={styles.notifLabel}>{e.label}</div>
              <div className={styles.notifSub}>{e.sub}</div>
            </div>
            {channels.map((c) => (
              <div key={c} className={styles.notifCol}>
                <Toggle disabled />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.placeholderBox} style={{ marginTop: 14 }}>
        Toggles werken zodra de notification-preferences-tabel beschikbaar
        is. Voor nu krijgt elke event-type een in-app notificatie.
      </div>
    </SectionCard>
  )
}

/* ── TEAM ─────────────────────────────────────────────── */
function TeamSection({ members }: { members: TeamMember[] }) {
  return (
    <SectionCard
      title="Team"
      sub={`${members.length} approved teamleden · uitnodigen via Frontlix-support`}
    >
      <div className={styles.teamList}>
        {members.map((m) => (
          <div key={m.user_id} className={styles.teamRow}>
            <Avatar name={m.bedrijfsnaam || 'Lid'} />
            <div className={styles.teamBody}>
              <div className={styles.teamName}>
                {m.bedrijfsnaam || 'Onbekend'}
              </div>
              <div className={styles.teamId}>{m.user_id.slice(0, 8)}…</div>
            </div>
            <Pill tone={m.is_owner ? 'blue' : 'gray'}>
              {m.is_owner ? 'Owner' : 'Member'}
            </Pill>
          </div>
        ))}
        {members.length === 0 && (
          <div className={styles.empty}>Geen approved teamleden gevonden.</div>
        )}
      </div>
    </SectionCard>
  )
}

/* ── SectionCard wrapper + atoms ──────────────────────── */
function SectionCard({
  title,
  sub,
  readOnly = true,
  children,
}: {
  title: string
  sub?: string
  /** Toon de "Read-only" pill. Default true — zet op false voor secties
   *  waar de UI wel echt kan opslaan (bv. Prijzen sinds we de editor
   *  hebben). */
  readOnly?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <div>
          <div className="dash-card-title">{title}</div>
          {sub && <div className="dash-card-sub">{sub}</div>}
        </div>
        {readOnly && (
          <Pill tone="gray">
            <Lock size={11} style={{ marginRight: 2 }} />
            Read-only
          </Pill>
        )}
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  full,
}: {
  label: string
  value: string | null | undefined
  full?: boolean
}) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={styles.fieldValue}>{value || '—'}</div>
    </div>
  )
}

function Toggle({ disabled = false }: { disabled?: boolean }) {
  return (
    <span className={`${styles.toggle} ${disabled ? styles.toggleDisabled : ''}`}>
      <span className={styles.toggleKnob} />
    </span>
  )
}

