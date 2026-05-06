# Klanten-dashboard — Design

**Datum:** 2026-05-06
**Status:** Goedgekeurd, klaar voor implementatieplan
**Subdomein:** `app.frontlix.com`

---

## Doel

Een dashboard bouwen voor klanten van het Frontlix lead-opvolgings-product. Bedrijven loggen in op `app.frontlix.com` en zien hun eigen leads, gesprekken, foto's en offertes. Schoon Straatje wordt de eerste tenant; het ontwerp is generiek zodat elke volgende klant er zonder code-wijziging in past.

---

## Architectuur

### Codebase

Eén Next.js-app, gescheiden via route groups in dezelfde repo. De bestaande marketing-pagina's zitten al in `app/(main)/` — daar voegen we `app/(dashboard)/` naast toe. Geen verhuizing van bestaande code.

```
app/
├── (main)/           ← frontlix.com (bestaande pagina's, ongewijzigd)
├── (dashboard)/      ← app.frontlix.com (nieuw)
└── api/
components/
├── dashboard/        ← dashboard-only componenten
└── ...
lib/
├── dashboard/        ← dashboard utils (auth, supabase, helpers)
└── ...
```

### Subdomein-routing

DNS: `app.frontlix.com` CNAME naar dezelfde server.

Nginx krijgt een tweede `server_name app.frontlix.com` block dat naar hetzelfde Next.js-process op poort 3000 proxyt.

`middleware.ts` kijkt naar de `host`-header en herschrijft `app.frontlix.com/...` naar `(dashboard)/...`. Andere hosts blijven onaangetast (Next.js serveert ze uit `(main)`).

HTTPS via dezelfde Certbot setup.

### Supabase-architectuur

| Project | Rol |
|---|---|
| Frontlix-website Supabase | Bestaande website-features (demo, contactform, etc.). Geen wijzigingen. |
| Schoon-straatje Supabase | Wordt de "Platform DB" voor v1. Dashboard verbindt rechtstreeks. |

In v1 **geen** `tenant_id`. Wel een **basale RLS-policy** per nieuwe tabel: "alleen ingelogde users met `dashboard_user_profiles.tenant_status='approved'` mogen lezen + schrijven". Geen multi-tenant scheiding (er is één klant), maar wel autorisatie zodat anon-key client-side veilig is. Bij klant 2 migreren we naar een nieuwe centrale Supabase, voegen `tenant_id` + tenant-aware RLS toe en koppelen we de bot per klant.

Code achter een laagje:

- `lib/dashboard/supabase.ts` exporteert `getDashboardSupabase()` (server, service-key, bypasst RLS) en `createDashboardClient()` (browser, anon-key + session, respecteert RLS).
- Bij switch naar centrale DB: alleen URL/keys vervangen + RLS-policies upgraden naar tenant-aware.

### Schrijf-strategie

| Type actie | Hoe | Waarom |
|---|---|---|
| Lichte acties (status, notitie, tag, archief, AVG-flag, profielsettings) | Direct naar Supabase via Server Action | Geen side-effects buiten DB; minimale latency |
| Zware acties (offerte goedkeuren+versturen, offerte aanpassen, afspraak boeken/verzetten, prijzen-config, AVG-cascade-delete) | Via nieuwe bot-API endpoints (`POST /dashboard-api/...`) | Bot blijft single source of truth voor business-logic; geen logica-duplicatie |

### Lees-strategie

- Server components voor initial page load: directe DB-query met service-key.
- Client components voor reactiviteit: anon-key + sessie + Supabase realtime channels (insert/update op `leads`).

---

## Schema-wijzigingen

### Nieuwe tabellen in de schoon-straatje Supabase

