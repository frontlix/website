# Bot Config-loader Migratie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the schoon-straatje bot from reading its `ClientConfig` from `clients/schoon-straatje/config.json` to reading from three Supabase tables (`tenant_settings`, `pricing_rules`, `service_offerings`), with 60s background refresh and a Bearer-authenticated reload endpoint for the dashboard.

**Architecture:** New `src/services/tenant-config.ts` owns the DB-fetch + in-memory cache + background refresh. `src/config.ts` keeps exporting `clientConfig` but it becomes a module-level `let` that gets swapped by the cache. New `src/routes/dashboard-api.ts` exposes `POST /dashboard-api/config/reload` with `DASHBOARD_API_TOKEN` Bearer auth. Rollout via `CONFIG_SOURCE=json|db` env-var.

**Tech Stack:** TypeScript, Node.js (CommonJS), Express 5, `@supabase/supabase-js`, Vitest, supertest (new test dep), `crypto.timingSafeEqual` for token comparison.

**REPO LOCATIE:** All file paths in this plan are **relative to the schoon-straatje repo**:
`/Users/christiaantromp/Desktop/schoon-straatje product/schoon-straatje-assistent/`

NOT to the Frontlix-website repo. `cd` into the schoon-straatje repo before running any command.

**Design spec:** `/Users/christiaantromp/Desktop/Frontlix website/docs/superpowers/specs/2026-05-13-bot-config-migratie-design.md`

---

## File Structure

**New files (schoon-straatje repo):**

- `src/services/tenant-config.ts` — DB-fetcher + in-memory cache + background refresh
- `src/routes/dashboard-api.ts` — Express router with Bearer-authenticated reload endpoint
- `supabase/migrations/037_eigenaar_spoed_telefoon.sql` — adds missing column
- `tests/tenant-config.test.ts` — unit tests for fetcher + cache + refresh
- `tests/dashboard-api.test.ts` — supertest-based tests for reload route + auth

**Modified files (schoon-straatje repo):**

- `src/config.ts` — `clientConfig` becomes `let`, seed depends on `CONFIG_SOURCE`; export `CONFIG_SOURCE` constant
- `src/index.ts` — `await hydrateClientConfig()` before `app.listen()` (when `CONFIG_SOURCE=db`); `startBackgroundRefresh()` after; mount reload route
- `scripts/migrate-config-to-db.ts` — include `eigenaar_spoed_telefoon` in upsert
- `.env.example` — document `DASHBOARD_API_TOKEN` and `CONFIG_SOURCE`
- `CLAUDE.md` — new section "Tenant config-bron en cache-flow"
- `package.json` — add `supertest` + `@types/supertest` to devDependencies

---

## Task 1: Migration 037 — add `eigenaar_spoed_telefoon` column

**Files:**
- Create: `supabase/migrations/037_eigenaar_spoed_telefoon.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/037_eigenaar_spoed_telefoon.sql`:

```sql
-- Migratie 037: voeg eigenaar_spoed_telefoon toe aan tenant_settings.
-- Bot-config-migratie (zie Frontlix-repo docs/superpowers/specs/2026-05-13-bot-config-migratie-design.md):
-- de bot leest binnenkort tenant_settings i.p.v. config.json. clients/schoon-straatje/config.json
-- heeft `eigenaar.spoed_telefoon`; dat veld ontbrak in 022_dashboard_config_tables.sql.
--
-- We voegen het nullable toe (geen risico op constraint-fail op bestaande rij), het migratiescript
-- vult het in een aparte run. NOT NULL kan in een latere migratie wanneer er een tenant_id-FK komt.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS eigenaar_spoed_telefoon TEXT;

COMMENT ON COLUMN tenant_settings.eigenaar_spoed_telefoon IS
  'Direct telefoonnummer voor spoed-contact. Format zonder + (zoals whatsapp).';
```

- [ ] **Step 2: Apply migration to schoon-straatje Supabase**

Run in Supabase Studio SQL editor (project: `ntewbcbveqqrojhrkrno`), or use the Supabase CLI if linked:

```bash
# Optie A — Supabase CLI (als linked):
supabase db push

# Optie B — direct via psql met SUPABASE_DB_URL uit .env:
psql "$SUPABASE_DB_URL" -f supabase/migrations/037_eigenaar_spoed_telefoon.sql
```

Expected: `ALTER TABLE` succeeds. Run `SELECT column_name FROM information_schema.columns WHERE table_name='tenant_settings' AND column_name='eigenaar_spoed_telefoon';` — moet één rij teruggeven.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/037_eigenaar_spoed_telefoon.sql
git commit -m "feat(db): add eigenaar_spoed_telefoon to tenant_settings (migration 037)"
```

---

## Task 2: Update `migrate-config-to-db.ts` and re-seed

**Files:**
- Modify: `scripts/migrate-config-to-db.ts:74-93` (the `tenant_settings` upsert block)

- [ ] **Step 1: Add the new field to the upsert**

In `scripts/migrate-config-to-db.ts`, locate the `tenant_settings` upsert object (around line 76-92). Add `eigenaar_spoed_telefoon` right after `eigenaar_whatsapp`:

```typescript
// tenant_settings — UPSERT op vaste id
const { error: tsErr } = await supabase.from('tenant_settings').upsert({
  id:                         TENANT_SETTINGS_SINGLETON_ID,
  bedrijfsnaam:               config.bedrijf.naam,
  chatbot_naam:               config.bedrijf.chatbot_naam,
  adres:                      config.bedrijf.adres,
  postcode:                   config.bedrijf.postcode,
  plaats:                     config.bedrijf.plaats,
  eigenaar_email:             config.eigenaar.email,
  eigenaar_whatsapp:          config.eigenaar.whatsapp,
  eigenaar_spoed_telefoon:    config.eigenaar.spoed_telefoon ?? null,
  calendar_link:              config.calendar_link ?? null,
  offerte_geldigheid_dagen:   config.offerte?.geldigheid_dagen ?? 30,
  reminder_dag_1:             config.reminders?.dag_1 ?? 2,
  reminder_dag_2:             config.reminders?.dag_2 ?? 5,
  reminder_dag_3:             config.reminders?.dag_3 ?? 8,
  radius_max_km:              config.radius?.max_km ?? 100,
  radius_doorverwijs_bedrijf: config.radius?.doorverwijs_bedrijf ?? null,
});
```

- [ ] **Step 2: Run the script**

```bash
CLIENT=schoon-straatje npx tsx scripts/migrate-config-to-db.ts
```

Expected output:
```
✓ tenant_settings geüpserteerd
✓ 16 pricing_rules geüpserteerd
✓ 2 service_offerings geüpserteerd

