/**
 * Gedeelde types voor de instellingen-secties (tenant_settings, pricing_rules,
 * service_offerings, team). Losgetrokken uit SettingSections.tsx zodat de
 * mobiele instellingen-componenten ze kunnen importeren zonder de v1-desktop
 * editor-keten in leven te houden.
 */

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
  radius_min_m2_buiten_straal: number | null
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
