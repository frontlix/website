# Plan 3 — Auth + subdomein-routing + layout-shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een werkende dashboard-shell op `app.frontlix.com` waarin een nieuwe klant een account kan aanmaken, in een wachtkamer komt, na handmatige goedkeuring kan inloggen, en een lege dashboard-layout met sidebar ziet die zijn bedrijfsnaam toont. Geen lead-data, geen acties — alleen de fundering.

**Architecture:** Drie lagen werk, alle in de Frontlix-repo:
1. **Schoon-straatje DB** — RLS-policies op de 8 dashboard-tabellen + helper-functie `is_approved_dashboard_user()`. **Geen** trigger op `auth.users` (Supabase staat dat niet toe — `auth.users` is eigendom van `supabase_auth_admin`); in plaats daarvan maakt de signup-server-action zelf de `dashboard_user_profiles`-rij aan met service-key. Wel een SQL-migratie maar die is volledig additief en raakt de bot niet (RLS was al aan zonder policies; bot gebruikt service-key dus bypasst alles).
2. **Frontlix Next.js shell** — `middleware.ts` doet host-based routing: bij `app.frontlix.com/<path>` rewrite naar `/dashboard/<path>` zodat de fysieke folder `app/dashboard/` serveert. Bij `frontlix.com/dashboard/<anything>` 404 om te voorkomen dat dashboard-routes via de marketing-host bereikbaar zijn. `lib/dashboard/supabase.ts` voor server/client clients, `app/dashboard/layout.tsx` met sidebar + topbar.
3. **Auth-pagina's** — `/login`, `/signup`, `/wachtkamer` als geneste route group `app/dashboard/(auth)/...` met eigen layout (geen sidebar). Server Actions schrijven naar Supabase Auth + Slack-webhook.

**Waarom een fysieke `/dashboard` folder en niet een `(dashboard)` route group?** Route groups (parens-folders) zijn URL-transparant — `app/dashboard/leads/page.tsx` zou óók serveren op `frontlix.com/leads`, wat we willen voorkomen. Een fysieke prefix + middleware-rewrite geeft echte host-isolatie. Voor de eindgebruiker blijft de URL `app.frontlix.com/leads`; Next.js routeert intern naar `/dashboard/leads`.

**Tech Stack:** Next.js 15.1.0 (App Router), TypeScript, `@supabase/supabase-js@2.100`, **nieuw: `@supabase/ssr`** voor cookie-based session handling. CSS Modules (geen Tailwind). Vitest (eventueel toevoegen voor server-action tests).

**Working directory voor dit plan:** `/Users/christiaantromp/Desktop/Frontlix website new/`

Tenzij expliciet anders vermeld zijn alle paden relatief vanaf die directory. Eén task vereist een handmatige actie in de schoon-straatje **Supabase Studio** (Task 2).

**Schoon-straatje bot-code wordt niet aangeraakt.** De bot test-fase loopt door zonder enige interferentie.

---

## File Structure

**Nieuw in Frontlix-repo:**
```
middleware.ts                                       — host-based rewrite naar /dashboard + auth-check
app/dashboard/                                      — fysieke folder, intern URL-pad /dashboard/...
├── layout.tsx                                      — sidebar + topbar shell, server component
├── leads/page.tsx                                  — placeholder (Plan 4 vult)
├── agenda/page.tsx                                 — placeholder (Plan 8)
├── statistieken/page.tsx                           — placeholder (Plan 8)
├── instellingen/page.tsx                           — read-only bedrijfsinfo (uit tenant_settings)
├── logout/route.ts                                 — GET → signOut + redirect naar /login (user-facing URL)
└── (auth)/                                         — geneste route group: eigen layout zonder sidebar
    ├── layout.tsx                                  — minimale shell (logo + content-area)
    ├── login/page.tsx                              — email + wachtwoord form
    ├── login/actions.ts                            — server action: Supabase Auth signin
    ├── signup/page.tsx                             — email + wachtwoord + bedrijfsnaam form
    ├── signup/actions.ts                           — server action: Supabase Auth signup + profile-row insert + Slack-notify
    └── wachtkamer/page.tsx                         — pending-approval pagina met realtime channel
components/dashboard/
├── Sidebar.tsx + Sidebar.module.css                — linker navigatie (Leads, Agenda, Statistieken, Instellingen)
├── Topbar.tsx + Topbar.module.css                  — bedrijfsnaam links, user-menu rechts
├── UserMenu.tsx + UserMenu.module.css              — dropdown met logout
└── MobileNav.tsx + MobileNav.module.css            — hamburger-variant van sidebar
lib/dashboard/
├── supabase-server.ts                              — getDashboardSupabase() server-side, cookie-based session
├── supabase-browser.ts                             — createDashboardClient() browser, anon-key
├── supabase-admin.ts                               — getDashboardAdmin() service-role, server-only
├── auth.ts                                         — getCurrentUser(), requireApprovedUser(), helpers
└── slack.ts                                        — postSignupNotification(text)

supabase/migrations-frontlix/024_dashboard_rls_and_signup_hook.sql
                                                    — Schoon-straatje DB migratie (apart van schoon-straatje repo migrations omdat ze door dashboard-team beheerd worden)
```

**Gewijzigd:**
```
.env.local           — voegt SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL toe
.env.example         — voegt nieuwe vars toe (als die file bestaat; anders niet aanmaken)
package.json         — voegt @supabase/ssr toe
```

**Niet aangeraakt:** alles in `app/(main)/`, `components/` (behalve nieuwe `dashboard/`-subdirectory), `lib/` (behalve nieuwe `dashboard/`-subdirectory), de schoon-straatje codebase.

---

## Approach principles

- **Niet in dezelfde Supabase migrations-folder** als de schoon-straatje bot. We zetten de dashboard-RLS-migratie in `supabase/migrations-frontlix/` in **deze** repo zodat het bot-team niet onbedoeld iets met onze migrations doet en omgekeerd. De migratie wordt handmatig in de schoon-straatje Supabase Studio gerund.
- **Server-side eerst**: alles wat ingeladen kan worden in een Server Component doet dat. Pas client-side waar reactiviteit nodig is (realtime channel op `/wachtkamer`).
- **TDD voor server-actions** (signup/login). Geen TDD voor UI-componenten — die testen we via een end-to-end smoke aan het eind.
- **YAGNI**: geen wachtwoord-reset, geen uitnodig-flow, geen onboarding-overlay (komt in Plan 7/9). Alleen wat nodig is om de eerste user binnen te laten.
- **Geen RLS-policies "voor later"** — we schrijven alleen policies voor tabellen die het dashboard nu daadwerkelijk benadert. Andere tabellen blijven "RLS aan, geen policy" totdat een volgend plan ze gebruikt.

---

### Task 1: SQL-migratie 024 — RLS-policies (geen Auth Hook trigger)

**Files (in Frontlix-repo):**
- Create: `supabase/migrations-frontlix/024_dashboard_rls_and_signup_hook.sql`

- [ ] **Step 1: Maak de directory aan**

```bash
mkdir -p supabase/migrations-frontlix
```

- [ ] **Step 2: Schrijf de migratie**

Bestand `supabase/migrations-frontlix/024_dashboard_rls_and_signup_hook.sql`:

```sql
-- Migratie 024 (Frontlix dashboard): RLS-policies + Auth Hook
--
-- DOEL: het dashboard kan straks met anon-key + session veilig lezen/schrijven
-- naar de dashboard-tabellen (Plan 1: 022, 023). Bot blijft op service-key
-- werken (bypasst RLS) — geen impact.
--
-- DRAAIEN: handmatig in schoon-straatje Supabase Studio (zelfde DB als
-- migrations 022 + 023). NIET in de schoon-straatje repo migrations-folder
-- omdat het bot-team die folder beheert; deze migratie hoort bij Frontlix.
--
-- AFHANKELIJKHEDEN:
--   - 022_dashboard_config_tables.sql moet uitgevoerd zijn
--   - 023_dashboard_data_tables.sql moet uitgevoerd zijn
--
-- POLICIES IN V1: alle SELECT-rechten zijn afhankelijk van approved status.
-- Pending users zien helemaal niets behalve hun eigen profile-rij.

-- ============================================
-- HELPER: is_approved() — leesbaar predikaat voor policies
-- ============================================
CREATE OR REPLACE FUNCTION is_approved_dashboard_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dashboard_user_profiles
    WHERE user_id = auth.uid()
      AND tenant_status = 'approved'
  );
$$;

COMMENT ON FUNCTION is_approved_dashboard_user IS
  'True als de huidig ingelogde user een dashboard_user_profile heeft met tenant_status=''approved''. Gebruikt door RLS-policies om approved-only access af te dwingen.';

-- ============================================
-- DASHBOARD_USER_PROFILES — user mag alleen eigen rij zien + updaten
-- ============================================
CREATE POLICY "user kan eigen profile lezen"
  ON dashboard_user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user kan eigen profile updaten (beperkte velden)"
  ON dashboard_user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- LET OP: dit laat user toe alle velden te wijzigen, ook tenant_status.
-- Frontlix-admin gebruikt service-key (bypass RLS). Voor v1 vertrouwen we
-- erop dat de UI alleen onboarding_voltooid_op-toggling exposeert. Plan 7
-- moet dit aanscherpen met column-level checks of een aparte updatable
-- view voor self-service velden.

-- INSERT policy is BEWUST AFWEZIG. Profile-rijen worden uitsluitend
-- aangemaakt door de Auth Hook trigger (zie onderaan dit bestand).

-- ============================================
-- TENANT_SETTINGS / PRICING_RULES / SERVICE_OFFERINGS — read-only voor approved users
-- ============================================
CREATE POLICY "approved users kunnen tenant_settings lezen"
  ON tenant_settings FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen pricing_rules lezen"
  ON pricing_rules FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen service_offerings lezen"
  ON service_offerings FOR SELECT
  USING (is_approved_dashboard_user());

-- Geen INSERT/UPDATE/DELETE policies — bot-config-migratie staat in postponed.md.
-- Dashboard-edits aan deze tabellen vereisen Plan 7 + bot-side migratie eerst.

-- ============================================
-- LEADS — approved users kunnen lezen + dashboard-velden wijzigen
-- ============================================
CREATE POLICY "approved users kunnen leads lezen"
  ON leads FOR SELECT
  USING (is_approved_dashboard_user());

-- UPDATE-policy is bewust beperkt: dashboard mag ALLEEN dashboard_status
-- en dashboard_archived wijzigen. Andere kolommen blijven exclusief voor
-- de bot (die met service-key schrijft, dus deze policy raakt 'm niet).
-- WITH CHECK forceert dat dashboard-edits geen bot-velden veranderen.
CREATE POLICY "approved users kunnen dashboard-velden van leads wijzigen"
  ON leads FOR UPDATE
  USING (is_approved_dashboard_user())
  WITH CHECK (is_approved_dashboard_user());
-- LET OP: Postgres' WITH CHECK kan helaas niet "alleen kolom X mag wijzigen"
-- afdwingen — dat moet via een trigger of via column grants. Voor v1 vertrouwen
-- we op de dashboard-code; Plan 5 (lichte acties) voegt een BEFORE UPDATE-trigger
-- toe die niet-dashboard-kolommen tegen aanroepen vanuit anon-key context blokkeert.
-- Documenteer dit risico expliciet:
COMMENT ON POLICY "approved users kunnen dashboard-velden van leads wijzigen" ON leads IS
  'V1: laat any-column UPDATE toe voor approved users. Plan 5 voegt column-restrict trigger toe. Bot gebruikt service-key dus is hier niet door beperkt.';

-- ============================================
-- BERICHTEN / FOTOS / OFFERTES / PRIJSREGELS — approved users mogen lezen
-- ============================================
-- Deze tabellen bestaan al sinds 001 / 006. We voegen alleen leesrechten toe
-- voor het dashboard. Als RLS niet aan staat zijn ze "Unrestricted" — dat
-- is in dit project deels al het geval; we forceren consistente policies.

ALTER TABLE berichten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved users kunnen berichten lezen"
  ON berichten FOR SELECT
  USING (is_approved_dashboard_user());

ALTER TABLE fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved users kunnen fotos lezen"
  ON fotos FOR SELECT
  USING (is_approved_dashboard_user());

-- offertes had al RLS aan (zie 006_offertes.sql)
CREATE POLICY "approved users kunnen offertes lezen"
  ON offertes FOR SELECT
  USING (is_approved_dashboard_user());

ALTER TABLE prijsregels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved users kunnen prijsregels lezen"
  ON prijsregels FOR SELECT
  USING (is_approved_dashboard_user());

-- ============================================
-- LEAD_NOTES / LEAD_TAGS / LEAD_STATUS_HISTORY / TAGS — read + insert voor approved users
-- ============================================

-- LEAD_NOTES
CREATE POLICY "approved users kunnen lead_notes lezen"
  ON lead_notes FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen lead_notes toevoegen"
  ON lead_notes FOR INSERT
  WITH CHECK (is_approved_dashboard_user() AND auteur = auth.uid());

CREATE POLICY "approved users kunnen eigen lead_notes verwijderen"
  ON lead_notes FOR DELETE
  USING (is_approved_dashboard_user() AND auteur = auth.uid());

-- LEAD_TAGS
CREATE POLICY "approved users kunnen lead_tags lezen"
  ON lead_tags FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen lead_tags toevoegen"
  ON lead_tags FOR INSERT
  WITH CHECK (is_approved_dashboard_user() AND aangemaakt_door = auth.uid());

CREATE POLICY "approved users kunnen lead_tags verwijderen"
  ON lead_tags FOR DELETE
  USING (is_approved_dashboard_user());

-- TAGS — gedeeld over de tenant, alleen approved kan lezen + creëren
CREATE POLICY "approved users kunnen tags lezen"
  ON tags FOR SELECT
  USING (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen tags aanmaken"
  ON tags FOR INSERT
  WITH CHECK (is_approved_dashboard_user());

CREATE POLICY "approved users kunnen tags verwijderen"
  ON tags FOR DELETE
  USING (is_approved_dashboard_user());

-- LEAD_STATUS_HISTORY — alleen lezen voor users; INSERT komt via trigger in Plan 5
CREATE POLICY "approved users kunnen lead_status_history lezen"
  ON lead_status_history FOR SELECT
  USING (is_approved_dashboard_user());
-- Geen INSERT-policy: history wordt via trigger op leads geschreven (Plan 5).

-- ============================================
-- AUTH HOOK: maak dashboard_user_profile bij elke nieuwe auth.user
-- ============================================
-- Bij een nieuwe Supabase Auth signup wordt automatisch een profile-rij
-- gemaakt met tenant_status='pending'. De signup-server-action vult later
-- bedrijfsnaam in (UPDATE) zodra de user die heeft ingevuld in het formulier.
--
-- Waarom een trigger en niet de signup-action? De trigger garandeert dat
-- ELKE auth.users-insert (ook via Supabase Studio of een toekomstige magic
-- link) een profile-rij krijgt — RLS-policies hangen ervan af.

CREATE OR REPLACE FUNCTION create_dashboard_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Idempotent: als er al een rij is (theoretisch: dubbel gebeuren), niet falen.
  INSERT INTO dashboard_user_profiles (user_id, tenant_status, is_owner)
  VALUES (NEW.id, 'pending', true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_dashboard_user_profile();

COMMENT ON TRIGGER on_auth_user_created_create_profile ON auth.users IS
  'Maakt automatisch een dashboard_user_profile-rij met tenant_status=pending bij nieuwe Supabase Auth signup. is_owner=true want eerste user van een tenant — Plan 7 introduceert uitgenodigde users met is_owner=false.';
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations-frontlix/024_dashboard_rls_and_signup_hook.sql
git commit -m "feat(db): add RLS policies + Auth Hook for dashboard signup"
```

