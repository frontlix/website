# Frontlix Brain v2 — "de brain leeft": bronnen, check-in & onderhoud

**Datum:** 2026-06-02
**Status:** goedgekeurd — klaar voor implementatieplannen (per component)
**Auteur:** Christiaan (+ Claude)
**Bouwt voort op:** `2026-06-02-frontlix-brain-design.md` (v1: vault + dagbrief, live)

---

## 1. Doel

v1 gaf de brain een **hartslag** (dagelijkse Slack-brief). v2 laat de brain **leven**: hij
kent je dagelijkse werk (sales/outreach), weet wat er gedaan is, en houdt zichzelf actueel.
Vier toevoegingen, gebouwd op de bestaande brain-repo (`frontlix-brein`, scripts in `scripts/`):

- **Fundament** — echte git-toegang op de VPS (deploy-key), zodat de vault vanzelf vers blijft
  én de check-in kan terugschrijven.
- **Component 1 — LinkedIn in de brief** (① CRM-follow-ups + ② dagelijkse rituelen).
- **Component 2 — onderhouds-/staleness-loop** (④ wekelijks stale notities flaggen).
- **Component 3 — dagelijkse check-in (VOL)** (③ Slack-replies → terug naar de vault).

Elk component krijgt zijn **eigen implementatieplan**. Bouwvolgorde: Fundament → C1 → C2 → C3.

## 2. Vastgelegde keuzes

- **③ check-in = VOL** (Slack-replies lezen → vault), niet de lichte git-commit-variant.
  Reden: vol vangt ook je eigen woorden/reflectie (niet alleen wat in git/`NU.md` staat) —
  dat is de extra waarde voor "Jarvis weet wat ik elke dag doe". Wel als nette MVP (zie C3).
- **④ onderhouds-loop = deterministisch** (geen LLM in v1; LLM-duiding is latere upgrade).
- LLM blijft **OpenAI GPT-4o** (`OPENAI_API_KEY`), zoals v1. Geen nieuwe leverancier.
- Hergebruik de bestaande scripts/infra: `scripts/slack.mjs`, `scripts/lib.mjs`,
  `scripts/dagbrief.mjs`-skelet (env-file, `DRY_RUN`, degraded fallback, VPS-cron + `TZ=Europe/Amsterdam`).

---

## 3. Fundament — git-toegang op de VPS (deploy-key)

**Probleem:** de brain staat op de VPS via **rsync** (eenmalig gepusht, mét `.git` maar zonder
push/pull-auth — de VPS heeft geen credentials voor de privé-repo). Daardoor: updates = handmatig
re-rsyncen, en de check-in (C3) kan niet terugschrijven.

**Oplossing:** een **read+write deploy-key** voor `frontlix-brein`.
1. Op de VPS: `ssh-keygen -t ed25519 -f ~/.ssh/frontlix_brein_deploy -N "" -C "frontlix-brein-vps"`.
2. De **publieke** sleutel (geen secret) wordt op GitHub toegevoegd als **deploy key met write-access**
   (`frontlix/frontlix-brein` → Settings → Deploy keys → Add → "Allow write access"). *Door Chris.*
3. Op de VPS: remote omzetten naar SSH (`git remote set-url origin git@github.com:frontlix/frontlix-brein.git`)
   + een `~/.ssh/config`-host-entry of `GIT_SSH_COMMAND` die de deploy-key gebruikt.
4. Verifieer `git pull` + een test-`push`.

**Gevolg:** `git pull` vervangt de handmatige rsync (vault/script blijven vanzelf vers op de VPS),
en C3 kan committen/pushen. Dit is de vereiste voor C3 en lost meteen het "blijft-vers"-gat op.

## 4. Component 1 — LinkedIn in de brief

Dit maakt de dagbrief relevanter voor je #1-doel (klanten werven). Twee delen, beide **Frontlix' eigen
werk** (anders dan de Schoon-Straatje-klantdata → ze horen wél in de actielijst).

