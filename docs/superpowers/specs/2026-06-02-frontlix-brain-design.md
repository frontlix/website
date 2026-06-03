# Frontlix Brain — een tweede brein ("Jarvis") voor de business

**Datum:** 2026-06-02
**Status:** goedgekeurd — klaar voor implementatieplan
**Auteur:** Christiaan (+ Claude)

---

## 1. Probleem & doel

Christiaan zet Frontlix op (een 1-2-persoons softwarebureau: WhatsApp-lead-automatisering
+ multi-tenant klant-dashboard voor lokale dienstverleners) en springt continu tussen
product, klant-delivery, sales, marketing en ops. De context van "de hele business"
zit verspreid (in zijn hoofd, in losse repos, in Slack, in een Google Sheet, in twee
Supabase-projecten) en in een primitief brein: de huidige Claude-memory.

**Doel:** één gestructureerd "brein" dat alles van de business weet en dat **proactief
stuurt** — concreet: een **dagelijkse Slack-brief met "de handigste stap voor vandaag"**.

Geïnspireerd op het "Jarvis / second brain"-concept, maar bewust pragmatisch: de techniek
is in 2026 een opgelost probleem; deze systemen falen op **gedrag** (verzamelen zonder
verwerken, kennis die veroudert) en op het ontbreken van een **proactieve push**. Dit
ontwerp optimaliseert daar expliciet op.

## 2. Kernbeslissingen (vastgesteld)

1. **Markdown als single source of truth.** Platte `.md`-bestanden in een git-repo
   (tevens Obsidian-vault). Geen vendor-lock-in; het LLM leest/schrijft ze native.
2. **Atomair + index, geen één lang document.** Veel kleine notities (één feit elk) +
   een altijd-geladen `INDEX.md`. Dit is gericht ophalen zonder infrastructuur.
3. **Structuur-first, RAG-later.** GÉÉN vector-DB/embeddings nu (de vault past ruim in
   context). De latere upgrade is `pgvector` op een Supabase — pas wanneer het brein de
   context ontgroeit. De schema-discipline (zie §6) maakt die migratie gratis.
4. **De proactieve push is het échte "Jarvis"-deel.** Een dagelijkse Slack-brief die de
   handigste stap kiest — niet een passief archief waar je naartoe gaat.
5. **Gedeeld brein voor 2 mede-eigenaars.** Christiaan + Georg, 50/50, beiden eigenaar van
   alle gebieden. Geen toegangs-splitsing; alles gedeeld. Eén gedeelde brief.
6. **YAGNI ruthless.** Niet bouwen wat nog niet gebruikt wordt (zie §9 weggelaten).

## 3. Architectuur — 4 lagen

| Laag | Wat | Realisatie |
|---|---|---|
| **1. Geheugen** | De markdown-vault: doelen, projecten, klanten, beslissingen, open loops | git-repo `frontlix-brain/` (+ Obsidian) |
| **2. Kennis-koppeling** | Live data uitlezen waar markdown een momentopname is | **Supabase: één project** (de **Schoon-Straatje-Supabase**, ref `ntewb…`, env `_DASHBOARD`) voor alle 5 briefsignalen; Google Calendar kort daarna; LinkedIn-Sheet later |
| **3. Proactief** | Dagelijkse Slack-brief "handigste stap voor vandaag" | VPS-cron → script → **OpenAI (GPT-4o, hergebruikt `OPENAI_API_KEY`)** → Slack-webhook. NB: het miner-watch-patroon levert alleen het cron+webhook-deel; de LLM-call is nieuw werk. |
| **4. Interface** | Praten ↔ lezen/bladeren | Claude (praten) + Obsidian (lezen, desktop + mobiel, optioneel) |

## 4. De vault-structuur

**Locatie & repo (bewust losgekoppeld van de Frontlix-website-repo):**
- **Eigen git-repo** `frontlix-brain` — niet binnen `Frontlix website/`. Eigen historie,
  eigen lifecycle, Georg kan hem los clonen, geen verstrengeling met de Next.js-app.
- **Lokaal:** `~/Desktop/frontlix-brain/` (zustermap naast `Frontlix website/`; Obsidian
  wijst hiernaartoe).
