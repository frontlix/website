# Frontlix Brain v2 — C1: LinkedIn in de brief

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Bite-sized stappen met TDD op de urgentie-logica.

**Goal:** De dagbrief leest de LinkedIn-CRM (publiek Apps-Script-endpoint) → "wie vandaag opvolgen", en herinnert aan de dagelijkse LinkedIn-routine (golden window di/wo/do, comments, connectieverzoeken). Dit zijn **Frontlix' eigen sales-acties** (anders dan de Schoon-Straatje-klantdata) → ze horen in de actielijst.

**Architecture:** Nieuw `scripts/crm.mjs` (pure `computeFollowups` + I/O `fetchCrm`), een vault-notitie `00-strategie/ritme.md`, helpers in `lib.mjs` (`daysSince`, `weekdagAmsterdam`), en integratie in `dagbrief.mjs` (extra context-blok + dag-bewustzijn + prompt-update). Geen nieuwe deps (`fetch` is ingebouwd). Env: `CRM_ENDPOINT_URL`.

**Tech Stack:** Node 20, fetch, vitest. Brain-repo: `~/Desktop/Frontlix hulp/frontlix-brain`.

**Datacontract (uit research):** GET `${CRM_ENDPOINT_URL}` → `{success, contacts:[...]}`. Keys: `eigenaar`(Chris/Georg), `bedrijf`, `linkedin_url`, `status`(gestuurd/follow-up-1/follow-up-2/reactie-ontvangen/niet-geinteresseerd/afgerond), `datum_laatste_actie`(YYYY-MM-DD), `notities`(soms `niet gelezen reset: YYYY-MM-DD`), `branche`, `tier`.

**Urgentie-tabel (zelf berekenen uit status + dagen sinds laatste actie):**
- `gestuurd` zonder reset: 0-3d=recent(skip) · 4+d=**check-gelezen**
- `gestuurd` mét reset: 0-3d=skip · 4-5d=**opvolgen** · 6+d=**dringend**
- `follow-up-1`: 0-4d=skip · 5-6d=**opvolgen** · 7+d=**dringend**
- `follow-up-2`: <7d=skip · 7+d=**dringend** (markeer niet-geïnteresseerd)
- `reactie-ontvangen`: altijd=**reactie**
- `niet-geinteresseerd`/`afgerond`: skip
Sorteer: dringend → reactie → opvolgen → check-gelezen.

---

## Task 1: lib-helpers `daysSince` + `weekdagAmsterdam` (TDD)
**Files:** Modify `scripts/lib.mjs`; Modify `scripts/lib.test.mjs`

- [ ] Test: `daysSince('2026-05-30', new Date('2026-06-02T10:00:00Z'))` === 3; `weekdagAmsterdam(new Date('2026-06-02T10:00:00Z'))` heeft `{iso:2, kort:'di'}` (2 juni 2026 = dinsdag).
- [ ] Implementeer in `lib.mjs`:
```js
/** Hele dagen tussen een YYYY-MM-DD datum en nu (kalenderdagen, ~grof). */
export function daysSince(isoDate, now = new Date()) {
  if (!isoDate) return null
  const then = new Date(`${isoDate}T00:00:00Z`)
  if (isNaN(then)) return null
  return Math.floor((now.getTime() - then.getTime()) / 86400000)
}
/** Weekdag in Europe/Amsterdam: { iso:1-7(ma-zo), kort:'ma'..'zo', naam }. */
export function weekdagAmsterdam(now = new Date()) {
  const kort = ['zo','ma','di','wo','do','vr','za']
  const naam = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']
  const d = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', weekday: 'short' }).format(now)
  const map = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }
  const idx = map[d] ?? 0
  return { iso: idx === 0 ? 7 : idx, kort: kort[idx], naam: naam[idx] }
}
```
- [ ] Tests groen (`npm test`). Commit.

## Task 2: `scripts/crm.mjs` — fetch + urgentie (TDD op de pure logica)
**Files:** Create `scripts/crm.mjs`, `scripts/crm.test.mjs`