---

### Task 2: Run migratie 024 in schoon-straatje Supabase Studio

Manuele operationele stap. Migrations 022 en 023 staan al; deze bouwt erop voort.

- [ ] **Step 1: Open Supabase Studio voor het schoon-straatje project**

Zelfde project URL als waar 022/023 zijn gerund. SQL Editor → New Query.

- [ ] **Step 2: Plak de inhoud van `supabase/migrations-frontlix/024_dashboard_rls_and_signup_hook.sql` en klik Run**

Verwacht: Supabase Studio zal waarschuwen voor "destructive operations" (vanwege de `DROP TRIGGER IF EXISTS`). Klik **Run this query** — veilig, idempotent.

Verwacht resultaat: `Success. No rows returned`.

- [ ] **Step 3: Verifieer policies**

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'dashboard_user_profiles','tenant_settings','pricing_rules',
    'service_offerings','leads','berichten','fotos','offertes','prijsregels',
    'lead_notes','lead_tags','tags','lead_status_history'
  )
ORDER BY tablename, cmd, policyname;
```

Verwacht: minstens 1 policy per tabel; `dashboard_user_profiles` heeft 2 (SELECT + UPDATE); `lead_notes`/`lead_tags`/`tags` hebben elk 3 (SELECT, INSERT, DELETE); `leads` heeft 2 (SELECT + UPDATE).

- [ ] **Step 4: Verifieer helper-functie**

```sql
SELECT proname, prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'is_approved_dashboard_user';
```

Verwacht: 1 rij met `is_security_definer = true`.

(Geen Auth Hook trigger meer — profile-rij wordt door de signup-server-action aangemaakt, omdat Supabase geen DDL toestaat op `auth.users`. Zie comment in de migratie-file voor uitleg.)

- [ ] **Step 5: Smoke-check de bot**

Belangrijk: RLS-policies veranderen lees-toegang voor anon-key contexten. Bot gebruikt service-key (bypass) dus zou niets moeten merken. Check `pm2 logs` (of waar je bot-logs leest) op fouten in de minuut na de migratie.

---

### Task 3: Install @supabase/ssr en setup ENV-vars

- [ ] **Step 1: Installeer @supabase/ssr**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Voeg de Slack-webhook env-var toe aan .env.local**

Genereer een nieuwe Slack incoming webhook (Slack App Settings → Incoming Webhooks). Voeg toe aan `.env.local`:

```bash
# Slack-webhook voor dashboard signup-notificaties.
# Wanneer een nieuwe klant een account aanmaakt op app.frontlix.com,
# postet de signup server-action een melding hier zodat Frontlix-team
# de aanvraag handmatig kan goedkeuren in Supabase Studio.
SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL=https://hooks.slack.com/services/...

# Dashboard verbindt met de schoon-straatje Supabase (NIET de Frontlix-website
# Supabase) want daar staan de leads/berichten/etc. Voor v1 hardcoded; bij
# multi-tenant migratie wordt dit dynamisch.
NEXT_PUBLIC_SUPABASE_URL_DASHBOARD=https://<schoon-straatje-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD=<schoon-straatje-anon-key>
SUPABASE_SERVICE_ROLE_KEY_DASHBOARD=<schoon-straatje-service-key>
```

Vul de drie SUPABASE_*_DASHBOARD vars met de waarden van het schoon-straatje project (niet de Frontlix-website project). Vraag de waardes uit de schoon-straatje-bot `.env` of uit Supabase Studio → Project Settings → API.

- [ ] **Step 3: Type-check**

```bash
npm run build
```

Verwacht: geen TS-errors (er is nog geen code die de nieuwe vars gebruikt — Task 4 introduceert ze).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add @supabase/ssr for cookie-based auth sessions"
```

(`.env.local` is in `.gitignore`, niet committen.)

---

### Task 4: Supabase clients (lib/dashboard/supabase-*.ts)

**Files:**
- Create: `lib/dashboard/supabase-server.ts`
- Create: `lib/dashboard/supabase-browser.ts`
- Create: `lib/dashboard/supabase-admin.ts`

- [ ] **Step 1: Maak de directory aan**

```bash
mkdir -p lib/dashboard
```

- [ ] **Step 2: Schrijf supabase-server.ts**

Bestand `lib/dashboard/supabase-server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client met session uit cookies.
 * Gebruik in Server Components, Server Actions en Route Handlers.
 *
 * Respecteert RLS — als je RLS wilt bypassen voor admin-werk, gebruik dan
 * getDashboardAdmin() uit supabase-admin.ts.
 */
export async function getDashboardSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll wordt aangeroepen vanuit een Server Component —
            // negeren is veilig zolang je middleware de session refresht.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 3: Schrijf supabase-browser.ts**

Bestand `lib/dashboard/supabase-browser.ts`:

```typescript
'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client. Gebruik in Client Components, bv. voor
 * realtime channels op /wachtkamer of /leads.
 *
 * Cookies worden automatisch beheerd door @supabase/ssr.
 */
export function createDashboardClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD!
  )
}
```

- [ ] **Step 4: Schrijf supabase-admin.ts**

Bestand `lib/dashboard/supabase-admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasst RLS — gebruik ALLEEN server-side
 * voor admin-acties zoals het uitnodigen van users (Plan 7) of het
 * inserten van een profile-rij vlak nadat de Auth Hook 'm aanmaakt.
 *
 * NOOIT importeren in een Client Component — dan lekt de service-key
 * naar de browser.
 */
let _admin: ReturnType<typeof createClient> | null = null

export function getDashboardAdmin() {
  if (_admin) return _admin

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_DASHBOARD

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL_DASHBOARD en SUPABASE_SERVICE_ROLE_KEY_DASHBOARD moeten gezet zijn'
    )
  }

  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _admin
}
```

- [ ] **Step 5: Type-check**

```bash
npm run build
```

Verwacht: geen errors.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/
git commit -m "feat(dashboard): add Supabase clients (server, browser, admin) for dashboard DB"
```

---

### Task 5: Auth helpers (lib/dashboard/auth.ts)

**Files:**
- Create: `lib/dashboard/auth.ts`
- Create: `lib/dashboard/auth.test.ts` (vitest)

- [ ] **Step 1: Voeg vitest toe aan de Frontlix-repo (eenmalig)**

Check of vitest al in `package.json` staat:

```bash
grep -q '"vitest"' package.json && echo "al aanwezig" || echo "ontbreekt"
```

Als ontbreekt, installeer:

```bash
npm install --save-dev vitest @vitest/ui
```

Voeg in `package.json` scripts-block toe (gebruik Edit tool, niet `sed`):

```json
"test": "vitest run",
"test:watch": "vitest"
```

Maak `vitest.config.ts` in de project root. **Belangrijk:** path-alias `@/` moet daar ook werken want sommige tests gebruiken `import { ... } from '@/lib/dashboard/...'`.

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 2: Schrijf de failing tests**

Bestand `lib/dashboard/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Supabase server-client voordat we onze module importeren.
const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import { getCurrentUser, getCurrentUserProfile } from './auth'

describe('getCurrentUser', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
  })

  it('retourneert de user als ingelogd', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    })

    const user = await getCurrentUser()

    expect(user).not.toBeNull()
    expect(user!.id).toBe('u1')
  })

  it('retourneert null als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const user = await getCurrentUser()

    expect(user).toBeNull()
  })

  it('retourneert null bij Supabase-error (geen exceptie)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired' },
    })

    const user = await getCurrentUser()

    expect(user).toBeNull()
  })
})

describe('getCurrentUserProfile', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockMaybeSingle.mockReset()
    mockSelect.mockClear()
    mockFrom.mockClear()
    mockEq.mockClear()
  })

  it('retourneert de profile-rij als user ingelogd is', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mockMaybeSingle.mockResolvedValue({
      data: {
        user_id: 'u1',
        tenant_status: 'approved',
        bedrijfsnaam: 'Schoon Straatje',
        is_owner: true,
        onboarding_voltooid_op: null,
      },
      error: null,
    })

    const profile = await getCurrentUserProfile()

    expect(profile).not.toBeNull()
    expect(profile!.tenant_status).toBe('approved')
    expect(mockFrom).toHaveBeenCalledWith('dashboard_user_profiles')
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('retourneert null als user niet ingelogd is (skipt query)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const profile = await getCurrentUserProfile()

    expect(profile).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('retourneert null als profile-rij niet bestaat', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const profile = await getCurrentUserProfile()

    expect(profile).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/auth.test.ts
```

