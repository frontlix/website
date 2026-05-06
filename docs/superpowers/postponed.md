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

3. **Auto-create dashboard_user_profile bij signup** — momenteel ontstaat er geen rij in `dashboard_user_profiles` als een nieuwe user signup doet. Plan 3 heeft een Supabase Auth Hook (`AFTER INSERT ON auth.users`) nodig die automatisch een rij aanmaakt met `tenant_status='pending'`. Anders blokkeren RLS-policies elke read voor net-signed-up users.

4. **`pricing_rules.toelichting` kolom is nu leeg** — config.json heeft geen overeenkomstig veld. Plan 7 (instellingen-edit) moet beslissen: hide of als editable note tonen wanneer de bot-config-migratie edits unlockt.

5. **Singleton UUID `00000000-0000-0000-0000-000000000001`** in de seed-script wordt awkward bij multi-tenant. Bij migratie naar centrale Supabase: rename naar proper tenant UUID + voeg `tenant_id` FK kolom toe op alle 7 dashboard-tabellen. Documentatie staat al in de migration comment.

6. **Lead-notes UI moet `auteur IS NULL` afhandelen** — sinds de FK fix in Plan 1 is `lead_notes.auteur` nullable (`ON DELETE SET NULL`). Bij verwijderde users toont de notitie "Onbekend" / "Verwijderde gebruiker" — designkeuze voor Plan 5 wanneer notes-UI gebouwd wordt.
