# Frontlix Brain — Plan 1: De vault (het brein zelf)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een werkende, doorzoekbare markdown-vault `frontlix-brain` opzetten — geordend, met conventies, gevuld met de gemigreerde kennis en geseede strategie/klant/product-notities — zodat Claude én Georg er direct mee kunnen werken.

**Architecture:** Lokale git-repo met platte markdown (PARA-mappen 00–99), een altijd-geladen `INDEX.md` die de conventies draagt, en `NU.md` als open-loops-feed. Privé GitHub-remote voor Georg. Geen runtime, geen externe afhankelijkheden — puur bestanden + git.

**Tech Stack:** git, markdown, GitHub (privé-repo), optioneel Obsidian + `kepano/obsidian-skills`.

**Dit is Plan 1 van 2.** Plan 2 (de dagelijkse Slack-brief: cron → Supabase → OpenAI → Slack) wordt apart geschreven nadat deze vault bestaat. Volledige context: `docs/superpowers/specs/2026-06-02-frontlix-brain-design.md`.

---

## Werklocatie & voorbereiding

- De repo komt op **`~/Desktop/frontlix-brain/`** — een aparte map, NIET in `Frontlix website/`.
  De executor werkt vanuit die map.
- De 11 te migreren bronnen staan in:
  `~/.claude/projects/-Users-christiaantromp-Desktop-Frontlix-website/memory/`
- De `feedback_*`-notities daar **blijven staan** (verhuizen niet).

## File-structuur (wat dit plan oplevert)

```
~/Desktop/frontlix-brain/
├── .gitignore                         (Task 1)
├── INDEX.md                           (Task 2 — kaart + conventies + 3 regels + Georg-onboarding)
├── NU.md                              (Task 3 — ## Open / ## Wacht op / ## Inbox)
├── 00-strategie/
│   ├── doelen.md                      (Task 6)
│   └── team-en-toegang.md             (Task 6)
├── 01-projecten/
│   ├── mobiel-dashboard-port.md       (Task 5)
│   └── offerte-mail-afmaken.md        (Task 5)
├── 02-klanten/
│   └── schoon-straatje.md             (Task 6)
├── 03-product/
│   ├── branches.md                    (Task 6)
│   ├── tech-beslissingen.md           (Task 5)
│   ├── service-offerings.md           (Task 5)
│   └── slack-template-aanvragen.md    (Task 5)
├── 05-ops/
│   ├── deploy.md                      (Task 4)
│   ├── lead-automation-cron.md        (Task 4)
│   ├── vps-security.md                (Task 4 — hardening-stand, IOC's geredigeerd)
│   ├── monitoring-alerts.md           (Task 4)
│   └── hostinger-cpu-throttle.md      (Task 4)
├── 06-resources/
│   └── dashboard-host-en-screenshots.md  (Task 5)
└── 99-archief/
    └── incident-2026-05-miner.md      (Task 4 — relaas, IOC's geredigeerd)
```
(`04-sales-marketing/` blijft voorlopig leeg; `pipeline.md` komt zodra de LinkedIn-sync relevant is.)

---

## Task 1: Repo initialiseren + .gitignore + mappen-skelet

**Files:**
- Create: `~/Desktop/frontlix-brain/.gitignore`
- Create: lege mappen `00-strategie` `01-projecten` `02-klanten` `03-product` `04-sales-marketing` `05-ops` `06-resources` `99-archief`

- [ ] **Step 1: Repo + mappen aanmaken**

```bash
mkdir -p ~/Desktop/frontlix-brain
cd ~/Desktop/frontlix-brain
git init
mkdir -p 00-strategie 01-projecten 02-klanten 03-product 04-sales-marketing 05-ops 06-resources 99-archief
```

- [ ] **Step 2: .gitignore schrijven**

Inhoud van `~/Desktop/frontlix-brain/.gitignore`:
```gitignore
# NOOIT secrets in de vault — git-historie is forever en gedeeld
*.env
.env*
*.key
*secret*
*credential*
*.pem
.DS_Store
.obsidian/workspace*
```

