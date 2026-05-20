# Offerte-tab Redesign — Design Spec

**Datum:** 2026-05-20
**Status:** Draft (awaiting approval)
**Auteur:** Claude (in opdracht van Christiaan)

---

## Probleem

De huidige Offerte-tab in de lead-detail-pagina is **read-only** met een aparte "nieuwe versie maken"-form. Wijzigingen vereisen een hele nieuwe versie via een apart formulier. Er is geen visuele samenhang met de Frontlix-brand-styling van de rest van het dashboard, en geen inzicht in marge of kostprijzen. Aanpassingen aan lead-data in de Info-tab worden niet automatisch doorgevoerd in de offerte.

De klant ervaart de huidige flow als log en weinig flexibel. Het Canva-design dat is opgeleverd toont een veel toegankelijker concept: inline-bewerken, sticky sidebar met totalen/korting/verzendopties, en een marge-zicht voor de eigenaar.

## Doel

De Offerte-tab verbouwen tot een **inline-bewerkbare, gedragen werkomgeving** die matcht met het opgeleverde design. Drie fases, opbouwend van laag → hoog risico:

- **Fase 1** — UI redesign (geen DB-wijziging). Hoofdwerk.
- **Fase 2** — Auto-save concept + revert + lead-data-sync.
- **Fase 3** — Marge-zicht + kostprijzen-modal (DB-migratie).

## Non-doelen

- **Bot-service aanpassen.** De externe FastAPI bot die de WhatsApp-workflow draait blijft ongewijzigd. We bouwen de "Versturen via WhatsApp"-knop *voor* maar koppelen 'm niet aan de bot.
- **Notificatie-link wijzigen.** De link die de bot in Slack stuurt om de offerte aan te passen, blijft voorlopig naar de externe webpagina wijzen — de huidige klant test die flow.
- **BTW configureerbaar maken.** 21% staat hardcoded.
- **Meerdere talen.** Nederlands only.

---

## Architectuur

```
LeadOfferte.tsx (orchestrator)
├── OfferteHeader        — versie-badge, bron-pill, save-indicator, PDF-knoppen
├── LeadContextChips     — readonly chips uit lead-velden, "Pas aan in Info-tab" link
├── OfferteRegelsTable   — inline-editable regels (auto + handmatig)
│   └── OfferteRegelRow  — één regel
├── OfferteSidebar       — sticky rechts
│   ├── TotalenKaart     — subtotaal, BTW 21%, incl, PDF + Versturen knoppen
│   ├── KortingKaart     — slider + omschrijving
│   ├── VerzendoptiesKaart — geldigheid + checkboxes
│   └── MargeKaart       — fase 3, "alleen jij" badge
└── KostprijzenModal     — fase 3, sliders per dienst
```

**Bestand-organisatie:** alles onder [components/dashboard/leads/offerte/](components/dashboard/leads/offerte/) als nieuwe map. De oude [LeadOfferte.tsx](components/dashboard/leads/LeadOfferte.tsx) wordt vervangen. [OfferteCreateForm.tsx](components/dashboard/leads/OfferteCreateForm.tsx) verdwijnt — inline editing maakt 'm overbodig.

---

## Fase 1 — UI redesign (geen DB-wijziging)

### 1.1 Layout

Twee kolommen op desktop (>1024px). Mobile fallt-back naar single column met sidebar onderaan.

```
┌─────────────────────────────────────────────────────┐
│  Header (versie-badge + save-state + PDF knoppen)   │
├─────────────────────────────────────────────────────┤
│  Lead-context chips                                  │
├──────────────────────────────┬──────────────────────┤
│  Regels-tabel (auto + manual)│  Totalen-kaart       │
│                              │  Korting-kaart       │
│  + Regel toevoegen           │  Verzendopties-kaart │
│                              │  (fase 3: Marge)     │
└──────────────────────────────┴──────────────────────┘
```

### 1.2 Header