- [ ] Test `computeFollowups(contacts, now)` met mock-contacten die elke tak van de urgentie-tabel raken (gestuurd 5d zonder reset → check-gelezen; follow-up-1 8d → dringend; reactie-ontvangen → reactie; afgerond → skip). Assert de juiste `urgentie` + sortering.
- [ ] Implementeer `scripts/crm.mjs`:
```js
import { daysSince } from './lib.mjs'

export async function fetchCrm(url) {
  if (!url) throw new Error('CRM_ENDPOINT_URL ontbreekt')
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`CRM-endpoint faalde: ${res.status}`)
  const json = await res.json()
  if (!json?.success || !Array.isArray(json.contacts)) throw new Error('CRM gaf onverwacht antwoord')
  return json.contacts
}

const RESET_RE = /niet gelezen reset:\s*(\d{4}-\d{2}-\d{2})/i
const RANK = { dringend: 0, reactie: 1, opvolgen: 2, 'check-gelezen': 3 }

/** Pure: bepaalt per contact de follow-up-urgentie; geeft alleen actie-rijen terug, gesorteerd. */
export function computeFollowups(contacts, now = new Date()) {
  const out = []
  for (const c of contacts ?? []) {
    const status = (c.status || '').toLowerCase()
    if (status === 'niet-geinteresseerd' || status === 'afgerond') continue
    const reset = (c.notities || '').match(RESET_RE)?.[1]
    const basis = status === 'gestuurd' && reset ? reset : c.datum_laatste_actie
    const dagen = daysSince(basis, now)
    let urgentie = null
    if (status === 'reactie-ontvangen') urgentie = 'reactie'
    else if (dagen == null) urgentie = null
    else if (status === 'gestuurd' && reset) urgentie = dagen >= 6 ? 'dringend' : dagen >= 4 ? 'opvolgen' : null
    else if (status === 'gestuurd') urgentie = dagen >= 4 ? 'check-gelezen' : null
    else if (status === 'follow-up-1') urgentie = dagen >= 7 ? 'dringend' : dagen >= 5 ? 'opvolgen' : null
    else if (status === 'follow-up-2') urgentie = dagen >= 7 ? 'dringend' : null
    if (!urgentie) continue
    out.push({ eigenaar: c.eigenaar || '?', bedrijf: c.bedrijf || '?', tier: c.tier || '', status,
      dagen, urgentie, linkedin_url: c.linkedin_url || '' })
  }
  return out.sort((a, b) => (RANK[a.urgentie] - RANK[b.urgentie]) || (b.dagen ?? 0) - (a.dagen ?? 0))
}
```
- [ ] Tests groen. Commit.

## Task 3: `00-strategie/ritme.md` (de LinkedIn-routine die de brief leest)
**Files:** Create `00-strategie/ritme.md`
- [ ] Schrijf de notitie met de dagelijkse + wekelijkse rituelen (golden window di/wo/do 08:00-09:30; 5-8 comments/dag; 5-8 connectieverzoeken/dag; ~20-25 min must-do; maandag-productieblok + funnel-review). Commit (gaat mee in de vault).

## Task 4: integratie in `scripts/dagbrief.mjs`
**Files:** Modify `scripts/dagbrief.mjs`, `scripts/generate.mjs`
- [ ] `dagbrief.mjs`: importeer `fetchCrm`/`computeFollowups` + `weekdagAmsterdam`. Haal de CRM-follow-ups best-effort op (try/catch → bij fout een nette "CRM niet bereikbaar"-regel, brief gaat door). Lees `00-strategie/ritme.md` (best-effort). Voeg aan de LLM-context twee blokken toe: `# FRONTLIX — sales/outreach VANDAAG (jouw werk)` (de follow-ups, per owner, met bedrijf/tier/dagen/urgentie/linkedin_url) + `# FRONTLIX — LinkedIn-routine (dag: <weekdag>)` (ritme.md + de weekdag). Toon de CRM-telling ook in de `formatBrief`-statusregel als een Frontlix-blok.
- [ ] `generate.mjs` SYSTEM_PROMPT: voeg toe dat de CRM-follow-ups + LinkedIn-routine **Frontlix' eigen sales-werk** zijn (wél actie-advies), naast de bestaande "Schoon Straatje = klant-operatie, geen to-do"-regel. Op di/wo/do het golden-window-blok prioriteren.
- [ ] Tests groen. Commit.

## Task 5: env + deploy
**Files:** Modify `.env.example`; lokale + VPS `.env`; VPS `git pull`
- [ ] `.env.example`: voeg `CRM_ENDPOINT_URL=` toe. Commit.
- [ ] Lokale `.env`: zet `CRM_ENDPOINT_URL=<publieke /exec-URL>`. Dry-run (`npm run brief:dry`) → controleer dat de follow-ups + routine in de brief staan en correct geframed zijn (Frontlix-acties).
- [ ] Push; op de VPS: `git pull` + `CRM_ENDPOINT_URL` in de VPS-`.env` zetten + een dry-run op de VPS. (Geen `npm install` nodig — geen nieuwe deps.)

---

## Self-Review
**Spec-dekking (v2 §4):** ① CRM-follow-ups → Task 2+4 · ② rituelen → Task 3+4 · Frontlix-vs-klant-framing → Task 4 (prompt) · env/config → Task 5. **Gedekt.** Funnel-KPI's (growth-log) bewust uitgesteld (placeholders) — buiten C1.
**Placeholders:** geen; `<publieke /exec-URL>` is de bekende config-waarde (uit research), niet gecommit (`.env` is gitignored).
**Consistentie:** `computeFollowups`/`fetchCrm`/`daysSince`/`weekdagAmsterdam` namen identiek over crm.mjs/lib.mjs/dagbrief.mjs.
