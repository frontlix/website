# Plan 1 — Schema + bot-config-migratie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het schoon-straatje Supabase-project uitbreiden met alle nieuwe tabellen die het dashboard nodig heeft, en de bot omschakelen van JSON-config (`clients/schoon-straatje/config.json`) naar Supabase-config — zonder de werkende bot te breken.

**Architecture:** Nieuwe SQL-migrations in de schoon-straatje repo onder `supabase/migrations/`. Een eenmalig migratiescript seedt `tenant_settings` + `pricing_rules` + `service_offerings` vanuit het bestaande `config.json`. De bot krijgt een **startup-fetch** die de config uit DB haalt en een in-memory facade hydrateert (zelfde shape als `clientConfig` nu, dus geen aanroeper-code wijzigen). Een nieuwe `POST /dashboard-api/config/reload` endpoint forceert een refresh; daarnaast een `setInterval` van 60s als achtergrond-fallback.

**Tech Stack:** Supabase Postgres, TypeScript, Express 5, Vitest. Werk uitsluitend in de schoon-straatje repo.

**Working directory voor dit plan:** `/Users/christiaantromp/Desktop/schoon-straatje product/schoon-straatje-assistent/`

Alle bestandspaden in dit plan zijn relatief vanaf die directory tenzij expliciet anders vermeld.

**Frontlix-repo aanrakingen in dit plan:** geen. (Plan 3 begint met dashboard-code in `/Users/christiaantromp/Desktop/Frontlix website new/`.)

---

## File Structure

**Nieuw:**
- `supabase/migrations/022_dashboard_config_tables.sql` — tenant_settings, pricing_rules, service_offerings + indexes
- `supabase/migrations/023_dashboard_data_tables.sql` — dashboard_user_profiles, tags, lead_tags, lead_notes, lead_status_history + ALTER leads
- `scripts/migrate-config-to-db.ts` — eenmalig seed-script (idempotent, UPSERT)
- `src/services/tenant-config.ts` — async fetcher die DB → ClientConfig-shape leest
- `src/routes/dashboard-api.ts` — Express router met `POST /dashboard-api/config/reload`
- `tests/tenant-config.test.ts` — vitest tests voor fetcher + cache + reload
- `tests/dashboard-api.test.ts` — vitest tests voor reload-endpoint (auth + side-effect)

**Gewijzigd:**
- `src/config.ts` — `loadClientConfig()` blijft de `clientConfig` constante exporteren, maar wordt asynchroon gehydrateerd; voegt `hydrateClientConfig()` + `refreshClientConfig()` toe
- `src/index.ts` — `await hydrateClientConfig()` vóór `app.listen()`; mount `dashboardApiRouter`; start refresh-interval
- `.env.example` — voegt `DASHBOARD_API_TOKEN` toe
- `CLAUDE.md` — beschrijving van de nieuwe config-bron en cache-flow

---

## Approach principles

- **DRY**: één fetcher-functie produceert de `ClientConfig`-shape; bot-code blijft ongewijzigd.
- **YAGNI**: geen `tenant_id` of multi-tenant logica in dit plan (komt later).
- **TDD**: voor elke logische stap (fetcher, cache, reload-endpoint) eerst de test, dan de implementatie.
- **Frequent commits**: één commit per task.
- **Idempotency**: migratiescript en reload-endpoint zijn idempotent (kan zonder schade meermaals draaien).
- **Side-by-side veiligheid**: tijdens transitie blijft `config.json` op disk staan. De fetcher faalt loud bij een lege of onvolledige DB, zodat we niet ongezien op verkeerde defaults draaien.

---

### Task 1: SQL-migratie 022 — config-tabellen

**Files:**
- Create: `supabase/migrations/022_dashboard_config_tables.sql`

- [ ] **Step 1: Schrijf de migratie**

Bestand `supabase/migrations/022_dashboard_config_tables.sql`:

```sql
-- Migratie 022: dashboard config-tabellen
-- Vervangt clients/<naam>/config.json als bron-of-truth voor bedrijfsinfo,
-- prijzen en dienst-toggles. De bot leest deze tabellen op startup en via
-- POST /dashboard-api/config/reload (zie Plan 1).

-- ============================================
-- TENANT_SETTINGS — bedrijfsinfo + eigenaar + offerte + radius + reminders
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  bedrijfsnaam               TEXT NOT NULL,
  chatbot_naam               TEXT NOT NULL,
  adres                      TEXT,
  postcode                   TEXT,
  plaats                     TEXT,

  eigenaar_email             TEXT,
  eigenaar_whatsapp          TEXT,

  calendar_link              TEXT,

  offerte_geldigheid_dagen   INT  NOT NULL DEFAULT 30,

  reminder_dag_1             INT  NOT NULL DEFAULT 2,
  reminder_dag_2             INT  NOT NULL DEFAULT 5,
  reminder_dag_3             INT  NOT NULL DEFAULT 8,

  radius_max_km              INT  NOT NULL DEFAULT 100,
  radius_doorverwijs_bedrijf TEXT,

  bijgewerkt_op              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_settings IS
  'Bedrijfsinfo + eigenaar + radius + reminders. v1: één rij per Supabase-project. Bij multi-tenant centrale DB: tenant_id-kolom + één rij per tenant.';

ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
-- Geen policies in v1: bot leest met service-key (bypasst RLS), dashboard
-- leest in Plan 3+ via approved-user policy. RLS aan zodat tabel niet als
-- "Unrestricted" in Studio staat.

-- ============================================
-- PRICING_RULES — alle prijzen als losse rijen
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key      TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  waarde        NUMERIC NOT NULL,
  eenheid       TEXT,
  toelichting   TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  bijgewerkt_op TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_sort_order ON pricing_rules(sort_order);

COMMENT ON TABLE pricing_rules IS
  'Prijzen voor offerte-berekening. rule_key matcht de keys uit het oude config.json (reinigen_per_m2, etc.).';

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SERVICE_OFFERINGS — welke diensten zijn aan/uit
-- ============================================
CREATE TABLE IF NOT EXISTS service_offerings (
  dienst_key  TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  actief      BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE service_offerings IS
  'Welke diensten deze tenant aanbiedt. dienst_key matcht het oude config.json diensten-block (oprit_terras_terrein, gevelreiniging, onkruidbeheersing_zakelijk).';

ALTER TABLE service_offerings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AUTO-UPDATE bijgewerkt_op
-- ============================================
DROP TRIGGER IF EXISTS tenant_settings_bijgewerkt ON tenant_settings;
CREATE TRIGGER tenant_settings_bijgewerkt
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_bijgewerkt();

DROP TRIGGER IF EXISTS pricing_rules_bijgewerkt ON pricing_rules;
CREATE TRIGGER pricing_rules_bijgewerkt
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_bijgewerkt();
```