- [ ] **Step 3: Verifiëren dat git de .gitignore-patronen pakt**

Run: `cd ~/Desktop/frontlix-brain && printf 'TEST=geheim\n' > test.env && git status --porcelain`
Expected: `test.env` verschijnt NIET in de output (alleen `.gitignore` als untracked).
Daarna opruimen: `rm test.env`

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add .gitignore
git commit -m "chore: init frontlix-brain vault + gitignore (geen secrets)"
```

---

## Task 2: INDEX.md — de altijd-geladen kaart + conventies

**Files:**
- Create: `~/Desktop/frontlix-brain/INDEX.md`

- [ ] **Step 1: INDEX.md schrijven**

Inhoud van `~/Desktop/frontlix-brain/INDEX.md`:
```markdown
# Frontlix Brain — INDEX

Het tweede brein van Frontlix. Dit bestand is de kaart: lees het eerst.

## ⚠️ Drie harde regels
1. **Geen secrets in de vault.** Geen tokens/keys/wachtwoorden/webhook-URLs. Git-historie is
   forever en gedeeld met Georg. Secrets horen in de VPS-`.env` (via `nano`, nooit `echo`).
2. **Geen rauwe lead-PII.** Naam/telefoon/adres van échte klanten horen in Supabase (met RLS),
   niet in markdown. Gebruik geaggregeerde cijfers; verwijs naar Supabase als bron.
3. **Pull voor je schrijft, commit klein.** Bij 2 schrijvers (Chris + Georg). `INDEX.md` =
   alleen links (zelden conflict); per dag een eigen bestand i.p.v. samen één bestand editen.

## Mappenlegenda (PARA)
- `NU.md` — open loops + wacht-op + inbox. DE brandstof voor de dagbrief. Begin hier.
- `00-strategie/` — doelen, richting, rollen & toegang.
- `01-projecten/` — lopend werk.
- `02-klanten/` — dossier per klant (live instanties).
- `03-product/` — het product dat Frontlix verkoopt (los van de klant).
- `04-sales-marketing/` — pipeline-samenvatting, outreach, content.
- `05-ops/` — VPS, deploy, security, kosten.
- `06-resources/` — herbruikbare kennis, snippets, research.
- `99-archief/` — afgerond.

## Notitie-conventies
Elke notitie begint met deze frontmatter:
\```yaml
---
name: <kebab-slug — exact gelijk aan de bestandsnaam zonder .md>
type: project | klant | product | sales | ops | resource | strategie
status: active | live | pending | untested | deferred | archived
updated: YYYY-MM-DD
---
\```
- `status` is één waarde uit de set. Een blokkade staat als tekst áchter de status:
  `status: untested (blokker: bot-verificatie)`.
- Links: Obsidian-wikilinks `[[bestandsnaam-zonder-extensie]]`. Target == exacte bestandsnaam.
- Bestandsnaam == kebab-slug == link-target. Atomair: ~1 concept per notitie.

## Voor Georg (git-onboarding)
\```bash
git clone git@github.com:frontlix/frontlix-brain.git ~/Desktop/frontlix-brain
cd ~/Desktop/frontlix-brain
git pull          # ALTIJD eerst pullen voor je schrijft
# ... wijzig/voeg notities toe ...
git add -A && git commit -m "..." && git push
\```
Open de map als vault in Obsidian voor een leesbare interface (desktop + mobiel).

## Relatie met de Claude-memory
Operationele/gedeelde kennis leeft hier (gedeeld met Georg). De `feedback_*`-notities in
Christiaans Claude-memory (hoe Claude moet wérken) blijven daar — die zijn per-gebruiker en
horen niet in de gedeelde vault.
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add INDEX.md
git commit -m "docs: INDEX.md — kaart, conventies, 3 harde regels, Georg-onboarding"
```

---

