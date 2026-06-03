# Frontlix Brain — Plan 2: De dagelijkse Slack-brief

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een standalone Node-script in de brain-repo dat elke ochtend de live business-signalen + de vault (`NU.md` + `doelen.md`) leest, GPT-4o de 1-3 handigste stappen laat kiezen, en die als brief naar een intern Slack-kanaal post — gedraaid door een VPS-cron op Europe/Amsterdam-tijd.

**Architecture:** Self-contained `scripts/dagbrief.mjs` in de brain-repo (`frontlix-brein`), met eigen minimale `package.json` (deps: `@supabase/supabase-js`, `openai`). Het leest read-only uit de **Schoon-Straatje-Supabase** (account `ntewb…`, via de `_DASHBOARD`-env-vars) met de **service-role-key** (cookie-vrij), repliceert de 5 signaal-query's exact uit de bestaande dashboard-logica, en laat GPT-4o (`json_schema` strict) prioriteren. Pure helpers zijn met vitest getest; de I/O-paden via een DRY-run handmatig geverifieerd. VPS root-crontab met `TZ=Europe/Amsterdam`, één run/dag (geen self-gate nodig).

**Tech Stack:** Node ≥20 (`--env-file`), `@supabase/supabase-js`, `openai` (^6, GPT-4o), Slack incoming webhook, vitest.

**Dit is Plan 2 van 2.** Plan 1 (de vault) is gebouwd + gepusht. Volledige context: `docs/superpowers/specs/2026-06-02-frontlix-brain-design.md` (§7).

**Bewuste afwijking van de spec:** de spec opperde het script in de brain-repo met eigen package.json — dat houden we aan. Maar het importeert NIET uit de website-repo (de query-helpers `getOwnerFollowups`/`getDagrapport`/`deriveActions` hangen aan `getDashboardSupabase()` → `next/headers` cookies). In plaats daarvan: de exacte query-drempels gerepliceerd (3-daagse stille offerte, NL-dag/-maand) en GPT-4o doet de prioritering. Bron-onderzoek: de research-workflow van 2026-06-02.

---

## Werklocatie

- Repo: **`~/Desktop/frontlix-brein`** (lokale map heet `frontlix-brain`; remote = `frontlix/frontlix-brein`).
- Alle paden hieronder zijn relatief aan die repo-root, tenzij absoluut.

## Datacontract (uit het onderzoek — niet wijzigen zonder DB-check)

- **Supabase-project:** de **Schoon-Straatje-Supabase** (account `ntewb…`; env `NEXT_PUBLIC_SUPABASE_URL_DASHBOARD` + `SUPABASE_SERVICE_ROLE_KEY_DASHBOARD`). De Frontlix-website-Supabase (`zsiokl…`) wordt NIET bevraagd.
- **`leads`-kolommen:** `dashboard_status` (`open|opgevolgd|afgehandeld|no_show|geen_interesse|archief`), `dashboard_archived` (bool), `afspraak_datum` (date `"YYYY-MM-DD"`), `afspraak_starttijd` (time), `offerte_verstuurd` (bool), `offerte_verstuurd_op` (timestamptz), `akkoord_op` (timestamptz|null), `totaal_prijs` (number), `pending_eigenaar_review` (json|null), `klus_geblokkeerd` (bool), `gesprek_fase` (`...|onderhandelen|...`), `naam`, `plaats`, `hoofdcategorie`, `lead_id`.
- **`tenant_settings.omzet_doel_maand`** (numeric|null) — single-tenant, `.limit(1).maybeSingle()`.
- **Tijdzone:** signaal (b) afspraken-vandaag en (e) omzet-maand zijn NL-tijd-gevoelig → via `Intl` Europe/Amsterdam. Signaal (a)/(c)/(d) zijn tijdzone-onafhankelijk.

## File-structuur (wat dit plan oplevert, in de brain-repo)

```
frontlix-brein/
├── package.json              (Task 1 — deps + test-script)
├── .env.example              (Task 1 — env-namen, géén waarden)
├── .gitignore                (Task 1 — node_modules toevoegen)
└── scripts/
    ├── lib.mjs               (Task 2 — pure helpers: datum/maand/euro/formatBrief)
    ├── lib.test.mjs          (Task 2 — vitest)
    ├── signals.mjs           (Task 3 — Supabase read: 5 signalen)
    ├── generate.mjs          (Task 4 — OpenAI: 1-3 stappen, json_schema strict)
    ├── slack.mjs             (Task 5 — fetch POST naar webhook)
    └── dagbrief.mjs          (Task 6 — main: wiring + fallbacks + DRY_RUN)
```