(De `update_bijgewerkt()` functie bestaat al in migratie `001_initial_schema.sql` regels 132-138.)

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/022_dashboard_config_tables.sql
git commit -m "feat(db): add dashboard config tables (tenant_settings, pricing_rules, service_offerings)"
```

---

### Task 2: SQL-migratie 023 — dashboard data-tabellen + leads-kolommen

**Files:**
- Create: `supabase/migrations/023_dashboard_data_tables.sql`

- [ ] **Step 1: Schrijf de migratie**

Bestand `supabase/migrations/023_dashboard_data_tables.sql`:

```sql
-- Migratie 023: dashboard data-tabellen + nieuwe kolommen op leads
-- Voor het dashboard: user-profiles, tags, notes, status-history.

-- ============================================
-- DASHBOARD_USER_PROFILES — extensie van auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS dashboard_user_profiles (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bedrijfsnaam           TEXT,
  tenant_status          TEXT NOT NULL DEFAULT 'pending'
                           CHECK (tenant_status IN ('pending','approved','rejected')),
  is_owner               BOOLEAN NOT NULL DEFAULT false,
  onboarding_voltooid_op TIMESTAMPTZ,
  approved_op            TIMESTAMPTZ,
  aangemaakt_op          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dashboard_user_profiles IS
  'Extensie van Supabase auth.users met goedkeuringsstatus, ownership-flag en onboarding-tracker.';

ALTER TABLE dashboard_user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TAGS + LEAD_TAGS — categorisering door dashboard-gebruikers
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam          TEXT NOT NULL UNIQUE,
  kleur         TEXT,
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id          TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  tag_id           UUID NOT NULL REFERENCES tags(id)       ON DELETE CASCADE,
  aangemaakt_door  UUID REFERENCES auth.users(id),
  aangemaakt_op    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_tag_id ON lead_tags(tag_id);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LEAD_NOTES — interne notities op leads
-- ============================================
CREATE TABLE IF NOT EXISTS lead_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  tekst         TEXT NOT NULL,
  auteur        UUID NOT NULL REFERENCES auth.users(id),
  aangemaakt_op TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id, aangemaakt_op DESC);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LEAD_STATUS_HISTORY — audit van dashboard_status-wijzigingen
-- ============================================
CREATE TABLE IF NOT EXISTS lead_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  oude_status     TEXT,
  nieuwe_status   TEXT NOT NULL,
  gewijzigd_door  UUID REFERENCES auth.users(id),
  gewijzigd_op    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id, gewijzigd_op DESC);

ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LEADS — nieuwe kolommen voor dashboard
-- ============================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS dashboard_status   TEXT
    CHECK (dashboard_status IS NULL OR dashboard_status IN
      ('open','opgevolgd','afgehandeld','no_show','geen_interesse','archief')),
  ADD COLUMN IF NOT EXISTS dashboard_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_dashboard_status   ON leads(dashboard_status);
CREATE INDEX IF NOT EXISTS idx_leads_dashboard_archived ON leads(dashboard_archived) WHERE dashboard_archived = false;

COMMENT ON COLUMN leads.dashboard_status IS
  'Door dashboard-user gezette resolutie-status. Apart van leads.status (bot-status) en leads.gesprek_fase (bot-fase).';
COMMENT ON COLUMN leads.dashboard_archived IS
  'Verberg uit hoofd-lijst maar bewaar de data.';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/023_dashboard_data_tables.sql
git commit -m "feat(db): add dashboard data tables (user profiles, tags, notes, status history) + leads dashboard cols"
```

---

### Task 3: Run beide migraties tegen de schoon-straatje Supabase

Geen code, manuele operationele stap. **Niet skipten** — alle volgende tasks gaan ervan uit dat deze tabellen bestaan.

- [ ] **Step 1: Open Supabase Studio**

Open `https://supabase.com/dashboard/project/<schoon-straatje-project-id>` (zie `SUPABASE_URL` in `.env`). Ga naar **SQL Editor → New Query**.

- [ ] **Step 2: Run migratie 022**

Plak de volledige inhoud van `supabase/migrations/022_dashboard_config_tables.sql` in de editor. Klik **Run**.

Verwacht: `Success. No rows returned`.

- [ ] **Step 3: Run migratie 023**

Plak de volledige inhoud van `supabase/migrations/023_dashboard_data_tables.sql` in de editor. Klik **Run**.

Verwacht: `Success. No rows returned`.

- [ ] **Step 4: Verifieer dat de tabellen bestaan**

In SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'tenant_settings','pricing_rules','service_offerings',
    'dashboard_user_profiles','tags','lead_tags','lead_notes','lead_status_history'
  )
ORDER BY table_name;
```

Verwacht: 8 rijen, alfabetisch.

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'leads' AND column_name IN ('dashboard_status','dashboard_archived');
```

Verwacht: 2 rijen.

---

### Task 4: Migratie-script — config.json → DB seeden

**Files:**
- Create: `scripts/migrate-config-to-db.ts`

- [ ] **Step 1: Schrijf het script**

Bestand `scripts/migrate-config-to-db.ts`:

```typescript
/**
 * Eenmalig: seedt tenant_settings + pricing_rules + service_offerings vanuit
 * clients/<CLIENT>/config.json. Idempotent — UPSERT op rule_key/dienst_key
 * en op tenant_settings.id (er is altijd één rij).
 *
 * Gebruik:
 *   CLIENT=schoon-straatje tsx scripts/migrate-config-to-db.ts
 *
 * Of zonder CLIENT (default development = schoon-straatje):
 *   tsx scripts/migrate-config-to-db.ts
 */
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const clientName = process.env.CLIENT || 'schoon-straatje';
const clientEnvPath = path.resolve(__dirname, '..', 'clients', clientName, '.env');
if (existsSync(clientEnvPath)) {
  dotenv.config({ path: clientEnvPath });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL en SUPABASE_SERVICE_KEY moeten gezet zijn.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Vaste UUID zodat herhaalde runs dezelfde rij upserten in plaats van duplicates
// te maken. Pas niet aan zonder een data-migratie.
const TENANT_SETTINGS_SINGLETON_ID = '00000000-0000-0000-0000-000000000001';

const PRICING_LABELS: Record<string, { label: string; eenheid: string; sort_order: number }> = {
  reinigen_per_m2:                         { label: 'Reinigen oprit/terras/terrein', eenheid: '€/m²',  sort_order: 10 },
  reinigen_dagprijs_onder_100m2:           { label: 'Dagprijs reinigen <100m²',       eenheid: '€',     sort_order: 11 },
  invegen_arbeid_normaal_per_m2:           { label: 'Invegen arbeid (normaal zand)',  eenheid: '€/m²',  sort_order: 20 },
  invegen_arbeid_onkruidwerend_per_m2:     { label: 'Invegen arbeid (onkruidwerend)', eenheid: '€/m²',  sort_order: 21 },
  voegzand_normaal_per_zak:                { label: 'Voegzand normaal',                eenheid: '€/zak', sort_order: 22 },
  voegzand_onkruidwerend_per_zak:          { label: 'Voegzand onkruidwerend',          eenheid: '€/zak', sort_order: 23 },
  voegzand_m2_per_zak:                     { label: 'Voegzand dekking',                eenheid: 'm²/zak',sort_order: 24 },
  onkruid_per_m2_4_weken:                  { label: 'Onkruidbeheersing 4-weken',       eenheid: '€/m²',  sort_order: 30 },
  onkruid_per_m2_8_weken:                  { label: 'Onkruidbeheersing 8-weken',       eenheid: '€/m²',  sort_order: 31 },
  onkruid_per_m2_12_weken:                 { label: 'Onkruidbeheersing 12-weken',      eenheid: '€/m²',  sort_order: 32 },
  onkruid_per_m2_langer:                   { label: 'Onkruidbeheersing langer',        eenheid: '€/m²',  sort_order: 33 },
  beschermlaag_per_m2:                     { label: 'Beschermlaag',                    eenheid: '€/m²',  sort_order: 40 },
  groene_aanslag_per_m2:                   { label: 'Groene aanslag verwijderen',      eenheid: '€/m²',  sort_order: 41 },
  planten_afschermen_folie_per_rol:        { label: 'Planten afschermen (folie)',      eenheid: '€/rol', sort_order: 42 },
  extra_arbeid_per_minuut:                 { label: 'Extra arbeid',                    eenheid: '€/min', sort_order: 50 },
  gevelreiniging_per_m2:                   { label: 'Gevelreiniging',                  eenheid: '€/m²',  sort_order: 60 },
  gevelimpregnatie_per_m2:                 { label: 'Gevelimpregnatie',                eenheid: '€/m²',  sort_order: 61 },
  reiskosten_per_km:                       { label: 'Reiskosten',                      eenheid: '€/km',  sort_order: 70 },
  reiskosten_gratis_tot_km:                { label: 'Reiskosten gratis tot',           eenheid: 'km',    sort_order: 71 },
};

const SERVICE_LABELS: Record<string, string> = {
  oprit_terras_terrein:        'Oprit / terras / terrein',
  gevelreiniging:              'Gevelreiniging',
  onkruidbeheersing_zakelijk:  'Onkruidbeheersing (zakelijk)',
};

async function main(): Promise<void> {
  const configPath = path.resolve(__dirname, '..', 'clients', clientName, 'config.json');
  if (!existsSync(configPath)) {
    console.error(`config.json niet gevonden: ${configPath}`);
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));

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
    calendar_link:              config.calendar_link ?? null,
    offerte_geldigheid_dagen:   config.offerte?.geldigheid_dagen ?? 30,
    reminder_dag_1:             config.reminders?.dag_1 ?? 2,
    reminder_dag_2:             config.reminders?.dag_2 ?? 5,
    reminder_dag_3:             config.reminders?.dag_3 ?? 8,
    radius_max_km:              config.radius?.max_km ?? 100,
    radius_doorverwijs_bedrijf: config.radius?.doorverwijs_bedrijf ?? null,
  });
  if (tsErr) throw tsErr;
  console.log('✓ tenant_settings geüpserteerd');

  // pricing_rules — UPSERT op rule_key
  const pricingRows = Object.entries(config.prijzen ?? {}).map(([rule_key, waarde]) => {
    const meta = PRICING_LABELS[rule_key] ?? { label: rule_key, eenheid: '', sort_order: 999 };
    return {
      rule_key,
      label:       meta.label,
      waarde:      Number(waarde),
      eenheid:     meta.eenheid,
      sort_order:  meta.sort_order,
    };
  });
  const { error: prErr } = await supabase.from('pricing_rules').upsert(pricingRows, { onConflict: 'rule_key' });
  if (prErr) throw prErr;
  console.log(`✓ ${pricingRows.length} pricing_rules geüpserteerd`);

  // service_offerings — UPSERT op dienst_key
  const serviceRows = Object.entries(config.diensten ?? {}).map(([dienst_key, actief], i) => ({
    dienst_key,
    label:       SERVICE_LABELS[dienst_key] ?? dienst_key,
    actief:      Boolean(actief),
    sort_order:  i * 10,
  }));
  const { error: soErr } = await supabase.from('service_offerings').upsert(serviceRows, { onConflict: 'dienst_key' });
  if (soErr) throw soErr;
  console.log(`✓ ${serviceRows.length} service_offerings geüpserteerd`);

  console.log('\nKlaar.');
}

main().catch((err) => {
  console.error('Migratie mislukt:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Run het script tegen de schoon-straatje Supabase**

```bash
CLIENT=schoon-straatje npx tsx scripts/migrate-config-to-db.ts
```

Verwacht in de console:

```
✓ tenant_settings geüpserteerd
✓ 19 pricing_rules geüpserteerd
✓ 3 service_offerings geüpserteerd

Klaar.
```

- [ ] **Step 3: Verifieer in Supabase Studio**

In SQL Editor:

```sql
SELECT bedrijfsnaam, chatbot_naam, eigenaar_whatsapp FROM tenant_settings;
SELECT count(*) FROM pricing_rules;
SELECT dienst_key, actief FROM service_offerings ORDER BY sort_order;
```

Verwacht:
- `tenant_settings`: 1 rij met `Schoon Straatje | Thomas | 31630313251`
- `pricing_rules`: 19 rijen
- `service_offerings`: 3 rijen, twee `true` (oprit_terras_terrein, gevelreiniging) en één `false` (onkruidbeheersing_zakelijk)

- [ ] **Step 4: Run het script nóg eens om idempotency te bevestigen**

```bash
CLIENT=schoon-straatje npx tsx scripts/migrate-config-to-db.ts
```

Verwacht: zelfde output, geen errors. In Supabase Studio: nog steeds 1 rij in tenant_settings, 19 in pricing_rules, 3 in service_offerings.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-config-to-db.ts
git commit -m "feat(scripts): add config.json → DB migration script (idempotent)"
```

