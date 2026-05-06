# Postponed Work

Werk dat bewust is uitgesteld omdat het op dit moment risico oplevert of niet past in scope. Houd dit bestand actueel — verwijder een entry zodra het werk is gedaan, voeg toe zodra iets uitgesteld wordt.

---

## Bot config-loader migratie naar DB-bron

**Uitgesteld:** 2026-05-06 — bij het opstellen van Plan 1 voor het klanten-dashboard.

**Reden:** De schoon-straatje workflow (Express bot in `/Users/christiaantromp/Desktop/schoon-straatje product/schoon-straatje-assistent/`) wordt momenteel **getest door de klant**. Wijzigingen aan `src/config.ts` of `src/index.ts` raken de productie-flow direct en zijn onverstandig zolang de testperiode loopt.

**Wat is wél gedaan in Plan 1:**
- Nieuwe tabellen aangemaakt in de schoon-straatje Supabase: `tenant_settings`, `pricing_rules`, `service_offerings` (additief, bot leest ze niet)
- `tenant_settings` + `pricing_rules` + `service_offerings` zijn éénmalig gevuld vanuit `clients/schoon-straatje/config.json` via `scripts/migrate-config-to-db.ts` (read-only mirror)
- Het dashboard kan deze tabellen straks **lezen** voor display (bedrijfsnaam in header, prijzen tonen)

**Wat is NIET gedaan en moet later wél gebeuren:**

| Onderdeel | Beschrijving |
|---|---|
| `src/config.ts` refactor | `clientConfig` mutable maken zodat hij hydrateerbaar is uit DB. Houd JSON-fallback voor dev-omgeving. |
| `src/services/tenant-config.ts` | Nieuw bestand met `fetchTenantConfig()`, `hydrateClientConfig()`, `refreshClientConfig()`, `getCachedClientConfig()`. Async DB-fetcher die DB-rijen omzet naar `ClientConfig`-shape. In-memory cache met lifecycle. |
| `src/index.ts` startup-flow | `await hydrateConfigFromDatabase()` voor `app.listen()` zodat bot pas requests accepteert als DB-config is geladen. Plus 60s `setInterval` voor achtergrondrefresh. |
| `src/routes/dashboard-api.ts` | Nieuwe Express router met `POST /dashboard-api/config/reload` endpoint, beveiligd met Bearer-token (`DASHBOARD_API_TOKEN` env-var). Forceert directe refresh na dashboard-edit. |
| `.env.example` documentatie | Voeg `DASHBOARD_API_TOKEN=` toe met uitleg. |
| `CLAUDE.md` documentatie | Beschrijf de nieuwe config-bron en cache-flow zoals voorgesteld in Plan 1. |
| Tests | `tests/tenant-config.test.ts` voor fetcher/cache, `tests/dashboard-api.test.ts` voor reload-endpoint (auth + side-effect via supertest). |
| Eindverificatie | End-to-end smoke test: prijs wijzigen in DB → reload-endpoint aanroepen → bot gebruikt nieuwe waarde in volgende offerte. |

**Implicaties voor v1 dashboard-features:**

De features "self-service bedrijfsinfo aanpassen" en "self-service prijzen-editor" uit de design-spec ([2026-05-06-klanten-dashboard-design.md](specs/2026-05-06-klanten-dashboard-design.md)) kunnen **niet werken** zolang de bot niet uit DB leest — een wijziging in de UI zou wel naar DB schrijven, maar de bot zou nog op JSON draaien. Daarom worden deze features **uit v1 geschoven**:

- `/instellingen/bedrijf` → in v1: read-only weergave van huidige waarden uit DB (gevuld via migratie-script). Edit-formulier komt na de bot-migratie.
- `/instellingen/prijzen` → idem: read-only tabel.
- `/instellingen/diensten` → idem: read-only toggle-weergave (niet toggleable).

De andere instellingen-pagina's (medewerkers, account, AVG) zijn niet afhankelijk van bot-config en blijven volledig in v1.

**Wanneer pakken we dit op?**

Zodra de schoon-straatje klant-testfase is afgerond en we een rustig moment hebben om de bot in onderhoud te zetten (of een staging-omgeving te valideren). Schat: **na de eerste 1-2 productie-weken zonder regressies**.