- **Versie-badge**: `v{n}` in afgeronde gradient-chip, status-tekst ernaast: `Concept · niet verstuurd · Auto uit lead-data` of `Verstuurd op {datum}`.
- **Save-indicator** (placeholder in fase 1, actief in fase 2): "zojuist bewaard" / "wijzigingen niet opgeslagen".
- **PDF-knoppen** (rechts):
  - "Bekijk verzonden offerte" → opent `huidige.pdf_url` in nieuw tabblad (alleen tonen als `offerte_verstuurd === true`)
  - "Preview huidige versie" → roept een server-action aan die de huidige concept-state als tijdelijke PDF genereert. *(Fase 1: stub die "binnenkort" toont; fase 2: live PDF.)*

### 1.3 Lead-context chips

Read-only chips op basis van lead-velden:

| Chip-label | Bron-veld(en) |
|---|---|
| `Op basis van lead-data` | (label) |
| `Oppervlakte {m2} m²` | `leads.m2` |
| `Diensten {sub_diensten.join(' + ')}` | `leads.sub_diensten` |
| `Voegzand {voegzand_type}` + `antraciet`/`naturel` | `leads.voegzand_type`, `leads.zand_kleur` |
| `Korstmos {ja/nee}` | `leads.korstmos` |
| `Planten {afschermen/staan}` | `leads.planten_afschermen`, `leads.planten` |

Rechts naast de chips: **"Pas aan in Info-tab"** link → switcht naar `?tab=info`.

### 1.4 Regels-tabel

- **Kolommen**: Omschrijving · Aantal · Eenheid · Stukprijs (excl) · Totaal (excl)
- **Twee secties**:
  - "Auto uit lead-data · {n} regels — recalculatie volgt bronwijzigingen" (groepskop, kleinere font, accent-icoon)
  - "Handmatige regels" (groepskop, met "+ Regel toevoegen" knop eronder)
- **Inline-editable**: klik in een cel → input. Tab springt naar volgende cel.
- **Verwijderen**: trash-icoon rechts per handmatige regel. Auto-regels niet verwijderbaar (toon disabled icoon met tooltip "Wijzig in Info-tab").
- **Hoe weten we welke regel auto vs handmatig is?** Nieuw veld op `prijsregels`: `bron` enum (`auto_lead` | `manual`). Default `manual`. **DB-migratie nodig** — kleine, niet-breaking. *(Alternatief: `volgorde < 1000` = auto, ≥1000 = manual. Voorkomt migratie. Beslis tijdens bouwen, voorkeur voor migratie wegens helderheid.)*

### 1.5 Sidebar — Totalen-kaart

```
┌──────────────────────────────────────────┐
│  Subtotaal              € 1.659,85       │
│  Excl BTW               € 1.659,85       │
│  BTW 21%                €   348,57       │
│  ┌──────────────────────────────────┐   │
│  │ TOTAAL INCL. BTW   € 2.008,42    │   │
│  │ geldig t/m {datum} (gradient bg) │   │
│  └──────────────────────────────────┘   │
│  [Bekijk PDF]  [Versturen via WhatsApp] │
└──────────────────────────────────────────┘
```

- **Berekening (client-side)**:
  - `subtotaal_excl = som(regel.totaal)` (alle regels zijn excl BTW)
  - `na_korting_excl = subtotaal_excl * (1 - korting_pct/100)`
  - `btw = na_korting_excl * 0.21`
  - `totaal_incl = na_korting_excl + btw`
- **Geldigheidsdatum**: `aangemaakt_op + offerte_geldigheid_dagen` (uit `bot_config.offerte_geldigheid_dagen`, default 30).

### 1.6 Sidebar — Korting-kaart

- Slider 0–15% met presets-buttons 0/5/10/15
- Omschrijvings-input (voor "Kennismakingskorting" etc.) — bewaard in `leads.korting_omschrijving`
- Live preview: totaalbedrag in totalen-kaart muteert direct
- Bron: `leads.korting_percentage`, `leads.korting_omschrijving`

### 1.7 Sidebar — Verzendopties-kaart

- **Geldigheid**: dropdown `7 / 14 / 30 / 60 dagen`, default uit `bot_config.offerte_geldigheid_dagen`
- **Checkboxes** (all default checked):
  - "Met garantievoorwaarden (12 mnd)"
  - "Met algemene voorwaarden"
  - "Foto's meesturen ({n})" — count uit `lead_fotos`