## Task 3: NU.md — de open-loops-feed (geseed met de echte stand)

**Files:**
- Create: `~/Desktop/frontlix-brain/NU.md`

- [ ] **Step 1: NU.md schrijven** (geseed met bekende open punten uit de memory)

Inhoud van `~/Desktop/frontlix-brain/NU.md`:
```markdown
---
name: NU
type: strategie
status: active
updated: 2026-06-02
---

# NU — open loops

De brandstof voor de dagbrief. Eén regel per actie: `actie — owner — status — [[bron]]`.
Owner = wie het oppakt (niet wie het mag zien; alles is gedeeld).

## Open
- [ ] Offerte-mail end-to-end testen naar een echte klant-mail — Chris — untested — [[offerte-mail-afmaken]]
- [ ] Mobiele dashboard-port afronden (resterende DB-afhankelijke schermen) — Chris — active — [[mobiel-dashboard-port]]

## Wacht op
- [ ] Beslissing op uitgestelde security-items (key-rotatie C7, rate-limiting H9, cron-telefoonnummers M25) — Chris — deferred — [[tech-beslissingen]]

## Inbox
<!-- Snelle dumps hier. Wekelijks opruimen naar de juiste map. -->
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add NU.md
git commit -m "docs: NU.md — open-loops feed, geseed met huidige stand"
```

---

## Task 4: Migreren — ops/security (5 notities → 05-ops/ + 99-archief/)

**Transformatie-regel (geldt voor élke migratie-stap in Task 4 en 5):**
1. Lees het bronbestand in de Claude-memory-map.
2. Behoud de inhoud van de body. Vervang de frontmatter door het uniforme platte schema
   uit `INDEX.md` (`name` = kebab-slug = nieuwe bestandsnaam; `type`; `status`; `updated`).
3. Converteer markdown-links → wikilinks; zorg dat elk `[[link-target]]` == een bestaande
   bestandsnaam in de vault.
4. `status` afleiden uit de body: live→`live`, lopend→`active`, ongetest→`untested`,
   uitgesteld→`deferred`, afgerond→`archived`.

**Files (bron → doel):**
- `memory/project_deploy_flow.md` → Create `05-ops/deploy.md` (type: ops, status: live)
- `memory/project_lead_automation_cron_deploy.md` → Create `05-ops/lead-automation-cron.md` (type: ops, status: live)
- `memory/project_miner_watch_alerts.md` → Create `05-ops/monitoring-alerts.md` (type: ops, status: live)
- `memory/reference_hostinger_cpu_throttle.md` → Create `05-ops/hostinger-cpu-throttle.md` (type: resource, status: active)
- `memory/project_vps_security_incident_may2026.md` → **SPLITSEN** (zie Step 4)

- [ ] **Step 1: deploy.md + lead-automation-cron.md migreren**

Pas de transformatie-regel toe op `project_deploy_flow.md` → `05-ops/deploy.md` en
`project_lead_automation_cron_deploy.md` → `05-ops/lead-automation-cron.md`.

- [ ] **Step 2: monitoring-alerts.md migreren**

`project_miner_watch_alerts.md` → `05-ops/monitoring-alerts.md`. Let op regel 2 (geen secrets):
vervang de letterlijke `SLACK_VPS_ALERTS_WEBHOOK_URL`-waarde (indien aanwezig in de body) door
de **naam** van de env-var, niet de URL.

- [ ] **Step 3: hostinger-cpu-throttle.md migreren**

`reference_hostinger_cpu_throttle.md` → `05-ops/hostinger-cpu-throttle.md` (type: resource).

- [ ] **Step 4: VPS-security splitsen + IOC's redigeren**

Uit `project_vps_security_incident_may2026.md` (181 regels):
- **`05-ops/vps-security.md`** (type: ops, status: active) — alleen de **huidige hardening-stand
  + open punten met trigger**. Vooruit bruikbaar.