Verwacht: alle tests falen omdat `lib/dashboard/auth.ts` niet bestaat.

- [ ] **Step 4: Implementeer auth.ts**

Bestand `lib/dashboard/auth.ts`:

```typescript
import type { User } from '@supabase/supabase-js'
import { getDashboardSupabase } from './supabase-server'

export interface DashboardUserProfile {
  user_id: string
  tenant_status: 'pending' | 'approved' | 'rejected'
  bedrijfsnaam: string | null
  is_owner: boolean
  onboarding_voltooid_op: string | null
}

/**
 * Retourneert de huidig ingelogde Supabase-Auth user, of null als er geen
 * sessie is. Faalt nooit met een exception — RLS / network errors worden
 * als "niet ingelogd" behandeld zodat aanroepers altijd kunnen doorgaan
 * met een redirect-naar-login fallback.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user ?? null
}

/**
 * Haalt de dashboard_user_profiles-rij voor de huidige user op. Retourneert
 * null als (a) niet ingelogd of (b) profile-rij ontbreekt — dat laatste is
 * een data-integriteit issue (de Auth Hook trigger zou 'm moeten hebben
 * gemaakt) en wordt als geen-toegang behandeld.
 */
export async function getCurrentUserProfile(): Promise<DashboardUserProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await getDashboardSupabase()
  const { data } = await supabase
    .from('dashboard_user_profiles')
    .select('user_id, tenant_status, bedrijfsnaam, is_owner, onboarding_voltooid_op')
    .eq('user_id', user.id)
    .maybeSingle()

  return (data as DashboardUserProfile | null) ?? null
}
```

- [ ] **Step 5: Run tests, verwacht green**

```bash
npm run test -- lib/dashboard/auth.test.ts
```

Verwacht: 6 tests slagen.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/auth.ts lib/dashboard/auth.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat(dashboard): add auth helpers (getCurrentUser, getCurrentUserProfile) with tests"
```

---

### Task 6: Slack-notification helper (lib/dashboard/slack.ts)

**Files:**
- Create: `lib/dashboard/slack.ts`
- Create: `lib/dashboard/slack.test.ts`

- [ ] **Step 1: Schrijf de failing tests**

Bestand `lib/dashboard/slack.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  process.env.SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL = 'https://hooks.slack.test/abc'
})

import { postSignupNotification } from './slack'

describe('postSignupNotification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('POST naar de configured Slack-webhook met JSON body', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 })
    )

    await postSignupNotification('Nieuwe aanvraag: Bedrijf X — a@b.c')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('https://hooks.slack.test/abc')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(init?.body).toBe(
      JSON.stringify({ text: 'Nieuwe aanvraag: Bedrijf X — a@b.c' })
    )
  })

  it('faalt stilletjes (geen exception) als de webhook ontbreekt', async () => {
    delete process.env.SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL
    const fetchSpy = vi.spyOn(global, 'fetch')

    await expect(postSignupNotification('test')).resolves.toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('faalt stilletjes als Slack 500 retourneert (logt wel)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 })
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(postSignupNotification('test')).resolves.toBeUndefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/slack.test.ts
```

- [ ] **Step 3: Implementeer slack.ts**

Bestand `lib/dashboard/slack.ts`:

```typescript
/**
 * Postet een tekstuele notificatie naar de dashboard-signup Slack-webhook.
 *
 * Faalt nooit met een exception: de signup-server-action mag niet worden
 * geblokkeerd door een Slack-outage. Bij een ontbrekende env-var of een
 * non-2xx response loggen we naar console.error en gaan we door.
 */
export async function postSignupNotification(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL
  if (!url) {
    console.error(
      '[slack] SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL niet gezet — signup-notificatie wordt overgeslagen'
    )
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error('[slack] webhook gaf non-2xx:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[slack] post failed:', err)
  }
}
```

- [ ] **Step 4: Run tests, verwacht green**

```bash
npm run test -- lib/dashboard/slack.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/slack.ts lib/dashboard/slack.test.ts
git commit -m "feat(dashboard): add Slack signup-notification helper with tests"
```

---

### Task 7: middleware.ts — subdomein-routing + auth-check

**Files:**
- Create: `middleware.ts`
- Create: `middleware.test.ts`

- [ ] **Step 1: Schrijf de failing tests**

Bestand `middleware.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

// We mocken @supabase/ssr volledig — middleware moet werken zonder echte DB.
const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

import { middleware } from './middleware'

function makeRequest(host: string, pathname: string, hasSession = false) {
  const url = new URL(`https://${host}${pathname}`)
  const cookies = hasSession
    ? { 'sb-access-token': 'fake' }
    : {}

  return {
    nextUrl: { ...url, pathname, clone: () => new URL(url.toString()) },
    url: url.toString(),
    headers: new Headers({ host }),
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      get: (name: string) => (cookies[name as keyof typeof cookies] ? { name, value: cookies[name as keyof typeof cookies] } : undefined),
      set: vi.fn(),
    },
  } as unknown as Parameters<typeof middleware>[0]
}

describe('middleware host-based routing', () => {
  beforeEach(() => mockGetUser.mockReset())

  it('app.frontlix.com / met session → rewrite naar /dashboard/', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const req = makeRequest('app.frontlix.com', '/', true)

    const res = await middleware(req)

    // NextResponse.rewrite() zet de header x-middleware-rewrite met de
    // interne URL waar Next.js naar moet routeren.
    expect(res.headers.get('x-middleware-rewrite')).toMatch(/\/dashboard$|\/dashboard\//)
  })

  it('frontlix.com / → laat door, geen rewrite, geen redirect', async () => {
    const req = makeRequest('frontlix.com', '/', false)

    const res = await middleware(req)

    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(308)
  })

  it('frontlix.com /dashboard/leads → 404 (block dashboard via marketing host)', async () => {
    const req = makeRequest('frontlix.com', '/dashboard/leads', false)

    const res = await middleware(req)

    expect(res.status).toBe(404)
  })

  it('app.frontlix.com /leads zonder session → redirect naar /login met next param', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('app.frontlix.com', '/leads', false)

    const res = await middleware(req)

    const location = res.headers.get('location') ?? ''
    expect(location).toMatch(/\/login/)
    expect(location).toMatch(/next=%2Fleads/)
  })

  it('app.frontlix.com /login zonder session → rewrite naar /dashboard/login (laat door)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('app.frontlix.com', '/login', false)

    const res = await middleware(req)

    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toMatch(/\/dashboard\/login/)
  })

  it('app.frontlix.com /login MET session → redirect naar /leads (skip auth-pagina)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const req = makeRequest('app.frontlix.com', '/login', true)

    const res = await middleware(req)

    expect(res.headers.get('location')).toMatch(/\/leads/)
  })

  it('app.frontlix.com /wachtkamer zonder session → rewrite naar /dashboard/wachtkamer (publiek)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('app.frontlix.com', '/wachtkamer', false)

    const res = await middleware(req)

    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-rewrite')).toMatch(/\/dashboard\/wachtkamer/)
  })

  it('app.frontlix.com /dashboard/leads (expliciet getypte prefix) → redirect naar /leads', async () => {
    const req = makeRequest('app.frontlix.com', '/dashboard/leads', false)

    const res = await middleware(req)

    expect(res.headers.get('location')).toMatch(/\/leads$/)
  })
})
```

**Note:** de tests gebruiken een minimale request-mock. Als NextResponse-internals afwijkend gedragen, gebruik dan een lichtere assertion zoals `res.status` of `res.url`. Belangrijkste signaal: redirects zetten `Location`-header, rewrites zetten `x-middleware-rewrite`-header. Beide zijn observable.

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- middleware.test.ts
```