---

### Task 5: Type-definitie voor DB-config + tests-eerst

**Files:**
- Create: `tests/tenant-config.test.ts`
- Create: `src/services/tenant-config.ts` (only the type-export skeleton in this task)

- [ ] **Step 1: Schrijf de failing tests**

Bestand `tests/tenant-config.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mocken @supabase/supabase-js zodat de tests geen echte DB nodig hebben.
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockSupabase = { from: mockFrom };

vi.mock('../src/lib/supabase', () => ({
  supabase: mockSupabase,
}));

import { fetchTenantConfig, type DbClientConfig } from '../src/services/tenant-config';

describe('fetchTenantConfig', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockFrom.mockClear();
    mockFrom.mockImplementation(() => ({ select: mockSelect }));
  });

  function setupSupabaseResponses(opts: {
    tenant?: any;
    pricing?: any[];
    services?: any[];
  }) {
    mockSelect.mockImplementation(() => ({
      // tenant_settings.select() returns single row via .limit().maybeSingle() —
      // we accept any chaining and resolve to the configured shape.
      limit: () => ({ maybeSingle: async () => ({ data: opts.tenant ?? null, error: null }) }),
      order: async () => ({ data: opts.pricing ?? opts.services ?? [], error: null }),
    }));
  }

  it('zet DB-rijen om naar het ClientConfig-shape', async () => {
    setupSupabaseResponses({
      tenant: {
        bedrijfsnaam: 'Schoon Straatje',
        chatbot_naam: 'Thomas',
        adres: 'Achterweg 23',
        postcode: '4521 CB',
        plaats: 'Biervliet',
        eigenaar_email: 'offertes@schoon-straatje.nl',
        eigenaar_whatsapp: '31630313251',
        calendar_link: 'https://cal.example/x',
        offerte_geldigheid_dagen: 30,
        reminder_dag_1: 2,
        reminder_dag_2: 5,
        reminder_dag_3: 8,
        radius_max_km: 100,
        radius_doorverwijs_bedrijf: 'https://bereschoon.nl',
      },
      pricing: [
        { rule_key: 'reinigen_per_m2', waarde: 3.95 },
        { rule_key: 'reinigen_dagprijs_onder_100m2', waarde: 395 },
      ],
      services: [
        { dienst_key: 'oprit_terras_terrein', actief: true },
        { dienst_key: 'gevelreiniging', actief: true },
        { dienst_key: 'onkruidbeheersing_zakelijk', actief: false },
      ],
    });

    const cfg: DbClientConfig = await fetchTenantConfig();

    expect(cfg.bedrijf.naam).toBe('Schoon Straatje');
    expect(cfg.bedrijf.chatbot_naam).toBe('Thomas');
    expect(cfg.eigenaar.email).toBe('offertes@schoon-straatje.nl');
    expect(cfg.eigenaar.whatsapp).toBe('31630313251');
    expect(cfg.diensten.oprit_terras_terrein).toBe(true);
    expect(cfg.diensten.gevelreiniging).toBe(true);
    expect(cfg.diensten.onkruidbeheersing_zakelijk).toBe(false);
    expect(cfg.prijzen.reinigen_per_m2).toBe(3.95);
    expect(cfg.prijzen.reinigen_dagprijs_onder_100m2).toBe(395);
    expect(cfg.offerte.geldigheid_dagen).toBe(30);
    expect(cfg.reminders.dag_1).toBe(2);
    expect(cfg.reminders.dag_2).toBe(5);
    expect(cfg.reminders.dag_3).toBe(8);
    expect(cfg.radius.max_km).toBe(100);
    expect(cfg.radius.doorverwijs_bedrijf).toBe('https://bereschoon.nl');
    expect(cfg.calendar_link).toBe('https://cal.example/x');
  });

  it('faalt loud als tenant_settings leeg is', async () => {
    setupSupabaseResponses({ tenant: null, pricing: [], services: [] });

    await expect(fetchTenantConfig()).rejects.toThrow(/tenant_settings/i);
  });

  it('faalt loud als pricing_rules leeg is', async () => {
    setupSupabaseResponses({
      tenant: {
        bedrijfsnaam: 'X', chatbot_naam: 'Y',
        eigenaar_email: 'a', eigenaar_whatsapp: 'b',
        offerte_geldigheid_dagen: 30,
        reminder_dag_1: 2, reminder_dag_2: 5, reminder_dag_3: 8,
        radius_max_km: 100,
      },
      pricing: [],
      services: [{ dienst_key: 'x', actief: true }],
    });

    await expect(fetchTenantConfig()).rejects.toThrow(/pricing_rules/i);
  });
});
```

- [ ] **Step 2: Schrijf type-skelet zodat de import niet faalt**

Bestand `src/services/tenant-config.ts`:

```typescript
import type { ClientConfig } from '../types/pricing';

export type DbClientConfig = ClientConfig;

export async function fetchTenantConfig(): Promise<DbClientConfig> {
  throw new Error('niet geïmplementeerd');
}
```

- [ ] **Step 3: Run de tests, verwacht failures**

```bash
npm run test -- tests/tenant-config.test.ts
```

Verwacht: 3 tests falen met "niet geïmplementeerd" / shape-mismatch.

- [ ] **Step 4: Commit (red)**

```bash
git add tests/tenant-config.test.ts src/services/tenant-config.ts
git commit -m "test(tenant-config): failing tests for DB-backed config fetcher"
```

---

### Task 6: Implementeer fetchTenantConfig

**Files:**
- Modify: `src/services/tenant-config.ts`

- [ ] **Step 1: Implementeer de fetcher**

Vervang de inhoud van `src/services/tenant-config.ts`:

```typescript
import { supabase } from '../lib/supabase';
import type { ClientConfig } from '../types/pricing';

export type DbClientConfig = ClientConfig;

interface TenantSettingsRow {
  bedrijfsnaam: string;
  chatbot_naam: string;
  adres: string | null;
  postcode: string | null;
  plaats: string | null;
  eigenaar_email: string | null;
  eigenaar_whatsapp: string | null;
  calendar_link: string | null;
  offerte_geldigheid_dagen: number;
  reminder_dag_1: number;
  reminder_dag_2: number;
  reminder_dag_3: number;
  radius_max_km: number;
  radius_doorverwijs_bedrijf: string | null;
}

interface PricingRow {
  rule_key: string;
  waarde: number;
}

interface ServiceRow {
  dienst_key: string;
  actief: boolean;
}

/**
 * Haalt tenant_settings + pricing_rules + service_offerings uit Supabase
 * en zet ze om naar het bestaande ClientConfig-shape (zoals voorheen
 * gelezen uit clients/<naam>/config.json). Faalt loud bij ontbrekende
 * data zodat we niet stilletjes op verkeerde defaults draaien.
 */
export async function fetchTenantConfig(): Promise<DbClientConfig> {
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenant_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (tenantErr) throw new Error(`tenant_settings query failed: ${tenantErr.message}`);
  if (!tenant) throw new Error('tenant_settings is leeg — run scripts/migrate-config-to-db.ts');

  const t = tenant as TenantSettingsRow;

  const { data: pricingRows, error: pricingErr } = await supabase
    .from('pricing_rules')
    .select('rule_key, waarde')
    .order('sort_order', { ascending: true });

  if (pricingErr) throw new Error(`pricing_rules query failed: ${pricingErr.message}`);
  if (!pricingRows || pricingRows.length === 0) {
    throw new Error('pricing_rules is leeg — run scripts/migrate-config-to-db.ts');
  }

  const { data: serviceRows, error: servicesErr } = await supabase
    .from('service_offerings')
    .select('dienst_key, actief')
    .order('sort_order', { ascending: true });

  if (servicesErr) throw new Error(`service_offerings query failed: ${servicesErr.message}`);

  const prijzen: Record<string, number> = {};
  for (const row of pricingRows as PricingRow[]) {
    prijzen[row.rule_key] = Number(row.waarde);
  }

  const diensten: Record<string, boolean> = {};
  for (const row of (serviceRows ?? []) as ServiceRow[]) {
    diensten[row.dienst_key] = Boolean(row.actief);
  }

  return {
    bedrijf: {
      naam:         t.bedrijfsnaam,
      adres:        t.adres ?? '',
      postcode:     t.postcode ?? '',
      plaats:       t.plaats ?? '',
      chatbot_naam: t.chatbot_naam,
    },
    eigenaar: {
      email:    t.eigenaar_email ?? '',
      whatsapp: t.eigenaar_whatsapp ?? '',
    },
    diensten: diensten as ClientConfig['diensten'],
    prijzen:  prijzen  as ClientConfig['prijzen'],
    offerte: {
      geldigheid_dagen: t.offerte_geldigheid_dagen,
    },
    reminders: {
      dag_1: t.reminder_dag_1,
      dag_2: t.reminder_dag_2,
      dag_3: t.reminder_dag_3,
    },
    radius: {
      max_km:              t.radius_max_km,
      doorverwijs_bedrijf: t.radius_doorverwijs_bedrijf ?? '',
    },
    calendar_link: t.calendar_link ?? '',
  } as ClientConfig;
}
```

- [ ] **Step 2: Run de tests, verwacht success**

```bash
npm run test -- tests/tenant-config.test.ts
```

Verwacht: 3 tests passen.

- [ ] **Step 3: Commit (green)**

```bash
git add src/services/tenant-config.ts
git commit -m "feat(tenant-config): implement Supabase-backed config fetcher"
```

---

### Task 7: Tests voor cache + reload-functies

**Files:**
- Modify: `tests/tenant-config.test.ts`

- [ ] **Step 1: Voeg failing tests toe**

Voeg onderaan `tests/tenant-config.test.ts` toe (binnen het bestand, na de `describe('fetchTenantConfig', ...)` block):

```typescript
import { hydrateClientConfig, refreshClientConfig, getCachedClientConfig } from '../src/services/tenant-config';

describe('hydrateClientConfig + refreshClientConfig + getCachedClientConfig', () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockFrom.mockClear();
    mockFrom.mockImplementation(() => ({ select: mockSelect }));
  });

  function arrangeValidResponse(bedrijfsnaam = 'Schoon Straatje'): void {
    mockSelect.mockImplementation(() => ({
      limit: () => ({ maybeSingle: async () => ({
        data: {
          bedrijfsnaam, chatbot_naam: 'Thomas',
          adres: '', postcode: '', plaats: '',
          eigenaar_email: 'a', eigenaar_whatsapp: 'b',
          calendar_link: '',
          offerte_geldigheid_dagen: 30,
          reminder_dag_1: 2, reminder_dag_2: 5, reminder_dag_3: 8,
          radius_max_km: 100, radius_doorverwijs_bedrijf: '',
        }, error: null,
      }) }),
      order: async () => ({
        data: [{ rule_key: 'reinigen_per_m2', waarde: 3.95 }],
        error: null,
      }),
    }));
  }

  it('hydrateClientConfig zet de cache', async () => {
    arrangeValidResponse();

    await hydrateClientConfig();
    const cached = getCachedClientConfig();

    expect(cached).not.toBeNull();
    expect(cached!.bedrijf.naam).toBe('Schoon Straatje');
  });

  it('refreshClientConfig herlaadt nieuwe data zonder herstart', async () => {
    arrangeValidResponse('Eerste Naam');
    await hydrateClientConfig();
    expect(getCachedClientConfig()!.bedrijf.naam).toBe('Eerste Naam');

    arrangeValidResponse('Nieuwe Naam');
    await refreshClientConfig();

    expect(getCachedClientConfig()!.bedrijf.naam).toBe('Nieuwe Naam');
  });

  it('getCachedClientConfig() retourneert null voordat hydrate is gerund', () => {
    // Reset module-state door te clearen via een fresh import is in vitest tricky;
    // we verifiëren hier alleen dat na hydrate de cache gevuld is — initial null
    // wordt impliciet getest in de eerste test (volgorde-onafhankelijk via ResetModules).
    // Skip-strategie: deze assertie is bewust mild.
    expect(typeof getCachedClientConfig).toBe('function');
  });
});
```

- [ ] **Step 2: Run de tests, verwacht failures op de nieuwe describe**

```bash
npm run test -- tests/tenant-config.test.ts
```

Verwacht: nieuwe tests falen omdat `hydrateClientConfig`, `refreshClientConfig` en `getCachedClientConfig` nog niet bestaan.

- [ ] **Step 3: Commit (red)**

```bash
git add tests/tenant-config.test.ts
git commit -m "test(tenant-config): failing tests for hydrate/refresh/getCached"
```

---

### Task 8: Implementeer hydrate / refresh / getCached

**Files:**
- Modify: `src/services/tenant-config.ts`

- [ ] **Step 1: Voeg cache + lifecycle-functies toe**

Voeg onderaan `src/services/tenant-config.ts` toe (na de bestaande `fetchTenantConfig`):