- **Remote:** privé GitHub-repo `frontlix/frontlix-brain` (zelfde org als
  `frontlix/schoon-straatje-assistent`); Georg cloont hiervan.
- **VPS:** de cron voor de dagbrief cloont/pullt dezelfde repo (of fetcht alleen `NU.md`
  + `00-strategie/doelen.md` — kleiner aanvalsoppervlak).
- Dit ontwerp-document (de spec) blijft in de website-repo onder `docs/superpowers/specs/`
  (consistent met de bestaande specs); de spec mag later mee verhuizen naar de brain-repo.

```
frontlix-brain/              (git-repo, gedeeld met Georg; ook Obsidian-vault)
├── INDEX.md      ← altijd-geladen kaart: mappenlegenda + frontmatter-schema
│                   + toegestane status-waarden + naming/link-regel
│                   + 3 harde regels + git-onboarding voor Georg + link naar NU.md
├── NU.md         ← drie secties (## Open / ## Wacht op / ## Inbox; canoniek in §5).
│                   DE brandstof voor de dagelijkse Slack-brief.
├── .gitignore    ← *.env, *.key, *secret*, credentials*
│
├── 00-strategie/
│     ├── doelen.md            (doelen + targets → brief prioriteert op impact)
│     └── team-en-toegang.md   (rollen Chris/Georg + wie-heeft-toegang-waartoe; GÉÉN secrets)
│
├── 01-projecten/             (lopend, met of zonder einddatum)
│     ├── mobiel-dashboard-port.md   (status: active)
│     └── offerte-mail-afmaken.md    (status: untested (blokker: bot-verificatie))
│
├── 02-klanten/               (live klant-instanties)
│     └── schoon-straatje.md   (status + branche + contract/prijs + "## Live-bronnen":
│                               welke Supabase-query = open leads / afspraak vandaag.
│                               GÉÉN rauwe lead-PII; verwijs naar Supabase als bron)
│
├── 03-product/               (het product dat Frontlix VERKOOPT, los van de klant)
│     ├── branches.md          (status per branche: dakdekker/schoonmaak/zonnepanelen/carwrapping
│     │                         → "welke branche dichtst bij verkoopbaar")
│     ├── dashboard.md
│     ├── demo-funnel.md       (techniek; opvolg-status leeft in NU.md / pipeline.md)
│     └── tech-beslissingen.md (uitgestelde keuzes als status: deferred + waarom + trigger)
│
├── 04-sales-marketing/
│     ├── pipeline.md          (wekelijks-gesync'te samenvatting: warme prospects + fase + next-step.
│     │                         NOOT bovenaan: live status leeft in de Google Sheet via linkedin-crm)
│     └── outreach-speelboek.md (herbruikbare DM-templates / positionering)
│
├── 05-ops/                   (VPS, deploy, security, kosten — GEMIGREERD uit Claude-memory)
│     ├── deploy.md
│     ├── vps-security.md      (huidige hardening-stand + open punten met trigger)
│     ├── monitoring-alerts.md (miner-watch + Slack-alerts)
│     ├── secrets-beleid.md    (verwijst naar regel; bevat zelf GÉÉN secrets)
│     └── leveranciers-en-tools.md (per dienst: waarvoor, eigenaar, kosten-orde, quota/vervaldatum)
│
├── 06-resources/             (herbruikbare kennis, snippets, research)
│
└── 99-archief/               (afgerond — bv. incident-2026-05-miner.md met IOC's geredigeerd)
```

`feedback_*`-notities (hoe Claude moet wérken) blijven in Christiaans Claude-memory en
verhuizen NIET; `INDEX.md` legt die scheiding in één regel vast.

## 5. NU.md — de brandstof

Het belangrijkste nieuwe bestand. Een platte feed waar elke open actie op één plek staat,
zodat de brief kandidaten hééft om uit te kiezen. **Canonieke vorm — drie secties:**

- `## Open` — losse acties. Per regel: `actie — owner(Chris/Georg) — status — [[bron-notitie]]`
- `## Wacht op` — geblokkeerd / wachtend op iemand of iets (met "sinds wanneer / trigger")
- `## Inbox` — ongesorteerde dumps (10-seconden-capture); wekelijks opruimen naar de juiste map