**Waar staan de details voor de eventuele uitvoering?**

Plan 1 is bewust beperkt tot schema-werk. De volledige bot-migratie staat hier in `postponed.md` als TODO. Wanneer we het oppakken, schrijven we een nieuw plan: `docs/superpowers/plans/<datum>-bot-config-migratie.md` met dezelfde TDD-stappen als oorspronkelijk in Plan 1 v1 zaten (zie git history `cac0fa3` voor de eerste versie van Plan 1, vóór de scope-aanpassing).

---

## Plan 3-vereisten gespot tijdens Plan 1 (mag niet vergeten in Plan 3)

Tijdens de final review van Plan 1 (2026-05-06) zijn deze items naar boven gekomen die in Plan 3 (auth + layout-shell) of Plan 5 (lichte acties) thuishoren — niet kritisch nu, wel essentieel later:

1. **RLS-policies voor alle 8 nieuwe tabellen** — momenteel is RLS aan zonder policies, dus de bot leest met service-key (bypass) en het dashboard kan straks niets met anon-key. Plan 3 moet `CREATE POLICY` statements ophanden voor:
   - `tenant_settings`, `pricing_rules`, `service_offerings` → SELECT voor `authenticated` users met join op `dashboard_user_profiles WHERE tenant_status='approved'`
   - `lead_notes`, `lead_tags`, `lead_status_history`, `tags` → SELECT+INSERT voor approved users, `auth.uid()` matched op `auteur`/`aangemaakt_door`/`gewijzigd_door` bij writes
   - `dashboard_user_profiles` → user mag alleen z'n eigen rij lezen + Frontlix admin-rol mag alle rijen lezen/wijzigen

2. **Auto-fill trigger voor `lead_status_history`** — momenteel schrijft niets naar deze tabel. Twee opties:
   - `BEFORE UPDATE ON leads`-trigger die elke `dashboard_status`-wijziging automatisch logt (audit-by-database, kan niet bypassed worden)
   - Dashboard-server-action schrijft expliciet (kan vergeten worden)
   - Aanbeveling: trigger.

3. **Auto-create dashboard_user_profile bij signup** — Plan 1 noemde een AFTER INSERT-trigger op `auth.users` als oplossing, maar **Supabase staat dat niet toe** (auth.users is eigendom van `supabase_auth_admin`, error: `42501: must be owner of relation users`). In Plan 3 wordt dit nu in de **signup-server-action** gedaan (service-key UPSERT op `dashboard_user_profiles` direct na `supabase.auth.signUp`). Edge case: gebruikers die buiten de signup-flow worden aangemaakt (bijv. handmatig in Studio) krijgen geen profile-rij — moet handmatig of via een latere Supabase Database Webhook opgelost worden.

4. **`pricing_rules.toelichting` kolom is nu leeg** — config.json heeft geen overeenkomstig veld. Plan 7 (instellingen-edit) moet beslissen: hide of als editable note tonen wanneer de bot-config-migratie edits unlockt.

5. **Singleton UUID `00000000-0000-0000-0000-000000000001`** in de seed-script wordt awkward bij multi-tenant. Bij migratie naar centrale Supabase: rename naar proper tenant UUID + voeg `tenant_id` FK kolom toe op alle 7 dashboard-tabellen. Documentatie staat al in de migration comment.

6. **Lead-notes UI moet `auteur IS NULL` afhandelen** — sinds de FK fix in Plan 1 is `lead_notes.auteur` nullable (`ON DELETE SET NULL`). Bij verwijderde users toont de notitie "Onbekend" / "Verwijderde gebruiker" — designkeuze voor Plan 5 wanneer notes-UI gebouwd wordt.

---

## Plan 4-vereisten + open items gespot tijdens Plan 3 (final review 2026-05-06)

### Quick-wins voor Plan 4 (leads-lijst + detail read-only):

1. **Generate Supabase DB types** — `app/dashboard/(app)/layout.tsx` heeft een manuale type-cast omdat Supabase type-inference `never` returnt zonder generated types. Genereer eenmalig:
   ```bash
   supabase gen types typescript --project-id ntewbcbveqqrojhrkrno > lib/dashboard/database.types.ts
   ```
   Daarna: `createServerClient<Database>(...)` en alle queries zijn typed. Voorkomt dat de cast-workaround zich in Plan 4 vermenigvuldigt.