- [ ] **Step 3: Implementeer middleware.ts**

Bestand `middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DASHBOARD_HOSTS = new Set([
  'app.frontlix.com',
  'app.localhost:3000', // lokaal: voeg "127.0.0.1 app.localhost" toe aan /etc/hosts
])

// Paden binnen de dashboard-host die GEEN session vereisen.
const PUBLIC_DASHBOARD_PATHS = new Set([
  '/login',
  '/signup',
  '/wachtkamer',
])

function isDashboardHost(host: string | null): boolean {
  return host !== null && DASHBOARD_HOSTS.has(host)
}

function isAssetPath(pathname: string): boolean {
  return pathname.startsWith('/_next') ||
         pathname.startsWith('/api') ||
         pathname === '/favicon.ico' ||
         pathname === '/robots.txt' ||
         pathname === '/sitemap.xml'
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')
  const { pathname } = request.nextUrl

  // ─────────────────────────────────────────────────────────────────────
  // MARKETING HOST (frontlix.com): block dashboard-paden, laat rest door
  // ─────────────────────────────────────────────────────────────────────
  if (!isDashboardHost(host)) {
    // Voorkom dat dashboard-routes per ongeluk via de marketing host
    // bereikbaar zijn (bv. iemand probeert frontlix.com/dashboard/leads).
    if (pathname.startsWith('/dashboard')) {
      return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
  }

  // ─────────────────────────────────────────────────────────────────────
  // DASHBOARD HOST (app.frontlix.com): rewrite naar /dashboard prefix
  // ─────────────────────────────────────────────────────────────────────

  // Assets en API routes laten we ongewijzigd door — die zitten niet in /dashboard.
  if (isAssetPath(pathname)) {
    return NextResponse.next()
  }

  // Als iemand expliciet /dashboard/... typed op de dashboard-host,
  // strippen we die prefix zodat de canonical URL altijd zonder is.
  if (pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/dashboard/, '') || '/'
    return NextResponse.redirect(url)
  }

  // Bouw het response-object dat we doorreiken (cookies kunnen erin landen).
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_DASHBOARD_PATHS.has(pathname)

  // Reeds ingelogd + op login/signup pagina → redirect naar /leads
  // (server-side moet weten welke status, zie /login server action; hier alleen UX).
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/leads'
    return NextResponse.redirect(url)
  }

  // Niet ingelogd + op een private pagina → naar /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Rewrite: app.frontlix.com/leads → intern /dashboard/leads
  // Browser blijft de externe URL tonen; Next.js routeert naar
  // app/dashboard/.../page.tsx.
  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = `/dashboard${pathname === '/' ? '' : pathname}`

  // Belangrijk: cookies uit de Supabase-session moeten in de response
  // landen, dus we klonen niet `response` weg maar maken een nieuwe rewrite
  // op basis van dezelfde cookies.
  const rewritten = NextResponse.rewrite(rewriteUrl, { request })
  // Kopieer de Supabase auth-cookies door:
  response.cookies.getAll().forEach((c) => {
    rewritten.cookies.set(c.name, c.value, c)
  })
  return rewritten
}

export const config = {
  matcher: [
    /*
     * Match alle paden behalve standaard Next.js assets. De middleware
     * doet zelf nog een fijnere isAssetPath()-check intern.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Belangrijk verschil met v1 van dit plan:** we gebruiken **fysieke folder `app/dashboard/`** in plaats van een `(dashboard)` route group. De middleware rewrite intern `/leads` naar `/dashboard/leads` zodat de juiste page-file serveert. URL-bar van de gebruiker toont nog steeds `app.frontlix.com/leads`.

- [ ] **Step 4: Run tests**

```bash
npm run test -- middleware.test.ts
```

Verwacht: 6 tests slagen. Als de NextResponse-assertions in de tests problemen geven (omdat NextResponse zich gedraagt als een echte Response), kan je de assertions versimpelen tot `expect(res.headers.get('location'))`-checks via `Response.redirect`.

- [ ] **Step 5: Commit**

```bash
git add middleware.ts middleware.test.ts
git commit -m "feat(middleware): add subdomain routing + auth-check for app.frontlix.com"
```

---

### Task 8: Auth route group + minimal auth layout

**Files:**
- Create: `app/dashboard/(auth)/layout.tsx`
- Create: `app/dashboard/(auth)/layout.module.css`

- [ ] **Step 1: Maak de directory aan**

```bash
mkdir -p "app/dashboard/(auth)"
```

- [ ] **Step 2: Schrijf de layout**

Bestand `app/dashboard/(auth)/layout.tsx`:

```tsx
import Link from 'next/link'
import Image from 'next/image'
import styles from './layout.module.css'

/**
 * Layout voor publieke auth-pagina's (/login, /signup, /wachtkamer).
 * Minimale shell: Frontlix-logo bovenin, gecentreerde content.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/logo_frontlix_trans.png"
            alt="Frontlix"
            width={120}
            height={32}
            priority
          />
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
```

Bestand `app/dashboard/(auth)/layout.module.css`:

```css
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.logoLink {
  display: inline-block;
}

.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-6);
}
```

- [ ] **Step 3: Type-check en commit**

```bash
npm run build
git add "app/dashboard/(auth)"
git commit -m "feat(auth): add auth route group + minimal shell layout"
```

---

### Task 9: /login pagina + server action

**Files:**
- Create: `app/dashboard/(auth)/login/page.tsx`
- Create: `app/dashboard/(auth)/login/actions.ts`
- Create: `app/dashboard/(auth)/login/page.module.css`

- [ ] **Step 1: Schrijf de server action**

Bestand `app/dashboard/(auth)/login/actions.ts`:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export type LoginState = { error?: string }

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const wachtwoord = String(formData.get('wachtwoord') ?? '')

  if (!email || !wachtwoord) {
    return { error: 'Vul email en wachtwoord in.' }
  }

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: wachtwoord,
  })

  if (error || !data.user) {
    return { error: 'E-mail of wachtwoord onjuist.' }
  }

  // Check tenant_status — pending → wachtkamer, rejected → foutmelding,
  // approved → /leads.
  const { data: profile } = await supabase
    .from('dashboard_user_profiles')
    .select('tenant_status')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!profile) {
    // Profile-rij ontbreekt — Auth Hook zou dit hebben moeten vangen.
    // Forceer logout om geen geldige session in een ongeldige state te laten.
    await supabase.auth.signOut()
    return { error: 'Account-configuratie ontbreekt. Neem contact op met Frontlix.' }
  }

  if (profile.tenant_status === 'rejected') {
    await supabase.auth.signOut()
    return { error: 'Aanvraag afgewezen.' }
  }

  if (profile.tenant_status === 'pending') {
    redirect('/wachtkamer')
  }

  redirect('/leads')
}
```

- [ ] **Step 2: Schrijf de page**

Bestand `app/dashboard/(auth)/login/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction, type LoginState } from './actions'
import styles from './page.module.css'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Inloggen</h1>
      <p className={styles.subtitle}>Log in op het Frontlix dashboard.</p>

      <form action={formAction} className={styles.form}>
        <label className={styles.label}>
          E-mail
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className={styles.input}
          />
        </label>

        <label className={styles.label}>
          Wachtwoord
          <input
            type="password"
            name="wachtwoord"
            required
            autoComplete="current-password"
            className={styles.input}
          />
        </label>

        {state.error && <p className={styles.error}>{state.error}</p>}

        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>

      <p className={styles.footer}>
        Nog geen account? <Link href="/signup">Aanmelden</Link>
      </p>
    </div>
  )
}
```

Bestand `app/dashboard/(auth)/login/page.module.css`:

```css
.card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
}

.title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 700;
  background: var(--color-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subtitle {
  margin: 0 0 var(--space-6);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.input {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font: inherit;
  color: var(--color-text);
}

.input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.error {
  margin: 0;
  padding: var(--space-3);
  background: rgba(255, 60, 60, 0.08);
  color: #c33;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.submit {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-gradient);
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footer {
  margin: var(--space-6) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
}

.footer a {
  color: var(--color-primary);
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/(auth)/login"
git commit -m "feat(auth): add /login page + signin server action with status routing"
```

---

### Task 10: /signup pagina + server action (incl. Slack-notify)

**Files:**
- Create: `app/dashboard/(auth)/signup/page.tsx`
- Create: `app/dashboard/(auth)/signup/actions.ts`
- Create: `app/dashboard/(auth)/signup/page.module.css`
- Create: `app/dashboard/(auth)/signup/actions.test.ts`

- [ ] **Step 1: Schrijf de failing tests voor de server action**

Bestand `app/dashboard/(auth)/signup/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignUp = vi.fn()
const mockUpsert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/dashboard/supabase-admin', () => ({
  getDashboardAdmin: () => ({
    auth: { admin: { /* niet gebruikt door signup */ } },
    from: () => ({ upsert: mockUpsert }),
  }),
}))
vi.mock('@/lib/dashboard/supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { signUp: mockSignUp },
  }),
}))
const mockSlack = vi.fn()
vi.mock('@/lib/dashboard/slack', () => ({
  postSignupNotification: mockSlack,
}))
const mockRedirect = vi.fn(() => { throw new Error('REDIRECT') })
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