`owner` = wie de actie oppakt (geen toegangscontrole — alles is gedeeld).
**Afgevinkte regels blijven in `NU.md` staan** (`[x]` + datum) tot de wekelijkse opruim,
zodat de brief ze als "recent gedaan, niet herhalen" herkent; bij de opruim verhuizen oude
afgevinkte regels naar `99-archief/` of worden ze verwijderd.

## 6. Conventies (in INDEX.md, afgedwongen)

**Frontmatter-schema (plat, uniform):**
```yaml
---
name: <kebab-slug — exact gelijk aan de bestandsnaam>
type: project | klant | product | sales | ops | resource | strategie
status: active | live | pending | untested | deferred | archived
updated: YYYY-MM-DD
---
```
- **`status` is enkelvoudig uit de toegestane set.** Een blokkade/reden staat als losse tekst
  áchter de status (bv. `status: untested (blokker: bot-verificatie)`), niet als nieuwe waarde.
- **Eén linkstijl:** Obsidian-wikilinks `[[bestandsnaam-zonder-extensie]]`, target == exacte
  bestandsnaam.
- **Naming:** bestandsnaam == kebab-slug == link-target. Geen prozatitels als `name`.
- **Atomair:** richtlijn ~1 concept per notitie; groeiende logs splitsen naar index + delen.
- **Tags:** optioneel/vrij voor nu (map + status zijn al genoeg pre-filter bij deze omvang).

**Drie harde regels (bovenaan INDEX.md):**
1. **Geen secrets in de vault** — git-historie is forever en gedeeld. (`.gitignore` als vangnet.)
2. **Geen rauwe lead-PII** — naam/telefoon/adres horen in Supabase (met RLS), niet in markdown.
   De vault gebruikt geaggregeerde cijfers + verwijst naar Supabase als bron.
3. **Pull voor je schrijft, commit klein** — merge-hygiëne bij 2 schrijvers. Index = alleen
   links (zelden conflict); dagbrief/log per dag eigen bestand.

## 7. De dagelijkse Slack-brief

**Wat hij doet:** elke ochtend bepalen wat de handigste stap is, voor Chris én Georg, in één
gedeeld Slack-kanaal.

**Hoe (high-level — detail in het plan):** een VPS-cron (`TZ=Europe/Amsterdam` — de VPS draait
UTC, dus zonder dit levert een avond-cron de verkeerde dag) draait een script dat context
verzamelt — `NU.md` + `00-strategie/doelen.md` + live-queries — en het LLM vraagt: *"Gegeven
de doelen en de open loops, wat is vandaag de handigste 1-3 stappen, en waarom?"* Output gaat
via een Slack-webhook (zelfde patroon als de bestaande miner-watch-alerts).

**LLM-call — besloten: hergebruik `OPENAI_API_KEY` + de bestaande `openai`-dep (GPT-4o).**
Nul nieuwe leveranciers, geen extra setup op de VPS. Het is één los moduletje, dus later
naar Claude (`@anthropic-ai/sdk`) wisselen is triviaal als dat ooit gewenst is.

**Hergebruik bestaande, geteste logica** (niet opnieuw bouwen): de "handigste stap"-derivatie
zit al in `lib/dashboard/eerst-dit-doen.ts` (`deriveActions`: tone/urgency/waitMs),
`agenda-followups.ts` (`getOwnerFollowups` = wacht-op-owner, `getStaleOfferteFollowups` =
stille klant) en `dagrapport-queries.ts` (omzet/sparklines).

**NB — niet verwarren:** er draait al een *klant*-digest-cron
(`app/api/cron/daily-digest/route.ts` + `lib/dashboard/notifications/digest.ts`, 08:00 Amsterdam)
die de Schoon-Straatje-eigenaar in zíjn dashboard bedient. De Frontlix-Brain-brief is **intern**
(Chris+Georg) en draait als losse VPS-cron.

**Prioriteert op impact, niet alleen urgentie:** een actie die een doel dichterbij brengt
(klant erbij, branche verkoop-klaar) wint van een willekeurige opruimtaak.

