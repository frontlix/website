# Self-service Google Agenda-koppelknop, implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een klant koppelt via een knop in het dashboard zelf zijn Google Agenda; het refresh-token wordt versleuteld in de gedeelde database opgeslagen en de bot gebruikt het voor vrije tijden en het inplannen van afspraken.

**Architecture:** Dashboard (Next.js, `Frontlix website/`) en bot (TypeScript/Express, `schoon-straatje product/schoon-straatje-assistent/`) delen Supabase-project `ntewbcbveqqrojhrkrno` ("DB-B"). Het dashboard voert de OAuth-web-flow uit en schrijft een versleuteld token in een nieuwe tabel `calendar_connections`; de bot leest die rij en gebruikt OAuth met het token in plaats van het service-account. Versleuteling is AES-256-GCM met een gedeeld geheim, identieke code aan beide kanten.

**Tech Stack:** TypeScript, Next.js route handlers, Express, Supabase (service-role), Node `crypto` (AES-256-GCM), Google OAuth 2.0 (raw fetch, geen extra dependency in het dashboard), `googleapis` (al aanwezig in de bot), vitest.

**Spec:** `docs/superpowers/specs/2026-06-09-google-agenda-koppelknop-design.md`

**Belangrijke conventies:**
- Dashboard tests: vitest, `*.test.ts` naast de bron. Draai met `npm run test`.
- Bot tests: vitest, in `tests/`. Draai met `npm run test`.
- Twee repos. "Dashboard" = `Frontlix website/`. "Bot" = `schoon-straatje product/schoon-straatje-assistent/`. Commits gebeuren per repo.
- Het gedeelde geheim `CALENDAR_TOKEN_ENC_KEY` is 32 bytes, base64-encoded, identiek in beide repos.

---

## File Structure

**Dashboard (`Frontlix website/`):**
- `lib/crypto/calendar-token.ts` (nieuw) — AES-256-GCM encrypt/decrypt, leest `CALENDAR_TOKEN_ENC_KEY`.
- `lib/google-oauth.ts` (nieuw) — consent-URL bouwen, code→token wisselen, e-mail ophalen. Geen Google-SDK, rauwe fetch.
- `app/api/integrations/google-calendar/authorize/route.ts` (nieuw) — redirect naar Google.
- `app/api/integrations/google-calendar/callback/route.ts` (nieuw) — token inwisselen, versleutelen, upsert.
- `app/api/integrations/google-calendar/disconnect/route.ts` (nieuw) — rij verwijderen.
- `lib/dashboard/calendar-connection-queries.ts` (nieuw) — status lezen (service-role, alleen niet-gevoelige velden).
- `components/dashboard/instellingen/IntegratiesSection.tsx` (nieuw) — UI.
- `components/dashboard/instellingen/SettingsNav.tsx` (wijzigen) — sectie registreren.
- `app/dashboard/(app)/instellingen/page.tsx` (wijzigen) — sectie toelaten, status ophalen, renderen.
- `supabase/migrations-frontlix/037_calendar_connections.sql` (nieuw) — tabel + RLS.

**Bot (`schoon-straatje product/schoon-straatje-assistent/`):**
- `src/lib/calendar-token-crypto.ts` (nieuw) — AES-256-GCM decrypt (+ encrypt voor tests), identiek formaat.
- `src/services/calendar-connection.ts` (nieuw) — actieve connectie ophalen uit DB-B, met korte cache.
- `src/services/google-calendar.ts` (wijzigen) — `getCalendarContext()` met DB-optie; 3 callers aanpassen.
- `src/config.ts` (wijzigen) — `CALENDAR_TOKEN_ENC_KEY` in `config.google`.

---

## Fase 1: Versleuteling (gedeeld fundament)

### Task 1: Crypto-helper in het dashboard

