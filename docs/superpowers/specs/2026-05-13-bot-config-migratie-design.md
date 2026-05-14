# Bot Config-loader Migratie — Design

**Datum:** 2026-05-13
**Sub-project:** A (van 2-delige scope; B = dashboard edit-flows, eigen spec).
**Status:** Goedgekeurd; klaar voor plan.
**Repo waar de implementatie landt:** `/Users/christiaantromp/Desktop/schoon-straatje product/schoon-straatje-assistent/` (NIET deze Frontlix-website-repo).

---

## Doel

De schoon-straatje bot leest zijn instellingen vandaag uit `clients/schoon-straatje/config.json`. Na deze migratie leest hij ze uit drie Supabase-tabellen (`tenant_settings`, `pricing_rules`, `service_offerings`) die al bestaan en al éénmalig gevuld zijn via `scripts/migrate-config-to-db.ts`. Dit unlockt sub-project B (dashboard edit-flows): de klant kan dan via het dashboard zijn bedrijfsinfo, prijzen en diensten wijzigen en de bot pakt die wijziging automatisch op.

## Scope

**In scope:**

- Bot leest `bedrijf.*`, `eigenaar.*`, `diensten.*`, `prijzen.*`, `offerte.geldigheid_dagen`, `reminders.*`, `radius.*`, `calendar_link` uit Supabase.
- In-memory cache van `ClientConfig` in de bot.
- Background refresh elke 60 seconden.
- Beveiligd reload-endpoint `POST /dashboard-api/config/reload` voor instant-refresh-vanuit-dashboard.
- Veilige rollout via `CONFIG_SOURCE=json|db` env-var (omschakel-knop met JSON-fallback).
- `eigenaar_spoed_telefoon` kolom toevoegen aan `tenant_settings` (ontbreekt nu).

**Uit scope (latere plannen):**

- Dashboard edit-flows voor instellingen (= sub-project B).
- Centrale multi-tenant DB (blijft per-klant Supabase voor nu).
- Verwijderen van `config.json` uit de repo (blijft als referentie/seed tot we comfortabel zijn).
- Removal van `CONFIG_SOURCE`-fallback (gebeurt in eigen plan na week zonder regressies).

## Architectuur

### Vandaag (vóór migratie)

```
bot startup
   └──▶ src/config.ts: loadClientConfig() leest config.json (sync, fs)
        └──▶ export const clientConfig = ...
   └──▶ alle services importeren `clientConfig` direct
```

### Na migratie

```
bot startup
   └──▶ src/config.ts: clientConfig krijgt seed (JSON of leeg, afh. CONFIG_SOURCE)
   └──▶ src/index.ts: await hydrateClientConfig()  ← swap in-memory uit DB
   └──▶ app.listen(...)
   └──▶ startBackgroundRefresh() ← 60s setInterval
   └──▶ mount /dashboard-api/config/reload route

reload-call van dashboard
   └──▶ Bearer-auth check
   └──▶ hydrateClientConfig() ← swap in-memory uit DB
   └──▶ 200 OK
```

`clientConfig` blijft een module-level `let` met dezelfde shape — bestaande imports door services blijven werken zonder wijziging.

## Componenten

### Nieuwe files

| File | Verantwoordelijkheid |
|---|---|
| `src/services/tenant-config.ts` | DB-fetcher + shape-mapping + cache-swap + background refresh |
| `src/routes/dashboard-api.ts` | Express router met `POST /config/reload`, Bearer-auth |
| `supabase/migrations/037_eigenaar_spoed_telefoon.sql` | `ALTER TABLE tenant_settings ADD COLUMN eigenaar_spoed_telefoon TEXT` |
| `tests/tenant-config.test.ts` | Fetcher + cache + fallback-gedrag |
| `tests/dashboard-api.test.ts` | Auth + reload side-effect (supertest) |

### Gewijzigde files