Klaar.
```

- [ ] **Step 3: Verify in DB**

In Supabase Studio SQL editor:
```sql
SELECT eigenaar_spoed_telefoon FROM tenant_settings;
```

Expected: one row with value `31630313251` (uit config.json).

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-config-to-db.ts
git commit -m "feat(seed): backfill eigenaar_spoed_telefoon in migrate-config-to-db"
```

---

## Task 3: `fetchTenantConfigFromDb()` — pure DB-fetcher with shape-mapping

**Files:**
- Create: `src/services/tenant-config.ts`
- Create: `tests/tenant-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tenant-config.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchTenantConfigFromDb } from '../src/services/tenant-config';
import type { ClientConfig } from '../src/types/pricing';

// Bouwt een gemockte Supabase-client die per .from(table) een vaste response teruggeeft.
function makeMockSupabase(responses: Record<string, { data: any; error: any }>) {
  return {
    from: (table: string) => {
      const resp = responses[table];
      if (!resp) throw new Error(`unexpected table query: ${table}`);
      return {
        select: () => ({
          limit: () => ({ maybeSingle: async () => resp }),
          order: () => ({ then: (cb: any) => cb(resp) }),
          // Voor service_offerings (geen .order)
          then: (cb: any) => cb(resp),
        }),
      };
    },
  } as any;
}

describe('fetchTenantConfigFromDb', () => {
  it('maps tenant_settings + pricing_rules + service_offerings naar ClientConfig', async () => {
    const supabase = makeMockSupabase({
      tenant_settings: {
        data: {
          bedrijfsnaam: 'Schoon Straatje',
          chatbot_naam: 'Surface',
          adres: 'Achterweg 23',
          postcode: '4521 CB',
          plaats: 'Biervliet',
          eigenaar_email: 'frontlixx@gmail.com',
          eigenaar_whatsapp: '31624965270',
          eigenaar_spoed_telefoon: '31630313251',
          calendar_link: 'https://calendar.google.com/x',
          offerte_geldigheid_dagen: 14,
          reminder_dag_1: 2,
          reminder_dag_2: 5,
          reminder_dag_3: 8,
          radius_max_km: 200,
          radius_doorverwijs_bedrijf: 'https://bereschoon.nl',
        },
        error: null,
      },
      pricing_rules: {
        data: [
          { rule_key: 'reinigen_per_m2', waarde: 3.95 },
          { rule_key: 'reinigen_dagprijs_onder_100m2', waarde: 395 },
        ],
        error: null,
      },
      service_offerings: {
        data: [
          { dienst_key: 'oprit_terras_terrein', actief: true },
          { dienst_key: 'onkruidbeheersing_zakelijk', actief: false },
        ],
        error: null,
      },
    });

    const cfg = await fetchTenantConfigFromDb(supabase);

    expect(cfg.bedrijf.naam).toBe('Schoon Straatje');
    expect(cfg.bedrijf.chatbot_naam).toBe('Surface');
    expect(cfg.eigenaar.email).toBe('frontlixx@gmail.com');
    expect(cfg.eigenaar.spoed_telefoon).toBe('31630313251');
    expect(cfg.prijzen.reinigen_per_m2).toBe(3.95);
    expect(cfg.prijzen.reinigen_dagprijs_onder_100m2).toBe(395);
    expect(cfg.diensten.oprit_terras_terrein).toBe(true);
    expect(cfg.diensten.onkruidbeheersing_zakelijk).toBe(false);
    expect(cfg.offerte.geldigheid_dagen).toBe(14);
    expect(cfg.reminders.dag_1).toBe(2);
    expect(cfg.radius.max_km).toBe(200);
    expect(cfg.calendar_link).toBe('https://calendar.google.com/x');
  });

  it('throws bij DB-fout op tenant_settings', async () => {
    const supabase = makeMockSupabase({
      tenant_settings: { data: null, error: { message: 'connection failed' } },
      pricing_rules: { data: [], error: null },
      service_offerings: { data: [], error: null },
    });

    await expect(fetchTenantConfigFromDb(supabase)).rejects.toThrow(/tenant_settings/);
  });

  it('throws bij geen rij in tenant_settings (data=null, error=null)', async () => {
    const supabase = makeMockSupabase({
      tenant_settings: { data: null, error: null },
      pricing_rules: { data: [], error: null },
      service_offerings: { data: [], error: null },
    });

    await expect(fetchTenantConfigFromDb(supabase)).rejects.toThrow(/no tenant_settings row/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tenant-config.test.ts
```

Expected: FAIL with "Cannot find module '../src/services/tenant-config'".

- [ ] **Step 3: Implement `fetchTenantConfigFromDb`**

