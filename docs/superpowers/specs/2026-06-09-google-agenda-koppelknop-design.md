# Self-service Google Agenda-koppelknop, ontwerp

- **Datum:** 2026-06-09
- **Status:** ontwerp goedgekeurd, klaar voor implementatieplan
- **Klant/aanleiding:** Schoon Straatje (Thierry) naar productie. Doel is een knop in het dashboard waarmee een klant zelf zijn Google Agenda koppelt, zodat het migreren van een klant niet langer handwerk is.

## 1. Context

De live Schoon Straatje-bot is de TypeScript-bot in `schoon-straatje product/schoon-straatje-assistent/` (PM2-proces `schoon-straatje`, VPS-pad `/var/www/schoon-straatje-assistent`). Die bot deelt de Supabase-database (project `ntewbcbveqqrojhrkrno`, hierna "DB-B") met het dashboard in `Frontlix website/` (host `app.frontlix.com`, lokaal `app.localhost:3000`).

De bot authenticeert nu bij Google Calendar via een **service account** (`schoon-straatje-calendar@frontlix-demo.iam.gserviceaccount.com`), met een OAuth-refresh-token als verouderde fallback. De huidige `GOOGLE_CALENDAR_ID` wijst naar een aparte groeps-agenda, niet naar de eigen agenda van de klant.

De Python-bot in `Frontlix website/lead-automation/` is een ándere bot (voor dakdekker/schoonmaak/zonnepanelen) op een andere database (`zsioklwkkhlylqgthnal`) en valt buiten dit ontwerp.

## 2. Doel en scope

**In scope:** een self-service OAuth-koppeling. De klant klikt in het dashboard op "Koppel Google Agenda", doorloopt het Google-toestemmingsscherm, en daarna gebruikt de bot het opgeslagen, versleutelde refresh-token van die klant voor het lezen van vrije tijden en het aanmaken van afspraken.

**Bewust nu één klant (single-tenant):** het mechanisme bewijzen en los testbaar maken, zodat het migreren van Thierry een kwestie van "klik de knop" wordt. De koppeling is op bedrijfsniveau (de tenant), niet per individuele lead.

**Buiten scope (later):** volledige multi-tenancy (meerdere bedrijven in één omgeving, `tenant_id` op alle tabellen, RLS per klant). De tabel wordt wel zo opgezet dat dit later kan zonder herbouw.

## 3. Architectuur-overzicht

Drie samenwerkende delen, over twee codebases die DB-B delen:

| Onderdeel | Codebase | Taak |
|---|---|---|
| Koppelknop + statusweergave | Dashboard (`Frontlix website`) | Knop tonen, status "gekoppeld als X" |
| Authorize- + callback-route | Dashboard | Klant naar Google sturen, token inwisselen, versleuteld opslaan |
| `calendar_connections`-tabel | DB-B | Versleuteld token + agenda-id bewaren |
| Bot-aanpassing | TS-bot (`schoon-straatje-assistent`) | Token uit DB lezen en gebruiken, met fallback |

**Data-flow:** owner klikt knop -> authorize-route -> Google-toestemming -> callback-route schrijft versleuteld token in `calendar_connections` -> bot leest die rij, ontsleutelt, en praat met Google Calendar.

## 4. Datamodel

Nieuwe tabel in DB-B, migratie in `Frontlix website/supabase/migrations-frontlix/` (volgende nummer, bijvoorbeeld `037_calendar_connections.sql`):

```
calendar_connections
  id                       uuid pk default gen_random_uuid()
  tenant_id                uuid references tenant_settings(id) on delete cascade, uniek
  google_email             text        -- voor de UI: "gekoppeld als thierry@..."
  calendar_id              text not null default 'primary'
  refresh_token_encrypted  text not null  -- base64(iv + auth-tag + ciphertext)
  connected_at             timestamptz not null default now()
  updated_at               timestamptz not null default now()
```