| File | Wijziging |
|---|---|
| `src/config.ts` | `const clientConfig` → `let clientConfig`. Seed afhankelijk van `CONFIG_SOURCE`: `json` = `loadClientConfig()` (huidig), `db` = leeg-skeleton (tot hydrate). `loadClientConfig()` blijft bestaan voor dev/fallback. |
| `src/index.ts` | Vóór `app.listen()`: `if (CONFIG_SOURCE === 'db') await hydrateClientConfig()`. Erna: `startBackgroundRefresh()` + mount reload-route. |
| `scripts/migrate-config-to-db.ts` | Voeg `eigenaar_spoed_telefoon: config.eigenaar?.spoed_telefoon ?? null` toe aan tenant_settings upsert. |
| `.env.example` | Documenteer `DASHBOARD_API_TOKEN`, `CONFIG_SOURCE`. |
| `CLAUDE.md` (schoon-straatje) | Nieuwe sectie "Tenant config-bron en cache-flow". |

### Public API van `tenant-config.ts`

```typescript
// Eenmalig bij startup of expliciete reload.
// Throws bij DB-fout (vangst door caller in src/index.ts → process.exit).
export async function hydrateClientConfig(): Promise<void>;

// Synchrone accessor — wordt door bestaande services indirect gebruikt
// via de export uit src/config.ts. Niet nodig om direct te importeren.
export function getCachedClientConfig(): ClientConfig;

// Start 60s setInterval. Geen-op als al gestart (idempotent).
// Bij refresh-fout: log warning, behoud cache.
export function startBackgroundRefresh(): void;

// Pure helper voor tests. Geen side-effects.
export async function fetchTenantConfigFromDb(
  supabaseClient: SupabaseClient
): Promise<ClientConfig>;
```

## Data-flow

```
[Dashboard "Opslaan"]
       │
       ├──▶ Supabase UPSERT (tenant_settings / pricing_rules / service_offerings)
       │
       └──▶ POST <BOT_URL>/dashboard-api/config/reload
                Authorization: Bearer <DASHBOARD_API_TOKEN>
                       │
                       ▼
              [Bot] middleware checkt token
                       │
                       ▼
              hydrateClientConfig()
                  ├──▶ fetchTenantConfigFromDb()
                  │      ├──▶ SELECT * FROM tenant_settings LIMIT 1
                  │      ├──▶ SELECT rule_key, waarde FROM pricing_rules
                  │      └──▶ SELECT dienst_key, actief FROM service_offerings
                  │
                  └──▶ Map naar ClientConfig-shape → swap module-level `clientConfig`
                       │
                       ▼
                  HTTP 200 { ok: true, ruleCount, serviceCount }

[Parallel: elke 60s]
       │
       └──▶ hydrateClientConfig()  (fout = log + behoud cache)
```

## Shape-mapping

```typescript
// tenant_settings (1 rij) → ClientConfig
{
  bedrijf: {
    naam:         row.bedrijfsnaam,
    adres:        row.adres,
    postcode:     row.postcode,
    plaats:       row.plaats,
    chatbot_naam: row.chatbot_naam,
  },
  eigenaar: {
    email:           row.eigenaar_email,
    whatsapp:        row.eigenaar_whatsapp,
    spoed_telefoon:  row.eigenaar_spoed_telefoon,  // ← nieuw veld
  },
  offerte:  { geldigheid_dagen: row.offerte_geldigheid_dagen },
  reminders:{ dag_1: row.reminder_dag_1, dag_2: row.reminder_dag_2, dag_3: row.reminder_dag_3 },
  radius:   { max_km: row.radius_max_km, doorverwijs_bedrijf: row.radius_doorverwijs_bedrijf },
  calendar_link: row.calendar_link,
}

// pricing_rules (N rijen) → ClientConfig.prijzen (Record<string, number>)
prijzen: Object.fromEntries(rows.map(r => [r.rule_key, Number(r.waarde)]))

// service_offerings (N rijen) → ClientConfig.diensten (Record<string, boolean>)
diensten: Object.fromEntries(rows.map(r => [r.dienst_key, r.actief]))
```

## Failure-modi

| Scenario | Gedrag |
|---|---|
| DB onbereikbaar bij startup (`CONFIG_SOURCE=db`) | `hydrateClientConfig()` throwt → `src/index.ts` catcht → log + `process.exit(1)` → pm2 herstart loop → operator wordt gealert via bestaande error-flow |
| DB onbereikbaar tijdens 60s-refresh | Catch in `startBackgroundRefresh()`, log warning, behoud bestaande cache, volgende tick probeert opnieuw |
| DB onbereikbaar bij reload-call | 503 terug naar dashboard, dashboard toont "wijziging opgeslagen, bot pikt het binnen 60s op" |
| Reload-call zonder Bearer | 401 |
| Reload-call met verkeerde Bearer | 401 |
| `CONFIG_SOURCE=json` | Geen DB-call, geen reload-route, geen interval — bot gedraagt zich precies als vóór deze migratie |
| `pricing_rules` heeft minder keys dan verwacht | Bot gebruikt wat er is; offerte-services valideren shape al via bestaande type-guards |