- **`99-archief/incident-2026-05-miner.md`** (type: ops, status: archived) — het incident-relaas.
- **REDIGEER in beide** de gevoelige strings: vervang het wallet-adres, het backdoor-wachtwoord
  (`Kermit123@`) en andere credentials door `[geredigeerd]`. IP/paden mogen blijven als ze nodig
  zijn voor de hardening-context, maar geen wachtwoorden/keys/wallets.

- [ ] **Step 5: Verifiëren dat er geen secrets/redigeer-lekken zijn**

Run:
```bash
cd ~/Desktop/frontlix-brain
grep -rniE 'Kermit123|4AypWi|password\s*[:=]|api[_-]?key\s*[:=]|webhook.*https' 05-ops 99-archief || echo "SCHOON"
```
Expected: `SCHOON` (geen treffers). Vind je iets → redigeren en opnieuw draaien.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add 05-ops 99-archief
git commit -m "docs(ops): migreer deploy/cron/monitoring/throttle + vps-security (IOC's geredigeerd)"
```

---

## Task 5: Migreren — projecten, product & resources (6 notities)

**Files (bron → doel), zelfde transformatie-regel als Task 4:**
- `memory/project_mobile_dashboard_port.md` → `01-projecten/mobiel-dashboard-port.md` (project, active)
- `memory/project_offerte_mail_untested.md` → `01-projecten/offerte-mail-afmaken.md` (project, untested)
- `memory/project_audit_may2026.md` → `03-product/tech-beslissingen.md` (product, deferred) — focus op de uitgestelde beslissingen (C7/H9/M25) als losse, traceerbare items
- `memory/project_service_offerings_cosmetic.md` → `03-product/service-offerings.md` (product, deferred)
- `memory/project_slack_webhook_pending.md` → `03-product/slack-template-aanvragen.md` (product, live)
- `memory/reference_dashboard_host_and_screenshots.md` → `06-resources/dashboard-host-en-screenshots.md` (resource, active)

- [ ] **Step 1: Projecten migreren** (`mobiel-dashboard-port.md`, `offerte-mail-afmaken.md`).
      Zorg dat de wikilinks in `NU.md` (`[[offerte-mail-afmaken]]`, `[[mobiel-dashboard-port]]`) nu resolven.

- [ ] **Step 2: Product-notities migreren** (`tech-beslissingen.md`, `service-offerings.md`,
      `slack-template-aanvragen.md`). Zorg dat `[[tech-beslissingen]]` uit `NU.md` resolvet.

- [ ] **Step 3: Resource migreren** (`dashboard-host-en-screenshots.md`).

- [ ] **Step 4: Verifiëren dat alle wikilinks resolven**

Run (lijst alle wikilink-targets en check of het bestand bestaat):
```bash
cd ~/Desktop/frontlix-brain
grep -rhoE '\[\[[a-z0-9-]+\]\]' . | sed -E 's/\[\[|\]\]//g' | sort -u | while read t; do
  [ -f "$(find . -name "$t.md" | head -1)" ] && : || echo "KAPOT: [[$t]]"
done; echo "klaar"
```
Expected: geen `KAPOT:`-regels.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add 01-projecten 03-product 06-resources
git commit -m "docs: migreer projecten, product-beslissingen en resources uit Claude-memory"
```

---

## Task 6: Seeden — strategie, klant & product-branches

**Files:**
- Create: `00-strategie/doelen.md`, `00-strategie/team-en-toegang.md`,
  `02-klanten/schoon-straatje.md`, `03-product/branches.md`

- [ ] **Step 1: `00-strategie/doelen.md`**

```markdown
---
name: doelen
type: strategie
status: active
updated: 2026-06-02
---

# Doelen

De dagbrief weegt acties tegen deze doelen (impact > urgentie). Twee soorten, gescheiden:

## Frontlix — eigen business
- **Klanten:** 3 à 4 betalende klanten tegen eind 2026.
- **Outreach (activiteit):** ~50 outreach-gesprekken per week (Chris + Georg samen).

## Klant — Schoon Straatje
- Omzet/omzetdoel leeft LIVE in Supabase (`tenant_settings.omzet_doel_maand`), niet hier.
  Zie [[schoon-straatje]]. Het omzet-signaal in de dagbrief gaat over dit klant-doel.

## Mijlpalen
- Geen harde product-deadlines op dit moment. Lopend werk staat in `01-projecten/`.
```