### ① CRM-follow-ups
- **Bron:** de LinkedIn-CRM Google Sheet, leesbaar via een **publiek Apps-Script-endpoint** (JSON,
  geen auth): `curl -s -L "$CRM_URL?eigenaar=Chris"` en `?eigenaar=Georg`. Response:
  `{ success, contacts: [...] }`. URL als config (`CRM_ENDPOINT_URL` in `.env`) — hardcoded
  deployment-URL die breekt bij een *nieuwe* (i.p.v. ge-edite) deployment.
- **Velden (JSON-keys):** `eigenaar`, `bedrijf`, `linkedin_url`, `status`
  (`gestuurd|follow-up-1|follow-up-2|reactie-ontvangen|niet-geinteresseerd|afgerond`),
  `datum_laatste_actie`, `notities`, `branche`, `tier`.
- **Urgentie (zelf berekenen uit `status` + dagen sinds `datum_laatste_actie`):** `gestuurd` 4+d
  zonder reset → "checken of gelezen"; mét reset (`notities` bevat `niet gelezen reset: YYYY-MM-DD`)
  4-5d → opvolgen, 6+d → dringend; `follow-up-1` 5-6d → FU2 nodig, 7+d → dringend; `follow-up-2`
  7+d → markeer niet-geïnteresseerd; `reactie-ontvangen` → altijd actie.
- **In de brief:** "vandaag opvolgen" = de DRINGEND/OPVOLGEN/reactie-ontvangen-rijen, met `bedrijf`,
  `tier`, dagen-geleden en de klikbare `linkedin_url`. Per owner (Chris/Georg).
- **Nieuw bestand:** `scripts/crm.mjs` (fetch + parse + urgentie). De dagbrief voegt een context-blok
  toe: `# FRONTLIX — sales/outreach (jouw werk)`.

### ② Dagelijkse rituelen (uit `linkedin-strategy`)
- **Dagelijks (dag-bewust):** golden window **di/wo/do 08:00–09:30**; 5-8 inhoudelijke comments/dag;
  5-8 connectieverzoeken/dag; ~20-25 min must-do.