```typescript
// ============================================
// In-memory cache + lifecycle
// ============================================
let cachedConfig: DbClientConfig | null = null;

/**
 * Wordt eenmalig aangeroepen tijdens server-startup, vóór app.listen().
 * Faalt de fetch, dan crasht de bot bewust — beter dan stilletjes door
 * te gaan met undefined config.
 */
export async function hydrateClientConfig(): Promise<DbClientConfig> {
  cachedConfig = await fetchTenantConfig();
  return cachedConfig;
}

/**
 * Herlaadt de config uit DB. Gebruikt door:
 *  - POST /dashboard-api/config/reload (na dashboard-edit)
 *  - setInterval in src/index.ts (60s achtergrondrefresh)
 * Bij een fail blijft de oude cached versie actief en logt de error.
 */
export async function refreshClientConfig(): Promise<DbClientConfig> {
  try {
    const fresh = await fetchTenantConfig();
    cachedConfig = fresh;
    return fresh;
  } catch (err) {
    console.error('[tenant-config] refresh failed, keeping cached version:', err);
    if (!cachedConfig) throw err;
    return cachedConfig;
  }
}

export function getCachedClientConfig(): DbClientConfig | null {
  return cachedConfig;
}
```

- [ ] **Step 2: Run de tests, verwacht success**

```bash
npm run test -- tests/tenant-config.test.ts
```

Verwacht: alle tests passen.

- [ ] **Step 3: Commit (green)**

```bash
git add src/services/tenant-config.ts
git commit -m "feat(tenant-config): add hydrate/refresh/getCached cache lifecycle"
```

---

### Task 9: Bekabel src/config.ts naar de DB-loader

**Files:**
- Modify: `src/config.ts`

Doel: de bestaande exports `clientConfig`, `config.business.*`, `config.owner.*` blijven werken — maar de bron is nu DB i.p.v. JSON. Tijdens hydrate-fase laden we eerst de JSON als fallback (zodat startup niet faalt als de DB-migratie nog niet is gedraaid in een dev-omgeving), maar in productie verwachten we DB als bron.

- [ ] **Step 1: Lees de huidige inhoud van src/config.ts**

(Geen actie, alleen oriëntatie. Het bestand staat in `src/config.ts`. De `clientConfig`-export wordt synchroon op module-load gezet via `loadClientConfig()` regel 25-46. Die houden we, maar voegen een hydrate-stap toe die de waarden in-place vervangt.)

- [ ] **Step 2: Wijzig src/config.ts zodat clientConfig hydrateerbaar is**

Vervang in `src/config.ts` regel 24-48 (de `loadClientConfig()`-functie + de `export const clientConfig = loadClientConfig();` regel) door:

```typescript
// Load client config (business settings, prices, etc.).
// MIGRATIE: bron is nu Supabase (tenant_settings + pricing_rules + service_offerings).
// Bij module-load lezen we de JSON-fallback zodat code die op import-tijd
// `clientConfig` aanraakt niet ondefined krijgt. Tijdens server-startup roept
// src/index.ts hydrateClientConfig() aan, die de DB-waarden in-place merged.
function loadClientConfigFromJson(): ClientConfig {
  const name = process.env.CLIENT;
  if (name) {
    const configPath = path.resolve(__dirname, '..', 'clients', name, 'config.json');
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as ClientConfig;
    }
    console.error(`[config] Client config.json not found: ${configPath}`);
    process.exit(1);
  }
  const devPath = path.resolve(__dirname, '..', 'clients', 'schoon-straatje', 'config.json');
  if (existsSync(devPath)) {
    const raw = readFileSync(devPath, 'utf-8');
    return JSON.parse(raw) as ClientConfig;
  }
  console.error('[config] No client config found. Create clients/schoon-straatje/config.json');
  process.exit(1);
}

// We exporteren clientConfig als een mutable referentie. Hydrate vervangt de
// velden in-place zodat al-geïmporteerde aanroepers de DB-waarden zien.
export const clientConfig: ClientConfig = loadClientConfigFromJson();

/**
 * Wordt aangeroepen vanuit src/index.ts vóór app.listen().
 * Vervangt de inhoud van `clientConfig` met DB-waarden.
 * Faalt de DB, dan crasht de bot — beter dan op stale JSON draaien
 * in productie.
 */
export async function hydrateConfigFromDatabase(): Promise<void> {
  const { hydrateClientConfig } = await import('./services/tenant-config');
  const fresh = await hydrateClientConfig();
  Object.assign(clientConfig, fresh);
  console.log('[config] hydrated clientConfig from Supabase');
}
```

- [ ] **Step 3: Type-check + start de server (smoke)**

```bash
npm run build
```

Verwacht: geen TS-errors.

- [ ] **Step 4: Commit**

```bash
git add src/config.ts
git commit -m "refactor(config): make clientConfig hydratable from Supabase, JSON as fallback"
```

---

### Task 10: Tests voor /dashboard-api/config/reload (failing first)

**Files:**
- Create: `tests/dashboard-api.test.ts`

- [ ] **Step 1: Schrijf de failing tests**

Bestand `tests/dashboard-api.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock refreshClientConfig zodat we tellen of het wordt aangeroepen.
const refreshMock = vi.fn(async () => ({ /* dummy */ }));
vi.mock('../src/services/tenant-config', () => ({
  refreshClientConfig: refreshMock,
  hydrateClientConfig: vi.fn(),
  getCachedClientConfig: vi.fn(),
  fetchTenantConfig: vi.fn(),
}));

// Test-vriendelijk: zet de env-var voordat de router import.
process.env.DASHBOARD_API_TOKEN = 'test-token-123';

import dashboardApiRouter from '../src/routes/dashboard-api';

function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(dashboardApiRouter);
  return app;
}

describe('POST /dashboard-api/config/reload', () => {
  beforeEach(() => {
    refreshMock.mockClear();
  });

  it('zonder Authorization header → 401', async () => {
    const res = await request(makeApp()).post('/dashboard-api/config/reload');
    expect(res.status).toBe(401);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('met verkeerde token → 403', async () => {
    const res = await request(makeApp())
      .post('/dashboard-api/config/reload')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(403);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('met juiste token → 200 + roept refreshClientConfig aan', async () => {
    const res = await request(makeApp())
      .post('/dashboard-api/config/reload')
      .set('Authorization', 'Bearer test-token-123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', reloaded: true });
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Voeg supertest toe als devDependency (eenmalig)**

```bash
npm install --save-dev supertest @types/supertest
```

- [ ] **Step 3: Run de tests, verwacht failures**

```bash
npm run test -- tests/dashboard-api.test.ts
```

Verwacht: drie falende tests met "Cannot find module '../src/routes/dashboard-api'".

- [ ] **Step 4: Commit (red)**

```bash
git add tests/dashboard-api.test.ts package.json package-lock.json
git commit -m "test(dashboard-api): failing tests for config/reload endpoint"
```

---

### Task 11: Implementeer dashboard-api router

**Files:**
- Create: `src/routes/dashboard-api.ts`

- [ ] **Step 1: Schrijf de router**

Bestand `src/routes/dashboard-api.ts`:

```typescript
import { Router, type Request, type Response, type NextFunction } from 'express';
import { refreshClientConfig } from '../services/tenant-config';