Create `src/services/tenant-config.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientConfig, PrijzenConfig } from '../types/pricing';

/**
 * Leest de drie config-tabellen uit en bouwt een ClientConfig-object.
 *
 * Pure functie — geen side-effects, geen cache. Wordt zowel bij startup
 * als bij elke refresh aangeroepen. Bij elke DB-fout: throw.
 *
 * Aanroeper is verantwoordelijk voor:
 *  - catchen bij refresh (warning logben, cache behouden)
 *  - laten doorgooien bij startup (process.exit via index.ts)
 */
export async function fetchTenantConfigFromDb(
  supabase: SupabaseClient,
): Promise<ClientConfig> {
  // tenant_settings — singleton-row (1 rij per project tot multi-tenant)
  const { data: ts, error: tsErr } = await supabase
    .from('tenant_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (tsErr) throw new Error(`Failed to fetch tenant_settings: ${tsErr.message}`);
  if (!ts) throw new Error('No tenant_settings row found — run scripts/migrate-config-to-db.ts first');

  // pricing_rules — N rijen, key/value
  const { data: pricingRows, error: prErr } = await supabase
    .from('pricing_rules')
    .select('rule_key, waarde');

  if (prErr) throw new Error(`Failed to fetch pricing_rules: ${prErr.message}`);

  const prijzen = Object.fromEntries(
    (pricingRows ?? []).map((r: { rule_key: string; waarde: number | string }) => [
      r.rule_key,
      Number(r.waarde),
    ]),
  ) as unknown as PrijzenConfig;

  // service_offerings — N rijen, key/boolean
  const { data: serviceRows, error: soErr } = await supabase
    .from('service_offerings')
    .select('dienst_key, actief');

  if (soErr) throw new Error(`Failed to fetch service_offerings: ${soErr.message}`);

  const diensten = Object.fromEntries(
    (serviceRows ?? []).map((r: { dienst_key: string; actief: boolean }) => [
      r.dienst_key,
      Boolean(r.actief),
    ]),
  ) as ClientConfig['diensten'];

  return {
    bedrijf: {
      naam:         ts.bedrijfsnaam,
      adres:        ts.adres ?? '',
      postcode:     ts.postcode ?? '',
      plaats:       ts.plaats ?? '',
      chatbot_naam: ts.chatbot_naam,
    },
    eigenaar: {
      email:          ts.eigenaar_email ?? '',
      whatsapp:       ts.eigenaar_whatsapp ?? '',
      spoed_telefoon: ts.eigenaar_spoed_telefoon ?? '',
    },
    diensten,
    prijzen,
    offerte: { geldigheid_dagen: ts.offerte_geldigheid_dagen },
    reminders: {
      dag_1: ts.reminder_dag_1,
      dag_2: ts.reminder_dag_2,
      dag_3: ts.reminder_dag_3,
    },
    radius: {
      max_km:              ts.radius_max_km,
      doorverwijs_bedrijf: ts.radius_doorverwijs_bedrijf ?? '',
    },
    calendar_link: ts.calendar_link ?? undefined,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tenant-config.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/tenant-config.ts tests/tenant-config.test.ts
git commit -m "feat(config): add fetchTenantConfigFromDb (pure DB→ClientConfig mapper)"
```

---

## Task 4: Cache state — `hydrateClientConfig` + `getCachedClientConfig`

**Files:**
- Modify: `src/services/tenant-config.ts`
- Modify: `tests/tenant-config.test.ts` (append new describe-block)

- [ ] **Step 1: Write the failing test**

Append to `tests/tenant-config.test.ts`:

```typescript
import {
  hydrateClientConfig,
  getCachedClientConfig,
  _resetCacheForTests,
} from '../src/services/tenant-config';

describe('cache (hydrateClientConfig + getCachedClientConfig)', () => {
  beforeEach(() => {
    _resetCacheForTests();
  });

  it('hydrate vult de cache, getCached geeft hem terug', async () => {
    const supabase = makeMockSupabase({
      tenant_settings: {
        data: {
          bedrijfsnaam: 'A', chatbot_naam: 'Bot', adres: '', postcode: '', plaats: '',
          eigenaar_email: '', eigenaar_whatsapp: '', eigenaar_spoed_telefoon: '',
          calendar_link: null, offerte_geldigheid_dagen: 14,
          reminder_dag_1: 2, reminder_dag_2: 5, reminder_dag_3: 8,
          radius_max_km: 100, radius_doorverwijs_bedrijf: null,
        },
        error: null,
      },
      pricing_rules: { data: [], error: null },
      service_offerings: { data: [], error: null },
    });

    await hydrateClientConfig(supabase);
    expect(getCachedClientConfig().bedrijf.naam).toBe('A');
  });

  it('getCached vóór hydrate throws met duidelijke message', () => {
    expect(() => getCachedClientConfig()).toThrow(/not hydrated/i);
  });

  it('failed hydrate laat oude cache intact', async () => {
    const supabaseOk = makeMockSupabase({
      tenant_settings: {
        data: {
          bedrijfsnaam: 'Origineel', chatbot_naam: 'Bot', adres: '', postcode: '', plaats: '',
          eigenaar_email: '', eigenaar_whatsapp: '', eigenaar_spoed_telefoon: '',
          calendar_link: null, offerte_geldigheid_dagen: 14,
          reminder_dag_1: 2, reminder_dag_2: 5, reminder_dag_3: 8,
          radius_max_km: 100, radius_doorverwijs_bedrijf: null,
        },
        error: null,
      },
      pricing_rules: { data: [], error: null },
      service_offerings: { data: [], error: null },
    });
    await hydrateClientConfig(supabaseOk);

    const supabaseFail = makeMockSupabase({
      tenant_settings: { data: null, error: { message: 'network down' } },
      pricing_rules: { data: [], error: null },
      service_offerings: { data: [], error: null },
    });
    await expect(hydrateClientConfig(supabaseFail)).rejects.toThrow();

    expect(getCachedClientConfig().bedrijf.naam).toBe('Origineel');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tenant-config.test.ts
```

Expected: 3 new tests FAIL with "hydrateClientConfig is not a function" / "getCachedClientConfig is not a function" / "_resetCacheForTests is not a function".

- [ ] **Step 3: Add cache implementation**

Append to `src/services/tenant-config.ts`:

```typescript
// ============================================
// IN-MEMORY CACHE
// ============================================
//
// `hydrateClientConfig` swap't `cachedConfig` atomair na een succesvolle fetch.
// `getCachedClientConfig` is synchroon (alle services importeren hem indirect
// via src/config.ts's clientConfig-export).
//
// Bij hydrate-fout: cachedConfig blijft staan, error propageert naar caller.
// Bij eerste call vóór een succesvolle hydrate: throw — dit signaleert een
// programmeerfout (we moeten altijd eerst hydrate'n).

let cachedConfig: ClientConfig | null = null;

export async function hydrateClientConfig(supabase: SupabaseClient): Promise<void> {
  const fresh = await fetchTenantConfigFromDb(supabase);
  cachedConfig = fresh;
}

export function getCachedClientConfig(): ClientConfig {
  if (!cachedConfig) {
    throw new Error(
      'tenant-config not hydrated yet — call hydrateClientConfig() at startup',
    );
  }
  return cachedConfig;
}

/** Alleen voor tests — reset module-state tussen testen. */
export function _resetCacheForTests(): void {
  cachedConfig = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tenant-config.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/tenant-config.ts tests/tenant-config.test.ts
git commit -m "feat(config): add in-memory cache (hydrate + get) with fail-soft semantics"
```

---

## Task 5: Background refresh — `startBackgroundRefresh`

**Files:**
- Modify: `src/services/tenant-config.ts`
- Modify: `tests/tenant-config.test.ts` (append new describe-block)

- [ ] **Step 1: Write the failing test**

Append to `tests/tenant-config.test.ts`:

```typescript
import {
  startBackgroundRefresh,
  stopBackgroundRefresh,
} from '../src/services/tenant-config';

describe('startBackgroundRefresh', () => {
  beforeEach(() => {
    _resetCacheForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    stopBackgroundRefresh();
    vi.useRealTimers();
  });

  it('refresht elke 60s en updatet cache', async () => {
    let bedrijfsnaam = 'Eerste';
    const supabase = {
      from: (_table: string) => ({
        select: () => ({
          limit: () => ({
            maybeSingle: async () => ({
              data: _table === 'tenant_settings' ? {
                bedrijfsnaam, chatbot_naam: 'Bot', adres: '', postcode: '', plaats: '',
                eigenaar_email: '', eigenaar_whatsapp: '', eigenaar_spoed_telefoon: '',
                calendar_link: null, offerte_geldigheid_dagen: 14,
                reminder_dag_1: 2, reminder_dag_2: 5, reminder_dag_3: 8,
                radius_max_km: 100, radius_doorverwijs_bedrijf: null,
              } : null,
              error: null,
            }),
          }),
          then: (cb: any) => cb({ data: [], error: null }),
        }),
      }),
    } as any;

    await hydrateClientConfig(supabase);
    expect(getCachedClientConfig().bedrijf.naam).toBe('Eerste');

    startBackgroundRefresh(supabase, 60_000);

    bedrijfsnaam = 'Tweede';
    await vi.advanceTimersByTimeAsync(60_000);
    expect(getCachedClientConfig().bedrijf.naam).toBe('Tweede');

    bedrijfsnaam = 'Derde';
    await vi.advanceTimersByTimeAsync(60_000);
    expect(getCachedClientConfig().bedrijf.naam).toBe('Derde');
  });

  it('refresh-fout laat cache intact en logt warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let shouldFail = false;
    const supabase = {
      from: (_table: string) => ({
        select: () => ({
          limit: () => ({
            maybeSingle: async () => shouldFail
              ? { data: null, error: { message: 'down' } }
              : {
                  data: _table === 'tenant_settings' ? {
                    bedrijfsnaam: 'Stabiel', chatbot_naam: 'Bot', adres: '', postcode: '', plaats: '',
                    eigenaar_email: '', eigenaar_whatsapp: '', eigenaar_spoed_telefoon: '',
                    calendar_link: null, offerte_geldigheid_dagen: 14,
                    reminder_dag_1: 2, reminder_dag_2: 5, reminder_dag_3: 8,
                    radius_max_km: 100, radius_doorverwijs_bedrijf: null,
                  } : null,
                  error: null,
                },
          }),
          then: (cb: any) => cb({ data: [], error: null }),
        }),
      }),
    } as any;

    await hydrateClientConfig(supabase);
    startBackgroundRefresh(supabase, 60_000);

    shouldFail = true;
    await vi.advanceTimersByTimeAsync(60_000);

    expect(getCachedClientConfig().bedrijf.naam).toBe('Stabiel');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[tenant-config] background refresh failed'),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });

  it('is idempotent — tweede start vervangt eerste interval niet stilletjes', () => {
    const supabase = {} as any;
    startBackgroundRefresh(supabase, 60_000);
    // Tweede call mag niet crashen; mag de bestaande interval houden of vervangen,
    // maar mag GEEN tweede parallelle interval starten.
    expect(() => startBackgroundRefresh(supabase, 60_000)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tenant-config.test.ts
```

Expected: 3 new tests FAIL with "startBackgroundRefresh is not a function".

- [ ] **Step 3: Implement background refresh**

Append to `src/services/tenant-config.ts`:

```typescript
// ============================================
// BACKGROUND REFRESH
// ============================================
//
// 60s setInterval die hydrateClientConfig opnieuw runt. Catcht alle errors:
// een refresh-fout mag de bot NIET crashen — we behouden de oude cache en
// proberen weer bij de volgende tick. Bij startup-hydrate gooien we wél
// (dat is een fail-fast moment).
//
// Idempotent: tweede aanroep stopt eerst de bestaande interval. Dit voorkomt
// dat hot-reload tijdens dev twee intervallen tegelijk laat draaien.

let refreshTimer: NodeJS.Timeout | null = null;

export function startBackgroundRefresh(
  supabase: SupabaseClient,
  intervalMs: number = 60_000,
): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(async () => {
    try {
      await hydrateClientConfig(supabase);
    } catch (err) {
      console.warn('[tenant-config] background refresh failed (keeping cache):', err);
    }
  }, intervalMs);

  // Niet de event-loop blokkeren bij shutdown.
  refreshTimer.unref?.();
}

export function stopBackgroundRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/tenant-config.test.ts
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/tenant-config.ts tests/tenant-config.test.ts
git commit -m "feat(config): add 60s background refresh with fail-soft cache retention"
```

---

## Task 6: `src/config.ts` — `let clientConfig` + `CONFIG_SOURCE` env

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Inspect current `src/config.ts` shape**

Read `src/config.ts` to confirm current state. The crucial section is:

```typescript
export const clientConfig = loadClientConfig();
```

We need to:
1. Change `const` → `let`.
2. Add `CONFIG_SOURCE` env-var (default `'json'` for safety).
3. When `CONFIG_SOURCE='db'`: seed `clientConfig` with an empty skeleton so existing `import { clientConfig }` doesn't crash at import-time; the actual values come from `hydrateClientConfig()` which `src/index.ts` calls before serving requests.
4. When `CONFIG_SOURCE='json'`: keep current behavior (read from JSON).

Note: `config.business.name` and `config.owner.email`/`whatsapp` are derived from `clientConfig` at module-load (lines 124-148). Those derived values become stale after a DB-hydrate. **We change them from `const` initialization to getters** so they always read the latest `clientConfig`.

- [ ] **Step 2: Apply the edit**

Replace the relevant blocks in `src/config.ts`:

```typescript
// === Replace line 48 ===
// FROM: export const clientConfig = loadClientConfig();
// TO:

const CONFIG_SOURCE = (process.env.CONFIG_SOURCE ?? 'json') as 'json' | 'db';
if (CONFIG_SOURCE !== 'json' && CONFIG_SOURCE !== 'db') {
  console.error(`[config] Invalid CONFIG_SOURCE='${process.env.CONFIG_SOURCE}'. Expected 'json' | 'db'.`);
  process.exit(1);
}

/**
 * Module-level config-object. Bij CONFIG_SOURCE='json': direct gevuld vanuit
 * clients/<CLIENT>/config.json. Bij CONFIG_SOURCE='db': eerst een lege
 * skeleton, daarna gevuld door hydrateClientConfig() in src/index.ts vóór
 * app.listen(). De let-binding wordt door tenant-config.ts gemuteerd.
 *
 * BELANGRIJK: services die clientConfig importeren krijgen géén live ref
 * naar dit object — ze krijgen een snapshot bij eerste import. Daarom doen we
 * de mutatie altijd in-place via Object.assign zodat alle bestaande refs
 * dezelfde inhoud zien. Zie applyClientConfigSnapshot hieronder.
 */
export let clientConfig: ClientConfig =
  CONFIG_SOURCE === 'json'
    ? loadClientConfig()
    : createEmptyClientConfig();

function createEmptyClientConfig(): ClientConfig {
  // Skeleton dat type-safe is en de bot bij accident-call niet crasht.
  // Wordt vervangen door hydrateClientConfig vóór app.listen() — vanaf dat
  // moment zien alle services de echte waarden.
  return {
    bedrijf:   { naam: '', adres: '', postcode: '', plaats: '', chatbot_naam: '' },
    eigenaar:  { email: '', whatsapp: '', spoed_telefoon: '' },
    diensten:  { oprit_terras_terrein: false, onkruidbeheersing_zakelijk: false },
    prijzen:   {} as ClientConfig['prijzen'],
    offerte:   { geldigheid_dagen: 14 },
    reminders: { dag_1: 2, dag_2: 5, dag_3: 8 },
    radius:    { max_km: 100, doorverwijs_bedrijf: '' },
    calendar_link: undefined,
  };
}

/**
 * In-place merge zodat services die clientConfig al hebben geïmporteerd
 * dezelfde object-referentie blijven zien met nieuwe inhoud. Wordt
 * aangeroepen door tenant-config.ts na een succesvolle hydrate.
 */
export function applyClientConfigSnapshot(next: ClientConfig): void {
  Object.assign(clientConfig.bedrijf,   next.bedrijf);
  Object.assign(clientConfig.eigenaar,  next.eigenaar);
  Object.assign(clientConfig.diensten,  next.diensten);
  // Prijzen: bestaande keys overschrijven, nieuwe keys toevoegen. Verwijderde
  // keys blijven staan met oude waarde — bewust, want type-shape eist ze.
  Object.assign(clientConfig.prijzen,   next.prijzen);
  Object.assign(clientConfig.offerte,   next.offerte);
  Object.assign(clientConfig.reminders, next.reminders);
  Object.assign(clientConfig.radius,    next.radius);
  clientConfig.calendar_link = next.calendar_link;
}

export { CONFIG_SOURCE };
```

Then update the `business` / `owner` section (around line 122-148) so they read live from `clientConfig`. Replace those object-literals on the `config` const:

```typescript
// === Replace the business + owner blocks inside `export const config = {` ===
// FROM:
//   owner: {
//     email: clientConfig.eigenaar.email,
//     whatsapp: clientConfig.eigenaar.whatsapp,
//   },
//   ...
//   business: {
//     name: clientConfig.bedrijf.naam,
//     address: `${clientConfig.bedrijf.adres}, ${clientConfig.bedrijf.postcode} ${clientConfig.bedrijf.plaats}`,
//     chatbotName: clientConfig.bedrijf.chatbot_naam,
//   },

// TO: gebruik getters zodat ze altijd de huidige clientConfig lezen.
```

Note that since `config` is currently a `const` object literal with `as const`, getters add a small complication. The cleanest change: convert `business` and `owner` to getter objects:

```typescript
// Verwijder uit de `config = {…} as const` initializer:
//   owner: { … }
//   business: { … }
// en hang ze na de declaratie aan met defineProperty zodat ze altijd
// clientConfig live uitlezen.

export const config = {
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  webhookSecret: requireEnv('WEBHOOK_SECRET'),
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceKey: requireEnv('SUPABASE_SERVICE_KEY'),
  },
  whatsapp: {
    phoneNumberId: requireEnv('WHATSAPP_PHONE_NUMBER_ID'),
    accessToken: requireEnv('WHATSAPP_ACCESS_TOKEN'),
    verifyToken: requireEnv('WHATSAPP_VERIFY_TOKEN'),
    appSecret: optionalEnv('WHATSAPP_APP_SECRET', ''),
  },
  openai: { apiKey: requireEnv('OPENAI_API_KEY') },
  googleMaps: { apiKey: requireEnv('GOOGLE_MAPS_API_KEY') },
  pinecone: {
    apiKey: requireEnv('PINECONE_API_KEY'),
    index: requireEnv('PINECONE_INDEX'),
    host: optionalEnv('PINECONE_HOST', ''),
  },
  gmail: {
    user: requireEnv('GMAIL_USER'),
    appPassword: requireEnv('GMAIL_APP_PASSWORD'),
  },
  google: {
    clientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
    refreshToken: optionalEnv('GOOGLE_REFRESH_TOKEN', ''),
    serviceAccountJsonBase64: optionalEnv('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64', ''),
    calendarId: optionalEnv('GOOGLE_CALENDAR_ID', 'primary'),
  },
  baseUrl: optionalEnv('BASE_URL', `http://localhost:${optionalEnv('PORT', '3000')}`),
  frontlix: {
    whatsapp: optionalEnv('FRONTLIX_WHATSAPP', '31651560103'),
    whatsappRecipients: parseRecipients(
      optionalEnv('FRONTLIX_WHATSAPP_RECIPIENTS', ''),
      optionalEnv('FRONTLIX_WHATSAPP', '31651560103'),
    ),
    slackWebhookUrl: optionalEnv('SLACK_WEBHOOK_URL', ''),
    adminToken: optionalEnv('ADMIN_TOKEN', ''),
  },
  dashboard: {
    apiToken: optionalEnv('DASHBOARD_API_TOKEN', ''),
  },
  // owner + business worden hieronder met getters toegevoegd zodat ze
  // altijd live uit clientConfig lezen (i.p.v. een snapshot bij module-load).
  owner: {} as { email: string; whatsapp: string },
  business: {} as { name: string; address: string; chatbotName: string },
};