- [ ] **Step 2: `00-strategie/team-en-toegang.md`** (rollen + WIE toegang heeft — GEEN secrets)

```markdown
---
name: team-en-toegang
type: strategie
status: active
updated: 2026-06-02
---

# Team & toegang

## Rollen
- **Chris** — mede-eigenaar (50/50). Alle gebieden.
- **Georg** — mede-eigenaar (50/50). Alle gebieden.
Geen toegangs-splitsing: alles is gedeeld. `owner` in [[NU]] = wie een actie oppakt.

## Toegang (WIE heeft toegang — nooit de credentials zelf)
| Systeem | Chris | Georg |
|---|---|---|
| GitHub `frontlix/*` | ✅ | ✅ |
| VPS (SSH) | ✅ | _in te vullen_ |
| Supabase (beide projecten) | ✅ | ✅ (Schoon Straatje-project eigenaar: georgtromp@gmail.com) |
| Slack-workspace | ✅ | ✅ |
| Meta WhatsApp Business | _in te vullen_ | _in te vullen_ |
```

- [ ] **Step 3: `02-klanten/schoon-straatje.md`** (geen rauwe PII; verwijs naar Supabase)

```markdown
---
name: schoon-straatje
type: klant
status: live
updated: 2026-06-02
---

# Schoon Straatje

Eerste klant/case. Branche: terreinreiniging / onkruidbeheersing. Product: WhatsApp-quoting-bot
+ dashboard. Repo: `frontlix/schoon-straatje-assistent`.

## Live-bronnen (voor de dagbrief — geen data dupliceren, alleen verwijzen)
Supabase-project: de Schoon-Straatje-Supabase (ref `ntewb…`).
- Open leads: `leads.dashboard_status='open' AND dashboard_archived=false`
- Afspraken vandaag: `leads.afspraak_datum` = vandaag (Europe/Amsterdam), sort `afspraak_starttijd`
- Offerte verstuurd zonder akkoord (>3d = stille klant): `offerte_verstuurd` + `offerte_verstuurd_op` + `akkoord_op IS NULL`
- Omzet deze maand vs doel: `SUM(leads.totaal_prijs WHERE akkoord_op …)` vs `tenant_settings.omzet_doel_maand`

## Contract / prijs
- _in te vullen_ (geen PII; afspraken op hoofdlijnen)
```

- [ ] **Step 4: `03-product/branches.md`**

```markdown
---
name: branches
type: product
status: active
updated: 2026-06-02
---

# Branches — productisatie

Frontlix verkoopt een herhaalbaar product (WhatsApp-bot + dashboard) per branche. Status:

| Branche | Template bestaat | Live klant | Verkoop-klaar? |
|---|---|---|---|
| Terreinreiniging | ✅ (Schoon Straatje) | ✅ [[schoon-straatje]] | referentie-case in opbouw |
| Dakdekker | ✅ config/branch | — | _beoordelen_ |
| Schoonmaak | ✅ config/branch | — | _beoordelen_ |
| Zonnepanelen | ✅ config/branch | — | _beoordelen_ |
| Carwrapping | ✅ branch | — | _beoordelen_ |

Bron-templates: `lead-automation/branches/*.py` + `lead-automation/clients/_template/`.
```

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/frontlix-brain
git add 00-strategie 02-klanten 03-product/branches.md
git commit -m "docs: seed strategie (doelen, team), klant Schoon Straatje en product-branches"
```

---

## Task 7: GitHub privé-remote + push

**Files:** geen — git/GitHub-configuratie.

- [ ] **Step 1: Privé-repo aanmaken op GitHub**

Run (vereist `gh` ingelogd):
```bash
cd ~/Desktop/frontlix-brain
gh repo create frontlix/frontlix-brain --private --source=. --remote=origin
```
Lukt `gh` niet → maak de repo handmatig privé aan op github.com en:
`git remote add origin git@github.com:frontlix/frontlix-brain.git`

- [ ] **Step 2: Laatste secret-scan vóór de eerste push**

Run:
```bash
cd ~/Desktop/frontlix-brain
grep -rniE 'Kermit123|4AypWi|password\s*[:=]|api[_-]?key\s*[:=]|sk-|ghp_|xox[baprs]-|webhook.*https' . --include='*.md' || echo "SCHOON"
```
Expected: `SCHOON`. Bij een treffer: NIET pushen — eerst redigeren.

- [ ] **Step 3: Push**

```bash
cd ~/Desktop/frontlix-brain
git push -u origin main
```

- [ ] **Step 4: Georg uitnodigen** als collaborator op `frontlix/frontlix-brain` (GitHub → Settings → Collaborators), of via `gh`:
```bash
gh repo add-collaborator frontlix/frontlix-brain <georg-github-username> --permission push
```

---

## Task 8: Obsidian-leeslaag (optioneel) + eindverificatie

**Files:** geen vault-bestanden; configuratie + checklist.

- [ ] **Step 1: Vault openen in Obsidian** — "Open folder as vault" → `~/Desktop/frontlix-brain`.
      Controleer: de graph-view rendert en `[[links]]` zijn klikbaar.

- [ ] **Step 2 (optioneel): `kepano/obsidian-skills` installeren** zodat Claude Code de vault
      native begrijpt (zie de repo-README van `kepano/obsidian-skills`).

- [ ] **Step 3: Eindverificatie-checklist**

```bash
cd ~/Desktop/frontlix-brain
echo "1. Geen secrets:"; grep -rniE 'Kermit123|4AypWi|sk-|ghp_|xox[baprs]-|password\s*[:=]' . --include='*.md' || echo "  SCHOON"
echo "2. Alle notities hebben frontmatter:"; for f in $(find . -name '*.md' -not -path './.git/*'); do head -1 "$f" | grep -q '^---$' || echo "  MIST FRONTMATTER: $f"; done; echo "  klaar"
echo "3. Git schoon:"; git status --porcelain || echo "  clean"
```
Expected: `SCHOON`, geen "MIST FRONTMATTER"-regels, working tree clean.

- [ ] **Step 4: Bevestig de migratie-bron is nog intact** — de `project_*`/`reference_*`-bestanden
      in de Claude-memory zijn gekopieerd, niet verplaatst. Laat ze voorlopig staan; verwijder ze
      pas wanneer Plan 1 volledig draait en je de vault vertrouwt (aparte beslissing).

---

## Self-Review (uitgevoerd)

**Spec-dekking:** §4 (structuur) → Tasks 1-6 · §5 (NU.md) → Task 3 · §6 (conventies/3 regels) →
Task 2 · §8 (doelen) → Task 6 · §10 (migratie 11 notities + schema/links) → Tasks 4-5 ·
locatie/remote (§4) → Tasks 1,7. De dagbrief (§7) en fase 2 vallen bewust buiten dit plan
(= Plan 2). **Gedekt.**

**Placeholders:** de `_in te vullen_`-velden (contract, Meta-toegang) zijn bewuste, gemarkeerde
lege plekken voor info die alleen Chris/Georg hebben — geen verzwegen TODO's in de bouwlogica.

**Type/naam-consistentie:** alle wikilinks in geseede bestanden (`[[schoon-straatje]]`,
`[[offerte-mail-afmaken]]`, `[[mobiel-dashboard-port]]`, `[[tech-beslissingen]]`, `[[NU]]`)
verwijzen naar bestandsnamen die in Tasks 3/5/6 worden aangemaakt. Task 5 Step 4 verifieert dit.