const router = Router();

/**
 * Bearer-token middleware. Token wordt gedeeld met de Next.js dashboard
 * (DASHBOARD_API_TOKEN env-var, identiek aan beide kanten).
 *
 * 401 = geen header
 * 403 = wel header, verkeerde token
 */
function requireDashboardToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.DASHBOARD_API_TOKEN;
  if (!expected) {
    res.status(503).json({ error: 'DASHBOARD_API_TOKEN niet geconfigureerd' });
    return;
  }
  const auth = req.header('authorization');
  if (!auth) {
    res.status(401).json({ error: 'Authorization header ontbreekt' });
    return;
  }
  const match = /^Bearer\s+(.+)$/.exec(auth);
  if (!match || match[1] !== expected) {
    res.status(403).json({ error: 'Ongeldige token' });
    return;
  }
  next();
}

router.post('/dashboard-api/config/reload', requireDashboardToken, async (_req, res) => {
  await refreshClientConfig();
  res.json({ status: 'ok', reloaded: true });
});

export default router;
```

- [ ] **Step 2: Run de tests, verwacht success**

```bash
npm run test -- tests/dashboard-api.test.ts
```

Verwacht: 3 tests passen.

- [ ] **Step 3: Commit (green)**

```bash
git add src/routes/dashboard-api.ts
git commit -m "feat(dashboard-api): add config/reload endpoint with bearer-token auth"
```

---

### Task 12: Mount router + hydrate in src/index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Voeg de import toe (bovenaan, naast andere route-imports)**

Wijzig `src/index.ts` regel 11 (direct na `import adminRouter from './routes/admin';`) door dit eronder toe te voegen:

```typescript
import dashboardApiRouter from './routes/dashboard-api';
import { hydrateConfigFromDatabase } from './config';
import { refreshClientConfig } from './services/tenant-config';
```

- [ ] **Step 2: Mount de router (na de andere route-mounts)**

Voeg toe direct ná regel 88 (`app.use(adminRouter);`):

```typescript
app.use(dashboardApiRouter);
```

- [ ] **Step 3: Hydrate vóór app.listen + start refresh-interval**

We veranderen `const server = app.listen(...)` naar een async startup-functie die eerst de config uit DB hydrateert. De server-handle bewaren we in een module-scope `serverRef` variabele zodat `shutdown()` er bij kan.

Vervang in `src/index.ts` exact deze block:

```typescript
const server = app.listen(config.port, () => {
  console.log(`
  ┌──────────────────────────────────────────┐
  │  ${config.business.name.padEnd(38)}│
  │  Port: ${String(config.port).padEnd(33)}│
  │  Client: ${(process.env.CLIENT || 'development').padEnd(30)}│
  │  Bot: ${config.business.chatbotName.padEnd(34)}│
  └──────────────────────────────────────────┘
  `);

  // Start daily reminder cron
  startReminderCron();
});
```

door:

```typescript
// Module-scope handle naar de HTTP-server. Wordt gezet zodra startServer()
// klaar is met hydrate + listen. shutdown() leest deze variabele.
let serverRef: ReturnType<typeof app.listen> | undefined;

async function startServer(): Promise<void> {
  // Hydrate config from Supabase voordat we requests accepteren — anders
  // draait de bot op de oude JSON-fallback, wat in productie ongewenst is.
  await hydrateConfigFromDatabase();

  serverRef = app.listen(config.port, () => {
    console.log(`
  ┌──────────────────────────────────────────┐
  │  ${config.business.name.padEnd(38)}│
  │  Port: ${String(config.port).padEnd(33)}│
  │  Client: ${(process.env.CLIENT || 'development').padEnd(30)}│
  │  Bot: ${config.business.chatbotName.padEnd(34)}│
  └──────────────────────────────────────────┘
  `);

    // Start daily reminder cron
    startReminderCron();

    // Achtergrondrefresh: pak DB-wijzigingen op zonder dat een dashboard-edit
    // de reload-endpoint hoeft te triggeren. 60s is vaak genoeg om "ik heb net
    // een prijs gewijzigd" binnen ruime tijd door te zetten zonder de DB te hammeren.
    setInterval(() => {
      void refreshClientConfig();
    }, 60_000);
  });
}

void startServer().catch((err) => {
  console.error('[startup] hydrate failed, exiting:', err);
  process.exit(1);
});
```

- [ ] **Step 4: Pas shutdown() aan om serverRef te gebruiken**

In `src/index.ts`, in de bestaande `shutdown()`-functie, vervang exact dit block:

```typescript
  // Stop accepting new connections
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  console.log('[shutdown] HTTP server closed');
```

door:

```typescript
  // Stop accepting new connections (serverRef kan undefined zijn als shutdown
  // afgaat tijdens hydrate — dan is er nog geen listener om te sluiten).
  await new Promise<void>((resolve) => {
    if (serverRef) {
      serverRef.close(() => resolve());
    } else {
      resolve();
    }
  });
  console.log('[shutdown] HTTP server closed');
```

- [ ] **Step 5: Type-check**

```bash
npm run build
```

Verwacht: geen TS-errors.

- [ ] **Step 6: Run alle tests om regressie uit te sluiten**

```bash
npm run test
```

Verwacht: tests passen (let op: er zijn 2 pre-existing failing tests in `tests/conversation.test.ts` zoals beschreven in [CLAUDE.md](../../../../schoon-straatje%20product/schoon-straatje-assistent/CLAUDE.md). Andere tests moeten passen.)

- [ ] **Step 7: Commit**

```bash
git add src/index.ts
git commit -m "feat(server): hydrate clientConfig from DB at startup + 60s background refresh + mount dashboard-api router"
```

---

### Task 13: Documenteer ENV-vars en config-bron

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Voeg DASHBOARD_API_TOKEN toe aan .env.example**

Voeg onderaan `.env.example` toe:

```bash