Deze 3 velden bestaan nog niet op de offertes-tabel. Voor fase 1 zijn ze **alleen UI-state** (niet persisted). In fase 2 worden ze meegestuurd in de "Versturen"-payload. Voorkomt nu DB-migratie.

### 1.8 Verwijderen oude code

- `LeadOfferte.tsx` → vervang inhoud, behoud filename voor import-compatibiliteit
- `OfferteCreateForm.tsx` → verwijderen
- `LeadOfferte.module.css` + `OfferteCreateForm.module.css` → opnieuw schrijven / verwijderen
- Imports in [app/dashboard/(app)/leads/[lead_id]/page.tsx](app/dashboard/(app)/leads/[lead_id]/page.tsx) controleren

### 1.9 Acceptatie-criteria fase 1

- [ ] Layout matcht het Canva-design op desktop (1440px width)
- [ ] Mobile (375px) toont alles single-column zonder horizontal scroll
- [ ] Inline-bewerken werkt voor handmatige regels: tab door cellen, verwijderen, toevoegen
- [ ] BTW-berekening klopt op cent-niveau (handmatige rekenproef in test)
- [ ] Korting-slider muteert totalen live
- [ ] Frontlix branding: blue/cyan gradient op heading + totaal-bedrag + accent-strepen
- [ ] `npm run lint && npm run build` slagen zonder errors

---

## Fase 2 — Auto-save concept + revert + lead-data sync

### 2.1 Concept-state model

**Probleem:** een edit op een verstuurde offerte moet niet meteen de "verzonden versie" overschrijven. We hebben een dirty/concept-laag nodig.

**Oplossing:**
- Nieuw veld op `offertes`: `is_concept: boolean` (default `false`)
- Per lead bestaat er **maximaal één concept-offerte** tegelijk (`is_concept=true`)
- De "huidige" tonen we als: concept als die bestaat, anders laatste niet-concept
- Verstuurde offertes (`offerte_verstuurd=true`) zijn altijd `is_concept=false` en immutable
- Edit op verstuurde offerte → **maakt automatisch een concept-kopie** (versie wordt +1, `is_concept=true`)

**DB-migratie**: `040_offerte_concept_state.sql`
```sql
ALTER TABLE offertes ADD COLUMN is_concept boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX one_concept_per_lead ON offertes (lead_id) WHERE is_concept = true;
```

### 2.2 Auto-save mechanism

- Elke edit triggert debounced server-action (~600ms na laatste keystroke)
- Server-action update prijsregels + offerte-velden van de huidige concept
- Save-indicator in header: `Opslaan...` → `Zojuist bewaard ({tijd})`
- Bij netwerk-fout: `Offline — wijzigingen niet bewaard, klik om opnieuw te proberen`

### 2.3 "Terug naar verzonden versie"-knop

- Alleen zichtbaar als er een concept bestaat én er een eerdere verstuurde versie is
- Klik → bevestigingsdialoog → concept wordt verwijderd, regels van laatste verstuurde versie worden teruggezet
- Server-action: `revertConcept(leadId)`

### 2.4 Lead-data sync (Info-tab → Offerte)

**Trigger**: wanneer een veld in Info-tab muteert dat in `computeRules()` gebruikt wordt (`m2`, `sub_diensten`, `voegzand_type`, `voegzand_zakken`, `zand_kleur`, `korstmos`, `planten_afschermen`, `groene_aanslag`, `beschermlaag_m2`, `extra_arbeid_*`, `korting_percentage`).

**Implementatie**:
- Server-action `regenerateAutoRegels(leadId)` die bestaande `computeRules()` aanroept
- Verwijdert alleen regels met `bron=auto_lead`, voegt nieuwe set toe
- Handmatige regels blijven onaangetast
- Trigger-punt: na elk save in Info-tab. Realtime push via Supabase channel naar Offerte-tab → "Auto-regels zijn herberekend" toast.

### 2.5 "Versturen via WhatsApp"-knop (voorbereid, niet gekoppeld)

