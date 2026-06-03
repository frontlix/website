# Frontlix Brain v2 — C2: onderhouds-/staleness-loop

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Deterministisch (geen LLM); TDD op de pure analyse-functies.

**Goal:** Een wekelijkse Slack-melding die de vault schoon houdt: notities met `updated:` >30 dagen, notities waar de git-commit nieuwer is dan `updated:` (vergeten te bumpen), en dode `[[wikilinks]]`.

**Architecture:** `scripts/staleness.mjs` — pure analyse (`parseUpdated`/`findWikilinks`/`daysBetween`/`analyze`) + I/O (vault doorlopen, git-datums, posten). Hergebruikt `scripts/slack.mjs` (`postSlack`) + `scripts/lib.mjs` (`amsterdamTodayKey`). Geen LLM, geen nieuwe deps. Post naar `SLACK_BRAIN_MAINTENANCE_WEBHOOK_URL` óf (fallback) de bestaande `SLACK_BRAIN_BRIEF_WEBHOOK_URL` → géén nieuwe webhook nodig. Wekelijkse VPS-cron (maandag 08:00 `TZ=Europe/Amsterdam`).

**Tech Stack:** Node 20, git, vitest. Brain-repo: `~/Desktop/Frontlix hulp/frontlix-brain`.

**Checks (allemaal deterministisch):** (a) `updated:` ouder dan `STALE_THRESHOLD_DAGEN` (default 30); (b) laatste git-commit-datum nieuwer dan `updated:`; (c) `[[target]]` zonder bestaand `target.md`. Skip notities zonder frontmatter-`updated:` (o.a. `INDEX.md`) en de voorbeeld-links `[[bestandsnaam-zonder-extensie]]`/`[[bron]]` (snippets in INDEX/NU).

---

## Task 1: npm-scripts
**Files:** Modify `package.json`
- [ ] Voeg toe aan `scripts`: `"stale": "node --env-file=.env scripts/staleness.mjs"`, `"stale:dry": "DRY_RUN=1 node --env-file=.env scripts/staleness.mjs"`.

## Task 2: `scripts/staleness.mjs` + test (TDD op de pure functies)
**Files:** Create `scripts/staleness.mjs`, `scripts/staleness.test.mjs`
- [ ] Test `parseUpdated` (frontmatter → datum / null), `findWikilinks` (targets), `analyze` (stale/bump/dead buckets met een mock-set). Tests groen.
- [ ] Implementeer `staleness.mjs` (pure: `parseUpdated`, `findWikilinks`, `daysBetween`, `analyze`; I/O: `walk` (recursief, skip dotfiles + node_modules), `gitDate` (`git -C VAULT log -1 --format=%cs -- <relpad>`), `formatMaintenance`, `main`). DRY_RUN-print zoals de dagbrief.

## Task 3: lokaal verifiëren
- [ ] `npm test` (alle groen) + `npm run stale:dry` → één net Slack-bericht (of "alles schoon").

## Task 4: deploy
- [ ] Commit + push. VPS: `git pull` + wekelijkse cron `0 8 * * 1 cd /var/www/frontlix-brein && TZ=Europe/Amsterdam /usr/bin/node --env-file=.env scripts/staleness.mjs >> /var/log/frontlix-brief.log 2>&1` (idempotent). Dry-run op de VPS ter controle. Geen npm install nodig (geen nieuwe deps).

## Self-Review
**Spec-dekking (v2 §5):** wekelijkse cron → Task 4 · updated>30d + git-mismatch + dode links → Task 2 · skip INDEX/voorbeeld-links → Task 2 · hergebruik slack/lib → Task 2 · geen LLM/nieuwe webhook → architectuur. **Gedekt.** LLM-duiding (Optie B) bewust uitgesteld.