---

## Task 0 (vooraf — vereist jou): Slack-kanaal + env-waarden

**Files:** geen (Slack-/VPS-configuratie).

- [ ] **Step 1:** Maak een Slack-kanaal `#frontlix-brief` (Chris + Georg). Maak een **Incoming Webhook** voor dat kanaal (Slack → Apps → Incoming Webhooks → Add). Kopieer de webhook-URL.
- [ ] **Step 2:** Verzamel de env-waarden die straks in de VPS-`.env` van de brain-repo komen (via `nano`, nooit `echo`): `NEXT_PUBLIC_SUPABASE_URL_DASHBOARD`, `SUPABASE_SERVICE_ROLE_KEY_DASHBOARD` (beide al bekend uit `/var/www/frontlix/.env.local`), `OPENAI_API_KEY` (idem), `SLACK_BRAIN_BRIEF_WEBHOOK_URL` (nieuw, uit Step 1), `SLACK_VPS_ALERTS_WEBHOOK_URL` (bestaand, voor de fout-ping).

*(Deze stap is naar buiten gericht / Slack-admin → jij doet 'm. De rest van het plan kan lokaal vooruit.)*

---

## Task 1: Project-scaffolding in de brain-repo

**Files:**
- Create: `package.json`, `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "frontlix-brein-dagbrief",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "brief": "node --env-file=.env scripts/dagbrief.mjs",
    "brief:dry": "DRY_RUN=1 node --env-file=.env scripts/dagbrief.mjs",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "openai": "^6.32.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: `.env.example`** (namen, géén waarden)

```bash
NEXT_PUBLIC_SUPABASE_URL_DASHBOARD=
SUPABASE_SERVICE_ROLE_KEY_DASHBOARD=
OPENAI_API_KEY=
SLACK_BRAIN_BRIEF_WEBHOOK_URL=
SLACK_VPS_ALERTS_WEBHOOK_URL=
```

- [ ] **Step 3: `node_modules` aan `.gitignore` toevoegen** (regel onderaan)

```gitignore
node_modules/
```

- [ ] **Step 4: Installeren + commit**

```bash
cd ~/Desktop/frontlix-brain
npm install
git add package.json package-lock.json .env.example .gitignore
git commit -m "chore(dagbrief): project-scaffolding — deps + scripts + env-template"
```

---

## Task 2: Pure helpers + tests (TDD)

**Files:**
- Create: `scripts/lib.mjs`, `scripts/lib.test.mjs`

- [ ] **Step 1: Schrijf de falende test** `scripts/lib.test.mjs`

```js
import { describe, it, expect } from 'vitest'
import { amsterdamTodayKey, amsterdamMonthStart, euro, formatBrief } from './lib.mjs'

describe('datum-helpers (Europe/Amsterdam)', () => {
  it('amsterdamTodayKey geeft NL-dag, ook net na middernacht UTC in de zomer', () => {
    // 2026-06-30 22:30 UTC = 2026-07-01 00:30 in Amsterdam (CEST, +2)
    const d = new Date('2026-06-30T22:30:00Z')
    expect(amsterdamTodayKey(d)).toBe('2026-07-01')
  })
  it('amsterdamMonthStart geeft de eerste van de NL-maand', () => {
    const d = new Date('2026-06-30T22:30:00Z') // NL: 1 juli
    expect(amsterdamMonthStart(d)).toBe('2026-07-01')
  })
})

describe('euro', () => {
  it('formatteert hele euros NL-stijl', () => {
    expect(euro(1500)).toMatch(/1\.500/)
    expect(euro(null)).toMatch(/0/)
  })
})

describe('formatBrief', () => {
  it('bevat datum, genummerde stappen en een signalen-regel', () => {
    const msg = formatBrief({
      datum: '2026-06-02',
      stappen: [{ titel: 'Bel Jan', actie: 'Bel over de offerte', onderbouwing: '5 dagen stil' }],
      signalen: { openLeads: 3, afsprakenVandaag: 1, staleOffertes: 2, omzetMaand: 1500, omzetDoel: 5000 },
    })
    expect(msg).toContain('2026-06-02')
    expect(msg).toContain('1. Bel Jan')
    expect(msg).toContain('3 open leads')
    expect(msg).toContain('doel')
  })
})
```

- [ ] **Step 2: Run → faalt** (`npm test`). Expected: FAIL, "Cannot find module './lib.mjs'".

- [ ] **Step 3: Implementeer `scripts/lib.mjs`**

```js
// Pure helpers — geen I/O, volledig unit-testbaar.

/** Huidige dag in Europe/Amsterdam als "YYYY-MM-DD". */
export function amsterdamTodayKey(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const g = (t) => p.find((x) => x.type === t).value
  return `${g('year')}-${g('month')}-${g('day')}`
}

/** Eerste dag van de huidige NL-maand als "YYYY-MM-01". */
export function amsterdamMonthStart(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit',
  }).formatToParts(now)
  const g = (t) => p.find((x) => x.type === t).value
  return `${g('year')}-${g('month')}-01`
}