```sql
-- Bedrijfsinfo (was config.json bedrijf+eigenaar+offerte+radius+reminders)
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bedrijfsnaam TEXT NOT NULL,
  chatbot_naam TEXT NOT NULL,
  adres TEXT, postcode TEXT, plaats TEXT,
  eigenaar_email TEXT, eigenaar_whatsapp TEXT,
  calendar_link TEXT,
  offerte_geldigheid_dagen INT DEFAULT 30,
  reminder_dag_1 INT DEFAULT 2,
  reminder_dag_2 INT DEFAULT 5,
  reminder_dag_3 INT DEFAULT 8,
  radius_max_km INT DEFAULT 100,
  radius_doorverwijs_bedrijf TEXT,
  bijgewerkt_op TIMESTAMPTZ DEFAULT now()
);
-- v1: één rij. Bij centrale DB: tenant_id-kolom + één rij per tenant.

-- Prijzen als gestructureerde rijen
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT UNIQUE NOT NULL,        -- "reinigen_per_m2", etc.
  label TEXT NOT NULL,                  -- NL-omschrijving voor UI
  waarde NUMERIC NOT NULL,
  eenheid TEXT,                         -- "€/m²", "€/zak", "€/min"
  toelichting TEXT,
  sort_order INT DEFAULT 0,
  bijgewerkt_op TIMESTAMPTZ DEFAULT now()
);

-- Welke diensten zijn aan/uit voor deze tenant
CREATE TABLE service_offerings (
  dienst_key TEXT PRIMARY KEY,           -- "oprit_terras_terrein", etc.
  label TEXT NOT NULL,
  actief BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0
);

-- Extensie van Supabase auth.users
CREATE TABLE dashboard_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bedrijfsnaam TEXT,
  tenant_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (tenant_status IN ('pending','approved','rejected')),
  is_owner BOOLEAN DEFAULT false,
  onboarding_voltooid_op TIMESTAMPTZ,
  approved_op TIMESTAMPTZ,
  aangemaakt_op TIMESTAMPTZ DEFAULT now()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  kleur TEXT,                            -- hex of CSS-variabele-naam
  aangemaakt_op TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lead_tags (
  lead_id TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  aangemaakt_door UUID REFERENCES auth.users(id),
  aangemaakt_op TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (lead_id, tag_id)
);

-- Interne notities op leads
CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  tekst TEXT NOT NULL,
  auteur UUID NOT NULL REFERENCES auth.users(id),
  aangemaakt_op TIMESTAMPTZ DEFAULT now()
);

-- Audit van dashboard-status-wijzigingen
CREATE TABLE lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  oude_status TEXT,
  nieuwe_status TEXT NOT NULL,
  gewijzigd_door UUID REFERENCES auth.users(id),
  gewijzigd_op TIMESTAMPTZ DEFAULT now()
);
```

### Nieuwe kolommen op bestaande tabel `leads`

```sql
ALTER TABLE leads
  ADD COLUMN dashboard_status TEXT,        -- open|opgevolgd|afgehandeld|no_show|geen_interesse
  ADD COLUMN dashboard_archived BOOLEAN DEFAULT false;
```

### Activity-timeline

Geen aparte event-tabel. Aggregeren on-the-fly per lead uit:

- `berichten` (bot- en klant-berichten)
- `fotos`
- `offertes` (verstuurde versies)
- `lead_notes`
- `lead_status_history`
- `leads.akkoord_op` + `leads.afspraak_geboekt_op` (audit-velden)

Voorkomt double-writes en blijft consistent met bot-state.

---

## Bot-aanpassingen

### Config-loader migratie

[src/config.ts](../../../../schoon-straatje%20product/schoon-straatje-assistent/src/config.ts) `loadClientConfig()` leest uit `tenant_settings` + `pricing_rules` + `service_offerings` i.p.v. `clients/<naam>/config.json`.

- Cache met 60s TTL.
- Handmatige cache-invalidatie via `POST /dashboard-api/config/reload` zodat dashboard-changes binnen seconden actief zijn.
- Side-by-side veiligheid: tijdens migratie eerst beide bronnen lezen + vergelijken, log waarschuwing bij divergentie. Pas weghalen na 1 week stabiel.

### Eenmalig migratie-script

`scripts/migrate-config-to-db.ts` op de bot leest `clients/schoon-straatje/config.json` en seedt de drie nieuwe tabellen. Idempotent (UPSERT op `rule_key` / `dienst_key`).