**RLS:** aan, met géén policies voor de browser-rollen (anon/authenticated). De tabel is alleen bereikbaar via de service-role-sleutel. Zowel de bot (`SUPABASE_SERVICE_KEY`) als de dashboard-achterkant (`getDashboardAdmin()` met `SUPABASE_SERVICE_ROLE_KEY_DASHBOARD`) gebruiken die. Het versleutelde token komt nooit in de browser.

De FK naar `tenant_settings` kan, want die tabel staat in dezelfde DB-B. Door `unique(tenant_id)` is er per tenant precies één rij; voor single-tenant pakt de bot simpelweg die ene rij.

## 5. OAuth-flow en routes

Twee nieuwe route-handlers in het dashboard, volgens het bestaande patroon in `app/api/.../route.ts`:

**`GET /api/integrations/google-calendar/authorize`**
- Alleen voor ingelogde owner.
- Genereert een `state` (CSRF) in een httpOnly-cookie.
- Bouwt de Google-consent-URL: scope `https://www.googleapis.com/auth/calendar`, `access_type=offline`, `prompt=consent`, de web-client-id, en de callback als redirect-URI.
- Stuurt de klant door (302).

**`GET /api/integrations/google-calendar/callback`**
- Valideert `state`.
- Wisselt server-side de `code` in voor tokens (met de web-client-secret).
- Leest het Google-e-mailadres uit (voor de statusweergave).
- Versleutelt het refresh-token, doet een upsert in `calendar_connections` via `getDashboardAdmin()`.
- Redirect terug naar de instellingen-pagina met succes- of foutmelding.

## 6. Knop en UI

Nieuwe sectie **"Agenda"** in de instellingen, geregistreerd op de gebruikelijke drie plekken:
- `SettingsNav.tsx`: type `SettingsSection` + `ITEMS`-array (icoon `Calendar`).
- `instellingen/page.tsx`: `ALLOWED_SECTIONS` + dataophaling (connectie-status) + conditionele render.
- `SettingSections.tsx`: nieuwe `IntegratiesSection`-component.

De sectie toont óf "Niet gekoppeld" met de knop "Koppel Google Agenda" (link naar de authorize-route), óf "Gekoppeld als thierry@... (primary)" met "Opnieuw koppelen" (zelfde authorize-route) en "Ontkoppelen". Ontkoppelen verwijdert de rij via een aparte actie (`POST /api/integrations/google-calendar/disconnect`, owner-only, `getDashboardAdmin()`). De statusweergave haalt server-side alleen niet-gevoelige velden op (`google_email`, `connected_at`), nooit het token.

## 7. Bot-aanpassing

In `schoon-straatje-assistent/src/services/google-calendar.ts`, functie `getCalendarClient()`: één optie toevoegen, vóór het service-account:

1. **Nieuw:** is er een `calendar_connections`-rij voor deze tenant? Ontsleutel het token, gebruik `google.auth.OAuth2` met dat refresh-token en de `calendar_id` uit de rij.
2. Service-account (ongewijzigd, fallback).
3. Env-OAuth-token (ongewijzigd, legacy fallback).

`getCalendarClient()` geeft voortaan zowel de auth-client als de te gebruiken `calendar_id` terug, zodat de huidige `config.google.calendarId || 'primary'` (gebruikt in `getFreeSaturdaysWithSlots()` e.a.) wordt vervangen door de waarde uit de connectie wanneer die bestaat. Dit is op tenant-niveau, dus geen `customerId` per lead.

**Niet-brekend:** tot er een connectie-rij bestaat verandert er niets (service-account blijft werken). Zodra de klant koppelt, schakelt de bot vanzelf over. De `calendar_connections`-lezing kan dezelfde 60s-cache-cadans volgen als de bestaande tenant-config, of bij wijziging van de connectie-rij verlopen.

## 8. Versleuteling

- Eén gedeeld geheim `CALENDAR_TOKEN_ENC_KEY` (32 bytes, base64) in de env van zowel het dashboard als de bot.
- Opslagformaat: `base64( iv[12] + authTag[16] + ciphertext )`, AES-256-GCM.
- Helper aan beide kanten met identiek byte-formaat (beide Node/TypeScript, dus dezelfde logica): `Frontlix website/lib/crypto/calendar-token.ts` (encrypt) en `schoon-straatje-assistent/src/lib/calendar-token-crypto.ts` (decrypt). Bestaande `signing.ts` in de bot is alleen HMAC, niet herbruikbaar voor AES.