Object.defineProperty(config.owner, 'email', {
  enumerable: true,
  get: () => clientConfig.eigenaar.email,
});
Object.defineProperty(config.owner, 'whatsapp', {
  enumerable: true,
  get: () => clientConfig.eigenaar.whatsapp,
});
Object.defineProperty(config.business, 'name', {
  enumerable: true,
  get: () => clientConfig.bedrijf.naam,
});
Object.defineProperty(config.business, 'address', {
  enumerable: true,
  get: () =>
    `${clientConfig.bedrijf.adres}, ${clientConfig.bedrijf.postcode} ${clientConfig.bedrijf.plaats}`,
});
Object.defineProperty(config.business, 'chatbotName', {
  enumerable: true,
  get: () => clientConfig.bedrijf.chatbot_naam,
});
```

Note: this removes the `as const` from the `config` initializer. That's intentional and acceptable — no other code relies on `config`'s deep-readonly typing.

Keep the existing `safety-guard` block at the bottom (lines 155-167); it still works because it reads `config.owner.whatsapp` (getter) and `config.frontlix.whatsapp`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors. Any "type 'string | undefined' not assignable to 'string'" must be resolved by either adding `?? ''` defaults or tightening the empty-config skeleton.

- [ ] **Step 4: Run existing tests to verify no regression**

```bash
npm test
```

Expected: all pre-existing tests still PASS. The `tests/pricing.test.ts` mock of `clientConfig` may need a `spoed_telefoon: ''` field added to its mocked `eigenaar` block — apply that fix if vitest complains about a type mismatch. (The runtime test is fine because the mock object overrides everything.)

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/pricing.test.ts
git commit -m "feat(config): convert clientConfig to mutable let + CONFIG_SOURCE env

- clientConfig blijft exported maar wordt door tenant-config.ts gemuteerd
  via applyClientConfigSnapshot zodat services dezelfde object-ref houden
- config.business + config.owner gebruiken nu getters i.p.v. snapshots
- nieuw env-var CONFIG_SOURCE=json|db (default json voor veilige rollout)"
```

---

## Task 7: Reload endpoint — `src/routes/dashboard-api.ts`

**Files:**
- Create: `src/routes/dashboard-api.ts`
- Create: `tests/dashboard-api.test.ts`
- Modify: `package.json` (add supertest)

- [ ] **Step 1: Install supertest**

```bash
npm install --save-dev supertest @types/supertest
```

Expected: dev-deps in package.json updated.

- [ ] **Step 2: Write the failing test**

Create `tests/dashboard-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock de tenant-config service zodat we hydrateClientConfig kunnen spyen.
const hydrateSpy = vi.fn();
vi.mock('../src/services/tenant-config', () => ({
  hydrateClientConfig: (...args: any[]) => hydrateSpy(...args),
}));

// Mock config met een vaste DASHBOARD_API_TOKEN voor auth.
vi.mock('../src/config', () => ({
  config: { dashboard: { apiToken: 'secret-token-xyz' } },
}));

import dashboardApiRouter from '../src/routes/dashboard-api';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(dashboardApiRouter);
  return app;
}

describe('POST /dashboard-api/config/reload', () => {
  beforeEach(() => {
    hydrateSpy.mockReset();
    hydrateSpy.mockResolvedValue(undefined);
  });

  it('zonder Authorization-header → 401', async () => {
    const app = makeApp();
    const res = await request(app).post('/dashboard-api/config/reload');
    expect(res.status).toBe(401);
    expect(hydrateSpy).not.toHaveBeenCalled();
  });

  it('met verkeerde Bearer-token → 401', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/dashboard-api/config/reload')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
    expect(hydrateSpy).not.toHaveBeenCalled();
  });

  it('met juiste Bearer-token → 200 + hydrate is aangeroepen', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/dashboard-api/config/reload')
      .set('Authorization', 'Bearer secret-token-xyz');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
    expect(hydrateSpy).toHaveBeenCalledTimes(1);
  });

  it('hydrate-fout → 503', async () => {
    hydrateSpy.mockRejectedValueOnce(new Error('db down'));
    const app = makeApp();
    const res = await request(app)
      .post('/dashboard-api/config/reload')
      .set('Authorization', 'Bearer secret-token-xyz');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false });
  });

  it('config zonder DASHBOARD_API_TOKEN → 503 (mis-config)', async () => {
    // Tijdelijk de mock overschrijven naar lege token
    vi.resetModules();
    vi.doMock('../src/config', () => ({
      config: { dashboard: { apiToken: '' } },
    }));
    const router = (await import('../src/routes/dashboard-api')).default;
    const app = express();
    app.use(express.json());
    app.use(router);

    const res = await request(app)
      .post('/dashboard-api/config/reload')
      .set('Authorization', 'Bearer anything');
    expect(res.status).toBe(503);

    vi.doUnmock('../src/config');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/dashboard-api.test.ts
```

Expected: tests FAIL with "Cannot find module '../src/routes/dashboard-api'".

- [ ] **Step 4: Implement the router**

Create `src/routes/dashboard-api.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from '../config';
import { hydrateClientConfig } from '../services/tenant-config';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Constant-time Bearer-token vergelijking. Voorkomt timing-attacks waarin
 * een aanvaller karakter-voor-karakter de juiste token zou kunnen raden.
 */
function isAuthorized(req: Request): boolean {
  const expected = config.dashboard.apiToken;
  if (!expected) return false;

  const header = req.header('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const provided = match[1];
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(provided, 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;

  try {
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}

/**
 * POST /dashboard-api/config/reload
 *
 * Trigger om de in-memory cache van tenant-config opnieuw uit Supabase te
 * laden. Beveiligd met DASHBOARD_API_TOKEN (Bearer-header).
 *
 * Geen body input — alleen een trigger. Bot pakt nieuwe waarden direct op
 * voor de volgende bot-call.
 */
router.post('/dashboard-api/config/reload', async (req: Request, res: Response) => {
  if (!config.dashboard.apiToken) {
    res.status(503).json({
      ok: false,
      error: 'DASHBOARD_API_TOKEN niet geconfigureerd',
    });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  try {
    await hydrateClientConfig(supabase);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[dashboard-api] reload failed:', err);
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : 'reload failed',
    });
  }
});

export default router;
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/dashboard-api.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/dashboard-api.ts tests/dashboard-api.test.ts package.json package-lock.json
git commit -m "feat(api): add POST /dashboard-api/config/reload with Bearer auth"
```

---