### Nieuwe `/dashboard-api/*` endpoints (Express, beveiligd met `Authorization: Bearer ${DASHBOARD_API_TOKEN}`)

```
POST /dashboard-api/lead/:id/approve-quote        ← wraps bestaande approveQuote()
POST /dashboard-api/lead/:id/modify-quote         ← wraps bestaande /owner/recalculate logica
POST /dashboard-api/lead/:id/book-appointment     ← {datum, starttijd}, schrijft Google Calendar event
POST /dashboard-api/lead/:id/reschedule           ← {nieuwe_datum, nieuwe_starttijd}
POST /dashboard-api/lead/:id/delete               ← AVG cascade: leads + berichten + fotos + storage + offertes
POST /dashboard-api/config/reload                 ← cache-invalidatie
```

Idempotency: bij `approve-quote` checken of `offerte_verstuurd=true`; zo ja, 200 OK retourneren zonder dubbele verzending.

### Bestaande WhatsApp owner-link-flow blijft volledig intact

`/owner/approve`, `/owner/modify`, `/owner/recalculate` worden niet aangepast. Eigenaar kan onderweg blijven approve via WhatsApp-template-link; dashboard biedt parallel een rijkere UI. Beide schrijven naar dezelfde DB-state.

### Database trigger voor signup-notificatie

Supabase database webhook op `dashboard_user_profiles INSERT` → POST naar Slack-webhook met "Nieuwe aanvraag: {bedrijfsnaam} — {email}".

### Goedkeuringsmail

Supabase database webhook op `dashboard_user_profiles UPDATE WHERE tenant_status='approved'` → POST naar `/dashboard-api/notify-approved` op de bot → bot stuurt mail "je account is geactiveerd, log in op app.frontlix.com" via bestaande `nodemailer`.

---

## Auth & onboarding

### Pagina's (publiek)

- `/login` — email + wachtwoord. Bij success: check `tenant_status` → `approved` ⇒ `/leads`, `pending` ⇒ `/wachtkamer`, `rejected` ⇒ foutmelding.
- `/signup` — email, wachtwoord, bedrijfsnaam. Maakt user aan in Supabase Auth + rij in `dashboard_user_profiles` met `tenant_status='pending'`, `is_owner=true`. Redirect naar `/wachtkamer`. Rate-limit: 5 signups/uur per IP.
- `/wachtkamer` — statusbericht "we beoordelen je aanvraag". Realtime channel op `dashboard_user_profiles` voor automatische redirect bij goedkeuring.
- `/wachtwoord-vergeten` + `/wachtwoord-reset` — Supabase magic-link flow.
- `/uitnodiging?token=...` — voor uitgenodigde medewerkers; wachtwoord zetten en direct ingelogd.

### Goedkeurings-flow (Frontlix-kant, v1)

1. Klant signup → user + profile-rij `pending`.
2. Slack-notificatie via Supabase webhook: "Nieuwe aanvraag: {bedrijfsnaam} — {email}".
3. Frontlix-medewerker controleert in Supabase Studio en zet `tenant_status='approved'`.
4. Webhook triggert bot → goedkeuringsmail naar klant.
5. Klant klikt link, logt in.

Geen admin-UI in v1. Bij toenemend volume bouwen we `/admin/tenants` in v1.1.

### Multi-user uitnodigen

`/instellingen/medewerkers` toont lijst + form "nodig collega uit per email".

Submit → Server Action → Supabase Admin API maakt user + profile-rij `approved`, `is_owner=false`. Stuurt invite-mail met magic-link naar `/uitnodiging`.

Geen rollen in v1: elke medewerker (inclusief uitgenodigde) binnen een tenant kan alles, ook nieuwe medewerkers uitnodigen, prijzen wijzigen en de tenant verwijderen. Bij latere RBAC: kolom `role` toevoegen aan `dashboard_user_profiles` met restricties op de gevoelige acties.

### Sessions & beveiliging