import { signupAction } from './actions'

function makeFormData(values: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.set(k, v)
  return fd
}

describe('signupAction', () => {
  beforeEach(() => {
    mockSignUp.mockReset()
    mockUpsert.mockClear()
    mockUpsert.mockResolvedValue({ error: null })
    mockSlack.mockReset()
    mockRedirect.mockClear()
  })

  it('vereist email, wachtwoord, bedrijfsnaam', async () => {
    const result = await signupAction({}, makeFormData({ email: '', wachtwoord: '', bedrijfsnaam: '' }))
    expect(result.error).toMatch(/vul/i)
  })

  it('vereist wachtwoord van minstens 8 tekens', async () => {
    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'kort', bedrijfsnaam: 'X',
    }))
    expect(result.error).toMatch(/wachtwoord/i)
  })

  it('roept Supabase signUp + upsert profile + slack-notify, dan redirect', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' } },
      error: null,
    })

    await expect(signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Bedrijf X',
    }))).rejects.toThrow('REDIRECT')

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'wachtwoord123',
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: 'u1',
        bedrijfsnaam: 'Bedrijf X',
        tenant_status: 'pending',
        is_owner: true,
      },
      { onConflict: 'user_id' }
    )
    expect(mockSlack).toHaveBeenCalledWith(
      expect.stringContaining('Bedrijf X')
    )
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect tóch als profile-upsert faalt, en vlagt in Slack', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'u2' } }, error: null,
    })
    mockUpsert.mockResolvedValueOnce({ error: { message: 'boom' } })

    await expect(signupAction({}, makeFormData({
      email: 'b@c.d', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'Y',
    }))).rejects.toThrow('REDIRECT')

    expect(mockSlack).toHaveBeenCalledWith(
      expect.stringContaining('handmatig aanmaken')
    )
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('retourneert error bij Supabase signUp failure (geen redirect, geen slack)', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const result = await signupAction({}, makeFormData({
      email: 'a@b.c', wachtwoord: 'wachtwoord123', bedrijfsnaam: 'X',
    }))

    expect(result.error).toBeDefined()
    expect(mockSlack).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- "app/dashboard/(auth)/signup/actions.test.ts"
```

- [ ] **Step 3: Implementeer de server action**

Bestand `app/dashboard/(auth)/signup/actions.ts`:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { getDashboardAdmin } from '@/lib/dashboard/supabase-admin'
import { postSignupNotification } from '@/lib/dashboard/slack'

export type SignupState = { error?: string }

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = String(formData.get('email') ?? '').trim()
  const wachtwoord = String(formData.get('wachtwoord') ?? '')
  const bedrijfsnaam = String(formData.get('bedrijfsnaam') ?? '').trim()

  if (!email || !wachtwoord || !bedrijfsnaam) {
    return { error: 'Vul email, wachtwoord en bedrijfsnaam in.' }
  }
  if (wachtwoord.length < 8) {
    return { error: 'Wachtwoord moet minstens 8 tekens zijn.' }
  }

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase.auth.signUp({ email, password: wachtwoord })

  if (error || !data.user) {
    return { error: error?.message ?? 'Aanmelden mislukt.' }
  }

  // Maak de dashboard_user_profiles-rij aan met tenant_status='pending'.
  // We doen dit hier (in plaats van via een AFTER INSERT-trigger op auth.users)
  // omdat Supabase geen DDL toestaat op auth.users — die tabel is eigendom
  // van supabase_auth_admin. Service-key bypasst RLS zodat de INSERT slaagt
  // ondanks dat de huidige session nog niet actief is.
  // UPSERT zodat een retry na fouten geen duplicate key conflict geeft.
  const admin = getDashboardAdmin()
  const { error: profileErr } = await admin
    .from('dashboard_user_profiles')
    .upsert(
      {
        user_id: data.user.id,
        bedrijfsnaam,
        tenant_status: 'pending',
        is_owner: true,
      },
      { onConflict: 'user_id' }
    )

  if (profileErr) {
    // Auth.user is gemaakt maar profile niet — log voor manuele opvolging.
    // We blokkeren de redirect niet zodat user toch de wachtkamer ziet;
    // Frontlix-admin krijgt de Slack-notify en kan handmatig de profile-rij
    // maken in Supabase Studio.
    console.error('[signup] profile-upsert failed:', profileErr)
  }

  await postSignupNotification(
    `🆕 Nieuwe dashboard-aanvraag: *${bedrijfsnaam}* — ${email}` +
      (profileErr ? ` ⚠️ profile-rij ontbreekt, handmatig aanmaken!` : '')
  )

  redirect('/wachtkamer')
}
```

- [ ] **Step 4: Run tests, verwacht green**

```bash
npm run test -- "app/dashboard/(auth)/signup/actions.test.ts"
```

- [ ] **Step 5: Schrijf de page**

Bestand `app/dashboard/(auth)/signup/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signupAction, type SignupState } from './actions'
import styles from './page.module.css'

const initialState: SignupState = {}

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState)

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Aanmelden</h1>
      <p className={styles.subtitle}>
        Vraag een dashboard-account aan. We bekijken je aanvraag handmatig en geven binnen 1 werkdag toegang.
      </p>

      <form action={formAction} className={styles.form}>
        <label className={styles.label}>
          Bedrijfsnaam
          <input type="text" name="bedrijfsnaam" required className={styles.input} />
        </label>

        <label className={styles.label}>
          E-mail
          <input type="email" name="email" required autoComplete="email" className={styles.input} />
        </label>

        <label className={styles.label}>
          Wachtwoord
          <input
            type="password"
            name="wachtwoord"
            required
            minLength={8}
            autoComplete="new-password"
            className={styles.input}
          />
          <span className={styles.hint}>Minstens 8 tekens.</span>
        </label>

        {state.error && <p className={styles.error}>{state.error}</p>}

        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? 'Bezig…' : 'Aanvraag versturen'}
        </button>
      </form>

      <p className={styles.footer}>
        Heb je al een account? <Link href="/login">Inloggen</Link>
      </p>
    </div>
  )
}
```

Bestand `app/dashboard/(auth)/signup/page.module.css`:

```css
/* Hergebruik de stijl van /login. Doel: visueel identiek aan login-card. */
@import url('../login/page.module.css');

.hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: calc(var(--space-2) * -1);
}
```

(Note: CSS Modules' `@import` werkt niet voor compositions. Als build hierop crasht, dupliceer dan de login-stijlen of refactor naar een gedeelde CSS Module. Acceptabel voor v1: dupliceer.)

Als duplicatie nodig is, vervang `signup/page.module.css` door:

```css
.card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
}
.title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 700;
  background: var(--color-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.subtitle { margin: 0 0 var(--space-6); color: var(--color-text-muted); font-size: var(--text-sm); }
.form { display: flex; flex-direction: column; gap: var(--space-4); }
.label { display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--text-sm); color: var(--color-text); }
.input { padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); font: inherit; color: var(--color-text); }
.input:focus { outline: 2px solid var(--color-primary); outline-offset: -1px; }
.hint { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: calc(var(--space-2) * -1); }
.error { margin: 0; padding: var(--space-3); background: rgba(255, 60, 60, 0.08); color: #c33; border-radius: var(--radius-md); font-size: var(--text-sm); }
.submit { margin-top: var(--space-2); padding: var(--space-3); border: none; border-radius: var(--radius-md); background: var(--color-gradient); color: white; font-weight: 600; cursor: pointer; }
.submit:disabled { opacity: 0.6; cursor: not-allowed; }
.footer { margin: var(--space-6) 0 0; font-size: var(--text-sm); color: var(--color-text-muted); text-align: center; }
.footer a { color: var(--color-primary); text-decoration: none; }
.footer a:hover { text-decoration: underline; }
```

- [ ] **Step 6: Commit**

```bash
git add "app/dashboard/(auth)/signup"
git commit -m "feat(auth): add /signup page + server action with profile-update + Slack notify"
```

---

### Task 11: /wachtkamer pagina

**Files:**
- Create: `app/dashboard/(auth)/wachtkamer/page.tsx`
- Create: `app/dashboard/(auth)/wachtkamer/page.module.css`
- Create: `app/dashboard/(auth)/wachtkamer/poll-approval.tsx` (Client Component)

- [ ] **Step 1: Schrijf de Server Component pagina**

Bestand `app/dashboard/(auth)/wachtkamer/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { PollApproval } from './poll-approval'
import styles from './page.module.css'

export default async function WachtkamerPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.tenant_status === 'approved') {
    redirect('/leads')
  }

  if (profile.tenant_status === 'rejected') {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Aanvraag afgewezen</h1>
        <p>Je aanvraag is helaas niet goedgekeurd. Neem contact op met Frontlix als dit een vergissing is.</p>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Aanvraag in behandeling</h1>
      <p className={styles.subtitle}>
        Bedankt voor je aanvraag, <strong>{profile.bedrijfsnaam ?? 'Klant'}</strong>.
      </p>
      <p>
        We bekijken je aanvraag handmatig — meestal binnen 1 werkdag. Zodra je toegang krijgt verschijnt het dashboard automatisch op deze pagina.
      </p>
      <PollApproval />
      <p className={styles.footer}>
        Heb je vragen? Mail <a href="mailto:hallo@frontlix.com">hallo@frontlix.com</a>.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Schrijf de polling Client Component**

Bestand `app/dashboard/(auth)/wachtkamer/poll-approval.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createDashboardClient } from '@/lib/dashboard/supabase-browser'

/**
 * Detecteert wanneer de huidige user wordt goedgekeurd door Frontlix-admin
 * en ververst de pagina (waarna de Server Component naar /leads redirect).
 *
 * Werkt via realtime channel — geen polling-loop, dus geen onnodige load.
 */
export function PollApproval() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createDashboardClient()
    let cancelled = false

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`profile:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dashboard_user_profiles',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as { tenant_status?: string }
            if (newRow?.tenant_status === 'approved' && !cancelled) {
              router.refresh()
            }
          }
        )
        .subscribe()

      return () => {
        cancelled = true
        void supabase.removeChannel(channel)
      }
    }

    const cleanup = setup()
    return () => {
      void cleanup.then((fn) => fn?.())
    }
  }, [router])

  return null
}
```

- [ ] **Step 3: Schrijf de styles**

Bestand `app/dashboard/(auth)/wachtkamer/page.module.css`:

```css
.card {
  width: 100%;
  max-width: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
}

.title {
  margin: 0 0 var(--space-4);
  font-size: var(--text-2xl);
  font-weight: 700;
  background: var(--color-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.subtitle {
  margin: 0 0 var(--space-4);
  font-size: var(--text-base);
}

.footer {
  margin: var(--space-6) 0 0;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/(auth)/wachtkamer"
git commit -m "feat(auth): add /wachtkamer page with realtime approval-check"
```

---

### Task 12: Dashboard layout-shell + placeholder pagina's

**Files:**
- Create: `app/dashboard/layout.tsx`
- Create: `app/dashboard/layout.module.css`
- Create: `app/dashboard/leads/page.tsx`
- Create: `app/dashboard/agenda/page.tsx`
- Create: `app/dashboard/statistieken/page.tsx`
- Create: `app/dashboard/instellingen/page.tsx`
- Create: `components/dashboard/Sidebar.tsx` + `Sidebar.module.css`
- Create: `components/dashboard/Topbar.tsx` + `Topbar.module.css`
- Create: `components/dashboard/UserMenu.tsx` + `UserMenu.module.css`
- Create: `app/dashboard/logout/route.ts`

- [ ] **Step 1: Maak de directory aan**

```bash
mkdir -p "app/dashboard/leads"
mkdir -p "app/dashboard/agenda"
mkdir -p "app/dashboard/statistieken"
mkdir -p "app/dashboard/instellingen"
mkdir -p "app/dashboard/logout"
mkdir -p "components/dashboard"
```

- [ ] **Step 2: Sidebar component**

Bestand `components/dashboard/Sidebar.tsx`:

```tsx
import Link from 'next/link'
import {
  LayoutGrid,
  Calendar,
  BarChart3,
  Settings,
} from 'lucide-react'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/leads', label: 'Leads', Icon: LayoutGrid },
  { href: '/agenda', label: 'Agenda', Icon: Calendar },
  { href: '/statistieken', label: 'Statistieken', Icon: BarChart3 },
  { href: '/instellingen', label: 'Instellingen', Icon: Settings },
]

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={styles.link}>
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

Bestand `components/dashboard/Sidebar.module.css`:

```css
.sidebar {
  width: 220px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-3);
  flex-shrink: 0;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
  transition: background 0.15s ease;
}