**Files:**
- Create: `Frontlix website/lib/crypto/calendar-token.ts`
- Test: `Frontlix website/lib/crypto/calendar-token.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/crypto/calendar-token.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { encryptToken, decryptToken } from './calendar-token'

const KEY_B64 = Buffer.alloc(32, 7).toString('base64') // 32 bytes, deterministisch

beforeAll(() => {
  process.env.CALENDAR_TOKEN_ENC_KEY = KEY_B64
})

describe('calendar-token crypto', () => {
  it('round-trips een token', () => {
    const plain = '1//04abcDEF_refresh-token-example'
    const enc = encryptToken(plain)
    expect(enc).not.toContain(plain)
    expect(decryptToken(enc)).toBe(plain)
  })

  it('produceert elke keer een andere ciphertext (random IV)', () => {
    expect(encryptToken('zelfde')).not.toBe(encryptToken('zelfde'))
  })

  it('faalt op een gemanipuleerde ciphertext (auth-tag)', () => {
    const enc = encryptToken('geheim')
    const raw = Buffer.from(enc, 'base64')
    raw[raw.length - 1] ^= 0xff // laatste byte van de ciphertext flippen
    expect(() => decryptToken(raw.toString('base64'))).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (in `Frontlix website/`): `npm run test -- lib/crypto/calendar-token.test.ts`
Expected: FAIL met "Cannot find module './calendar-token'" of "encryptToken is not a function".

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/crypto/calendar-token.ts
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const b64 = process.env.CALENDAR_TOKEN_ENC_KEY
  if (!b64) throw new Error('CALENDAR_TOKEN_ENC_KEY ontbreekt')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('CALENDAR_TOKEN_ENC_KEY moet 32 bytes zijn (base64)')
  return key
}

/** Versleutelt UTF-8 plaintext. Output: base64(iv[12] + authTag[16] + ciphertext). */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

/** Ontsleutelt het base64(iv + authTag + ciphertext) formaat terug naar UTF-8. */
export function decryptToken(payload: string): string {
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = raw.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/crypto/calendar-token.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit** (in `Frontlix website/`)

```bash
git add lib/crypto/calendar-token.ts lib/crypto/calendar-token.test.ts
git commit -m "feat(dashboard): AES-256-GCM helper voor agenda-token"
```

---

### Task 2: Identieke crypto-helper in de bot + interop-vector

**Files:**
- Create: `schoon-straatje-assistent/src/lib/calendar-token-crypto.ts`
- Test: `schoon-straatje-assistent/tests/calendar-token-crypto.test.ts`

De bot heeft alleen `decryptToken` nodig in productie, maar we zetten ook `encryptToken` erin zodat de round-trip te testen is en de code byte-identiek blijft aan het dashboard.

- [ ] **Step 1: Genereer één interop-vector (eenmalig)**

Run dit eenmalig vanuit `Frontlix website/` om een door het dashboard versleutelde string te maken die de bot moet kunnen ontsleutelen:

```bash
CALENDAR_TOKEN_ENC_KEY=$(node -e "console.log(Buffer.alloc(32,7).toString('base64'))") \
node -e "const {encryptToken}=require('./lib/crypto/calendar-token.ts'); console.log(encryptToken('interop-plaintext-123'))" 2>/dev/null \
|| echo "Als require op .ts faalt: compileer of gebruik tsx; de vector mag ook met het onderstaande inline-script gemaakt worden."
```

Als bovenstaande door TS-loading faalt, gebruik dit zelfstandige Node-script (gebruikt exact hetzelfde formaat):

```bash
node -e "
const crypto=require('crypto');
const key=Buffer.alloc(32,7);
const iv=crypto.randomBytes(12);
const c=crypto.createCipheriv('aes-256-gcm',key,iv);
const ct=Buffer.concat([c.update('interop-plaintext-123','utf8'),c.final()]);
const tag=c.getAuthTag();
console.log(Buffer.concat([iv,tag,ct]).toString('base64'));
"
```

Noteer de geprinte base64-string; die plak je in Step 2 als `VECTOR`.

- [ ] **Step 2: Write the failing test** (vervang `VECTOR` door de string uit Step 1)

```ts
// tests/calendar-token-crypto.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { encryptToken, decryptToken } from '../src/lib/calendar-token-crypto'

const KEY_B64 = Buffer.alloc(32, 7).toString('base64')
const VECTOR = 'PLAK_HIER_DE_STRING_UIT_STEP_1'

beforeAll(() => {
  process.env.CALENDAR_TOKEN_ENC_KEY = KEY_B64
})

