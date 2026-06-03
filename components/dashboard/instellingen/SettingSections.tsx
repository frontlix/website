/**
 * Alle 8 sub-secties van /instellingen + de gedeelde SectionCard wrapper.
 *
 * Verhuisd uit app/dashboard/(app)/instellingen/page.tsx zodat die page
 * alleen nog data-fetching + routing naar de juiste section doet.
 *
 * Elke section accepteert zijn eigen data als props; de page doet de
 * conditionele fetches per actieve section en kiest de juiste hier.
 */

import { Lock } from 'lucide-react'
import { Pill } from '@/components/dashboard/ui/Pill'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { TenantBaseForm } from '@/components/dashboard/instellingen/TenantBaseForm'
import { OmzetDoelForm } from '@/components/dashboard/instellingen/OmzetDoelForm'
import { ServiceOfferingToggle } from '@/components/dashboard/instellingen/ServiceOfferingToggle'
import { TagsManager } from '@/components/dashboard/instellingen/TagsManager'
import { PrijzenEditor } from '@/components/dashboard/instellingen/PrijzenEditor'
import { OpeningTemplateEditor } from '@/components/dashboard/instellingen/OpeningTemplateEditor'
import { RemindersEditor } from '@/components/dashboard/instellingen/RemindersEditor'
import { NotificatiesEditor } from '@/components/dashboard/instellingen/NotificatiesEditor'
import { AccountSection } from '@/components/dashboard/instellingen/AccountSection'
import { AvgSection } from '@/components/dashboard/instellingen/AvgSection'
import type { getPricingImpactBaseline } from '@/lib/dashboard/pricing-impact-queries'
import type { TagWithCount } from '@/lib/dashboard/tags-queries'
import type { TemplateAanvraag } from '@/lib/dashboard/template-queries'
import type { NotificationPreferenceRow } from '@/lib/dashboard/notifications/types'
import styles from './SettingSections.module.css'

/* ── Shared types ───────────────────────────────────────── */

export type TenantSettings = {
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
  daily_digest_tijd: string | null
  omzet_doel_maand: number | null
}

export type PricingRule = {
  rule_key: string
  label: string
  waarde: number
  eenheid: string | null
  sort_order: number
}

export type ServiceOffering = {
  dienst_key: string
  label: string
  actief: boolean
  sort_order: number
}

export type TeamMember = {
  user_id: string
  bedrijfsnaam: string | null
  is_owner: boolean
  tenant_status: 'pending' | 'approved' | 'rejected'
}

/* ── SectionCard wrapper + atoms ────────────────────────── */

function SectionCard({
  title,
  sub,
  readOnly = true,
  children,
}: {
  title: string
  sub?: string
  /** Toon de "Read-only" pill. Default true, zet op false voor secties
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

/* ── BEDRIJFSGEGEVENS ───────────────────────────────────── */
export function BedrijfSection({ tenant }: { tenant: TenantSettings | null }) {
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
      <SectionCard title="Bedrijfsgegevens" sub="Contactgegevens en vestiging">
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

      {/* Maand-omzetdoel, voedt de Hero KPI goal-ring op de mobiele
          Overzicht-pagina. NULL = geen doel ingesteld (placeholder elders). */}
      <div className="dash-card" style={{ marginTop: 16 }}>
        <div className="dash-card-head">
          <div>
            <div className="dash-card-title">Maand-omzetdoel</div>
            <div className="dash-card-sub">
              Stel een omzetdoel in voor deze maand, de voortgangsring op je
              mobiele Overzicht volgt automatisch. Laat leeg om geen doel te
              tonen.
            </div>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <OmzetDoelForm initialValue={tenant?.omzet_doel_maand ?? null} />
        </div>
      </div>
    </>
  )
}

/* ── PRIJZEN ────────────────────────────────────────────── */
export function PrijzenSection({
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
      sub={`${pricing.length} prijsregels, gebruikt door Surface voor offerte-berekening`}
      readOnly={false}
    >
      <PrijzenEditor rules={pricing} baseline={safeBaseline} />
    </SectionCard>
  )
}

/* ── DIENSTEN AANBOD ────────────────────────────────────── */
export function DienstenSection({ services }: { services: ServiceOffering[] }) {
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
export function TagsSection({ tags }: { tags: TagWithCount[] }) {
  return (
    <SectionCard
      title="Tags"
      sub="Categoriseer leads in je eigen woorden, gebruik in filters en zoekopdrachten"
      readOnly={false}
    >
      <TagsManager initialTags={tags} />
    </SectionCard>
  )
}

/* ── OPENINGSBERICHT ────────────────────────────────────── */
export function OpeningSection({
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
      sub={`Het eerste bericht dat ${chatbot} stuurt zodra een lead binnenkomt, Meta-template`}
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

/* ── REMINDERS ──────────────────────────────────────────── */
export function RemindersSection({
  tenant,
  aanvragen,
}: {
  tenant: TenantSettings | null
  aanvragen: TemplateAanvraag[]
}) {
  return (
    <SectionCard
      title="Reminders"
      sub="Surface stuurt deze berichten automatisch wanneer een klant niet reageert op de offerte"
      readOnly={false}
    >
      <RemindersEditor
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

/* ── NOTIFICATIES ───────────────────────────────────────── */
export function NotificatiesSection({
  prefs,
  digestTijd,
}: {
  prefs: NotificationPreferenceRow[]
  digestTijd: string
}) {
  return (
    <SectionCard
      title="Notificatie-voorkeuren"
      sub="Per type event kies je welke kanalen je gebruikt"
      readOnly={false}
    >
      <NotificatiesEditor initialPrefs={prefs} initialDigestTijd={digestTijd} />
    </SectionCard>
  )
}

/* ── TEAM ───────────────────────────────────────────────── */
export function TeamSection({ members }: { members: TeamMember[] }) {
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

/* ── ACCOUNT / AVG, wrappers om client-components ──────── */
export function AccountWrapper({ email }: { email: string }) {
  return <AccountSection email={email} />
}

export function AvgWrapper() {
  return <AvgSection />
}