## 9. Google Cloud-configuratie

- Project `frontlix-demo` (toestemmingsscherm staat al op "In production", user-cap 1/100).
- Web-OAuth-client hergebruiken of nieuw aanmaken (er is al "Frontlix OAuth Playground", type Web application). Geautoriseerde redirect-URI's toevoegen:
  - Productie: `https://app.frontlix.com/api/integrations/google-calendar/callback`
  - Lokaal: `http://localhost:3000/api/integrations/google-calendar/callback`
- `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` van deze web-client in de dashboard-env.

## 10. Foutafhandeling en randgevallen

- **Geen refresh-token van Google:** we forceren `prompt=consent`, dus dat komt altijd. Lukt het toch niet, nette foutmelding op de pagina.
- **State-mismatch (CSRF):** callback weigert.
- **Ontsleutel-fout in de bot** (verkeerde sleutel/corrupte rij): luid loggen en stoppen, niet stil terugvallen. De fallback geldt alleen bij "geen rij".
- **Token ingetrokken door de klant:** Google geeft `invalid_grant`; de bestaande fail-loud-logging vangt dat. Statusvlag voor "verlopen/ingetrokken" is een latere verbetering.
- **Klant ziet "app niet geverifieerd"-scherm:** verwacht in deze fase (sensitive scope, ongeverifieerde app tot 100 gebruikers). Klant klikt door via "Geavanceerd".

## 11. Testaanpak

1. **Crypto-interop-test (eerst):** gedeelde testvector (vaste sleutel + plaintext); dashboard-helper versleutelt, bot-helper ontsleutelt en omgekeerd. Moet groen zijn voordat de rest telt.
2. **End-to-end lokaal:** koppelen met een eigen test-Google-account via `http://localhost:3000/...` (de API-routes hangen niet aan het `app.`-subdomein, en Google accepteert `localhost` als redirect). Controleren dat de rij versleuteld in `calendar_connections` staat, en dat de bot er vrije tijden uit haalt en een testafspraak in die agenda zet.
3. **Fallback-test:** rij verwijderen, bot valt terug op het service-account, werkt nog.

## 12. Bestanden (implementatie-overzicht)

**Aanmaken, dashboard (`Frontlix website`):**
- `supabase/migrations-frontlix/037_calendar_connections.sql`
- `app/api/integrations/google-calendar/authorize/route.ts`
- `app/api/integrations/google-calendar/callback/route.ts`
- `app/api/integrations/google-calendar/disconnect/route.ts`
- `lib/google-oauth.ts` (client-config + consent-URL)
- `lib/crypto/calendar-token.ts` (encrypt)
- `components/dashboard/instellingen/IntegratiesSection.tsx`

**Wijzigen, dashboard:**
- `components/dashboard/instellingen/SettingsNav.tsx` (type + ITEMS)
- `app/dashboard/(app)/instellingen/page.tsx` (ALLOWED_SECTIONS + fetch + render)
- `components/dashboard/instellingen/SettingSections.tsx` (export IntegratiesSection)

**Aanmaken, bot (`schoon-straatje-assistent`):**
- `src/lib/calendar-token-crypto.ts` (decrypt)
- `src/services/calendar-connection.ts` (de actieve connectie ophalen uit DB-B)

**Wijzigen, bot:**
- `src/services/google-calendar.ts` (`getCalendarClient()` derde optie + calendar_id uit connectie)
- `src/config.ts` (env `CALENDAR_TOKEN_ENC_KEY`)

**Env (beide):** `CALENDAR_TOKEN_ENC_KEY`. Dashboard ook `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` van de web-client.

## 13. Toekomst (buiten scope)

Voor meerdere klanten in één omgeving: `tenant_id` op leads en overige tabellen, RLS per klant, en de bot per gesprek de juiste tenant laten bepalen. De `calendar_connections`-tabel ondersteunt dit al via `tenant_id`.