- Server-action `sendOfferteAsNewVersion(leadId, payload)`
- Stappen:
  1. Concept commit → `is_concept=false`, versie blijft, of nieuwe versie als origineel verstuurd was
  2. PDF genereren (via bestaande PDF-pipeline)
  3. `// TODO: bot-koppeling` — bot-call wordt later toegevoegd
  4. Return success + toast: *"Versie v{n} opgeslagen — WhatsApp-versturen wordt binnenkort gekoppeld"*
- De knop is volledig zichtbaar en klikbaar — alleen het laatste stuk (bot-trigger) ontbreekt

### 2.6 Acceptatie-criteria fase 2

- [ ] Edit op verstuurde offerte → automatisch concept-kopie, "concept" badge verschijnt
- [ ] Auto-save: typ in een cel, wacht 1s, check DB: regel is bijgewerkt
- [ ] Revert: concept-edit terugdraaien werkt; verstuurde regels keren terug
- [ ] Info-tab wijziging in `m2` → auto-regels in Offerte-tab worden herberekend zonder page reload
- [ ] Handmatige regels blijven na info-tab-sync onveranderd
- [ ] Versturen-knop maakt nieuwe versie + PDF; bot-call is stub met TODO-comment

---

## Fase 3 — Marge-zicht + Kostprijzen-modal

### 3.1 Data model

**Nieuwe Supabase tabel**: `kostprijzen_per_dienst`
```sql
CREATE TABLE kostprijzen_per_dienst (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  rule_key text NOT NULL,
  label text NOT NULL,
  kost_pct numeric(5,2) NOT NULL CHECK (kost_pct >= 0 AND kost_pct <= 100),
  bijgewerkt_op timestamptz DEFAULT now(),
  UNIQUE (tenant_id, rule_key)
);
```

**Seed-categorieën** (komen uit het Canva-design):
- `reiniging_straatwerk` — default 42%
- `arbeid_invegen` — default 38%
- `voegzand` (materiaal) — default 55%
- `beschermlaag_impregneren` — default 30%
- `plantenafscherming_folie` — default 35%
- `reiskosten` — default 18%
- `onderhoud_abonnement` — default 35%
- `overig_handmatig` — default 38%

### 3.2 Marge-kaart in sidebar

```
┌────────────────────────────────────────────┐
│  ⚙ MARGE-ZICHT              alleen jij  ×  │
│  kosten ≈ € 737,62                         │
│  marge   € 922,23                  56%     │
│  ███████████████░░░░░░░░░░░░░░             │
│  Gezond — boven 50%                        │
│  [▼ Toon per regel] [⚙ Pas kostprijzen aan]│
└────────────────────────────────────────────┘
```

**Status-kleuren** (van slecht naar goed):
- < 30%: rood "Krap — onder verlies-grens"
- 30–50%: oranje "Acceptabel"
- 50–70%: groen "Gezond"
- > 70%: blauw "Uitstekend"

**Berekening**: voor elke regel wordt op basis van `rule_key` → `kost_pct` opgezocht. Kosten = `regel.totaal * kost_pct/100`. Marge = totaal - kosten.

### 3.3 "Toon per regel" expand

Inline accordeon onder de marge-kaart die per regel toont: omschrijving · omzet · kosten · marge € · marge %.

### 3.4 Kostprijzen-modal

Trigger: knop "Pas kostprijzen aan" → modal opent.

**Inhoud**:
- Lijst van alle 8 categorieën, per regel:
  - Naam + "in deze offerte: {x}× · omzet € {y} · marge € {z}"
  - Slider 0–100% met live-value rechts: `{n} % kost`
  - Resulterende marge: `→ {100-n}% marge`
- Onderaan: "Effect op deze offerte" — live preview Omzet / Geschatte kosten / Marge / %
- Acties: "Standaard-waarden terugzetten" (link), "Annuleren", "Opslaan" (primary)

**Persistentie**:
- Opslaan → upsert in `kostprijzen_per_dienst` per `(tenant_id, rule_key)`
- "Standaard-waarden terugzetten" → DELETE tenant-rows, fallback naar hardcoded defaults

### 3.5 "Alleen jij"-badge

De marge-kaart toont alleen voor users met rol `owner` of `admin`. Per de bestaande RBAC-check (`profiles.role`).

### 3.6 Acceptatie-criteria fase 3

