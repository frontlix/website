import { Lock, Sparkles } from 'lucide-react'
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
import { BotRefreshButton } from '@/components/dashboard/bot-actions/BotRefreshButton'
import { PricingRuleEditor } from '@/components/dashboard/instellingen/PricingRuleEditor'
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
  const [tenantRaw, pricingRaw, servicesRaw, teamRaw] = await Promise.all([
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
  ])

  const tenant = tenantRaw.data as TenantSettings | null
  const pricing = (pricingRaw.data as PricingRule[] | null) ?? []
  const services = (servicesRaw.data as ServiceOffering[] | null) ?? []
  const team = (teamRaw.data as TeamMember[] | null) ?? []

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
          {section === 'prijzen' && <PrijzenSection pricing={pricing} />}
          {section === 'diensten' && <DienstenSection services={services} />}
          {section === 'tags' && <TagsSection />}
          {section === 'opening' && <OpeningSection chatbot={tenant?.chatbot_naam ?? 'Surface'} />}
          {section === 'reminders' && <RemindersSection tenant={tenant} />}
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
function PrijzenSection({ pricing }: { pricing: PricingRule[] }) {
  return (
    <>
      <SectionCard
        title="Prijzen"
        sub={`${pricing.length} prijsregels — gebruikt door Surface voor offerte-berekening`}
        readOnly={false}
      >
        <div className={styles.pricingList}>
          {pricing.map((rule) => (
            <div key={rule.rule_key} className={styles.pricingRow}>
              <div>
                <div className={styles.pricingLabel}>{rule.label}</div>
              </div>
              <PricingRuleEditor
                ruleKey={rule.rule_key}
                eenheid={rule.eenheid}
                initialValue={rule.waarde}
              />
            </div>
          ))}
          {pricing.length === 0 && (
            <div className={styles.empty}>Geen prijsregels gevonden.</div>
          )}
        </div>
      </SectionCard>

      <WatAlsSimulator />
    </>
  )
}

/* ── WAT-ALS SIMULATOR (placeholder) ───────────────────── */
function WatAlsSimulator() {
  return (
    <div className={styles.simulator}>
      <div className={styles.simulatorIcon} aria-hidden="true">
        <Sparkles size={18} />
      </div>
      <div className={styles.simulatorBody}>
        <div className={styles.simulatorTitle}>Wat-als simulator</div>
        <div className={styles.simulatorSub}>
          Pas een prijs aan om het effect te zien op je laatste 30 leads
        </div>
      </div>
      <Pill tone="gray">Binnenkort</Pill>
    </div>
  )
}

/* ── DIENSTEN AANBOD ───────────────────────────────────── */
function DienstenSection({ services }: { services: ServiceOffering[] }) {
  return (
    <SectionCard title="Diensten aanbod" sub="Welke diensten biedt je bedrijf aan?">
      <div className={styles.servicesList}>
        {services.map((s) => (
          <div key={s.dienst_key} className={styles.serviceRow}>
            <div>
              <div className={styles.serviceLabel}>{s.label}</div>
              <div className={styles.serviceKey}>{s.dienst_key}</div>
            </div>
            <Pill tone={s.actief ? 'green' : 'gray'} dot>
              {s.actief ? 'Actief' : 'Uit'}
            </Pill>
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
function TagsSection() {
  return (
    <SectionCard
      title="Tags"
      sub="Categoriseer leads in je eigen woorden — gebruik in filters en zoekopdrachten"
    >
      <div className={styles.tagsPlaceholder}>
        <p>
          Tags-beheer komt zodra de tags-tabel onder dashboard-RLS-policies
          staat. Voor nu worden tags via Surface automatisch toegekend bij
          detectie (zoals <Pill tone="amber">Korting</Pill>{' '}
          <Pill tone="red">Buiten radius</Pill>{' '}
          <Pill tone="green">Review</Pill>).
        </p>
      </div>
    </SectionCard>
  )
}

/* ── OPENINGSBERICHT ───────────────────────────────────── */
function OpeningSection({ chatbot }: { chatbot: string }) {
  return (
    <SectionCard
      title="Openingsbericht via WhatsApp"
      sub={`Het eerste bericht dat ${chatbot} stuurt zodra een lead binnenkomt — Meta-template`}
    >
      <div className={styles.metaWarning}>
        ⚠ <strong>Let op:</strong> Meta keurt elke wijziging handmatig goed
        (kan 24-48u duren). Zolang Meta de nieuwe versie nog niet heeft
        goedgekeurd blijft de oude versie actief. Variabelen zoals{' '}
        <code>{'{voornaam}'}</code> moeten <strong>exact</strong> overeenkomen
        met de template-parameters bij Meta.
      </div>
      <div className={styles.placeholderBox}>
        Template-editor + Meta sync-status komen in een opvolg-batch — vereist
        de Meta Business API-integratie. Voor nu is de bot-config nog in
        clients/schoon-straatje/config.json.
      </div>
    </SectionCard>
  )
}

/* ── REMINDERS ────────────────────────────────────────── */
function RemindersSection({ tenant }: { tenant: TenantSettings | null }) {
  const reminders = [
    {
      num: 1,
      label: 'Eerste herinnering',
      sub: 'Vriendelijk, zonder druk',
      days: tenant?.reminder_dag_1 ?? 2,
    },
    {
      num: 2,
      label: 'Tweede herinnering',
      sub: 'Vraagt expliciet of klant nog interesse heeft',
      days: tenant?.reminder_dag_2 ?? 5,
    },
    {
      num: 3,
      label: 'Derde herinnering',
      sub: 'Laatste poging, met optie tot afmelden',
      days: tenant?.reminder_dag_3 ?? 8,
    },
  ]
  return (
    <SectionCard
      title="Reminders"
      sub="Surface stuurt deze berichten automatisch wanneer een klant niet reageert op de offerte"
    >
      <div className={styles.remindersList}>
        {reminders.map((r) => (
          <div key={r.num} className={styles.reminderCard}>
            <div className={styles.reminderHead}>
              <div className={styles.reminderNum}>{r.num}</div>
              <div>
                <div className={styles.reminderLabel}>{r.label}</div>
                <div className={styles.reminderSub}>{r.sub}</div>
              </div>
              <div className={styles.reminderDays}>
                <span>Na </span>
                <strong>{r.days}</strong>
                <span> dagen</span>
              </div>
            </div>
          </div>
        ))}
      </div>
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

