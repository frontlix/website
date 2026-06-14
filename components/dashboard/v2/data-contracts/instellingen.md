# Data-contract: Instellingen (Settings) — v1 (app) to v2 migration data contract

**Auth/tenant:** Single-tenant setup: een user = een owner = één tenant_settings-rij. RLS op meeste tabellen filtert automatisch op approved status. Service-role writes (admin-client) gebruikt voor updates waar geen direct UPDATE-policy bestaat (tenant_settings, calendar_connections). Auth-checks: requireApprovedUser() redirect als pending/rejected. Push-notificatie vereist browser-permission + SW-subscription."

**Realtime:** geen

## Bestaande bestanden (bron)

- `/Users/christiaantromp/Desktop/Frontlix website/app/dashboard/(app)/instellingen/page.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/SettingSections.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/PrijzenEditor.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/ServiceOfferingToggle.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/TenantBaseForm.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/TagsManager.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/RemindersEditor.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/NotificatiesEditor.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/OmzetDoelForm.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/components/dashboard/instellingen/AccountSection.tsx`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-server.ts`
- `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/supabase-admin.ts`

## Leest (weergave-data)

- **Tenant Settings (bedrijfsgegevens, basis, omzetdoel)**
  - bron: `tenant_settings (Supabase table)`
  - vorm: TenantSettings { bedrijfsnaam, chatbot_naam, eigenaar_email, eigenaar_whatsapp, eigenaar_spoed_telefoon, plaats, postcode, adres, offerte_geldigheid_dagen, radius_max_km, reminder_dag_1/2/3, calendar_link, base_huisnummer, base_label, base_lat, base_lng, daily_digest_tijd, omzet_doel_maand }
  - vervangt in v2: BedrijfsprofielPanel { profiel, basis, radius, maanddoel }
- **Pricing Rules (diensten met prijzen)**
  - bron: `pricing_rules (Supabase table)`
  - vorm: PricingRule[] { rule_key, label, waarde, eenheid, sort_order }
  - vervangt in v2: Diensten & prijzen panel + Offertes panel (geldigheid)
- **Service Offerings (diensten aan/uit)**
  - bron: `service_offerings (Supabase table)`
  - vorm: ServiceOffering[] { dienst_key, label, actief, sort_order }
  - vervangt in v2: DienstenPanel { diensten[] + toggles }
- **Dashboard User Profiles (teamleden)**
  - bron: `dashboard_user_profiles (Supabase table)`
  - vorm: TeamMember[] { user_id, bedrijfsnaam, is_owner, tenant_status }
  - vervangt in v2: TeamPanel { members }
- **Pricing Impact Baseline (laatste 30 leads voor Wat-als-simulator)**
  - bron: `lib/dashboard/pricing-impact-queries.ts → getPricingImpactBaseline()`
  - vorm: PricingImpactBaseline { leadCount, periodStart, periodEnd, baselineRevenue, baselineConversion, volumes }
  - vervangt in v2: OffertesPanel + Simulatie-context
- **Tags (labels voor leads)**
  - bron: `lib/dashboard/tags-queries.ts → getTagsWithCounts()`
  - vorm: TagWithCount[] { id, naam, kleur, icon, aangemaakt_op, count, isSystem }
  - vervangt in v2: Tags-panel via tagsState (client)
- **Template Aanvragen (aangevraagde template-wijzigingen)**
  - bron: `lib/dashboard/template-queries.ts → getRecentTemplateAanvragen(20)`
  - vorm: TemplateAanvraag[] { id, template_naam, voorgestelde_tekst, status, aangemaakt_op, notitie }
  - vervangt in v2: OpeningsberichtPanel + RemindersPanel (aanvraagenhistorie)
- **Notification Preferences (notificatie-toggles per event/kanaal)**
  - bron: `lib/dashboard/notifications/queries.ts → getAllPrefs()`
  - vorm: NotificationPreferenceRow[] { event_type, kanaal, enabled }
  - vervangt in v2: MeldingenPanel { meldingen[] + toggles }
- **Calendar Connection Status (Google Agenda-koppeling)**
  - bron: `lib/dashboard/calendar-connection-queries.ts → getConnectionStatus()`
  - vorm: ConnectionStatus { connected, googleEmail, calendarId, connectedAt }
  - vervangt in v2: KanalenPanel { channels status }
- **Current Auth User (ingelogde user e-mail)**
  - bron: `supabase.auth.getUser() (Supabase Auth)`
  - vorm: user { id, email }
  - vervangt in v2: AccountPanel (email-wijziging)

## Muteert (acties/knoppen)

- **Bedrijfsgegevens bijwerken (bedrijfsnaam, bot-naam, adres, plaats, etc.)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tenant-base-actions.ts (saveTenantBase)`
  - Geocodet postcode+huisnummer via postcode.tech, slaat lat/lng op. Alleen approved users via admin-client.