- [ ] Migratie `041_kostprijzen_per_dienst.sql` lokaal + remote toegepast
- [ ] Default-waardes geseed bij eerste open van modal
- [ ] Slider-mutaties tonen live preview
- [ ] Opslaan persist; nadien pagina-reload toont opgeslagen waardes
- [ ] Marge-kaart alleen zichtbaar voor owner/admin
- [ ] "Toon per regel" expand werkt smooth

---

## Risico's & mitigatie

| Risico | Kans | Impact | Mitigatie |
|---|---|---|---|
| Auto-save race condition bij snelle edits | Middel | Middel | Debounce 600ms + abort-controller op vorige inflight request |
| `computeRules()` breekt bij ontbrekende lead-velden | Laag | Hoog | Defensive null-checks; bestaat al deels in huidige code |
| DB-migratie `is_concept` botst met productie-data | Laag | Hoog | Migratie pre-test op staging; default-value `false` is veilig |
| User raakt verward door dual PDF-knoppen | Laag | Laag | Labels duidelijk maken ("Verzonden" vs "Preview") |
| Bot-koppeling later vraagt om payload-format dat nu niet klopt | Middel | Laag | Definieer payload-shape in fase 2 reeds; TODO-comment beschrijft expected bot-payload |

## Open vragen tijdens implementatie

- **Welke font-grootte exact** voor het hero-bedrag in totalen-kaart? Canva toont ~28px. **Beslissing tijdens build**.
- **Hoe veel padding** in modal? Canva toont ruime padding. **Beslissing tijdens build**, default Frontlix modal-styling.
- **Animaties**: collapse/expand voor "Toon per regel"? Ja, 200ms ease-out (matcht bestaande dashboard).

---

## Parallelle uitvoering — agent-decompositie

### Fase 1 (3 agents parallel + 1 integrator)

| Agent | Scope | Output |
|---|---|---|
| **Agent 1a — Layout & Header** | `LeadOfferte.tsx` orchestrator, `OfferteHeader.tsx`, `LeadContextChips.tsx`, container-CSS | Files + module.css |
| **Agent 1b — Regels-tabel** | `OfferteRegelsTable.tsx`, `OfferteRegelRow.tsx`, prijsregels-CRUD server-actions (lokaal, niet persisted in fase 1) | Files + module.css |
| **Agent 1c — Sidebar-kaarten** | `OfferteSidebar.tsx`, `TotalenKaart.tsx`, `KortingKaart.tsx`, `VerzendoptiesKaart.tsx`, BTW-calc utility | Files + module.css + util |
| **Integrator (ik)** | Wire-up, eindstyle-pass, lint + build verificatie | Final commit |

### Fase 2 (2 agents parallel)

| Agent | Scope |
|---|---|
| **Agent 2a — Auto-save + concept-state** | Migratie 040, server-actions, dirty-state UI |
| **Agent 2b — Lead-data sync** | `regenerateAutoRegels()`, hook in Info-tab save, realtime channel |

### Fase 3 (2 agents parallel)

| Agent | Scope |
|---|---|
| **Agent 3a — DB + backend** | Migratie 041, seed-defaults, get/save server-actions |
| **Agent 3b — Marge-modal UI** | `KostprijzenModal.tsx`, `MargeKaart.tsx`, sliders |

---

## Migratie-volgorde

1. **Fase 1**: geen migraties (mits we voor `volgorde`-based bron-detectie kiezen — beslissing tijdens build)
2. **Fase 1.5** (optioneel): `prijsregels.bron` kolom als we voor migratie-aanpak kiezen
3. **Fase 2**: `040_offerte_concept_state.sql`
4. **Fase 3**: `041_kostprijzen_per_dienst.sql`

Alle migraties zijn additief (geen kolom-dropping of type-changes) — veilig om in productie te draaien.

---

## Wat er **niet** in deze spec staat

- Bot-service aanpassingen (eigen project, andere repo)
- Notificatie-link in Slack omgooien (later, na klant-test)
- Email-versturen van offertes (al bestaande flow, ongewijzigd)
- Klantportaal voor offerte-bekijken (out of scope)
- E-tekenen of digitale handtekening (out of scope)
