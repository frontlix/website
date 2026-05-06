# Plan 1 — Schema-migratie + DB-seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het schoon-straatje Supabase-project uitbreiden met alle nieuwe tabellen die het dashboard nodig heeft, plus de drie config-tabellen alvast eenmalig vullen vanuit `clients/schoon-straatje/config.json`. Dashboard kan ze straks **lezen** voor display. **Geen wijzigingen aan de bot-code** — die blijft volledig op JSON-config zolang de klant-testfase loopt.

**Architecture:** Twee SQL-migrations + één eenmalig TypeScript-script in de schoon-straatje repo. Niets aan `src/` van de bot wordt aangeraakt. De bot-config-migratie naar DB is uitgesteld en gedocumenteerd in [postponed.md](../postponed.md).

**Tech Stack:** Supabase Postgres, TypeScript (`tsx` voor het script). Werk uitsluitend in de schoon-straatje repo.

**Working directory voor dit plan:** `/Users/christiaantromp/Desktop/schoon-straatje product/schoon-straatje-assistent/`

Alle bestandspaden in dit plan zijn relatief vanaf die directory tenzij expliciet anders vermeld.

**Frontlix-repo aanrakingen in dit plan:** geen. (Plan 3 begint met dashboard-code in `/Users/christiaantromp/Desktop/Frontlix website new/`.)

---

## File Structure

**Nieuw:**
- `supabase/migrations/022_dashboard_config_tables.sql` — tenant_settings, pricing_rules, service_offerings + indexes
- `supabase/migrations/023_dashboard_data_tables.sql` — dashboard_user_profiles, tags, lead_tags, lead_notes, lead_status_history + ALTER leads
- `scripts/migrate-config-to-db.ts` — eenmalig seed-script (idempotent, UPSERT)

**Gewijzigd:** geen bestanden in `src/`. Geen Express-routes geraakt. Geen tests gewijzigd.

---

## Approach principles

- **Niet de werkende bot raken**: alle wijzigingen zijn additief op de DB, of in `scripts/` (wordt niet door de bot ingelezen).
- **Idempotency**: migratiescript is UPSERT-only en kan zonder schade meermaals draaien.
- **YAGNI**: geen `tenant_id` of multi-tenant logica in dit plan (komt later).
- **Frequent commits**: één commit per task.
- **Risico-discipline**: na deze plan is `npm run dev` van de bot identiek aan vóór de plan. Geen runtime-impact.

---

### Task 1: SQL-migratie 022 — config-tabellen

**Files:**
- Create: `supabase/migrations/022_dashboard_config_tables.sql`

- [ ] **Step 1: Schrijf de migratie**

Bestand `supabase/migrations/022_dashboard_config_tables.sql`:

```sql
-- Migratie 022: dashboard config-tabellen
-- ADDITIEF — bot leest deze tabellen NIET. Dashboard leest ze straks
-- voor display (bedrijfsnaam in header, prijzen-overzicht).
-- Edit-functionaliteit + bot-migratie naar DB-bron staat in
-- docs/superpowers/postponed.md (Frontlix-repo).

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
-- Geen policies in v1: bot leest niet uit deze tabel; dashboard leest in
-- Plan 3+ via approved-user policy. RLS aan zodat tabel niet als
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
  'Prijzen voor offerte-berekening. rule_key matcht de keys uit het oude config.json (reinigen_per_m2, etc.). v1: read-only mirror van JSON.';

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
  'Welke diensten deze tenant aanbiedt. dienst_key matcht het oude config.json diensten-block. v1: read-only mirror.';

ALTER TABLE service_offerings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AUTO-UPDATE bijgewerkt_op
-- ============================================
-- De bestaande update_bijgewerkt() functie uit 001_initial_schema.sql schrijft
-- NEW.bijgewerkt — onze nieuwe tabellen gebruiken kolom bijgewerkt_op (consistent
-- met aangemaakt_op in andere nieuwe tabellen). Daarom hier een aparte
-- trigger-functie die naar de _op-kolom schrijft.
CREATE OR REPLACE FUNCTION update_bijgewerkt_op()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bijgewerkt_op = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_settings_bijgewerkt_op ON tenant_settings;
CREATE TRIGGER tenant_settings_bijgewerkt_op
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_bijgewerkt_op();

DROP TRIGGER IF EXISTS pricing_rules_bijgewerkt_op ON pricing_rules;
CREATE TRIGGER pricing_rules_bijgewerkt_op
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_bijgewerkt_op();
```

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
-- ADDITIEF — bot leest deze tabellen NIET; raakt dashboard_status of
-- dashboard_archived niet aan.

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
  aangemaakt_door  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  auteur        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  gewijzigd_door  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
  'Door dashboard-user gezette resolutie-status. Apart van leads.status (bot-status) en leads.gesprek_fase (bot-fase). Bot leest deze kolom NIET.';