- `@supabase/ssr` package voor server + client cookie-handling.
- `middleware.ts` doet auth-check op alle `(dashboard)`-routes behalve auth-pagina's.
- Cookie-domein: `.frontlix.com` zodat sessie geldig blijft over subdomeinen (vereist als marketing en dashboard ooit gedeelde sessie willen — voor v1 geen hard-vereiste).

---

## Pagina-structuur

```
publiek:
  /login, /signup, /wachtkamer, /wachtwoord-vergeten, /uitnodiging

ingelogd (na approval):
  /leads                    — hoofdlijst
  /leads/[id]               — detail (3-koloms)
  /agenda                   — week-/maand-view afspraken
  /statistieken             — KPI's, grafieken, funnel
  /instellingen
    /bedrijf                — tenant_settings formulier
    /diensten               — service_offerings toggles
    /prijzen                — pricing_rules editor
    /medewerkers            — multi-user uitnodigen
    /account                — wachtwoord, email
    /avg                    — data-export + account verwijderen
```

### Globale UI-shell (`app/(dashboard)/layout.tsx`)

- Linker sidebar (desktop) / hamburger (mobiel): Leads, Agenda, Statistieken, Instellingen
- Bovenbalk: bedrijfsnaam (uit `tenant_settings.bedrijfsnaam`), user-menu rechts (logout, account)
- Eerste-keer-overlay (3 stappen) als `dashboard_user_profiles.onboarding_voltooid_op IS NULL`

### `/leads` — hoofdlijst

- Tabel: naam, telefoon, hoofdcategorie, m², totaalprijs, bot-status, dashboard-status, tags, aangemaakt, laatste update
- Filters: status, dashboard-status, branche/dienst, datum-range, tag, "verberg gearchiveerd"
- Globale zoek (naam/telefoon/email/postcode)
- Klikbare kolomheaders voor sortering
- "Exporteer CSV" knop respecteert huidige filter
- Realtime channel: nieuwe lead → toast + lijst-update zonder refresh

### `/leads/[id]` — lead-detail

3 kolommen op desktop, gestapeld op mobiel met tabs.

**Links — Klantgegevens & status**
- Naam, telefoon (`tel:`), email (`mailto:`), postcode + huisnummer, plaats, toelichting
- Bot-status + `gesprek_fase` (read-only)
- Dashboard-status dropdown (open / opgevolgd / afgehandeld / no_show / geen_interesse / archief)
- Tags-chip-lijst (+/− knoppen)
- Aangemaakt + laatste update

**Midden — Gesprek & foto's** (tabs)
- Gesprek: chronologische whatsapp-stijl bubbels (in/uit), media-thumbnails inline
- Foto's: grid met `foto_analyse` overlay, click-to-enlarge lightbox
- Activity-timeline: on-the-fly aggregaat van berichten + foto's + offertes + notities + status-history + audit-velden

**Rechts — Offerte, afspraak, notities, acties**
- Offerte-blok: huidige versie totaalprijs + korting + PDF-link, vorige versies (collapsible)
- Prijsregels-tabel (read-only); aanpassen via "Offerte aanpassen" knop → modal → bot-API
- "Goedkeuren & versturen" knop (alleen actief als `pending_eigenaar_review` of `info_compleet`)
- Afspraak-blok: datum + starttijd + "boek/verzet" knop → modal → bot-API
- Notities: lijst (auteur+datum) + textarea om toe te voegen
- Gevaarlijke zone (collapsible): "Verwijder lead (AVG)"

### `/agenda`

- Week- en maand-toggle (default week)
- Afspraken als blokjes met klant-naam + tijdslot + dashboard-status-kleur
- Klik blok → `/leads/[id]`

### `/statistieken`

- Periode-filter (deze week / deze maand / dit jaar / custom)
- 4 KPI-cards: nieuwe leads, conversie %, geboekte afspraken, gemiddelde reactietijd
- Lijngrafiek leads-per-dag
- Funnel-staafdiagram per `gesprek_fase`
- Trend-vergelijking deze periode vs. vorige periode

### `/instellingen/*`

