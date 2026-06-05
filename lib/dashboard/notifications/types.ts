/**
 * Notificatie-types, applicatielaag boven de database.
 *
 * `database.types.ts` wordt door Supabase CLI gegenereerd; voor onze
 * nieuwe enums + tabellen typen we hier hand-matig zodat de FE/backend
 * niet hoeft te wachten op een type-regen. Houd in sync met
 * migration 033_notifications.sql.
 */

export type NotificationEventType =
  | 'nieuwe_lead'
  | 'owner_review_nodig'
  | 'klant_vraagt_korting'
  | 'offerte_goedgekeurd'
  | 'offerte_afgewezen'
  | 'afspraak_ingepland'
  | 'nieuwe_review'
  | 'dagelijkse_samenvatting'
  | 'template_goedgekeurd'
  | 'template_afgewezen'
  | 'template_notitie'

export type NotificationKanaal = 'in_app' | 'email' | 'push' | 'whatsapp'

/** Volgorde waarin events in de UI (settings-tab) verschijnen. */
export const EVENT_TYPES_ORDERED: NotificationEventType[] = [
  'nieuwe_lead',
  'owner_review_nodig',
  'klant_vraagt_korting',
  'offerte_goedgekeurd',
  'offerte_afgewezen',
  'afspraak_ingepland',
  'nieuwe_review',
  'template_goedgekeurd',
  'template_afgewezen',
  'template_notitie',
  'dagelijkse_samenvatting',
]

/** Volgorde van kanaal-kolommen in de UI. */
export const KANALEN_ORDERED: NotificationKanaal[] = [
  'in_app',
  'email',
  'push',
  'whatsapp',
]

/** Labels voor de UI (Nederlandse weergave). */
export const EVENT_LABELS: Record<NotificationEventType, { titel: string; sub: string }> = {
  nieuwe_lead: {
    titel: 'Nieuwe lead binnen',
    sub: 'iemand vult het formulier in',
  },
  owner_review_nodig: {
    titel: 'Owner-review nodig',
    sub: 'Surface wacht op jouw goedkeuring',
  },
  klant_vraagt_korting: {
    titel: 'Klant vraagt korting',
    sub: 'Onderhandelingsmoment',
  },
  offerte_goedgekeurd: {
    titel: 'Offerte goedgekeurd',
    sub: 'Klant gaat akkoord',
  },
  offerte_afgewezen: {
    titel: 'Offerte afgewezen',
    sub: 'Klant haakt af',
  },
  afspraak_ingepland: {
    titel: 'Afspraak ingepland',
    sub: 'Klant kiest een datum',
  },
  nieuwe_review: {
    titel: 'Nieuwe review ontvangen',
    sub: 'Klant scoort de klus',
  },
  dagelijkse_samenvatting: {
    titel: 'Dagelijkse samenvatting',
    sub: 'Elke ochtend, wat ging er gisteren',
  },
  template_goedgekeurd: {
    titel: 'Template goedgekeurd',
    sub: 'Frontlix heeft je aanvraag goedgekeurd',
  },
  template_afgewezen: {
    titel: 'Template afgewezen',
    sub: 'Frontlix heeft je aanvraag afgewezen, check de notitie',
  },
  template_notitie: {
    titel: 'Notitie op template-aanvraag',
    sub: 'Frontlix heeft een opmerking achtergelaten',
  },
}

export const KANAAL_LABELS: Record<NotificationKanaal, string> = {
  in_app: 'In-app',
  email: 'E-mail',
  push: 'Push',
  whatsapp: 'WhatsApp',
}

/** Welke kanalen in welke fase live gaan (UI toont de rest als "binnenkort"). */
export const KANAAL_FASE: Record<NotificationKanaal, 1 | 2 | 3 | 4> = {
  in_app: 1,
  email: 2,
  push: 3,
  whatsapp: 4,
}

/** Events waarvoor het WhatsApp-kanaal live is (toggle interactief, default aan).
 *  De rest van de WhatsApp-kolom blijft "Binnenkort"/disabled. De assistent
 *  (schoon-straatje-assistent) checkt deze prefs voordat hij de owner-WhatsApp stuurt. */
export const WHATSAPP_LIVE_EVENTS: ReadonlySet<NotificationEventType> = new Set([
  'owner_review_nodig',
  'klant_vraagt_korting',
  'offerte_goedgekeurd',
  'offerte_afgewezen',
  'afspraak_ingepland',
])

export interface NotificationPreferenceRow {
  event_type: NotificationEventType
  kanaal: NotificationKanaal
  enabled: boolean
  bijgewerkt_op: string
  bijgewerkt_door: string | null
}

export interface NotificationRow {
  id: string
  user_id: string
  event_type: NotificationEventType
  lead_id: string | null
  titel: string
  body: string
  payload: Record<string, unknown>
  aangemaakt_op: string
  gelezen_op: string | null
}

/**
 * Mapping van event-type naar de visuele `kind` in NotificationPanel.
 * NotificationPanel ondersteunt 4 kinds (lead/wa/review/agenda), we
 * mappen onze 8 event-types daarop. Later kunnen we meer iconen toevoegen.
 */
export type NotifKind = 'lead' | 'wa' | 'review' | 'agenda'

export const EVENT_KIND: Record<NotificationEventType, NotifKind> = {
  nieuwe_lead: 'lead',
  owner_review_nodig: 'wa',
  klant_vraagt_korting: 'wa',
  offerte_goedgekeurd: 'review',
  offerte_afgewezen: 'review',
  afspraak_ingepland: 'agenda',
  nieuwe_review: 'review',
  dagelijkse_samenvatting: 'lead',
  // Template-events hebben geen perfect-passende kind (komen niet van
  // een klant), mappen ze op 'wa' want het is een Frontlix-feedback-
  // bericht. Latere uitbreiding kan een eigen 'template' kind krijgen.
  template_goedgekeurd: 'wa',
  template_afgewezen: 'wa',
  template_notitie: 'wa',
}