/** Euro-formatter (hele euros, NL). */
export function euro(n) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n ?? 0)
}

/** Bouwt het Slack-bericht (mrkdwn) uit de gegenereerde stappen + signalen. */
export function formatBrief({ datum, stappen, signalen }) {
  const lines = [`:sunrise: *Frontlix-brief — ${datum}*`, '']
  stappen.forEach((s, i) => {
    lines.push(`*${i + 1}. ${s.titel}*`)
    lines.push(`   ${s.actie}`)
    lines.push(`   _${s.onderbouwing}_`)
  })
  lines.push('')
  lines.push(
    `:bar_chart: ${signalen.openLeads} open leads · ${signalen.afsprakenVandaag} afspraak(en) vandaag · ` +
    `${signalen.staleOffertes} stille offerte(s) · omzet ${euro(signalen.omzetMaand)}` +
    (signalen.omzetDoel ? ` / ${euro(signalen.omzetDoel)} doel` : ''),
  )
  return lines.join('\n')
}
```

- [ ] **Step 4: Run → slaagt** (`npm test`). Expected: PASS (alle tests groen).

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add scripts/lib.mjs scripts/lib.test.mjs
git commit -m "feat(dagbrief): pure helpers (NL-datum/maand, euro, formatBrief) + tests"
```

---

## Task 3: Supabase-signalen (read-only)

**Files:**
- Create: `scripts/signals.mjs`

- [ ] **Step 1: Implementeer `scripts/signals.mjs`** (query-vormen exact uit het onderzoek)

```js
import { createClient } from '@supabase/supabase-js'
import { amsterdamTodayKey, amsterdamMonthStart } from './lib.mjs'

/** Service-role client — cookie-vrij, bypasst RLS. ALLEEN read (.select) gebruiken. */
export function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_DASHBOARD
  if (!url || !key) {
    throw new Error('Supabase-env ontbreekt (NEXT_PUBLIC_SUPABASE_URL_DASHBOARD / SUPABASE_SERVICE_ROLE_KEY_DASHBOARD)')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Haalt de 5 dagbrief-signalen op. Gooit bij een DB-fout (caller vangt → VPS-alert). */
export async function fetchSignals(supabase, now = new Date()) {
  const today = amsterdamTodayKey(now)
  const monthStart = amsterdamMonthStart(now)
  const staleCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const [openLeads, afspraken, stale, opvolg, omzetRows, doel] = await Promise.all([
    // (a) open leads — count
    supabase.from('leads').select('*', { count: 'exact', head: true })
      .eq('dashboard_status', 'open').eq('dashboard_archived', false),
    // (b) afspraken vandaag (NL-dag), sort starttijd
    supabase.from('leads').select('lead_id, naam, afspraak_starttijd, plaats, hoofdcategorie')
      .eq('afspraak_datum', today).eq('dashboard_archived', false)
      .order('afspraak_starttijd', { ascending: true }),
    // (c) stille offertes: verstuurd >3d zonder akkoord
    supabase.from('leads').select('lead_id, naam, offerte_verstuurd_op, totaal_prijs')
      .eq('offerte_verstuurd', true).is('akkoord_op', null).eq('dashboard_archived', false)
      .lt('offerte_verstuurd_op', staleCutoff).order('offerte_verstuurd_op', { ascending: true }),
    // (d) opvolging: owner-review OF geblokkeerd OF onderhandelen
    supabase.from('leads').select('lead_id, naam, pending_eigenaar_review, klus_geblokkeerd, gesprek_fase')
      .eq('dashboard_archived', false)
      .or('pending_eigenaar_review.not.is.null,klus_geblokkeerd.eq.true,gesprek_fase.eq.onderhandelen'),
    // (e) omzet deze maand: SUM totaal_prijs WHERE akkoord_op >= maandstart
    supabase.from('leads').select('totaal_prijs').not('akkoord_op', 'is', null).gte('akkoord_op', monthStart),
    // doel
    supabase.from('tenant_settings').select('omzet_doel_maand').limit(1).maybeSingle(),
  ])

  for (const r of [openLeads, afspraken, stale, opvolg, omzetRows, doel]) {
    if (r.error) throw new Error(`Supabase-query faalde: ${r.error.message}`)
  }

  const omzetMaand = (omzetRows.data ?? []).reduce((s, r) => s + (Number(r.totaal_prijs) || 0), 0)
  return {
    openLeads: openLeads.count ?? 0,
    afsprakenVandaag: afspraken.data?.length ?? 0,
    afspraken: afspraken.data ?? [],
    staleOffertes: stale.data?.length ?? 0,
    stale: stale.data ?? [],
    opvolg: opvolg.data ?? [],
    omzetMaand,
    omzetDoel: doel.data?.omzet_doel_maand ?? null,
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add scripts/signals.mjs
git commit -m "feat(dagbrief): 5 Supabase-signalen (service-role, read-only)"
```