**Live bronnen, gefaseerd:**
- **Fase 1 — Supabase, één project** (de **Schoon-Straatje-Supabase** `ntewb…`, via
  `SUPABASE_SERVICE_ROLE_KEY_DASHBOARD` + `NEXT_PUBLIC_SUPABASE_URL_DASHBOARD`). **Vijf
  signalen**, vrijwel allemaal op de centrale `leads`-tabel:
  - **(a) open leads** — `dashboard_status='open' AND dashboard_archived=false`
  - **(b) afspraken vandaag** — `afspraak_datum` = vandaag (Europe/Amsterdam), sorteer op
    `afspraak_starttijd`; `google_event_id` koppelt aan Calendar
  - **(c) offerte-status** — `offerte_verstuurd` + `offerte_verstuurd_op` + `akkoord_op`
    (akkoord ontbreekt = open); `>3d` zonder akkoord = stille klant; klaar-maar-niet-verstuurd
    via `offerte_pending_sinds`
  - **(d) opvolging** — afgeleid (geen eigen tabel): `pending_eigenaar_review`/`klus_geblokkeerd`
    = wacht-op-owner, `gesprek_fase='onderhandelen'` = lopend, `reminder_1/2/3_op` = reminders
  - **(e) omzet deze maand** — `SUM(leads.totaal_prijs) WHERE akkoord_op` in periode, vs
    `tenant_settings.omzet_doel_maand`
  - Het script doet **geen `SELECT *`** op de ~100-koloms `leads`-tabel — alleen de
    brief-relevante kolommen (hergebruik de selecties uit `lead-queries.ts`).
  - De site-DB (`zsiokl…`) levert **géén** briefsignaal en wordt niet bevraagd; Frontlix' eigen
    web-leads (contactformulieren) zijn een apart latere-fase-*sales*-signaal.
- **Fase 2 — Google Calendar:** events ZONDER lead (sales-calls, intern). Lead-gekoppelde
  afspraken (`google_event_id != null`) komen al uit fase 1 → toon ze één keer, via Supabase.
- **Later — LinkedIn-CRM (Google Sheet):** warme prospects (zodra `pipeline.md` staat).
- **Bewust uitgesteld:** Gmail (te veel ruis), uitgaven-sheet (ander ritme).

**Fallback (degraded mode):** faalt de LLM-call → stuur de kale fase-1-cijfers naar Slack
("AI-duiding mislukt"); faalt Supabase → een error-ping naar `#frontlix-vps-alerts`
(`SLACK_VPS_ALERTS_WEBHOOK_URL`). Voorkomt een stille faalmodus.

**Anti-herhaling:** voor `NU.md`-acties voorkomt het afvinken (met datum) dagelijkse herhaling.
Voor de **live-signalen** werkt het anders: die zijn de actuele stand van zaken en mógen
herhalen (een stille klant blíjft een stille klant); alleen de gekozen 1-3 stappen variëren.

## 8. Doelen (start-set, bijstelbaar)

In `00-strategie/doelen.md`:
- **Uitkomst:** 3 à 4 betalende klanten tegen eind 2026.
- **Activiteit:** ~50 outreach-gesprekken per week (Chris + Georg samen).
- **Mijlpalen:** geen harde product-deadlines op dit moment. Lopend werk (mobiel dashboard,
  offerte-mail-test) staat als project in `01-projecten/` zonder deadline-druk.

**Twee soorten doel, gescheiden gehouden:** de brief weegt acties tegen (1) Frontlix' **eigen**
business-doel (3-4 klanten, uit `doelen.md`) én (2) de **klant**-omzet/omzetdoel van Schoon
Straatje (`tenant_settings.omzet_doel_maand` in Supabase). Het omzet-signaal in §7(e) gaat over
(2), niet over (1) — anders weegt het script tegen het verkeerde doel.

## 9. Wat we bewust NIET doen (YAGNI)

