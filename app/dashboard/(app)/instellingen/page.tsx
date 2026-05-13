import { Building2, Euro, Wrench, Lock } from 'lucide-react'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { Pill } from '@/components/dashboard/ui/Pill'
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

export default async function InstellingenPage() {
  const supabase = await getDashboardSupabase()

  const [tenantRaw, pricingRaw, servicesRaw] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select(
        'bedrijfsnaam, chatbot_naam, eigenaar_email, eigenaar_whatsapp, eigenaar_spoed_telefoon, plaats, postcode, adres, offerte_geldigheid_dagen, radius_max_km',
      )
      .limit(1)
      .maybeSingle(),
    supabase
      .from('pricing_rules')
      .select('rule_key, label, waarde, eenheid, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('service_offerings')
      .select('dienst_key, label, actief, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  const tenant = tenantRaw.data as TenantSettings | null
  const pricing = (pricingRaw.data as PricingRule[] | null) ?? []
  const services = (servicesRaw.data as ServiceOffering[] | null) ?? []

  return (
    <>
      <div className="dash-section-head">
        <div>
          <div className="dash-section-title">Instellingen</div>
          <div className="dash-section-sub">
            Bedrijfsinfo, prijzen en diensten — bewerken via het dashboard
            volgt in een latere release. Wijzigingen tot dan via Frontlix.
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Bedrijfsinfo */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className={styles.cardHeadInner}>
              <Building2 size={16} className={styles.headIcon} />
              <div>
                <div className="dash-card-title">Bedrijfsinfo</div>
                <div className="dash-card-sub">
                  Contactgegevens en vestiging
                </div>
              </div>
            </div>
            <Pill tone="gray">
              <Lock size={11} style={{ marginRight: 2 }} />
              Read-only
            </Pill>
          </div>
          <div className={styles.cardBody}>
            <DataRow label="Bedrijfsnaam" value={tenant?.bedrijfsnaam} />
            <DataRow label="Bot-naam" value={tenant?.chatbot_naam} />
            <DataRow
              label="Vestigingsadres"
              value={
                tenant?.adres
                  ? `${tenant.adres}, ${tenant.postcode ?? ''} ${tenant.plaats ?? ''}`.trim()
                  : null
              }
            />
            <DataRow label="E-mail" value={tenant?.eigenaar_email} />
            <DataRow label="WhatsApp" value={tenant?.eigenaar_whatsapp} />
            <DataRow label="Spoed-telefoon" value={tenant?.eigenaar_spoed_telefoon} />
            <DataRow
              label="Offerte geldig"
              value={tenant?.offerte_geldigheid_dagen ? `${tenant.offerte_geldigheid_dagen} dagen` : null}
            />
            <DataRow
              label="Service-radius"
              value={tenant?.radius_max_km ? `${tenant.radius_max_km} km` : null}
            />
          </div>
        </div>

        {/* Prijzen */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className={styles.cardHeadInner}>
              <Euro size={16} className={styles.headIcon} />
              <div>
                <div className="dash-card-title">Prijzen</div>
                <div className="dash-card-sub">
                  {pricing.length} prijsregels — gebruikt door de bot voor
                  offerte-berekening
                </div>
              </div>
            </div>
            <Pill tone="gray">
              <Lock size={11} style={{ marginRight: 2 }} />
              Read-only
            </Pill>
          </div>
          <div className={styles.pricingBody}>
            {pricing.map((rule) => (
              <div key={rule.rule_key} className={styles.pricingRow}>
                <div className={styles.pricingLabel}>{rule.label}</div>
                <div className={styles.pricingValue}>
                  <span className="dash-tabular">
                    {rule.eenheid?.startsWith('€') ? '€ ' : ''}
                    {formatNumber(rule.waarde)}
                  </span>
                  {rule.eenheid && (
                    <span className={styles.pricingEenheid}>
                      {rule.eenheid.replace(/^€\s*/, '/')}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {pricing.length === 0 && (
              <div className={styles.empty}>Geen prijsregels gevonden.</div>
            )}
          </div>
        </div>

        {/* Diensten */}
        <div className="dash-card">
          <div className="dash-card-head">
            <div className={styles.cardHeadInner}>
              <Wrench size={16} className={styles.headIcon} />
              <div>
                <div className="dash-card-title">Diensten</div>
                <div className="dash-card-sub">
                  Welke diensten biedt {tenant?.bedrijfsnaam ?? 'het bedrijf'} aan?
                </div>
              </div>
            </div>
            <Pill tone="gray">
              <Lock size={11} style={{ marginRight: 2 }} />
              Read-only
            </Pill>
          </div>
          <div className={styles.servicesBody}>
            {services.map((svc) => (
              <div key={svc.dienst_key} className={styles.serviceRow}>
                <div className={styles.serviceLabel}>{svc.label}</div>
                <Pill tone={svc.actief ? 'green' : 'gray'} dot>
                  {svc.actief ? 'Actief' : 'Uit'}
                </Pill>
              </div>
            ))}
            {services.length === 0 && (
              <div className={styles.empty}>Geen diensten gevonden.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function DataRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={styles.dataRow}>
      <dt className={styles.dataLabel}>{label}</dt>
      <dd className={styles.dataValue}>{value || '—'}</dd>
    </div>
  )
}

function formatNumber(n: number): string {
  // Met decimalen alleen als ze betekenisvol zijn (3.95 ja, 50.00 nee).
  return n % 1 === 0
    ? n.toLocaleString('nl-NL')
    : n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