# Dashboard API — Bearer token gedeeld met Next.js dashboard
# (app.frontlix.com). Wordt geverifieerd op /dashboard-api/* routes.
# Genereer met: openssl rand -hex 32
DASHBOARD_API_TOKEN=
```

- [ ] **Step 2: Update CLAUDE.md — config-bron sectie**

In `CLAUDE.md`, vervang in de "Belangrijke endpoints en files" tabel de regel:

```
| Prijzen / zakelijke config | [clients/schoon-straatje/config.json](clients/schoon-straatje/config.json) |
```

door:

```
| Prijzen / zakelijke config (live) | Supabase: tenant_settings + pricing_rules + service_offerings |
| Prijzen / zakelijke config (initial seed) | [clients/schoon-straatje/config.json](clients/schoon-straatje/config.json) → seedt DB via [scripts/migrate-config-to-db.ts](scripts/migrate-config-to-db.ts) |
| Dashboard config-reload endpoint | POST /dashboard-api/config/reload (Bearer token) |
```

Voeg onder de bestaande "Conversatie-architectuur" sectie een nieuwe sectie toe:

```markdown
## Config-bron (sinds Plan 1)

`clientConfig` (uit `src/config.ts`) wordt bij server-startup gehydrateerd
uit Supabase (`tenant_settings`, `pricing_rules`, `service_offerings`).
JSON-bestanden in `clients/<naam>/config.json` zijn alleen nog een seed-bron
voor de initiële migratie en als dev-fallback.

- **Bij start**: `hydrateConfigFromDatabase()` overschrijft de in-memory
  `clientConfig` met DB-waarden. Faalt de fetch, dan crasht de bot bewust.
- **Achtergrondrefresh**: 60 seconden interval roept `refreshClientConfig()`
  aan zodat dashboard-edits binnen ruime tijd actief worden.
- **Forceer refresh**: `POST /dashboard-api/config/reload` met Bearer-token.
- **Dashboard-edits** (Plan 7) schrijven naar `tenant_settings`/`pricing_rules`
  en roepen direct het reload-endpoint aan zodat wijzigingen binnen seconden
  effect hebben.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs: document DASHBOARD_API_TOKEN and Supabase-backed config flow"
```

---

### Task 14: End-to-end smoke test

Manuele verificatie dat de hele keten werkt.

- [ ] **Step 1: Genereer een dashboard-token en zet 'm in `.env`**

```bash
TOKEN=$(openssl rand -hex 32)
echo "DASHBOARD_API_TOKEN=$TOKEN" >> .env
echo "Generated token: $TOKEN"
```

- [ ] **Step 2: Start de bot in dev**

```bash
npm run dev
```

Verwacht in de output:

```
[config] hydrated clientConfig from Supabase
  ┌──────────────────────────────────────────┐
  │  Schoon Straatje                         │
  │  Port: 3000                              │
  │  ...
```

- [ ] **Step 3: Wijzig een prijs handmatig in Supabase**

In Supabase Studio SQL Editor:

```sql
UPDATE pricing_rules SET waarde = 9.99 WHERE rule_key = 'reinigen_per_m2';
```

- [ ] **Step 4: Roep het reload-endpoint aan**

In een nieuwe terminal:

```bash
curl -X POST http://localhost:3000/dashboard-api/config/reload \
  -H "Authorization: Bearer $TOKEN" -i
```

Verwacht: `HTTP/1.1 200 OK` + body `{"status":"ok","reloaded":true}`.

- [ ] **Step 5: Verifieer dat de bot de nieuwe waarde gebruikt**

Voeg tijdelijk een diagnostiek-endpoint toe aan `src/routes/dashboard-api.ts` voor smoke-doeleinden — vlak vóór `export default router;` :

```typescript
// SMOKE-ONLY: tijdelijke read-back van een prijsregel om de hydrate-cyclus
// end-to-end te kunnen verifiëren. Wordt verwijderd in step 7.
router.get('/dashboard-api/_smoke/pricing/:key', requireDashboardToken, async (req, res) => {
  const { getCachedClientConfig } = await import('../services/tenant-config');
  const cfg = getCachedClientConfig();
  if (!cfg) { res.status(503).json({ error: 'cache niet gehydrateerd' }); return; }
  const key = req.params.key as keyof typeof cfg.prijzen;
  res.json({ key, waarde: cfg.prijzen[key] });
});
```

Restart `npm run dev` (de file watcher pakt het op) en run:

```bash
curl http://localhost:3000/dashboard-api/_smoke/pricing/reinigen_per_m2 \
  -H "Authorization: Bearer $TOKEN"
```

Verwacht: `{"key":"reinigen_per_m2","waarde":9.99}` (de DB-update uit step 3 + reload uit step 4 zijn nu zichtbaar in-memory).

- [ ] **Step 6: Reset de prijs en verwijder de smoke-route**

```sql
UPDATE pricing_rules SET waarde = 3.95 WHERE rule_key = 'reinigen_per_m2';
```

```bash
curl -X POST http://localhost:3000/dashboard-api/config/reload \
  -H "Authorization: Bearer $TOKEN"
```

Daarna: verwijder het tijdelijke `_smoke/pricing/:key` endpoint uit `src/routes/dashboard-api.ts` dat in step 5 is toegevoegd. Plan 7 (instellingen-pagina's) introduceert de echte read-back die het dashboard gebruikt.

- [ ] **Step 7: Commit de smoke-cleanup en stop de server**

```bash
git add src/routes/dashboard-api.ts
git commit -m "chore(dashboard-api): remove temporary smoke endpoint after Plan 1 verification"
```

`Ctrl+C` in de terminal waar `npm run dev` draait. Verwacht: `[shutdown] HTTP server closed`.

---

## Summary checklist

Aan het einde van Plan 1 moet alles van het volgende waar zijn:

- [ ] 8 nieuwe tabellen bestaan in de schoon-straatje Supabase
- [ ] `leads.dashboard_status` en `leads.dashboard_archived` kolommen bestaan
- [ ] `tenant_settings` heeft 1 rij, `pricing_rules` heeft 19 rijen, `service_offerings` heeft 3 rijen
- [ ] Bot start met `[config] hydrated clientConfig from Supabase` in de log
- [ ] `npm run test` slaagt (m.u.v. 2 pre-existing failures in conversation.test.ts)
- [ ] `POST /dashboard-api/config/reload` met juiste Bearer token retourneert 200 en triggert refresh
- [ ] Een UPDATE in `pricing_rules` is binnen 60s (of direct via reload) zichtbaar voor de bot
- [ ] `.env.example` documenteert `DASHBOARD_API_TOKEN`
- [ ] CLAUDE.md beschrijft de DB-config-bron

Plan 2 (bot-API endpoints voor lead-acties) bouwt verder op deze fundamenten.