---

## Task 4: OpenAI brief-generator

**Files:**
- Create: `scripts/generate.mjs`

- [ ] **Step 1: Implementeer `scripts/generate.mjs`** (json_schema strict, GPT-4o)

```js
import OpenAI from 'openai'

const SYSTEM_PROMPT = `Je bent de strategisch assistent van Frontlix, een 1-2-persoons softwarebureau
(WhatsApp-lead-automatisering + dashboard voor lokale dienstverleners). Op basis van de context
(doelen, open loops uit NU.md, en de live signalen van vandaag) noem je de 1 tot 3 HANDIGSTE
eerstvolgende stappen voor vandaag.
- Kies op IMPACT en urgentie; een sales-/omzet-actie die een doel dichterbij brengt weegt zwaarder
  dan een willekeurige opruimtaak. Liever 1 scherpe stap dan 3 vage.
- Onderbouw elke stap met een verwijzing naar een CONCREET signaal of doel uit de context.
- Verzin geen feiten die niet in de context staan. Schrijf in het Nederlands, kort en concreet.`

const BRIEF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['stappen'],
  properties: {
    stappen: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['titel', 'actie', 'onderbouwing'],
        properties: {
          titel: { type: 'string' },
          actie: { type: 'string' },
          onderbouwing: { type: 'string' },
        },
      },
    },
  },
}

/** Vraagt GPT-4o om 1-3 stappen. Gooit bij fout (caller valt terug op kale cijfers). */
export async function generateBrief({ doelen, openLoops, signalenTekst }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY ontbreekt')
  const client = new OpenAI({ apiKey })
  const userContent = [
    `# Doelen\n${doelen}`,
    `# Open loops (NU.md)\n${openLoops}`,
    `# Live signalen vandaag\n${signalenTekst}`,
  ].join('\n\n')

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'frontlix_brief', strict: true, schema: BRIEF_SCHEMA },
    },
    temperature: 0.3,
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('OpenAI gaf geen antwoord terug')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed.stappen) || parsed.stappen.length === 0) {
    throw new Error('OpenAI gaf geen geldige stappen terug')
  }
  return parsed.stappen
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add scripts/generate.mjs
git commit -m "feat(dagbrief): GPT-4o brief-generator (json_schema strict, 1-3 stappen)"
```

---

## Task 5: Slack-post

**Files:**
- Create: `scripts/slack.mjs`

- [ ] **Step 1: Implementeer `scripts/slack.mjs`**

```js
/** Post platte mrkdwn-tekst naar een Slack incoming webhook. Gooit bij niet-2xx. */
export async function postSlack(webhookUrl, text) {
  if (!webhookUrl) throw new Error('Slack webhook-URL ontbreekt')
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Slack POST faalde: ${res.status} ${body}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add scripts/slack.mjs
git commit -m "feat(dagbrief): Slack webhook-post helper"
```

---

## Task 6: Main-script (wiring + fallbacks + DRY_RUN)

**Files:**
- Create: `scripts/dagbrief.mjs`

- [ ] **Step 1: Implementeer `scripts/dagbrief.mjs`**

```js
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeClient, fetchSignals } from './signals.mjs'
import { generateBrief } from './generate.mjs'
import { postSlack } from './slack.mjs'
import { amsterdamTodayKey, formatBrief, euro } from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const VAULT = process.env.VAULT_PATH || join(HERE, '..')
const BRIEF_HOOK = process.env.SLACK_BRAIN_BRIEF_WEBHOOK_URL
const ALERT_HOOK = process.env.SLACK_VPS_ALERTS_WEBHOOK_URL
const DRY = process.env.DRY_RUN === '1'

