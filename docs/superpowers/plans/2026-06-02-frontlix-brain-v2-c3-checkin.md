# Frontlix Brain v2 — C3: dagelijkse check-in (vol)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. TDD op de pure parsers; de Slack-I/O via mocks/handmatige verificatie.

**Goal:** De ochtendbrief stelt een check-in-vraag in Slack; Chris/Georg antwoorden in de thread; een avond-cron leest die replies en schrijft ze naar de vault (`99-archief/dagboek/YYYY-MM-DD.md`), commit + push. Zo leert Jarvis je dagelijkse activiteit in je eigen woorden.

**Architecture:** Een **aparte "Frontlix Brain" Slack-app** (raakt de live template-flow NIET) met bot-scopes `chat:write` + `groups:history`, in `#frontix-brein`. De brief schakelt van incoming-webhook naar `chat.postMessage` (geeft de message-`ts`) — **met graceful fallback**: zonder bot-token blijft de webhook werken (niets breekt tijdens de overgang). De `ts` wordt opgeslagen in `scripts/.state/last-brief.json` (gitignored). De avond-cron (`checkin.mjs`) leest `conversations.replies`, filtert menselijke replies, schrijft het dagboek en commit/pusht (kan dankzij het git-fundament van stap 0). **MVP:** ruwe append, géén LLM-classificatie (later).

**Tech Stack:** Node 20, Slack Web API (fetch), git, vitest. Env: `SLACK_BOT_TOKEN`, `SLACK_BRAIN_CHANNEL_ID`.

---

## Task 0 (HANDMATIG — Chris): aparte "Frontlix Brain" Slack-app
- [ ] api.slack.com/apps → **Create New App** → "From scratch" → naam "Frontlix Brain", je workspace.
- [ ] **OAuth & Permissions → Bot Token Scopes:** voeg toe `chat:write` + `groups:history`.
- [ ] **Install to Workspace** → kopieer het **Bot User OAuth Token** (`xoxb-…`).
- [ ] In Slack: open `#frontix-brein` → `/invite @Frontlix Brain` (bot in het kanaal).
- [ ] Geef Claude: het `xoxb-…`-token + het **channel-ID** van `#frontix-brein` (uit de kanaal-URL: `…/C0B7HM3E6F5`).

*(Aparte app = de bestaande template-flow-app + zijn token blijven onaangeroerd.)*

## Task 1: `slack.mjs` — bot-functies + pure reply-filter (TDD op de pure)
**Files:** Modify `scripts/slack.mjs`; Create `scripts/slack.test.mjs`
- [ ] Houd `postSlack(webhookUrl, text)` (webhook — voor staleness + fallback). Voeg toe: `postMessage(token, channel, text)` → `ts` (chat.postMessage), `getReplies(token, channel, ts)` → messages[], en pure `humanReplies(messages, parentTs)` (geen parent, geen bot-berichten, alleen met tekst).
- [ ] Test `humanReplies`: filtert parent-ts + `bot_id`-berichten eruit. Tests groen.

## Task 2: state-helper + check-in-cron
**Files:** Create `scripts/state.mjs`, `scripts/checkin.mjs`, `scripts/checkin.test.mjs`; Modify `.gitignore`
- [ ] `state.mjs`: `saveBriefTs(datum, ts)` / `loadBriefTs()` → `scripts/.state/last-brief.json`. Voeg `scripts/.state/` toe aan `.gitignore`.
- [ ] `checkin.mjs`: pure `formatJournalEntry(datum, replies)` (frontmatter + bullets) + `main` (skip als bot niet geconfigureerd of geen brief-ts van vandaag → leest replies → schrijft `99-archief/dagboek/<datum>.md` → `git pull --rebase` + `add` + `commit` + `push`; DRY_RUN print). 
- [ ] Test `formatJournalEntry`. Tests groen.

## Task 3: brief → bot met fallback
**Files:** Modify `scripts/dagbrief.mjs`
- [ ] Als `SLACK_BOT_TOKEN` + `SLACK_BRAIN_CHANNEL_ID` gezet: post via `postMessage` (append een check-in-vraag), sla de `ts` op via `saveBriefTs`. Anders: huidige webhook-`postSlack` (ongewijzigd gedrag). Bot-post faalt → val terug op webhook.

## Task 4: npm-scripts + env + deploy
**Files:** Modify `package.json`, `.env.example`
- [ ] `package.json`: `"checkin"` + `"checkin:dry"`. `.env.example`: `SLACK_BOT_TOKEN=` + `SLACK_BRAIN_CHANNEL_ID=`.
- [ ] `npm test` + `npm run brief:dry` (toont webhook-modus zolang er geen bot-token is — bewijst dat niets breekt). Commit + push. VPS `git pull`.
- [ ] **Na Task 0:** bot-token + channel-ID in lokale + VPS `.env`. Test: `npm run brief` (post via bot) → reageer in de thread → `npm run checkin:dry` (leest de reply) → dan echte `checkin` + controleer het dagboek-bestand + git-push. Avond-cron: `0 19 * * * cd /var/www/frontlix-brein && TZ=Europe/Amsterdam /usr/bin/node --env-file=.env scripts/checkin.mjs >> /var/log/frontlix-brief.log 2>&1`.

## Self-Review
**Spec-dekking (v2 §6):** aparte app (geen reinstall-risico) ✓ afwijking van de spec (die noemde de bestaande app) — **veiliger**, expliciet zo gekozen. chat.postMessage+ts → Task 1/3 · ts-state → Task 2 · avond-cron replies→dagboek→git → Task 2/4 · graceful fallback → Task 3 · MVP zonder LLM-classificatie → Task 2. **Gedekt.**