- **Thuisbasis (basis) instellen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tenant-base-actions.ts (saveTenantBase)`
  - Slaat base_huisnummer, base_label, base_lat, base_lng op op tenant_settings. Geocoding + auth-check.
- **Werkstraal (radius) aanpassen**  (server-action)
  - hergebruik: `NEW: updateTenantRadius() in tenant-base-actions.ts`
  - Slaat radius_max_km op op tenant_settings. Geen geocoding nodig, simple numeric update.
- **Maanddoel (omzet_doel_maand) instellen/wissen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/omzet-doel-actions.ts (saveOmzetDoelMaand)`
  - NULL = geen doel. Approved-user via admin-client. Voedt Hero KPI ring op mobile Overzicht.
- **Prijsregel wijzigen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/pricing-actions.ts (updatePricingRulesBatch)`
  - Batch-save alle wijzigingen. Direct opslaan, geen Meta-approval nodig. Tabbed interface per categorie.
- **Dienst aan/uit schakelen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/service-offerings-actions.ts (toggleServiceOffering)`
  - Optimistic UI, toggles direct. RLS controleert schrijfrechten.
- **Tag aanmaken**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tags-actions.ts (createTag)`
  - Avec kleur + icoon, duplicate-check op naam (case-insensitive).
- **Tag wijzigen (naam/kleur/icoon)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tags-actions.ts (updateTag)`
  - Partial updates, niet-opgegeven velden blijven ongewijzigd.
- **Tag verwijderen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/tags-actions.ts (deleteTag)`
  - Soft-delete via is_deleted vlag (leads-referenties blijven intact).
- **Openingsbericht-template aanvragen (Meta-approval)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/template-actions.ts (requestTemplateChange)`
  - Schrijft naar template_aanvragen + Slack-webhook. Status=pending totdat Meta goedkeurt.
- **Template-aanvraag annuleren**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/template-actions.ts (cancelTemplateAanvraag)`
  - Zet status=cancelled. Alleen voor pending aanvragen.
- **Reminder-dagen instellen (reminder_dag_1/2/3)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/reminder-actions.ts (updateReminderDays)`
  - Direct opslaan op tenant_settings, geen Meta-approval. Scheduling alleen, niet tekst.
- **Notificatie-voorkeur toggle (event x kanaal)**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/notifications/prefs-actions.ts (togglePrefAction)`
  - Upsert naar notification_preferences. Push vereist extra browser-permission-stap.
- **Dagelijkse digest-tijd instellen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/notifications/prefs-actions.ts (setDailyDigestTijdAction)`
  - Slaat daily_digest_tijd op op tenant_settings. Admin-client write.
- **Offerte-geldigheid aanpassen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/pricing-actions.ts (updatePricingRule)`
  - offerte_geldigheid_dagen via pricing_rules. Batch met andere prijzen.
- **Wachtwoord wijzigen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/account-actions.ts (updatePasswordAction)`
  - FormData-based, Supabase auth update, geen DB-rij.
- **E-mailadres wijzigen**  (server-action)
  - hergebruik: `/Users/christiaantromp/Desktop/Frontlix website/lib/dashboard/account-actions.ts (updateEmailAction)`
  - Supabase auth update, confirmation-email + RLS-check.

## Gedeelde helpers (hergebruiken)

- `lib/dashboard/supabase-server.ts (getDashboardSupabase)`
- `lib/dashboard/supabase-admin.ts (getDashboardAdmin)`
- `lib/dashboard/require-approved-user.ts (requireApprovedUser)`
- `lib/dashboard/tag-presets.ts (SYSTEM_TAG_DEFAULTS, isValidIcon, isValidColor)`
- `lib/dashboard/notifications/types.ts (NotificationEventType, NotificationKanaal, EVENT_TYPES_ORDERED, KANALEN_ORDERED)`

## Koppel-stappenplan (v2)

STAP 1: Server-data ophalen. De v2-page moet server-side dezelfde queries draaien als v1 (app)/instellingen/page.tsx. Parallel fetch: [tenantRaw, pricingRaw, servicesRaw, teamRaw, baselineRaw, tagsRaw, aanvragenRaw, notifPrefs, gcalStatus]. Zie /app/dashboard/(app)/instellingen/page.tsx ln 70-105 voor exact pattern. STAP 2: Props naar componenten. Elke v2-panel-component accepteert zijn state + onChange-handler. BedrijfsprofielPanel krijgt {profiel, onProfiel, basis, onBasis, radius, onRadius}. DienstenPanel krijgt {diensten, onToggle, onPrijs}. RemindersPanel krijgt {reminders, onDag, onTekst}. STAP 3: Opslaan-logica. Globale \"Opslaan\"-knop in v2-page roept alle actieve mutations (bewaar client-side state, submit batch). Hergebruik bestaande server-actions; geen nieuwe state-management. Notificatie-prefs: 32 toggles (8 event-types × 4 kanalen), aparte toggles per cel. Push vereist extra UX: browser-permission → subscribe → toggle. STAP 4: Error-handling + previews. Geen realtime. Fout bij server-action → UI rollback + error-melding. Reminders + Templates: textareas met variabele-substitutie (use previewTemplate() util). Tags: client-side list + modal-editor (create/edit/delete) → server-actions, wis isSystem-tags af. STAP 5: Auth-gating. Instellingen-pagina vereist approved user (check via auth.getUser). Elke action checkt opnieuw (redundant maar veilig voor security)."