/** Bouwt het live-signalen-tekstblok dat aan de LLM gevoed wordt (incl. namen voor actiegerichtheid). */
function signalenTekst(s) {
  const lines = [
    `Open leads: ${s.openLeads}`,
    `Afspraken vandaag: ${s.afsprakenVandaag}` +
      (s.afspraken.length ? ` (${s.afspraken.map((a) => `${a.naam ?? '?'} ${a.afspraak_starttijd ?? ''}`.trim()).join('; ')})` : ''),
    `Stille offertes (>3d zonder akkoord): ${s.staleOffertes}` +
      (s.stale.length ? ` (${s.stale.slice(0, 5).map((o) => `${o.naam ?? '?'} — ${euro(o.totaal_prijs)}`).join('; ')})` : ''),
    `Opvolg-kandidaten: ${s.opvolg.length}` +
      (s.opvolg.length ? ` (${s.opvolg.slice(0, 5).map((o) => o.naam ?? '?').join('; ')})` : ''),
    `Omzet deze maand: ${euro(s.omzetMaand)}${s.omzetDoel ? ` van ${euro(s.omzetDoel)} doel` : ' (geen doel gezet)'}`,
  ]
  return lines.join('\n')
}

function kaleCijfers(datum, s) {
  return `:sunrise: *Frontlix-brief — ${datum}* (AI-duiding mislukt)\n` +
    `:bar_chart: ${s.openLeads} open leads · ${s.afsprakenVandaag} afspraak(en) vandaag · ` +
    `${s.staleOffertes} stille offerte(s) · omzet ${euro(s.omzetMaand)}` +
    (s.omzetDoel ? ` / ${euro(s.omzetDoel)} doel` : '')
}

async function main() {
  const datum = amsterdamTodayKey()

  // 1. Live signalen — bij DB-fout: alert naar VPS-alerts en stop.
  let signals
  try {
    signals = await fetchSignals(makeClient())
  } catch (err) {
    console.error('[brief] Supabase-fout:', err)
    if (!DRY && ALERT_HOOK) {
      await postSlack(ALERT_HOOK, `:warning: Frontlix-brief: Supabase-fout — ${err.message}`).catch(() => {})
    }
    process.exit(1)
  }

  // 2. Vault-context (best-effort).
  const [openLoops, doelen] = await Promise.all([
    readFile(join(VAULT, 'NU.md'), 'utf8').catch(() => '(NU.md niet gevonden)'),
    readFile(join(VAULT, '00-strategie', 'doelen.md'), 'utf8').catch(() => '(doelen.md niet gevonden)'),
  ])

  // 3. LLM → bij fout: kale cijfers.
  let message
  try {
    const stappen = await generateBrief({ doelen, openLoops, signalenTekst: signalenTekst(signals) })
    message = formatBrief({ datum, stappen, signalen: signals })
  } catch (err) {
    console.error('[brief] LLM faalde, val terug op kale cijfers:', err)
    message = kaleCijfers(datum, signals)
  }

  // 4. Verstuur (of print bij DRY_RUN).
  if (DRY) {
    console.log('--- DRY RUN — zou naar Slack posten: ---\n' + message)
    return
  }
  await postSlack(BRIEF_HOOK, message)
  console.log(`[brief] verstuurd voor ${datum}`)
}