Bewust weggelaten om het brein licht en bruikbaar te houden — toevoegen "als het knelt":
apart beslissingen-log (vouw uitgestelde keuzes in als `status: deferred`-notities) ·
losse inbox-map (zit in `NU.md`) · dagboek-archief · verplicht tag-vocabulaire ·
privé-map (`_prive/`) · pre-commit secret-scan-hook · aparte README (vouw in `INDEX.md`) ·
klant-template (pas na klant #2) · brand-assets-map (al gedekt door tokens.css) ·
content-kalender/website-notitie · juridisch/contracten-zone · aparte `datasources.md` ·
**vector-DB/RAG/embeddings** · encryptie/aparte private repo voor klantdata.

## 10. Migratie van de bestaande memory-notities (nu, in één keer)

Er zijn **19 sidecar-notities** naast `MEMORY.md`. Daarvan **migreren er 11** (9 × `project_*`
+ 2 × `reference_*`); de **8 × `feedback_*`** (AI-gedragsregels) **blijven** in de Claude-memory.

- `project_*` → `01-projecten/` of `03-product/` (naar onderwerp).
- ops/security/deploy (`project_deploy_flow`, `project_vps_security_incident_may2026`,
  `project_miner_watch_alerts`, `project_lead_automation_cron_deploy`,
  `reference_hostinger_cpu_throttle`) → `05-ops/`. Het 16KB-incident: hardening-stand →
  `05-ops/vps-security.md`; relaas → `99-archief/` met wallet/backdoor-wachtwoord/IOC's
  **geredigeerd**.
- `reference_dashboard_host_and_screenshots` → `06-resources/`.
- **Schema-fix in dezelfde slag:** uniform plat frontmatter + `status` + `updated`-veld.
- **Links:** converteer de markdown-links in `MEMORY.md` naar Obsidian-wikilinks en hernoem de
  targets naar kebab-slug (bv. `feedback_vps_ssh_workflow.md` → `[[vps-ssh-workflow]]`); fix
  tegelijk de wikilinks in de notitie-*bodies* zodat `link-target == bestandsnaam`. (Dit is
  conversie + rename, geen "herstel van kapotte links".)
- De huidige `MEMORY.md` wordt de basis voor `INDEX.md` (+ schema-blok + legenda + 3 regels).

## 11. Bouwvolgorde (high-level — detail in het implementatieplan)

1. Repo `frontlix-brain/` aanmaken + `.gitignore` + `INDEX.md` (met schema + regels) + lege `NU.md`.
2. De 11 notities migreren + opschonen (schema, links, naming) volgens §10.
3. `00-strategie/doelen.md` + `team-en-toegang.md` vullen; klant- en product-notities seeden.
4. De dagelijkse Slack-brief bouwen (cron + script + Supabase-queries + LLM + webhook), fase 1.
   **Hergebruik** `lib/dashboard/eerst-dit-doen.ts` / `agenda-followups.ts` /
   `dagrapport-queries.ts` i.p.v. queries opnieuw te schrijven. **Fase 1 gaat eerst volledig
   live en draait minstens een week** voordat fase 2 (Calendar) erbij komt — een werkende brief
   met alleen de Supabase-signalen is het MVP.
5. Georg toegang geven (git clone) + korte onboarding in `INDEX.md`.
6. Obsidian openen op de vault + `kepano/obsidian-skills` (optioneel, leeslaag).
7. Fase 2: Google Calendar koppelen aan de brief. Later: LinkedIn-Sheet, en RAG/pgvector pas
   wanneer de vault de context ontgroeit.

## 12. Open punten / resoluties voor het plan

- **Supabase-mapping — OPGELOST:** fase 1 = 1 project (`ntewb…`), zie §7. Open blijft alleen de
  exacte query-tekst (mag grotendeels uit de bestaande `lib/dashboard`-modules komen).
- **Cron-plek:** nieuwe regel in de root-crontab van de VPS (analoog aan miner-watch,
  `TZ=Europe/Amsterdam`), **niet** in het bot-PM2-proces; eigen clone-pad, los van de website.
  Het brief-script woont in de brain-repo met een eigen minimale `package.json` (of puur
  curl+jq zoals miner-watch).
- **Credential:** `SUPABASE_SERVICE_ROLE_KEY_DASHBOARD` in de VPS-`.env` (via `nano`, nooit
  `echo` — conform de secret-handling-regel), script doet alleen `SELECT`s. RLS+anon werkt
  niet voor een headless cron (geen user-sessie → lege resultaten). Een échte read-only-rol is
  een latere verbetering.
- **LLM-key — besloten:** `OPENAI_API_KEY` hergebruiken (GPT-4o). Geen nieuwe externe
  afhankelijkheid; staat al op de VPS voor de bot.