- **Wekelijks (maandag):** productieblok (posts + power-list snoeien) + funnel-review.
- **Realisatie:** een `00-strategie/ritme.md` in de vault (de brief leest 'm + weet de dag van de week),
  zodat de reminders bijstelbaar zijn zonder code te wijzigen.
- **Kanttekening:** `growth-log.json` (de funnel-tellers) staat nog vol placeholders → echte
  funnel-KPI's (noord-ster, demo-aanvragen) toont de brief pas zodra die log gevuld is. De
  ritueel-reminders + CRM-follow-ups werken nu al.

## 5. Component 2 — onderhouds-/staleness-loop

Houdt de vault schoon, deterministisch (geen LLM).

- **Nieuw bestand:** `scripts/staleness.mjs`. **Wekelijkse VPS-cron** (bv. maandag 08:00,
  `TZ=Europe/Amsterdam`), naast de dagbrief.
- **Checks (allemaal deterministisch):** (a) notities met `updated:` ouder dan **30 dagen**
  ("nog actueel?"); (b) git-commit-datum nieuwer dan `updated:` ("vergeten te bumpen"); (c) dode
  `[[wikilinks]]` (link-target bestaat niet → schema-regel gebroken). **Skip `INDEX.md`** (template
  met `YYYY-MM-DD`-placeholder).
- **Output:** één Slack-bericht (via `postSlack`) naar `SLACK_BRAIN_MAINTENANCE_WEBHOOK_URL`
  (of hergebruik de brief-hook): *"🧹 Vault-onderhoud — N notities >30d / M dode links — nog actueel?"*
- **VAULT_PATH-parametrisch** (zoals de dagbrief), zodat hetzelfde script later ook lokaal tegen de
  Claude-memory kan draaien. **Claude-memory zelf:** niet bereikbaar vanaf de VPS, en grotendeels
  stabiele `feedback_*`-gedragsregels → nu **niets** voor bouwen (YAGNI); later evt. lokaal met dit script.
- **Later (Optie B):** optionele GPT-4o-duiding ("welke ruikt naar achterhaald?") als de kale
  leeftijd-lijst te bot blijkt — met dezelfde degraded fallback als de dagbrief.

## 6. Component 3 — dagelijkse check-in (VOL)

De brief stelt 's ochtends een vraag; Chris/Georg antwoorden in de Slack-thread; die replies komen
terug in de vault. **Vereist het git-fundament (§3).**

**Slack-kant (eenmalige config):**
- De bestaande Slack-app heeft al een **bot-token** (`SLACK_BOT_TOKEN`) + signing-secret (voor de
  template-flow). Voeg **`groups:history`** toe (privé-kanaal) + **`chat:write`**, en **herinstalleer**
  de app. ⚠️ Herinstallatie kan de bot-token roteren → werk `SLACK_BOT_TOKEN` bij overal waar 'ie
  gebruikt wordt (`app/api/dashboard/slack/template-action/route.ts`) om de live template-flow niet te
  breken. Nodig de bot uit in `#frontix-brein` (`/invite`).
- **Brief omschakelen van webhook → `chat.postMessage`** (met het bot-token), zodat de respons de
  **message-`ts`** teruggeeft. Sla die `ts` op als anker (klein state-bestand `scripts/.state/last-brief.json`,
  gitignored, óf een Supabase-rij) zodat de avond-cron weet welke thread te lezen.

**Capture-kant (avond-cron, bv. 19:00 NL):**
- `conversations.replies` op de brief-`ts` van die dag → filter replies van Chris/Georg →
  **append-only** naar een dagboek-bestand **per dag** (`99-archief/dagboek/YYYY-MM-DD.md`, één
  bestand/dag → conflict-vrij) → `git pull --rebase` → `commit` → `push` (kan dankzij §3).
- **MVP-grens:** ruwe append (auteur + tijd + tekst), **geen LLM-classificatie** in v1. Later
  (als het knelt): GPT-4o classificeert een reply als nieuwe open loop / afvink / notitie en sluist
  het naar `NU.md`. Conform spec-v1 §5/§6 (capture → wekelijkse opruim).
- **Nieuw bestand:** `scripts/checkin.mjs` + een `chat.postMessage`-variant in `scripts/slack.mjs`.

## 7. Bouwvolgorde (elk = eigen plan)

1. **Fundament** — deploy-key + git pull/push op de VPS (vervangt rsync).
2. **C1 — LinkedIn in de brief** (`crm.mjs` + `00-strategie/ritme.md` + dagbrief-uitbreiding).
3. **C2 — onderhouds-loop** (`staleness.mjs` + wekelijkse cron).
4. **C3 — check-in vol** (Slack-scopes/reinstall + `chat.postMessage`+ts-state + `checkin.mjs` + avond-cron).

## 8. Open punten / vereisten

- **Deploy-key (write)** door Chris op GitHub toe te voegen (§3) — vereiste voor het fundament + C3.
- **Slack-app-herinstallatie** met nieuwe scopes — raakt de live template-flow (token-rotatie-risico);
  zorgvuldig + `SLACK_BOT_TOKEN` overal bijwerken.
- **Publiek CRM-endpoint** — leesbaar door iedereen met de URL. Aparte hardening-keuze (bv. een
  shared-secret-param toevoegen in de Apps Script) — staat los van de brief, los te plannen.
- **`growth-log.json` placeholders** — funnel-KPI's in de brief pas ná het vullen ervan; ritueel-reminders
  + CRM-follow-ups werken al wel.
- **CRM `/exec`-URL** is een hardcoded deployment-URL → als config zetten; breekt bij een nieuwe deployment.

## 9. Wat we bewust NIET doen (YAGNI)

Geen Slack Events API (push) voor C3 (pull-cron volstaat, breekt de losgekoppelde architectuur niet) ·
geen LLM-classificatie van check-in-replies in v1 · geen LLM in de onderhouds-loop in v1 · geen
staleness-cron voor de Claude-memory (niet op VPS, stabiele gedragsregels) · geen vector-DB/RAG (nog steeds
niet nodig op deze schaal).