main().catch((err) => {
  console.error('[brief] onverwachte fout:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add scripts/dagbrief.mjs
git commit -m "feat(dagbrief): main-script — wiring, fallbacks (DB-alert/kale cijfers), DRY_RUN"
```

---

## Task 7: Lokale dry-run (echte data, geen Slack)

**Files:** geen (verificatie).

- [ ] **Step 1: Lokale `.env` aanmaken** met de waarden uit Task 0 Step 2 (kopieer `.env.example` → `.env`, vul in). `.env` is al gitignored. NB: `node --env-file` vereist Node ≥20.6.

- [ ] **Step 2: Dry-run draaien**

Run: `cd ~/Desktop/frontlix-brain && npm run brief:dry`
Expected: een nette Nederlandse brief in de terminal — 1-3 stappen + een signalen-regel met echte cijfers uit Supabase. GEEN Slack-post. Geen errors.

- [ ] **Step 3: Sanity-check de output** — kloppen de aantallen ongeveer met het dashboard (open leads, afspraken vandaag)? Verwijst de onderbouwing naar echte signalen? Zo niet: controleer env-vars + de query-filters in `signals.mjs`.

- [ ] **Step 4: Eénmalige echte test naar Slack** (optioneel, lokaal): `npm run brief` → controleer dat het bericht in `#frontlix-brief` landt en leesbaar is. Pas zo nodig `formatBrief` aan.

---

## Task 8: Push + VPS-deploy + cron (vereist SSH-toestemming)

**Files:** geen (deploy/cron). **Let op:** SSH naar de VPS alleen ná expliciete toestemming per logische actie (VPS-workflow-regel).

- [ ] **Step 1: Push de brain-repo**

```bash
cd ~/Desktop/frontlix-brain
git push
```

- [ ] **Step 2: Brain-repo op de VPS clonen** (apart van `/var/www/frontlix`)

```bash
cd /var/www && git clone https://github.com/frontlix/frontlix-brein.git
cd /var/www/frontlix-brein && npm install --omit=dev
```

- [ ] **Step 3: VPS-`.env` zetten via `nano`** (nooit `echo` — secret-handling-regel):
`/var/www/frontlix-brein/.env` met de 5 waarden uit Task 0 Step 2.

- [ ] **Step 4: Node-versie checken** (`node --version`). Bij ≥ v20.6: `--env-file` werkt. Bij ouder: gebruik in de cron-regel `bash -c 'set -a; . .env; set +a; node scripts/dagbrief.mjs'` i.p.v. `--env-file`.

- [ ] **Step 5: Handmatige dry-run op de VPS**

```bash
cd /var/www/frontlix-brein && DRY_RUN=1 node --env-file=.env scripts/dagbrief.mjs
```
Expected: de brief in de terminal, geen Slack-post, geen errors.

- [ ] **Step 6: Eénmalige echte run** `cd /var/www/frontlix-brein && node --env-file=.env scripts/dagbrief.mjs` → bevestig dat het bericht in `#frontlix-brief` verschijnt.

- [ ] **Step 7: Crontab-regel toevoegen** (root-crontab, `crontab -e`) — 07:00 NL, één run/dag:

```cron
0 7 * * * cd /var/www/frontlix-brein && TZ=Europe/Amsterdam /usr/bin/node --env-file=.env scripts/dagbrief.mjs >> /var/log/frontlix-brief.log 2>&1
```
(Pad naar `node` checken met `which node`; vervang zo nodig.)

- [ ] **Step 8: Verifieer de volgende ochtend** dat de brief in `#frontlix-brief` staat, en check `/var/log/frontlix-brief.log` op fouten. Een `git pull` in `/var/www/frontlix-brein` houdt de vault + script up-to-date (overweeg een wekelijkse pull-cron of pull-bij-deploy).

---

## Self-Review (uitgevoerd)

**Spec-dekking (§7):** dagelijkse brief → Task 6+8 · 5 Supabase-signalen (1 project, service-role) → Task 3 · GPT-4o hergebruik `OPENAI_API_KEY` → Task 4 · NL-tijd (TZ + Intl) → Task 2/3/8 · fallback (DB-alert / kale cijfers) → Task 6 · Slack-patroon → Task 5 · cron op VPS, los van app & client-digest → Task 8 · doelen+NU.md als context → Task 6. **Gedekt.**

**Placeholder-scan:** geen TBD/TODO in de bouwlogica. Task 0 + Task 8 bevatten bewuste, gemarkeerde mens-/SSH-stappen (Slack-kanaal, secrets, cron) — geen verzwegen gaten.

**Type/naam-consistentie:** `fetchSignals` levert `{ openLeads, afsprakenVandaag, afspraken, staleOffertes, stale, opvolg, omzetMaand, omzetDoel }`; `signalenTekst` en `formatBrief` lezen exact die velden; `formatBrief`-test (Task 2) gebruikt dezelfde shape. `generateBrief` retourneert `stappen[]` met `{titel,actie,onderbouwing}` — matcht het `BRIEF_SCHEMA` en wat `formatBrief` verwacht. Env-namen identiek over alle modules + `.env.example` + Task 8.

**Bewuste keuze:** `deriveActions` (TS, website-repo) NIET geïmporteerd — GPT-4o prioriteert op de gerepliceerde signaal-drempels. Als de prioritering later strakker/deterministischer moet, is het importeren/porteren van `deriveActions` de logische vervolgstap (vereist dan tsx of een gedeelde package).