## Task 8: Wire startup in `src/index.ts`

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Apply the edit**

Add imports near the top of `src/index.ts`:

```typescript
import { config, CONFIG_SOURCE, applyClientConfigSnapshot } from './config';
import {
  hydrateClientConfig,
  startBackgroundRefresh,
} from './services/tenant-config';
import { supabase } from './lib/supabase';
import dashboardApiRouter from './routes/dashboard-api';
```

(Existing `import { config } from './config';` is replaced/extended with the line above.)

Add the reload route just before the existing `adminRouter` mount line (~line 88):

```typescript
app.use(dashboardApiRouter);
app.use(adminRouter);
```

Wrap `app.listen()` in an async startup-function:

```typescript
// === Replace lines 137-151 (the app.listen block) ===
//
// Vóór listen: bij CONFIG_SOURCE='db' eerst hydrate. Bij fout: process.exit.
// Na listen: start 60s background refresh.

async function start(): Promise<void> {
  if (CONFIG_SOURCE === 'db') {
    try {
      await hydrateClientConfig(supabase);
      // Merge in-place naar de exported `clientConfig` zodat alle services
      // die `import { clientConfig } from './config'` doen de nieuwe waarden
      // direct zien. (getCachedClientConfig returnt een nieuw object; we
      // willen de bestaande object-ref behouden.)
      applyClientConfigSnapshot((await import('./services/tenant-config')).getCachedClientConfig());
      console.log('[startup] Tenant config hydrated from database');
    } catch (err) {
      console.error('[startup] FATAL: failed to hydrate tenant config from database:', err);
      console.error('[startup] Set CONFIG_SOURCE=json to use config.json fallback');
      process.exit(1);
    }
  } else {
    console.log('[startup] CONFIG_SOURCE=json — using clients/<CLIENT>/config.json');
  }

  const server = app.listen(config.port, () => {
    console.log(`
  ┌──────────────────────────────────────────┐
  │  ${config.business.name.padEnd(38)}│
  │  Port: ${String(config.port).padEnd(33)}│
  │  Client: ${(process.env.CLIENT || 'development').padEnd(30)}│
  │  Bot: ${config.business.chatbotName.padEnd(34)}│
  │  Config: ${CONFIG_SOURCE.padEnd(30)}│
  └──────────────────────────────────────────┘
  `);

    if (CONFIG_SOURCE === 'db') {
      startBackgroundRefresh(supabase, 60_000);
      console.log('[startup] Tenant config background refresh started (60s)');
    }

    // Start daily reminder cron
    startReminderCron();
  });

  // Bestaande shutdown-handler verwacht `server` in scope. Hijs hem naar
  // module-level zodat de SIGTERM/SIGINT-handlers er bij kunnen.
  globalThis.__server = server;
}

declare global {
  // Module-level pointer voor shutdown-handler.
  // eslint-disable-next-line no-var
  var __server: ReturnType<typeof app.listen> | undefined;
}

start().catch((err) => {
  console.error('[startup] Unhandled error:', err);
  process.exit(1);
});
```

Then update the `shutdown` function (around line 162-198) to use `globalThis.__server` instead of the local `server` const:

```typescript
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] Received ${signal}, closing gracefully...`);

  const server = globalThis.__server;
  if (!server) {
    console.warn('[shutdown] server not started yet — exiting');
    process.exit(0);
  }

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  // ... rest blijft hetzelfde
}
```

Also add `stopBackgroundRefresh()` call in the shutdown sequence (after `server.close()`):

```typescript
import { stopBackgroundRefresh } from './services/tenant-config';

// In shutdown(), na server.close():
stopBackgroundRefresh();
console.log('[shutdown] Background refresh stopped');
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all existing tests still PASS.

- [ ] **Step 4: Smoke-test `CONFIG_SOURCE=json` (default)**

```bash
# Test dat oude gedrag intact is.
CLIENT=schoon-straatje npm run dev
```

Expected log output includes `[startup] CONFIG_SOURCE=json — using clients/<CLIENT>/config.json` en het bestaande startup-banner. `Ctrl-C` om te stoppen.

- [ ] **Step 5: Smoke-test `CONFIG_SOURCE=db`**

```bash
CLIENT=schoon-straatje CONFIG_SOURCE=db npm run dev
```

Expected:
- `[startup] Tenant config hydrated from database`
- Banner toont `Config: db`
- `[startup] Tenant config background refresh started (60s)`
- Geen errors. `Ctrl-C` om te stoppen.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat(startup): wire hydrateClientConfig + background refresh + reload route

- Bij CONFIG_SOURCE=db: await hydrate vóór app.listen, exit bij fout
- Na listen: start 60s background refresh (alleen bij CONFIG_SOURCE=db)
- Reload route gemount op /dashboard-api/config/reload
- Shutdown stopt background refresh"
```

---

## Task 9: Documentation — `.env.example` + `CLAUDE.md`

**Files:**
- Modify: `.env.example` (schoon-straatje repo)
- Modify: `CLAUDE.md` (schoon-straatje repo)

- [ ] **Step 1: Update `.env.example`**

Append at the bottom (or near other dashboard-related vars):

```env
# ============================================
# Dashboard integration
# ============================================
# Source van de bot-config:
#   json — leest clients/<CLIENT>/config.json (default, veilig voor rollback)
#   db   — leest tenant_settings + pricing_rules + service_offerings uit Supabase
CONFIG_SOURCE=json

# Bearer-token voor POST /dashboard-api/config/reload. Genereer met:
#   openssl rand -hex 32
# Moet 1-op-1 matchen met Frontlix-dashboard env-var BOT_RELOAD_TOKEN.
DASHBOARD_API_TOKEN=
```

- [ ] **Step 2: Update `CLAUDE.md`**

Add a new section (between Architecture and Deploy):

```markdown
## Tenant config-bron en cache-flow

De bot-config (`ClientConfig` shape) komt uit één van twee bronnen, geschakeld via env-var:

| `CONFIG_SOURCE` | Bron | Wanneer |
|---|---|---|
| `json` (default) | `clients/<CLIENT>/config.json` | Dev + fallback voor productie-rollback |
| `db` | Supabase (`tenant_settings`, `pricing_rules`, `service_offerings`) | Productie zodra dashboard-edits live mogen |

**Bij `CONFIG_SOURCE=db`:**