.link:hover {
  background: var(--color-surface-2);
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
```

- [ ] **Step 3: Topbar + UserMenu component**

Bestand `components/dashboard/Topbar.tsx`:

```tsx
import { UserMenu } from './UserMenu'
import styles from './Topbar.module.css'

export function Topbar({ bedrijfsnaam, email }: { bedrijfsnaam: string; email: string }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>{bedrijfsnaam}</div>
      <UserMenu email={email} />
    </header>
  )
}
```

Bestand `components/dashboard/Topbar.module.css`:

```css
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}

.brand {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}
```

Bestand `components/dashboard/UserMenu.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { LogOut, User as UserIcon } from 'lucide-react'
import styles from './UserMenu.module.css'

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={styles.wrap}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserIcon size={16} />
        <span className={styles.email}>{email}</span>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <a href="/logout" className={styles.item}>
            <LogOut size={16} />
            <span>Uitloggen</span>
          </a>
        </div>
      )}
    </div>
  )
}
```

Bestand `components/dashboard/UserMenu.module.css`:

```css
.wrap {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  font: inherit;
  color: var(--color-text);
  cursor: pointer;
}

.email {
  font-size: var(--text-sm);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-2));
  min-width: 180px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: var(--space-2);
  z-index: 10;
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  text-decoration: none;
  font-size: var(--text-sm);
}