describe('calendar-token-crypto (bot)', () => {
  it('round-trips', () => {
    const enc = encryptToken('1//04xyz')
    expect(decryptToken(enc)).toBe('1//04xyz')
  })

  it('ontsleutelt een door het dashboard geproduceerde vector (interop)', () => {
    expect(decryptToken(VECTOR)).toBe('interop-plaintext-123')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run (in `schoon-straatje-assistent/`): `npm run test -- calendar-token-crypto`
Expected: FAIL met "Cannot find module '../src/lib/calendar-token-crypto'".

- [ ] **Step 4: Write the implementation** (byte-identiek aan Task 1)

```ts
// src/lib/calendar-token-crypto.ts
import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const b64 = process.env.CALENDAR_TOKEN_ENC_KEY
  if (!b64) throw new Error('CALENDAR_TOKEN_ENC_KEY ontbreekt')
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('CALENDAR_TOKEN_ENC_KEY moet 32 bytes zijn (base64)')
  return key
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

export function decryptToken(payload: string): string {
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = raw.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- calendar-token-crypto`
Expected: PASS (2 tests). De interop-test bewijst dat de bot ontsleutelt wat het dashboard versleutelde.

- [ ] **Step 6: Commit** (in `schoon-straatje-assistent/`)

```bash
git add src/lib/calendar-token-crypto.ts tests/calendar-token-crypto.test.ts
git commit -m "feat(bot): AES-256-GCM helper + interop-test met dashboard"
```

---

## Fase 2: Database

### Task 3: Migratie `calendar_connections`

**Files:**
- Create: `Frontlix website/supabase/migrations-frontlix/037_calendar_connections.sql`

> Controleer eerst het hoogste bestaande nummer in `supabase/migrations-frontlix/`. Was 036 het hoogste, dan klopt 037. Pas anders het nummer aan.

- [ ] **Step 1: Schrijf de migratie**

```sql
-- 037_calendar_connections.sql
-- Per-tenant Google Calendar OAuth-koppeling. Token staat versleuteld
-- (AES-256-GCM, base64). Alleen leesbaar/schrijfbaar via service-role:
-- de bot (SUPABASE_SERVICE_KEY) en de dashboard-callback (getDashboardAdmin).

create table if not exists public.calendar_connections (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenant_settings(id) on delete cascade,
  google_email            text,
  calendar_id             text not null default 'primary',
  refresh_token_encrypted text not null,
  connected_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (tenant_id)
);

alter table public.calendar_connections enable row level security;

-- Geen policies voor anon/authenticated: de tabel is dus onbereikbaar vanuit
-- de browser. De service-role-sleutel bypasst RLS en is de enige toegang.
```

- [ ] **Step 2: Pas de migratie toe op DB-B**

Open Supabase Studio (project `ntewbcbveqqrojhrkrno`) → SQL editor, plak de inhoud, voer uit. (Of via de Supabase CLI als die aan dit project gelinkt is.)
Expected: tabel `calendar_connections` bestaat, RLS staat aan.

- [ ] **Step 3: Verifieer RLS-afscherming**

Run in de SQL editor:
```sql
select relrowsecurity from pg_class where relname = 'calendar_connections';
```
Expected: `t` (RLS aan).

- [ ] **Step 4: Commit** (in `Frontlix website/`)

```bash
git add supabase/migrations-frontlix/037_calendar_connections.sql
git commit -m "feat(db): calendar_connections tabel met RLS (service-role only)"
```

---

## Fase 3: Dashboard OAuth-flow

### Task 4: OAuth-helper (`lib/google-oauth.ts`)

**Files:**
- Create: `Frontlix website/lib/google-oauth.ts`
- Test: `Frontlix website/lib/google-oauth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/google-oauth.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { buildConsentUrl, redirectUri } from './google-oauth'

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD = 'http://localhost:3000'
})

describe('buildConsentUrl', () => {
  it('bevat de juiste scopes, offline access en consent-prompt', () => {
    const url = new URL(buildConsentUrl('state-abc'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('state')).toBe('state-abc')
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri())
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar')
    expect(url.searchParams.get('scope')).toContain('email')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/google-oauth.test.ts`
Expected: FAIL ("Cannot find module './google-oauth'").

- [ ] **Step 3: Write the implementation**

```ts
// lib/google-oauth.ts
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo'

const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar']

function clientId(): string {
  const v = process.env.GOOGLE_CLIENT_ID
  if (!v) throw new Error('GOOGLE_CLIENT_ID ontbreekt')
  return v
}

function clientSecret(): string {
  const v = process.env.GOOGLE_CLIENT_SECRET
  if (!v) throw new Error('GOOGLE_CLIENT_SECRET ontbreekt')
  return v
}

/** De callback-URL, afgeleid van de dashboard-host. Moet exact in de Google-client staan. */
export function redirectUri(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL_DASHBOARD || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/api/integrations/google-calendar/callback`
}

export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: SCOPES.join(' '),
    state,
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export interface TokenResult {
  refreshToken: string
  accessToken: string
}

/** Wisselt de auth-code in voor tokens. Gooit als er geen refresh_token terugkomt. */
export async function exchangeCode(code: string): Promise<TokenResult> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Token-exchange faalde: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { refresh_token?: string; access_token?: string }
  if (!json.refresh_token) throw new Error('Geen refresh_token van Google (prompt=consent vereist)')
  return { refreshToken: json.refresh_token, accessToken: json.access_token || '' }
}

/** Haalt het e-mailadres van het gekoppelde account op (voor de statusweergave). */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { email?: string }
  return json.email ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/google-oauth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/google-oauth.ts lib/google-oauth.test.ts
git commit -m "feat(dashboard): google-oauth helper (consent-url, code-exchange, email)"
```

---

### Task 5: Connection-queries (status + upsert + delete)

**Files:**
- Create: `Frontlix website/lib/dashboard/calendar-connection-queries.ts`
- Test: `Frontlix website/lib/dashboard/calendar-connection-queries.test.ts`

Centraliseert alle DB-toegang tot `calendar_connections` via `getDashboardAdmin()` (service-role). De single-tenant `tenant_id` halen we uit de enige `tenant_settings`-rij.

- [ ] **Step 1: Write the failing test** (we mocken `getDashboardAdmin`)

```ts
// lib/dashboard/calendar-connection-queries.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const upsert = vi.fn().mockResolvedValue({ error: null })
const del = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
const maybeSingle = vi.fn().mockResolvedValue({
  data: { google_email: 'thierry@example.com', calendar_id: 'primary', connected_at: '2026-06-09T10:00:00Z' },
  error: null,
})

vi.mock('./supabase-admin', () => ({
  getDashboardAdmin: () => ({
    from: () => ({
      upsert,
      delete: del,
      select: () => ({ limit: () => ({ maybeSingle }) }),
    }),
  }),
}))

import { getConnectionStatus, saveConnection } from './calendar-connection-queries'

beforeEach(() => vi.clearAllMocks())

describe('calendar-connection-queries', () => {
  it('getConnectionStatus geeft alleen niet-gevoelige velden terug', async () => {
    const status = await getConnectionStatus()
    expect(status).toEqual({
      connected: true,
      googleEmail: 'thierry@example.com',
      calendarId: 'primary',
      connectedAt: '2026-06-09T10:00:00Z',
    })
  })

  it('saveConnection schrijft een upsert met de versleutelde token', async () => {
    await saveConnection({ tenantId: 't1', googleEmail: 'a@b.nl', calendarId: 'primary', refreshTokenEncrypted: 'ENC' })
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 't1', refresh_token_encrypted: 'ENC' }),
      expect.objectContaining({ onConflict: 'tenant_id' }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/dashboard/calendar-connection-queries.test.ts`
Expected: FAIL ("Cannot find module './calendar-connection-queries'").

- [ ] **Step 3: Write the implementation**

```ts
// lib/dashboard/calendar-connection-queries.ts
import { getDashboardAdmin } from './supabase-admin'

export interface ConnectionStatus {
  connected: boolean
  googleEmail: string | null
  calendarId: string | null
  connectedAt: string | null
}

/** Leest de connectie-status (zonder het token) van de enige tenant. */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const admin = getDashboardAdmin()
  const { data } = await admin
    .from('calendar_connections')
    .select('google_email, calendar_id, connected_at')
    .limit(1)
    .maybeSingle()

  if (!data) return { connected: false, googleEmail: null, calendarId: null, connectedAt: null }
  return {
    connected: true,
    googleEmail: data.google_email ?? null,
    calendarId: data.calendar_id ?? null,
    connectedAt: data.connected_at ?? null,
  }
}

/** Haalt de id van de enige tenant_settings-rij (single-tenant). */
export async function getTenantId(): Promise<string> {
  const admin = getDashboardAdmin()
  const { data, error } = await admin.from('tenant_settings').select('id').limit(1).maybeSingle()
  if (error || !data) throw new Error('Geen tenant_settings-rij gevonden')
  return data.id as string
}

export interface SaveConnectionInput {
  tenantId: string
  googleEmail: string | null
  calendarId: string
  refreshTokenEncrypted: string
}

export async function saveConnection(input: SaveConnectionInput): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('calendar_connections').upsert(
    {
      tenant_id: input.tenantId,
      google_email: input.googleEmail,
      calendar_id: input.calendarId,
      refresh_token_encrypted: input.refreshTokenEncrypted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' },
  )
  if (error) throw new Error(`Opslaan connectie faalde: ${error.message}`)
}

export async function deleteConnection(tenantId: string): Promise<void> {
  const admin = getDashboardAdmin()
  const { error } = await admin.from('calendar_connections').delete().eq('tenant_id', tenantId)
  if (error) throw new Error(`Ontkoppelen faalde: ${error.message}`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/dashboard/calendar-connection-queries.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/calendar-connection-queries.ts lib/dashboard/calendar-connection-queries.test.ts
git commit -m "feat(dashboard): calendar_connections queries (status, upsert, delete)"
```

---

### Task 6: Authorize-route

**Files:**
- Create: `Frontlix website/app/api/integrations/google-calendar/authorize/route.ts`

> Patroon: bestaande route-handlers (bv. `app/api/contact/route.ts`) gebruiken `import { NextRequest, NextResponse } from 'next/server'` en `export async function GET/POST`. Owner-check via `getCurrentUserProfile()` uit `lib/dashboard/auth.ts` (heeft `is_owner`).

- [ ] **Step 1: Write the route**

```ts
// app/api/integrations/google-calendar/authorize/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { buildConsentUrl } from '@/lib/google-oauth'

export async function GET() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const state = crypto.randomBytes(16).toString('hex')
  const res = NextResponse.redirect(buildConsentUrl(state))
  res.cookies.set('gcal_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
```

- [ ] **Step 2: Verifieer handmatig (lokaal)**

Start de dev-server (`npm run dev`), log in als owner, open `http://localhost:3000/api/integrations/google-calendar/authorize`.
Expected: redirect naar het Google-toestemmingsscherm; er staat een `gcal_oauth_state`-cookie.

- [ ] **Step 3: Commit**

```bash
git add app/api/integrations/google-calendar/authorize/route.ts
git commit -m "feat(dashboard): authorize-route voor google-agenda-koppeling"
```

---

### Task 7: Callback-route

**Files:**
- Create: `Frontlix website/app/api/integrations/google-calendar/callback/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/integrations/google-calendar/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { exchangeCode, fetchGoogleEmail } from '@/lib/google-oauth'
import { encryptToken } from '@/lib/crypto/calendar-token'
import { getTenantId, saveConnection } from '@/lib/dashboard/calendar-connection-queries'

const SETTINGS_URL = '/instellingen?section=integraties'

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=forbidden`, request.url))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = request.cookies.get('gcal_oauth_state')?.value

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=state_error`, request.url))
  }

  try {
    const { refreshToken, accessToken } = await exchangeCode(code)
    const email = await fetchGoogleEmail(accessToken)
    const tenantId = await getTenantId()
    await saveConnection({
      tenantId,
      googleEmail: email,
      calendarId: 'primary',
      refreshTokenEncrypted: encryptToken(refreshToken),
    })
    const res = NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=ok`, request.url))
    res.cookies.delete('gcal_oauth_state')
    return res
  } catch (e) {
    console.error('[gcal-callback]', e)
    return NextResponse.redirect(new URL(`${SETTINGS_URL}&gcal=error`, request.url))
  }
}
```

- [ ] **Step 2: Verifieer (na Task 9/10 end-to-end; nu compile-check)**

Run: `npm run build` (of `npx tsc --noEmit`)
Expected: geen type-fouten in de nieuwe route.

- [ ] **Step 3: Commit**

```bash
git add app/api/integrations/google-calendar/callback/route.ts
git commit -m "feat(dashboard): callback-route wisselt code in en slaat versleuteld token op"
```

---

### Task 8: Disconnect-route

**Files:**
- Create: `Frontlix website/app/api/integrations/google-calendar/disconnect/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/integrations/google-calendar/disconnect/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { getTenantId, deleteConnection } from '@/lib/dashboard/calendar-connection-queries'

export async function POST() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved' || !profile.is_owner) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  const tenantId = await getTenantId()
  await deleteConnection(tenantId)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/integrations/google-calendar/disconnect/route.ts
git commit -m "feat(dashboard): disconnect-route verwijdert de agenda-koppeling"
```

---

## Fase 4: Dashboard UI

### Task 9: Instellingen-sectie "Agenda"

**Files:**
- Create: `Frontlix website/components/dashboard/instellingen/IntegratiesSection.tsx`
- Modify: `Frontlix website/components/dashboard/instellingen/SettingsNav.tsx`
- Modify: `Frontlix website/app/dashboard/(app)/instellingen/page.tsx`

> Volg het bestaande sectie-patroon: in `SettingsNav.tsx` staat een `SettingsSection`-union en een `ITEMS`-array; in `page.tsx` een `ALLOWED_SECTIONS`-array en conditionele renders. Bekijk hoe een bestaande sectie (bv. `account`) data krijgt en wordt gerenderd, en spiegel dat.

- [ ] **Step 1: Registreer de sectie in `SettingsNav.tsx`**

Voeg `Calendar` toe aan de lucide-import, breid de union uit, en voeg een ITEM toe:

```ts
// in de import uit 'lucide-react': voeg Calendar toe
// union SettingsSection: voeg toe
  | 'integraties'
// ITEMS array: voeg toe (na 'team' bijvoorbeeld)
  { key: 'integraties', label: 'Agenda', Icon: Calendar },
```

- [ ] **Step 2: Maak de sectie-component**

```tsx
// components/dashboard/instellingen/IntegratiesSection.tsx
'use client'

import { useState } from 'react'

export interface IntegratiesSectionProps {
  connected: boolean
  googleEmail: string | null
  calendarId: string | null
}

export function IntegratiesSection({ connected, googleEmail, calendarId }: IntegratiesSectionProps) {
  const [busy, setBusy] = useState(false)

  async function disconnect() {
    setBusy(true)
    await fetch('/api/integrations/google-calendar/disconnect', { method: 'POST' })
    window.location.href = '/instellingen?section=integraties'
  }

  return (
    <section>
      <h2>Google Agenda</h2>
      {connected ? (
        <div>
          <p>Gekoppeld als <strong>{googleEmail ?? 'onbekend account'}</strong> (agenda: {calendarId ?? 'primary'}).</p>
          <a href="/api/integrations/google-calendar/authorize">Opnieuw koppelen</a>
          <button type="button" onClick={disconnect} disabled={busy}>
            {busy ? 'Bezig…' : 'Ontkoppelen'}
          </button>
        </div>
      ) : (
        <div>
          <p>Koppel je Google Agenda zodat de bot je vrije tijden ziet en afspraken inplant.</p>
          <a href="/api/integrations/google-calendar/authorize">Koppel Google Agenda</a>
        </div>
      )}
    </section>
  )
}
```

> Styling: hergebruik de bestaande sectie-/knop-classes uit `SettingSections.tsx` / de bijbehorende CSS-module zodat het visueel aansluit. De markup hierboven is functioneel; pas de class-namen aan op het bestaande patroon.

- [ ] **Step 3: Sluit de sectie aan in `page.tsx`**

```ts
// ALLOWED_SECTIONS: voeg 'integraties' toe
// bovenaan: import { IntegratiesSection } from '@/components/dashboard/instellingen/IntegratiesSection'
//           import { getConnectionStatus } from '@/lib/dashboard/calendar-connection-queries'

// in de component, bij de data-ophaling:
const gcalStatus = section === 'integraties' ? await getConnectionStatus() : null

// bij de conditionele renders:
{section === 'integraties' && gcalStatus && (
  <IntegratiesSection
    connected={gcalStatus.connected}
    googleEmail={gcalStatus.googleEmail}
    calendarId={gcalStatus.calendarId}
  />
)}
```

- [ ] **Step 4: Verifieer handmatig**

Start dev, open `http://localhost:3000/instellingen?section=integraties`.
Expected: de sectie "Agenda" met de knop "Koppel Google Agenda" verschijnt in de nav en op de pagina.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/instellingen/IntegratiesSection.tsx components/dashboard/instellingen/SettingsNav.tsx "app/dashboard/(app)/instellingen/page.tsx"
git commit -m "feat(dashboard): instellingen-sectie Agenda met koppelknop"
```

---

## Fase 5: Bot-integratie

### Task 10: `CALENDAR_TOKEN_ENC_KEY` in bot-config

**Files:**
- Modify: `schoon-straatje-assistent/src/config.ts`

> In `config.ts` staat een `config`-object met een `google`-sectie (gebruikt door `google-calendar.ts` als `config.google.calendarId`, `config.google.serviceAccountJsonBase64`, `config.google.clientId`, `config.google.clientSecret`, `config.google.refreshToken`). Voeg daar één veld aan toe.

- [ ] **Step 1: Voeg het veld toe aan `config.google`**

```ts
// in de google-sectie van het config-object:
    tokenEncKey: optionalEnv('CALENDAR_TOKEN_ENC_KEY', ''),
```

- [ ] **Step 2: Compile-check**

Run (in `schoon-straatje-assistent/`): `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat(bot): CALENDAR_TOKEN_ENC_KEY in config"
```

---

### Task 11: Connection-service in de bot

**Files:**
- Create: `schoon-straatje-assistent/src/services/calendar-connection.ts`
- Test: `schoon-straatje-assistent/tests/calendar-connection.test.ts`

Haalt de enige `calendar_connections`-rij op uit DB-B (service-role client uit `src/lib/supabase.ts`), ontsleutelt het token, en cachet 60s (consistent met de tenant-config-cadans).

- [ ] **Step 1: Write the failing test**

```ts
// tests/calendar-connection.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const maybeSingle = vi.fn()
vi.mock('../src/lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ limit: () => ({ maybeSingle }) }) }) },
}))