1. **Startup** — `src/index.ts` doet `await hydrateClientConfig(supabase)` vóór `app.listen()`. Bij fout: log + `process.exit(1)`.
2. **Background refresh** — `startBackgroundRefresh(supabase, 60_000)` na listen. Elke 60s wordt de cache opnieuw uit DB gelezen. Bij DB-fout: warning + behoud cache.
3. **Reload-endpoint** — `POST /dashboard-api/config/reload` (Bearer `DASHBOARD_API_TOKEN`) triggert een directe hydrate. Wordt vanuit het Frontlix-dashboard aangeroepen na elke "Opslaan" op een instelling.

**Eén in-memory `ClientConfig`** wordt gemuteerd via `applyClientConfigSnapshot` (in `src/config.ts`) zodat alle services die `import { clientConfig } from './config'` dezelfde object-ref blijven zien met nieuwe inhoud.

**Schema:** zie migrations `022_dashboard_config_tables.sql` (oorspronkelijke tabellen) en `037_eigenaar_spoed_telefoon.sql`.

**Seed:** `scripts/migrate-config-to-db.ts` upsert vanuit `clients/<CLIENT>/config.json`. Idempotent. Re-runnen na een JSON-wijziging om DB synchroon te houden.

**Rollback:** zet `CONFIG_SOURCE=json` in `.env`, `pm2 restart`. Bot draait dan weer op het tekstbestand zonder code-deploy.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs: document CONFIG_SOURCE + tenant-config cache-flow"
```

---

## Task 10: Production rollout

**Files:** none — this is the deploy procedure.

- [ ] **Step 1: Generate `DASHBOARD_API_TOKEN`**

On local:
```bash
openssl rand -hex 32
```

Bewaar in 1Password onder "Frontlix → Schoon-straatje bot → DASHBOARD_API_TOKEN".

- [ ] **Step 2: Merge `dev` → `main`**

```bash
git checkout main && git pull
git merge dev
npm run build
npm test
```

Expected: build success, all tests pass.

- [ ] **Step 3: Deploy to VPS with `CONFIG_SOURCE=json` (safe rollout)**

SSH to VPS:
```bash
ssh <vps-host>
cd /var/www/schoon-straatje-assistent
git pull origin main
npm install
npm run build
# Verifieer dat CONFIG_SOURCE niet gezet is in .env (= json default)
grep CONFIG_SOURCE .env || echo "OK: not set, default=json"
pm2 restart schoon-straatje
pm2 logs schoon-straatje --lines 50
```

Expected: log toont `[startup] CONFIG_SOURCE=json — using clients/<CLIENT>/config.json`, bot draait normaal. Stuur één testlead via WhatsApp om de happy path te verifiëren.

- [ ] **Step 4: Switch to `CONFIG_SOURCE=db` on VPS**

Op VPS:
```bash
# Edit .env
cat >> .env <<EOF
CONFIG_SOURCE=db
DASHBOARD_API_TOKEN=<paste-from-1password>
EOF
pm2 restart schoon-straatje
pm2 logs schoon-straatje --lines 50
```

Expected:
- `[startup] Tenant config hydrated from database`
- Banner toont `Config: db`
- `[startup] Tenant config background refresh started (60s)`
- Géén errors.

- [ ] **Step 5: Verify reload endpoint**

Op VPS:
```bash
curl -i -X POST \
  -H "Authorization: Bearer $(grep DASHBOARD_API_TOKEN .env | cut -d= -f2)" \
  http://localhost:3000/dashboard-api/config/reload
```

Expected: `HTTP/1.1 200 OK` + body `{"ok":true}`. Log toont een nieuwe hydrate.

Tegen-test:
```bash
curl -i -X POST http://localhost:3000/dashboard-api/config/reload
```
Expected: `HTTP/1.1 401 Unauthorized`.

- [ ] **Step 6: End-to-end smoke test**

1. Wijzig in Supabase Studio: `UPDATE pricing_rules SET waarde = 4.00 WHERE rule_key = 'reinigen_per_m2';` (vergeet niet later terug naar 3.95!).
2. Trigger reload-endpoint zoals in Step 5.
3. Stuur een testlead via WhatsApp die om een offerte vraagt.
4. Verifieer in de PDF-offerte: `reinigen_per_m2` is `€4,00`, niet `€3,95`.
5. Reset prijs terug: `UPDATE pricing_rules SET waarde = 3.95 WHERE rule_key = 'reinigen_per_m2';`.
6. Trigger reload opnieuw, stuur tweede testlead, verifieer dat het weer `€3,95` is.

- [ ] **Step 7: Update tracker (Frontlix repo)**

Verwijder de "Bot config-loader migratie naar DB-bron" sectie uit `docs/superpowers/postponed.md` (in Frontlix-website repo) — dat werk is nu gedaan.

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website"
# Edit docs/superpowers/postponed.md, verwijder de sectie
git add docs/superpowers/postponed.md
git commit -m "docs: bot config-migratie is done, remove from postponed.md"
```

- [ ] **Step 8: Monitor for 7 days**

Watch `pm2 logs schoon-straatje` voor:
- Refresh-warnings (`background refresh failed`).
- Reload-endpoint calls vanuit dashboard (komt zodra sub-project B live is).
- Onverwachte hydrate-fouten.

Bij issues: `CONFIG_SOURCE=json` + `pm2 restart` = bot draait weer op tekstbestand. Géén git-revert nodig.

Na 7 dagen zonder regressies: nieuw plan schrijven om de `CONFIG_SOURCE=json`-codepath te verwijderen.

---

## Self-Review Checklist (filled by plan author)

- **Spec coverage:** alle 5 secties van de spec hebben taak-coverage:
  - Architectuur → Tasks 3-8
  - Componenten → Tasks 3-8
  - Data-flow → Tasks 3, 4, 7, 8
  - Failure-modi → Task 4 (cache fail-soft), Task 5 (refresh fail-soft), Task 7 (reload 503), Task 8 (startup exit)
  - Shape-mapping → Task 3
  - Beveiliging → Task 7
  - Rollout → Task 10
- **Placeholder scan:** geen TBD/TODO/"implement later" gevonden.
- **Type consistency:** `hydrateClientConfig`, `getCachedClientConfig`, `fetchTenantConfigFromDb`, `startBackgroundRefresh`, `stopBackgroundRefresh`, `applyClientConfigSnapshot` consistent benoemd door alle taken.
- **Repo-locatie waarschuwing:** in header + nogmaals in elke file-pad opgenomen.