.item:hover {
  background: var(--color-surface-2);
}
```

- [ ] **Step 4: Logout route handler**

Bestand `app/dashboard/logout/route.ts`:

```typescript
import { redirect } from 'next/navigation'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export async function GET() {
  const supabase = await getDashboardSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 5: Dashboard layout**

Bestand `app/dashboard/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentUserProfile } from '@/lib/dashboard/auth'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Topbar } from '@/components/dashboard/Topbar'
import styles from './layout.module.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    redirect('/wachtkamer')
  }

  // Bedrijfsnaam uit tenant_settings (v1: één rij). Fallback naar profile-naam.
  const supabase = await getDashboardSupabase()
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('bedrijfsnaam')
    .limit(1)
    .maybeSingle()

  const bedrijfsnaam = settings?.bedrijfsnaam ?? profile.bedrijfsnaam ?? 'Dashboard'

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar bedrijfsnaam={bedrijfsnaam} email={user.email ?? ''} />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
```

Bestand `app/dashboard/layout.module.css`:

```css
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}

.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.content {
  flex: 1;
  padding: var(--space-8) var(--space-6);
  overflow: auto;
}
```

- [ ] **Step 6: Placeholder pagina's**

Elke placeholder is identiek qua structuur — copy-paste maar met andere koptekst. Voorbeeld voor leads:

Bestand `app/dashboard/leads/page.tsx`:

```tsx
export default function LeadsPage() {
  return (
    <div>
      <h1>Leads</h1>
      <p>Binnenkort: overzicht van al je leads, gesprekken, foto&apos;s en offertes.</p>
    </div>
  )
}
```

Bestand `app/dashboard/agenda/page.tsx`:

```tsx
export default function AgendaPage() {
  return (
    <div>
      <h1>Agenda</h1>
      <p>Binnenkort: week- en maandweergave van je geboekte afspraken.</p>
    </div>
  )
}
```

Bestand `app/dashboard/statistieken/page.tsx`:

```tsx
export default function StatistiekenPage() {
  return (
    <div>
      <h1>Statistieken</h1>
      <p>Binnenkort: aantal leads, conversie, trends en funnel-analyse.</p>
    </div>
  )
}
```

Bestand `app/dashboard/instellingen/page.tsx`:

```tsx
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export default async function InstellingenPage() {
  const supabase = await getDashboardSupabase()
  const { data } = await supabase
    .from('tenant_settings')
    .select('bedrijfsnaam, eigenaar_email, eigenaar_whatsapp, plaats')
    .limit(1)
    .maybeSingle()

  return (
    <div>
      <h1>Instellingen</h1>
      <p>
        Hieronder zie je de huidige instellingen van je dashboard. Aanpassen via het dashboard volgt in een latere release;
        voor nu kunnen wijzigingen door Frontlix worden doorgevoerd.
      </p>
      <dl>
        <dt>Bedrijfsnaam</dt><dd>{data?.bedrijfsnaam ?? '—'}</dd>
        <dt>Plaats</dt><dd>{data?.plaats ?? '—'}</dd>
        <dt>E-mail</dt><dd>{data?.eigenaar_email ?? '—'}</dd>
        <dt>WhatsApp</dt><dd>{data?.eigenaar_whatsapp ?? '—'}</dd>
      </dl>
    </div>
  )
}
```

- [ ] **Step 7: Type-check**

```bash
npm run build
```

Verwacht: succesvolle build (alle nieuwe routes detected, geen TS-errors).

- [ ] **Step 8: Commit**

```bash
git add "app/dashboard" "components/dashboard"
git commit -m "feat(dashboard): add layout shell with sidebar/topbar + placeholder pages + logout route"
```

---

### Task 13: End-to-end smoke test

Manuele verificatie dat de hele auth-flow werkt.

- [ ] **Step 1: Voeg een lokale hosts-entry toe (eenmalig per machine)**

Subdomein-routing testen lokaal:

```bash
sudo sh -c 'echo "127.0.0.1 app.localhost" >> /etc/hosts'
```

(Of gebruik `app.frontlix.com.local` met je eigen mapping. Het belangrijkste is dat een hostname die aan `app` begint resolvert naar localhost.)

- [ ] **Step 2: Start de dev-server**

```bash
npm run dev
```

- [ ] **Step 3: Test marketing-host (geen wijzigingen)**

Open `http://localhost:3000/`. Verwacht: bestaande Frontlix homepage zoals altijd.

- [ ] **Step 4: Test dashboard-host zonder login**

Open `http://app.localhost:3000/leads`. Verwacht: redirect naar `/login`.

- [ ] **Step 5: Test signup**

Open `http://app.localhost:3000/signup`. Vul in:
- Bedrijfsnaam: `Test Bedrijf`
- E-mail: een test-mailadres (bijv. `test+1@frontlix.com`)
- Wachtwoord: `test1234`

Klik "Aanvraag versturen". Verwacht:
- Redirect naar `/wachtkamer`
- Pagina toont "Aanvraag in behandeling, **Test Bedrijf**"
- Slack-channel ontvangt notificatie "🆕 Nieuwe dashboard-aanvraag: *Test Bedrijf* — test+1@frontlix.com"
- In Supabase Studio: `auth.users` heeft 1 nieuwe rij; `dashboard_user_profiles` heeft 1 rij met `tenant_status='pending'`, `bedrijfsnaam='Test Bedrijf'`, `is_owner=true`.

- [ ] **Step 6: Test goedkeuring + auto-redirect**

In Supabase Studio:

```sql
UPDATE dashboard_user_profiles
SET tenant_status = 'approved', approved_op = now()
WHERE bedrijfsnaam = 'Test Bedrijf';
```

In de browser-tab met `/wachtkamer`: binnen 1-2 seconden zou de pagina automatisch moeten refreshen en doorgaan naar `/leads`. Verwacht:
- `/leads` toont sidebar (Leads / Agenda / Statistieken / Instellingen) en topbar met "Test Bedrijf" links + email + dropdown rechts
- Klik op "Instellingen" — toont de bedrijfsinfo uit `tenant_settings` (Schoon Straatje data want één rij)

- [ ] **Step 7: Test logout**

Klik in de UserMenu op "Uitloggen". Verwacht: redirect naar `/login`. Probeer `/leads` direct → redirect naar `/login`.

- [ ] **Step 8: Test login met geapproveerde user**

Login met `test+1@frontlix.com` / `test1234`. Verwacht: direct naar `/leads`.

- [ ] **Step 9: Cleanup test-user**

In Supabase Studio:

```sql
DELETE FROM auth.users WHERE email LIKE 'test+%@frontlix.com';
```

Cascade verwijdert de profile-rij.

- [ ] **Step 10: Stop de dev-server**

`Ctrl+C`. Verwacht: clean shutdown.

---

## Summary checklist

Aan het einde van Plan 3:

- [ ] RLS-policies actief op alle 8 dashboard-tabellen + 4 bot-tabellen (berichten, fotos, offertes, prijsregels)
- [ ] Auth Hook trigger maakt automatisch `dashboard_user_profile` bij signup
- [ ] `@supabase/ssr` geïnstalleerd
- [ ] `lib/dashboard/supabase-{server,browser,admin}.ts` werken en getypt
- [ ] `lib/dashboard/auth.ts` met tests groen
- [ ] `lib/dashboard/slack.ts` met tests groen
- [ ] `middleware.ts` herkent `app.frontlix.com` en doet auth-check
- [ ] `/login`, `/signup`, `/wachtkamer` werken (server actions + realtime channel)
- [ ] `(dashboard)/layout.tsx` toont sidebar + topbar met bedrijfsnaam
- [ ] Placeholder pagina's `/leads`, `/agenda`, `/statistieken`, `/instellingen` aanwezig
- [ ] Logout-route werkt
- [ ] End-to-end smoke test slaagt: signup → wachtkamer → admin approves → auto-redirect naar /leads → logout → login

Plan 4 (leads-lijst + lead-detail read-only) bouwt erop voort. De bot-test-fase loopt door zonder enige interferentie.