COMMENT ON COLUMN leads.dashboard_archived IS
  'Verberg uit hoofd-lijst maar bewaar de data. Bot leest deze kolom NIET.';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/023_dashboard_data_tables.sql
git commit -m "feat(db): add dashboard data tables (user profiles, tags, notes, status history) + leads dashboard cols"
```

---

### Task 3: Run beide migraties tegen de schoon-straatje Supabase

Manuele operationele stap. **Niet skipten** — Task 4 (seed-script) gaat ervan uit dat tenant_settings/pricing_rules/service_offerings bestaan.

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

- [ ] **Step 5: Smoke-check dat de bot nog werkt**

Belangrijk: na de migraties zijn alle nieuwe kolommen op `leads` NULL/false-default. De bot zou ze niet moeten lezen. Verifieer:

```bash
# Op je laptop (geen productie, gewoon lokale check)
curl -s http://localhost:3000/health 2>/dev/null || echo "(bot lokaal niet aan, OK)"
```

Als de bot lokaal of in productie loopt: check `pm2 logs frontlix --lines 50` (of de SSH-equivalent voor de schoon-straatje VPS) op fouten in de minuut na de migratie. Verwacht: geen nieuwe errors.

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
 * Het script raakt de bot-runtime NIET aan. De bot blijft gewoon op
 * config.json draaien. Deze tabellen zijn alleen een read-only mirror voor
 * het dashboard tot we de bot-config-migratie doen
 * (zie docs/superpowers/postponed.md in de Frontlix-repo).
 *
 * Gebruik:
 *   CLIENT=schoon-straatje npx tsx scripts/migrate-config-to-db.ts
 *
 * Of zonder CLIENT (default development = schoon-straatje):
 *   npx tsx scripts/migrate-config-to-db.ts
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

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-config-to-db.ts
git commit -m "feat(scripts): add config.json → DB seed script (idempotent, dashboard-only mirror)"
```

---

### Task 5: Run het seed-script en verifieer

- [ ] **Step 1: Run het script tegen de schoon-straatje Supabase**

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

- [ ] **Step 2: Verifieer in Supabase Studio**

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

- [ ] **Step 3: Run het script nóg eens om idempotency te bevestigen**

```bash
CLIENT=schoon-straatje npx tsx scripts/migrate-config-to-db.ts
```

Verwacht: zelfde output, geen errors. In Supabase Studio: nog steeds 1 rij in tenant_settings, 19 in pricing_rules, 3 in service_offerings (geen duplicates).

- [ ] **Step 4: Smoke-check dat de bot nog identiek werkt**

Zelfde controle als Task 3 step 5: `pm2 logs` (of lokaal `npm run dev`) — geen nieuwe errors, geen gedragsverandering.

---

## Summary checklist

Aan het einde van Plan 1 moet alles van het volgende waar zijn:

- [ ] 8 nieuwe tabellen bestaan in de schoon-straatje Supabase
- [ ] `leads.dashboard_status` en `leads.dashboard_archived` kolommen bestaan
- [ ] `tenant_settings` heeft 1 rij, `pricing_rules` heeft 19 rijen, `service_offerings` heeft 3 rijen — alle drie identiek aan `clients/schoon-straatje/config.json`
- [ ] **Geen wijzigingen aan `src/`** — bot draait identiek aan vóór de migratie
- [ ] **Geen Express-routes toegevoegd of geraakt**
- [ ] [docs/superpowers/postponed.md](../postponed.md) (in Frontlix-repo) documenteert het uitgestelde bot-config-migratie werk

Plan 2 (in Frontlix-repo: bot-API endpoints voor lead-acties) is óók uitgesteld zolang de testfase loopt — die endpoints zouden de bot wel raken. Plan 3 (auth + layout-shell, volledig in Frontlix-repo) kan onmiddellijk na Plan 1 omdat het de bot niet raakt.