2. **`requireApprovedUser()` helper toevoegen aan `lib/dashboard/auth.ts`** — was in Plan 3 spec genoemd maar niet gebouwd. Elke Plan 4-page herhaalt nu hetzelfde redirect-patroon. Extract zodra Plan 4 begint.

3. **`<PollApproval>` loading-indicator** — momenteel returnt het `null`. Een subtiele "checking…" bij wachtkamer-pagina zou de pending user geruststellen.

4. **Document de auth-redirect pattern** in `lib/dashboard/auth.ts` — beide auth-actions gebruiken `revalidatePath('/', 'layout')` + client-side `window.location.href`. Dit is een bekend Supabase+Next.js patroon dat we in Plan 4+ kunnen hergebruiken; voorkom dat het opnieuw gediscovered moet worden.

### Open security/UX items (niet blocking voor Plan 4, wel opnemen):

5. **RLS UPDATE policy op `dashboard_user_profiles` laat self-approval toe** — `tenant_status` kan door de user zelf gewijzigd worden via API. Niet exploitable nu (geen UI exposes dit), maar Plan 7 moet column-level constraint of trigger toevoegen. Migration comment documenteert dit risico.

6. **`/logout` is een GET handler zonder CSRF-bescherming** — een `<img src="/logout">` kan users uitloggen. Lage impact (alleen vervelend), maar Plan 4+ kan dit naar POST verplaatsen.

7. **Geen `app/dashboard/(app)/page.tsx`** — `app.frontlix.com/` (root) heeft geen page-bestand. Of in middleware redirecten naar `/leads`, of een index-page maken. Klein UX-puntje.

8. **MobileNav niet gebouwd** — Plan 3 spec noemde een `MobileNav.tsx`, niet geïmplementeerd. Sidebar verstopt zich `< 768px` maar mobile users kunnen niet navigeren. Toevoegen wanneer mobiel relevant wordt.

9. **`tenant_settings`-query is nog single-row** — bij multi-tenant migratie moet `WHERE tenant_id = ...` worden toegevoegd. Komt automatisch bij de centrale-DB migratie.

10. **Logout-route gebruikt server-side `redirect('/login')`** — werkte tijdens smoke-test, maar als de cookie-clear-write race optreedt (zelfde categorie als de signup/login race) kan logout flaken. Watch in productie. Fix is hetzelfde patroon: client-side `window.location.href`.

### Productie-deploy checklist voor `app.frontlix.com`:

**DNS:**
- A/CNAME-record: `app.frontlix.com` → VPS IP `72.61.23.186` (zelfde target als `frontlix.com`)
- Verifieer met `dig app.frontlix.com`

**Nginx (op VPS):**
- Voeg `app.frontlix.com` toe aan bestaand `server_name` block, of nieuw block dat naar poort 3000 proxyt
- `proxy_set_header Host $host;` belangrijk zodat middleware de echte hostname ziet
- `nginx -t && systemctl reload nginx`

**Let's Encrypt:**
- `certbot --nginx -d frontlix.com -d www.frontlix.com -d app.frontlix.com`

**VPS production `.env`:**
- Voeg de 4 nieuwe DASHBOARD env-vars toe (zelfde waarden als lokaal in `.env.local`)
- Gebruik schoon-straatje Supabase keys (ntewbcbveqqrojhrkrno)

**Deploy:**
```bash
git pull origin main && npm install && npm run build && pm2 restart frontlix
```

**Post-deploy verificatie:**
- `https://app.frontlix.com/login` rendert
- `https://frontlix.com/dashboard/leads` geeft 404 (host-isolation werkt)
- Volledige flow eenmaal testen op productie
- Slack-webhook fired vanuit productie

**Supabase Realtime:**
- Verifieer dat Realtime aan staat voor `dashboard_user_profiles` (Studio → Database → Replication) — vereist voor wachtkamer auto-redirect.

---

## Plan 5 follow-ups (final review 2026-05-06)

Items uit de eind-review die niet blocking waren maar wel verbeterpunten:

1. **Introduceer `--color-error` + `--color-error-bg` tokens** — `#c33` en `rgba(255,60,60,0.08)` zijn nu hardcoded in 4 nieuwe Plan 5 module.css files (LeadStatusBadges, LeadNotes, LeadTagsEditor, LeadDangerZone). CLAUDE.md zegt "no hardcoded colors outside `tokens.css`". Voeg toe aan `styles/tokens.css` en vervang in een follow-up commit.

2. **`as any` casts in tests vermijden via `if (!result.ok)` narrowing** — `lead-actions.test.ts`, `note-actions.test.ts`, `tag-actions.test.ts` gebruiken op enkele plekken `as any` voor het narrowen van de discriminated union. `.eslintrc.json` staat het toe in test-files, maar een `if (!result.ok)`-guard is cleaner. Cosmetic.

3. **Outside-click-to-close voor LeadTagsEditor dropdown** — momenteel sluit de dropdown alleen door opnieuw op "+ Tag" te klikken of via een succesvolle add/create. UX-nit: voeg een ref + click-outside listener toe.

4. **`confirm()` browser-dialog vervangen** — `LeadNotes.tsx` (delete-bevestiging) en `LeadDangerZone.tsx` (archive-bevestiging) gebruiken `window.confirm()`. Werkt maar styled niet mee met de rest van het dashboard. Een eigen `<ConfirmDialog>` component bouwen wanneer de v1-feedback komt.

5. **`tag-actions.ts` cast `(data as unknown as { id: string })`** — kan weg zodra `database.types.ts` regenererend wordt vanuit Supabase (zie Plan 4 quick-win #1). Niet urgent.

6. **CSV line endings** — `app/api/dashboard/export/leads-csv/route.ts` gebruikt `\n`. Modern Excel handelt dit goed af, maar oudere Windows-Excel verwacht `\r\n`. Wijzig wanneer een klant erover klaagt.

7. **Status dropdown error-message phrasing** — `"{dashboardStatusLabel(optimisticStatus)} kon niet worden opgeslagen"` leest als "Geen status kon niet worden opgeslagen" wanneer de user de status leegt. Re-phrase naar bv. "De status kon niet worden opgeslagen: {error}".

---

## Plan 7 + 8 follow-ups (final review 2026-05-06)

Items uit de eind-review die niet blocking waren:

1. **`--color-on-primary` token toevoegen** — `AgendaCalendar.module.css:78` en `AgendaAppointmentBlock.module.css:16` gebruiken `color: white` hardcoded. CLAUDE.md zegt geen hardcoded colors. Voeg `--color-on-primary: #FFFFFF` toe aan `tokens.css` en vervang. Combineer met de `#c33` token-kwestie uit Plan 5.

2. **Inline width-style in DistributionBars** — `DistributionBars.tsx:36` gebruikt `style={{ width: ${pct}% }}`. Werkt prima maar CLAUDE.md verbiedt inline styles strikt. Kan vervangen worden door CSS-custom-property: `style={{ ['--w']: pct }}` + `width: calc(var(--w) * 1%)`. Cosmetic.

3. **Wrap Supabase builder casts in een typed helper** — `stats-queries.ts` heeft ~10 `eslint-disable + any` casts op de query-builder. Een `getQueryBuilder<T>()` helper kan dit opruimen. Niet urgent — pragmatic pattern werkt.

4. **`leadsPerDag` date-string vs timestamptz** — `stats-queries.ts:204` doet `.gte('aangemaakt', '2026-04-06')`. Postgres interpreteert dit als UTC midden, dus tot ±2u kunnen leads aan de start-grens missen in NL-tijd. Acceptabel voor een 30-daagse trend-chart, maar aanpassen wanneer we tijdzone-strikt willen zijn.

5. **`reactietijd` outliers** — gebruikt pure gemiddelde, kan vertekend worden door 1-2 leads die pas na 3 weken opgevolgd werden. Mediaan zou robuuster zijn maar duurder; later optimaliseren.

6. **Plan 7 + 8 hebben geen "vergelijking met vorige periode"** indicator (bv. "+12% vs vorige maand"). Mooi later toe te voegen als de klant erom vraagt.