- `/bedrijf` — single form, schrijft `tenant_settings` + roept `/dashboard-api/config/reload` aan
- `/diensten` — toggle-switches per `service_offerings` rij + reload
- `/prijzen` — tabel met inline-edit per `pricing_rules` rij + reload
- `/medewerkers` — lijst + uitnodig-form
- `/account` — Supabase Auth wachtwoord + email-update
- `/avg` — "Exporteer mijn data" (ZIP-job, mail bij klaar) + "Verwijder mijn account" (cascade)

### Mobiel-strategie

- Tabellen → kaart-lijsten
- Modals → bottom-sheets
- Sidebar → hamburger
- Lead-detail 3-kolommen → gestapeld met tab-navigatie

---

## API-routes & data-flow

### Server Actions (Next.js 15 native)

```
updateDashboardStatus(leadId, newStatus)   → leads.update + lead_status_history.insert
addLeadNote(leadId, tekst)                 → lead_notes.insert
addLeadTag / removeLeadTag                 → lead_tags
createTag / deleteTag                      → tags
archiveLead(leadId)                        → leads.update dashboard_archived
updateTenantSettings(formData)             → tenant_settings.update + bot reload
updatePricingRules(rules[])                → pricing_rules.upsert + bot reload
updateServiceOfferings(offerings[])        → service_offerings.upsert + bot reload
inviteUser(email)                          → Supabase Admin API + profile.insert + invite-mail
markOnboardingDone()                       → dashboard_user_profiles.update
```

### Next.js API-routes

```
POST /api/dashboard/lead/[id]/approve-quote    ← proxy naar bot-API + bearer
POST /api/dashboard/lead/[id]/modify-quote     ← proxy
POST /api/dashboard/lead/[id]/book-appointment ← proxy
POST /api/dashboard/lead/[id]/reschedule       ← proxy
POST /api/dashboard/lead/[id]/delete           ← proxy (AVG)
GET  /api/dashboard/export/csv?filters=...     ← streaming CSV
POST /api/dashboard/export/avg                 ← start ZIP-job, mail bij klaar
POST /api/dashboard/auth/signup                ← signup wrapper
POST /api/dashboard/auth/notify-approved       ← Supabase webhook → mail-trigger
```

### Auth-flow per laag

- Browser → Next.js: Supabase session cookie via `@supabase/ssr`
- Next.js Server Component → Supabase: session + service-key voor admin-acties (geen RLS in v1)
- Next.js API-route → Bot API: `Authorization: Bearer ${DASHBOARD_API_TOKEN}` (env, nooit in browser)
- Bot API → Supabase: bestaande service-role key

### Realtime channel

Client component op `/leads` subscribet op Supabase realtime `leads` insert/update.

- Nieuwe lead → toast + lijst-row
- Status-wijziging door andere medewerker → lijst-row update zonder refresh

### Data-fetching patroon

| Pagina | Initial load | Reactief |
|---|---|---|
| `/leads` | Server component met filters uit URL | Client component op realtime channel |
| `/leads/[id]` | Server component → lead + berichten + fotos + offertes + notes + tags + history | Server actions voor mutaties; bot-API voor zware acties |
| `/agenda` | Server component → leads waar `afspraak_datum IS NOT NULL` | Refresh on focus |
| `/statistieken` | Server component → aggregate queries | Periode-filter triggert nieuwe fetch |
| `/instellingen/*` | Server component | Server action op submit |

### Nieuwe ENV-vars

Next.js `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL_DASHBOARD       — schoon-straatje project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD  — schoon-straatje anon key
SUPABASE_SERVICE_ROLE_KEY_DASHBOARD      — schoon-straatje service-key
DASHBOARD_API_TOKEN                      — shared secret met de bot
DASHBOARD_API_URL                        — https://schoonstraatje.frontlix.com
```

Bot `.env`:
```
DASHBOARD_API_TOKEN  — zelfde shared secret
SLACK_WEBHOOK_URL    — bestaand, hergebruiken voor signup-notificaties
```

---

## v1 scope-recap

### In scope