// crypto-helper mocken zodat we geen echte sleutel nodig hebben
vi.mock('../src/lib/calendar-token-crypto', () => ({
  decryptToken: (s: string) => (s === 'ENC' ? 'plain-refresh' : 'x'),
}))

import { getActiveCalendarConnection, _clearCache } from '../src/services/calendar-connection'

beforeEach(() => {
  vi.clearAllMocks()
  _clearCache()
})

describe('getActiveCalendarConnection', () => {
  it('geeft null als er geen rij is', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })
    expect(await getActiveCalendarConnection()).toBeNull()
  })

  it('ontsleutelt het token en geeft calendarId terug', async () => {
    maybeSingle.mockResolvedValue({
      data: { refresh_token_encrypted: 'ENC', calendar_id: 'thierry@example.com' },
      error: null,
    })
    expect(await getActiveCalendarConnection()).toEqual({
      refreshToken: 'plain-refresh',
      calendarId: 'thierry@example.com',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- calendar-connection`
Expected: FAIL ("Cannot find module '../src/services/calendar-connection'").

- [ ] **Step 3: Write the implementation**

```ts
// src/services/calendar-connection.ts
import { supabase } from '../lib/supabase'
import { decryptToken } from '../lib/calendar-token-crypto'

export interface ActiveCalendarConnection {
  refreshToken: string
  calendarId: string
}

let cache: { value: ActiveCalendarConnection | null; at: number } | null = null
const TTL_MS = 60_000

/** Alleen voor tests: leegt de cache. */
export function _clearCache(): void {
  cache = null
}

/**
 * Haalt de enige actieve agenda-koppeling op (single-tenant). null als er geen
 * koppeling is, dan valt de caller terug op het service-account. Een corrupte
 * rij (ontsleutel-fout) gooit, zodat het zichtbaar wordt en niet stil maskeert.
 */
export async function getActiveCalendarConnection(): Promise<ActiveCalendarConnection | null> {
  const now = Date.now()
  if (cache && now - cache.at < TTL_MS) return cache.value

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('refresh_token_encrypted, calendar_id')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`calendar_connections lezen faalde: ${error.message}`)
  if (!data) {
    cache = { value: null, at: now }
    return null
  }

  const value: ActiveCalendarConnection = {
    refreshToken: decryptToken(data.refresh_token_encrypted),
    calendarId: data.calendar_id || 'primary',
  }
  cache = { value, at: now }
  return value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- calendar-connection`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/calendar-connection.ts tests/calendar-connection.test.ts
git commit -m "feat(bot): actieve agenda-koppeling ophalen uit DB-B"
```

---

### Task 12: `getCalendarContext()` in `google-calendar.ts`

**Files:**
- Modify: `schoon-straatje-assistent/src/services/google-calendar.ts`
- Test: `schoon-straatje-assistent/tests/google-calendar-context.test.ts`

Doel: een nieuwe optie vóór het service-account. De huidige synchronе `getCalendarClient()` wordt een async `getCalendarContext()` die `{ calendar, calendarId }` teruggeeft. De drie callers (`getFreeSaturdaysWithSlots`, `createAppointmentEvent`, `deleteAppointmentEvent`, allemaal al `async`) gaan die gebruiken.

- [ ] **Step 1: Write the failing test**

```ts
// tests/google-calendar-context.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getActive = vi.fn()
vi.mock('../src/services/calendar-connection', () => ({
  getActiveCalendarConnection: getActive,
}))
vi.mock('../src/config', () => ({
  config: { google: { calendarId: 'sa-cal@group.calendar.google.com', serviceAccountJsonBase64: '', clientId: 'cid', clientSecret: 'sec', refreshToken: 'env-rt' } },
  clientConfig: { planning: { gesloten_weekdagen: [0], sluit_op_feestdagen: true, extra_gesloten_data: [] } },
}))

import { getCalendarContext } from '../src/services/google-calendar'

beforeEach(() => vi.clearAllMocks())

describe('getCalendarContext', () => {
  it('gebruikt de DB-koppeling als die bestaat (calendarId uit de rij)', async () => {
    getActive.mockResolvedValue({ refreshToken: 'db-rt', calendarId: 'thierry@example.com' })
    const ctx = await getCalendarContext()
    expect(ctx.calendarId).toBe('thierry@example.com')
    expect(ctx.calendar).toBeDefined()
  })

  it('valt terug op de config-agenda als er geen koppeling is', async () => {
    getActive.mockResolvedValue(null)
    const ctx = await getCalendarContext()
    expect(ctx.calendarId).toBe('sa-cal@group.calendar.google.com')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- google-calendar-context`
Expected: FAIL ("getCalendarContext is not exported").

- [ ] **Step 3: Vervang `getCalendarClient()` door `getCalendarContext()`**

Vervang de huidige `function getCalendarClient()` (regels ~29-52) door:

```ts
import { google } from 'googleapis';
import { getActiveCalendarConnection } from './calendar-connection';
// (bestaande imports config, clientConfig, werkdagen blijven staan)

export interface CalendarContext {
  calendar: ReturnType<typeof google.calendar>;
  calendarId: string;
}

// Cache de service-account/env-auth (verandert niet binnen een run).
let cachedFallbackAuth: any = null;

function buildFallbackAuth() {
  if (cachedFallbackAuth) return cachedFallbackAuth;
  const saJsonB64 = config.google.serviceAccountJsonBase64;
  if (saJsonB64) {
    const credentials = JSON.parse(Buffer.from(saJsonB64, 'base64').toString('utf-8'));
    cachedFallbackAuth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
  } else {
    const oauth2 = new google.auth.OAuth2(config.google.clientId, config.google.clientSecret);
    oauth2.setCredentials({ refresh_token: config.google.refreshToken });
    cachedFallbackAuth = oauth2;
  }
  return cachedFallbackAuth;
}

/**
 * Bepaalt welke auth + agenda gebruikt wordt:
 *  1) Is er een per-tenant OAuth-koppeling in de DB? Gebruik die + zijn calendarId.
 *  2) Anders: service-account (of env-OAuth) + config.google.calendarId.
 */
export async function getCalendarContext(): Promise<CalendarContext> {
  const conn = await getActiveCalendarConnection();
  if (conn) {
    const oauth2 = new google.auth.OAuth2(config.google.clientId, config.google.clientSecret);
    oauth2.setCredentials({ refresh_token: conn.refreshToken });
    return { calendar: google.calendar({ version: 'v3', auth: oauth2 }), calendarId: conn.calendarId };
  }
  const calendarId = config.google.calendarId || 'primary';
  return { calendar: google.calendar({ version: 'v3', auth: buildFallbackAuth() }), calendarId };
}
```

- [ ] **Step 4: Pas de drie callers aan**

In `getFreeSaturdaysWithSlots`, `createAppointmentEvent` en `deleteAppointmentEvent`: vervang
```ts
const calendar = getCalendarClient();
const calendarId = config.google.calendarId || 'primary';
```
door
```ts
const { calendar, calendarId } = await getCalendarContext();
```
(De functies zijn al `async`, dus `await` mag.)

- [ ] **Step 5: Run tests + compile**

Run: `npm run test -- google-calendar-context` → Expected: PASS (2 tests).
Run: `npm run test` → Expected: bestaande agenda-tests blijven groen (callers gedragen zich gelijk bij geen koppeling).
Run: `npx tsc --noEmit` → Expected: geen fouten.

- [ ] **Step 6: Commit**

```bash
git add src/services/google-calendar.ts tests/google-calendar-context.test.ts
git commit -m "feat(bot): getCalendarContext gebruikt DB-koppeling met fallback op service-account"
```

---

## Fase 6: End-to-end, secrets en deploy

### Task 13: Secrets en Google-client

- [ ] **Step 1: Genereer het gedeelde geheim**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Zet de output als `CALENDAR_TOKEN_ENC_KEY` in:
- `Frontlix website/.env.local` (lokaal) en de dashboard-productie-env.
- `schoon-straatje-assistent/.env` (lokaal) en de bot-`.env` op de VPS (`/var/www/schoon-straatje-assistent`).
**Exact dezelfde waarde aan beide kanten.**

- [ ] **Step 2: Web-OAuth-client (Google Cloud, project `frontlix-demo`)**

Gebruik de bestaande Web-client "Frontlix OAuth Playground" of maak een nieuwe Web application-client. Voeg als geautoriseerde redirect-URI's toe:
- `http://localhost:3000/api/integrations/google-calendar/callback`
- `https://app.frontlix.com/api/integrations/google-calendar/callback`

Zet `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` van deze client in de dashboard-env (lokaal + productie). Het OAuth-toestemmingsscherm staat al op "In production".

### Task 14: Lokale end-to-end test

- [ ] **Step 1: Crypto-interop** — al groen via Task 1 + 2.

- [ ] **Step 2: Koppelen** — start dashboard (`npm run dev`) en bot lokaal (met dezelfde `CALENDAR_TOKEN_ENC_KEY` en `SUPABASE_URL`=DB-B). Log in als owner, ga naar `http://localhost:3000/instellingen?section=integraties`, klik "Koppel Google Agenda", doorloop Google met een test-account (klik door het "niet geverifieerd"-scherm).
Expected: terug op de instellingen met `gcal=ok`; in `calendar_connections` staat een rij met een versleuteld token en `google_email`.

- [ ] **Step 3: Bot gebruikt de koppeling** — trigger in de bot een vrije-tijden-ophaling (of roep `getFreeSaturdaysWithSlots()` aan via een testscript).
Expected: de bot leest uit de gekoppelde agenda (controleer met een test-afspraak in die agenda dat de bezette tijd wordt herkend) en een nieuwe afspraak verschijnt in de gekoppelde agenda.

- [ ] **Step 4: Fallback** — verwijder de rij via "Ontkoppelen".
Expected: de bot valt terug op het service-account en blijft werken.

### Task 15: Deploy

- [ ] **Step 1: Migratie op DB-B** — al toegepast in Task 3 (zelfde DB voor lokaal en productie). Controleer dat de tabel bestaat.

- [ ] **Step 2: Dashboard** — deploy volgens de bestaande dashboard-deployroute, met `CALENDAR_TOKEN_ENC_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in de productie-env.

- [ ] **Step 3: Bot** — deploy via `deploy.sh` naar `/var/www/schoon-straatje-assistent`, met `CALENDAR_TOKEN_ENC_KEY` in de bot-`.env`. Herstart `pm2 restart schoon-straatje`.

- [ ] **Step 4: Productie-rooktest** — koppel op `https://app.frontlix.com` en verifieer een proefafspraak, daarna ontkoppelen of de echte agenda van Thierry koppelen.

---

## Aandachtspunten

- **Cache-vertraging bot:** na koppelen/ontkoppelen ziet de bot de wijziging pas na maximaal 60s (de connectie-cache). Acceptabel; bij het testen even wachten of de bot herstarten.
- **`getCalendarClient` verwijderd:** controleer dat geen ander bestand dan de drie callers `getCalendarClient` nog importeert (grep). Zo ja, ook ombouwen naar `getCalendarContext()`.
- **Token-intrekking:** als de klant in zijn Google-account de toegang intrekt, geeft Google `invalid_grant`; dat verschijnt in de bot-logs. Een nette "opnieuw koppelen"-melding in het dashboard is een latere verbetering.