## Beveiliging

- **`DASHBOARD_API_TOKEN`** — nieuw env-var (alleen op VPS en in dashboard-env), random 32-byte hex. Niet in repo.
- **Constant-time vergelijk** op token (gebruik `crypto.timingSafeEqual`) om timing-attacks te voorkomen.
- **Geen logging van token-waarden** (alleen "auth ok" / "auth failed").
- **Reload-endpoint heeft géén body-input** — geen injection-vector, alleen een trigger.

## Tests

### `tests/tenant-config.test.ts`

- `fetchTenantConfigFromDb()` met mocked Supabase-client → verifieer shape-mapping (bedrijf, eigenaar incl. nieuw spoed_telefoon-veld, prijzen, diensten).
- `hydrateClientConfig()` → cache bevat laatste swap.
- `hydrateClientConfig()` bij DB-fout (mock throwt) → throwt, cache onveranderd.
- `startBackgroundRefresh()` met fake timers + mock die de tweede call laat falen → cache blijft de eerste waarde.

### `tests/dashboard-api.test.ts`

- `POST /dashboard-api/config/reload` zonder header → 401.
- Met `Authorization: Bearer wrong-token` → 401.
- Met juiste token → 200 + hydrate is aangeroepen (spy).

### Handmatige smoke-test na deploy

1. SSH naar VPS, verifieer `pm2 logs` toont "Hydrated tenant config from database".
2. Wijzig `pricing_rules.waarde` waar `rule_key='reinigen_per_m2'` in Supabase Studio.
3. `curl -X POST -H "Authorization: Bearer $DASHBOARD_API_TOKEN" http://localhost:3000/dashboard-api/config/reload` → verwacht 200.
4. Stuur testlead via Frontlix-bot. Offerte gebruikt nieuwe prijs.

## Rollout

1. **Code merge naar `main` met `CONFIG_SOURCE=json` op VPS.** Bot draait door op tekstbestand. Niets verandert in productie-gedrag. Verifieer pm2-logs zien er gewoon uit.
2. **Migratie 037 in Supabase draaien** (voegt `eigenaar_spoed_telefoon` kolom toe).
3. **`scripts/migrate-config-to-db.ts` opnieuw runnen** zodat het nieuwe veld gevuld wordt en eventuele JSON-wijzigingen sinds vorige run mee gaan.
4. **VPS `.env`**: voeg `DASHBOARD_API_TOKEN=<32-byte-hex>` toe, zet `CONFIG_SOURCE=db`, `pm2 restart`.
5. **Verifieer pm2-logs**: "Hydrated tenant config from database (16 pricing rules, 2 services)".
6. **Smoke-test** met testlead.
7. **Bij issues**: `CONFIG_SOURCE=json` + `pm2 restart` = oude gedrag onmiddellijk terug. Geen git-revert nodig.
8. **Na 7 dagen zonder regressies**: separate plan voor verwijderen `CONFIG_SOURCE=json`-codepad.

## Open vragen / aandachtspunten

- **`DASHBOARD_API_TOKEN` gegenereerd waar?** `openssl rand -hex 32`. Bewaar in 1Password + VPS `.env` + Frontlix dashboard-env. Niet in repo.
- **Bot-URL voor dashboard?** Frontlix-dashboard heeft `BOT_RELOAD_URL=https://<bot-host>/dashboard-api/config/reload` env-var nodig (komt in sub-project B).
- **`config.json` blijft in repo?** Ja, voor `CONFIG_SOURCE=json` (dev + fallback). Wordt later verwijderd in eigen plan.

## Niet doen in dit plan

- Geen multi-tenant `tenant_id` toevoegen — blijft singleton-row.
- Geen RLS-policies op `tenant_settings` (bot leest met service-key = bypass).
- Geen verwijderen van JSON-codepad — komt in opvolg-plan.
- Geen edit-UI in het dashboard — sub-project B.