- Pagina's: leads-lijst, lead-detail (3-koloms), agenda, statistieken, instellingen-suite
- Auth: self-serve signup met handmatige goedkeuring, multi-user uitnodigen (geen rollen), magic-link reset
- Acties op lead: status, notities, tags, archiveren, AVG-verwijdering, CSV-export
- Zware acties via bot-API: offerte goedkeuren, offerte aanpassen, afspraak boeken/verzetten
- Self-service config: bedrijfsinfo, diensten-toggle, prijzen-editor (alle uit DB)
- Statistieken: counters, leads-per-dag-grafiek, funnel per `gesprek_fase`, periode-filter
- Activity-timeline per lead (on-the-fly aggregaat)
- Globale zoek + filters
- Realtime updates via Supabase channel
- Mobiel-vriendelijk responsive
- Onboarding-overlay bij eerste login
- Bot-aanpassingen: config-loader naar DB, eenmalige migratie, `/dashboard-api/*` endpoints

### Expliciet uit scope

- Email-notificaties bij nieuwe lead (klant krijgt al WhatsApp updates)
- WhatsApp-link openen vanuit lead-detail
- Bot pauzeren per lead
- Zapier / webhook-integratie
- Per-tenant logo/branding upload
- Admin-UI voor signup-goedkeuring (v1.1)
- Rollen/RBAC binnen tenant
- Bulk-acties op meerdere leads
- Activity-feed homepage (dashboard-breed)
- `tenant_id` + RLS (komt bij migratie naar centrale DB bij klant 2)

---

## Implementatie-fasering

1. **Schema + bot-migratie** — nieuwe tabellen, config.json → DB migratie, bot config-loader aanpassen, `/dashboard-api/*` endpoints bouwen
2. **Auth-fundament** — Supabase Auth setup, signup/login pagina's, session middleware, `dashboard_user_profiles` + goedkeuringsflow
3. **Layout + navigatie** — `(dashboard)` route group, sidebar/header shell, subdomein routing in middleware + Nginx
4. **Leads-lijst + detail (read-only eerst)** — gesprek, foto's, offerte tonen
5. **Lichte acties** — status, notities, tags, archiveren, CSV-export
6. **Zware acties via bot-API** — offerte goedkeuren/aanpassen, afspraak boeken
7. **Instellingen-pagina's** — bedrijfsinfo, diensten, prijzen, medewerkers
8. **Agenda + statistieken**
9. **AVG, onboarding-tour, mobiel polish, productiehardening**

---

## Risico's

| Risico | Impact | Mitigation |
|---|---|---|
| Bot-config migratie veroorzaakt regressie (verkeerde prijs in offerte) | Hoog | Migratie-script idempotent; side-by-side lees+vergelijk eerste week; rollback-pad behouden |
| Subdomein cookie-handling tussen `frontlix.com` en `app.frontlix.com` | Middel | Cookie-domein expliciet (`.frontlix.com`) of geen sessie-deling tussen marketing/dashboard. Middleware-test |
| Double-write conflict (eigenaar approved via WhatsApp én dashboard) | Middel | Idempotency-check in bot-API: bij `offerte_verstuurd=true` retour 200 zonder dubbele verzending |
| Self-serve signup misbruik (spam) | Laag | Goedkeuring is handmatig; rate-limit 5 signups/uur per IP |
| Schema-drift schoon-straatje DB vs latere centrale DB | Middel | Migratie-scripts versionen; centrale DB-schema baseren op snapshot van schoon-straatje DB |
| Realtime channel traag bij grote tenants | Laag | v1 acceptabel; bij groei polling of SSE als fallback |

---

## Toekomst (out-of-scope nu, gepland)

- **v1.1**: email/Slack-notificaties bij nieuwe lead, admin-UI voor signup-goedkeuring (`/admin/tenants`), Zapier/webhook-uitgang
- **v2**: rollen/RBAC, bulk-acties, per-tenant branding, klant-portaal, AI-insights
- **Bij klant 2**: migratie naar centrale Supabase + `tenant_id` + RLS-policies
