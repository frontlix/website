# MASTER PROMPT — Bouwkansen-onderzoek Frontlix (1000-agent sweep)

> **Gebruik:** plak alles onder de streep in een nieuwe Claude Code-sessie in deze repo,
> of start het als background job. De zin "gebruik een workflow" staat er bewust in:
> dat is de expliciete opt-in voor multi-agent-orkestratie via de Workflow-tool.
> Voeg eventueel een tokenbudget toe (bijv. "+2M") om de diepte te sturen.

---

Je bent Claude Code en je voert het grootste bouwkansen-onderzoek tot nu toe uit voor
Frontlix. **Gebruik een workflow** en stuur tot 1000 subagents aan. Het doel: een
uitputtende, geverifieerde en gerangschikte lijst van alles wat we nog kunnen bouwen
dat aantoonbaar toegevoegde waarde heeft. Niet "leuke ideeën", maar kansen met
vraagbewijs, een effortinschatting en een go/no-go-advies.

## Missie

Beantwoord deze vraag uitputtend:

**"Wat kunnen we nog bouwen dat van toegevoegde waarde is, voor wie, hoeveel waarde,
tegen welke effort, en wat is het bewijs dat iemand erop zit te wachten?"**

Onderzoek vier waardegebieden tegelijk, geen enkel gebied overslaan:

1. **PRODUCT** — features voor de Frontlix-webapp/bot die klanten (MKB-dienstverleners)
   meer omzet, minder gemiste leads of tijdwinst opleveren
2. **GROEI** — tools en assets die Frontlix zelf aan demo's en klanten helpen
   (lead-magneten, calculators, content-machines, partnertools)
3. **INTERN** — automatisering die Chris tijd teruggeeft (Jarvis-blokken, Meesterbrein,
   dashboards, agent-orkestratie)
4. **NIEUW** — inkomstenstromen naast Frontlix (micro-SaaS, tools-sites, services)

## Fase 0 — Context vers laden (verplicht, vertrouw niet op dit document)

Dit document is een snapshot; de werkelijkheid beweegt. Spawn eerst parallelle
context-readers (±15 agents) die elk één bron in kaart brengen en een gestructureerde
samenvatting teruggeven:

- Deze repo (`~/Desktop/Frontlix website`): site, dashboard, api-routes, lead-automation
- De Obsidian-vault (`~/Desktop/Frontlix hulp/frontlix-brain`): alle plannen, beslissingen,
  geparkeerde ideeën, het BREIN-STATUS-overzicht
- De memory-directory van dit project (MEMORY.md + alle memory-bestanden)
- Het live product: welke features draaien op app.frontlix.com, wat doet de
  Schoon-Straatje-bot vandaag (web-chat-fallback, na-afspraak-LLM, review-flow)
- Eerdere onderzoeken: autonome-geldstromen (18 categorieën, mediaan €0!), ICP-onderzoek,
  LinkedIn-strategie, lead-lek-check-spec, dispatch-cockpit-plan, flyer-masterplan
- De Supabase-schema's van beide projecten (welke data ligt er al die we kunnen ontsluiten)

Output van fase 0: één "asset- en beslissingenkaart": wat bestaat, wat is geparkeerd
(en waarom), wat is expliciet besloten (en mag dus niet opnieuw voorgesteld worden als
"nieuw idee" zonder nieuw inzicht).

## Fase 1 — Generatie: alle mogelijke ideeën (loop-until-dry)

Genereer ideeën via een matrix van **lenzen × waardegebieden**, elke combinatie een
eigen agent met een eigen invalshoek. Draai rondes van ±40 generator-agents en stop
pas na **2 opeenvolgende rondes zonder nieuwe ideeën** (dedup op kern van het idee,
niet op formulering). Reken op 3 tot 6 rondes.

De lenzen (gebruik ze allemaal, en laat een completeness-critic er extra verzinnen):

| Lens | Kernvraag |
|---|---|
| Funnel | Waar lekt waarde in bezoek → lead → opvolging → afspraak → klus → review → herhaalaankoop? |
| Klant-pijn | Wat kost een MKB-dienstverlener nu het meeste geld/tijd/frustratie? |
| Branche | Wat heeft elke branche specifiek nodig (schoonmaak, hovenier, schilder, kapper, fysio, garagebedrijf, …)? Minimaal 15 branches afzonderlijk. |
| Concurrentie | Wat bieden Trengo, Bookly, Calendly, Plug&Pay, branchesoftware e.d. dat wij niet hebben, en omgekeerd: wat is hun zwakte? (WebSearch) |
| Data | Welke data hebben we al (leads, gesprekken, reviews, analytics) waar een feature of benchmark uit te slaan valt? |
| Integratie | Welke koppelingen vergroten de waarde: boekhouden, agenda, betaalproviders, Google Business, Meta, telefonie? |
| AI-trend | Welke nieuwe modelcapaciteiten (voice, vision, agents, realtime) zijn nu pas haalbaar/betaalbaar? (WebSearch) |
| Retentie | Wat verlaagt churn van Frontlix-klanten en maakt opzeggen onlogisch? |
| Onboarding | Wat verkort de tijd van demo naar betalende, zelfredzame klant? |
| Pricing/packaging | Welke features rechtvaardigen een hogere tier of usage-fee? |
| Distributie | Wat maakt partners, white-label of marketplaces mogelijk? |
| Interne tijd | Wat kost Chris wekelijks de meeste uren en is automatiseerbaar? |
| Hergebruik | Welke bestaande bouwsteen (bot, dashboard, vault, cron-infra) is met klein werk een tweede product? |
| Anti-lens | Wat zou een concurrent bouwen om óns pijn te doen, en kunnen wij dat eerst? |

Elke generator levert ideeën als gestructureerde output: titel, waardegebied, doelgroep,
pijn die het oplost, ruwe waardehypothese, waarom-nu.

## Fase 2 — Dedup en clustering (code, geen agents)

Dedupliceer tegen ALLES wat al gezien is (ook tegen fase 0: bestaande features en
geparkeerde plannen tellen als gezien). Cluster de rest in thema's. Log expliciet
hoeveel ideeën zijn samengevoegd of geschrapt en waarom: geen stille truncatie.

## Fase 3 — Verdieping (1 agent per overgebleven idee)

Per idee één deep-dive-agent die oplevert:
- Concrete vorm: wat bouw je precies, MVP-scope in 1 alinea
- Effort: dagen werk, gegeven onze bestaande stack (Next.js, Supabase, FastAPI, VPS)
- Waardepad: hoe verdient/bespaart dit geld, met een rekensom
- **Vraagbewijs-pad: hoe valideer je binnen 1 tot 2 weken dat er vraag is, ZONDER te
  bouwen** (landingspagina, 5 klantgesprekken, zoekvolume, concurrent-omzet)
- Onderhoudslast en risico's (API-kosten! Chris wil geen lopende kosten zonder omzet)
- Fit-score met bestaande assets

## Fase 4 — Red-team (3 skeptici per idee, adversarial)

Drie verificatie-agents per idee, elk met een eigen lens en de opdracht het idee
te SLOPEN:
1. **Vraag-skepticus:** "niemand wil dit / de mediaan is €0" (toets tegen de les van
   het juni-onderzoek; zoek actief naar bewijs van afwezige vraag)
2. **Effort-skepticus:** "dit is 5× meer werk dan geschat" (verborgen complexiteit,
   edge-cases, onderhoud)
3. **Focus-skepticus:** "dit verdunt de focus van Frontlix" (toets tegen ICP-besluit,
   founder-led strategie en lopende prioriteiten)

Een idee overleeft alleen met minimaal 2 van de 3 niet-fatale oordelen. Gesneuvelde
ideeën komen in een bijlage mét doodsoorzaak, zodat ze niet terugkomen.

## Fase 5 — Extern vraagbewijs (WebSearch-agents voor de overlevers)

Voor elk overlevend idee één research-agent die echt bewijs zoekt: zoekvolumes,
fora/Reddit/LinkedIn-klachten, concurrenten met omzet, prijspunten in de markt.
Geen bewijs gevonden = expliciet "onbewezen" labelen, niet stilletjes optimistisch laten.

## Fase 6 — Scoringspanel en synthese

Een panel van 5 onafhankelijke scorers per finalist (schaal 1 tot 10, gewogen):
- Waarde voor de doelgroep (×3)
- Vraagbewijs-sterkte (×3)
- Effort omgekeerd (×2)
- Strategische fit (×2)
- Verdedigbaarheid/moat (×1)

Mediaan van het panel telt. Daarna één synthese-agent plus een completeness-critic
("welke lens is niet gedraaid, welk waardegebied is dun, welke claim is ongeverifieerd?").
Wat de critic vindt wordt nog één extra ronde werk.

## Eindrapport (de deliverable)

Schrijf naar `docs/onderzoek/bouwkansen-rapport-<datum>.md`:

1. **Top 10** met per kans: wat, voor wie, waarde-rekensom, effort, vraagbewijs,
   eerste validatiestap van maximaal 1 week
2. **Per waardegebied de top 3** (PRODUCT/GROEI/INTERN/NIEUW)
3. **Quick wins**: alles onder 2 dagen effort met direct nut
4. **Kerkhof**: gesneuvelde ideeën met doodsoorzaak (1 regel elk)
5. **Methodeverantwoording**: aantallen agents per fase, rondes tot dry, wat NIET
   onderzocht is
6. Een voorstel voor de **eerste 3 acties** van komende week

## Harde regels (lessen uit eerdere onderzoeken, niet onderhandelbaar)

- **Vraagbewijs boven bouwplezier.** Het autonome-geldstromen-onderzoek van juni 2026
  vond bij 18 categorieën een mediaan van ~€0. Een idee zonder valideerbaar vraagpad
  haalt de top 10 niet, hoe elegant ook.
- **Geen lopende API-kosten zonder omzetpad** (besluit dicteerfunctie-uitstel geldt
  als precedent).
- **Respecteer genomen besluiten**: ICP blijft breed, tools-site en dispatch-cockpit
  zijn bewust geparkeerd, flyer-service blijft los van het Frontlix-merk. Een geparkeerd
  idee mag alleen terugkomen met een NIEUW inzicht dat de parkeer-reden wegneemt.
- **Geen silent caps**: elke truncatie, sampling of niet-gedraaide lens wordt gelogd.
- Schrijf klantgerichte voorbeeldteksten zonder streepjes als leesteken.
- Rapporteer eerlijk: "onbewezen" is een valide en waardevol label.

## Budgetverdeling (richtlijn, ±1000 agents totaal)

| Fase | Agents |
|---|---|
| 0 Context | ~15 |
| 1 Generatie (rondes tot dry) | ~150–250 |
| 3 Verdieping | ~100–150 |
| 4 Red-team (×3) | ~300–450 |
| 5 Extern bewijs | ~60–100 |
| 6 Panel + synthese + critic | ~40 |

Schaal fase 1 en 4 op als budget het toelaat; bezuinig nooit op fase 4 (de red-team
is wat dit onderzoek anders maakt dan een brainstorm).

## Referentie-workflowscript (skelet)

```javascript
export const meta = {
  name: 'bouwkansen-sweep',
  description: 'Uitputtend onderzoek naar bouwkansen met vraagbewijs, red-team en scoring',
  phases: [
    { title: 'Context' }, { title: 'Genereer' }, { title: 'Verdiep' },
    { title: 'RedTeam' }, { title: 'Bewijs' }, { title: 'Score' },
  ],
}

const IDEE = { type: 'object', required: ['ideeën'], properties: { ideeën: { type: 'array', items: {
  type: 'object', required: ['titel', 'gebied', 'doelgroep', 'pijn', 'waardehypothese'],
  properties: { titel: {type:'string'}, gebied: {enum:['PRODUCT','GROEI','INTERN','NIEUW']},
    doelgroep: {type:'string'}, pijn: {type:'string'}, waardehypothese: {type:'string'},
    waaromNu: {type:'string'} } } } } }
const VERDICT = { type: 'object', required: ['fataal', 'reden'],
  properties: { fataal: {type:'boolean'}, reden: {type:'string'} } }
const SCORE = { type: 'object', required: ['waarde','bewijs','effortInv','fit','moat'],
  properties: { waarde:{type:'number'}, bewijs:{type:'number'}, effortInv:{type:'number'},
    fit:{type:'number'}, moat:{type:'number'} } }

// Fase 0 — context vers laden
phase('Context')
const bronnen = ['deze repo', 'vault frontlix-brain', 'memory-dir', 'live product/bot',
  'eerdere onderzoeken', 'supabase-schemas']
const kaart = await parallel(bronnen.map(b => () =>
  agent(`Breng in kaart: ${b}. Geef bestaande assets, geparkeerde plannen en genomen besluiten terug als compacte lijst.`,
    { label: `ctx:${b}`, phase: 'Context' })))
const context = kaart.filter(Boolean).join('\n---\n')

// Fase 1 — generatie tot dry
phase('Genereer')
const LENZEN = ['funnel','klant-pijn','branche','concurrentie','data','integratie','ai-trend',
  'retentie','onboarding','pricing','distributie','interne-tijd','hergebruik','anti-lens']
const GEBIEDEN = ['PRODUCT','GROEI','INTERN','NIEUW']
const gezien = new Set(); const pool = []; let dry = 0; let ronde = 0
while (dry < 2 && ronde < 8) {
  ronde++
  const batch = await parallel(LENZEN.flatMap(l => GEBIEDEN.map(g => () =>
    agent(`CONTEXT:\n${context}\n\nGenereer ronde ${ronde} nieuwe bouwideeën voor gebied ${g} via de lens "${l}". Vermijd alles wat al bestaat of geparkeerd is. Wees concreet en gedurfd.`,
      { label: `gen:${l}/${g}/r${ronde}`, phase: 'Genereer', schema: IDEE }))))
  const vers = batch.filter(Boolean).flatMap(r => r.ideeën)
    .filter(i => { const k = i.titel.toLowerCase().replace(/\W/g,''); if (gezien.has(k)) return false; gezien.add(k); return true })
  if (!vers.length) { dry++; continue }
  dry = 0; pool.push(...vers); log(`Ronde ${ronde}: +${vers.length} nieuw (totaal ${pool.length})`)
}

// Fase 3+4+5 — pipeline per idee: verdiep → red-team → bewijs
const resultaten = await pipeline(pool,
  (idee) => agent(`Verdiep dit idee: ${JSON.stringify(idee)}. Geef MVP-scope, effort in dagen, waarde-rekensom, vraagbewijs-pad (valideren binnen 2 weken zonder te bouwen), onderhoudslast/API-kosten.`,
    { label: `diep:${idee.titel.slice(0,30)}`, phase: 'Verdiep' }).then(d => ({ idee, diep: d })),
  async (r, idee) => {
    const oordelen = await parallel([
      ['vraag', 'Bewijs dat NIEMAND dit wil (mediaan €0-les). Fataal bij afwezige vraag.'],
      ['effort', 'Bewijs dat dit 5x meer werk is dan geschat. Fataal bij verborgen moeras.'],
      ['focus', 'Bewijs dat dit de Frontlix-focus verdunt. Fataal bij strijd met ICP/strategie.'],
    ].map(([lens, opdracht]) => () =>
      agent(`RED-TEAM (${lens}): ${opdracht}\n\nIdee + verdieping:\n${JSON.stringify(r)}`,
        { label: `red:${lens}:${idee.titel.slice(0,20)}`, phase: 'RedTeam', schema: VERDICT })))
    const fataal = oordelen.filter(Boolean).filter(v => v.fataal).length
    return { ...r, fataal, oordelen, dood: fataal >= 2 }
  },
  (r, idee) => r.dood ? r : agent(
    `Zoek EXTERN vraagbewijs voor: ${idee.titel}. Gebruik WebSearch: zoekvolume, klachten op fora, concurrenten met omzet, prijspunten. Label eerlijk "onbewezen" zonder bewijs.`,
    { label: `bewijs:${idee.titel.slice(0,25)}`, phase: 'Bewijs' }).then(b => ({ ...r, bewijs: b })))

// Fase 6 — panel + synthese
phase('Score')
const levend = resultaten.filter(Boolean).filter(r => !r.dood)
log(`${levend.length} overlevers van ${pool.length} ideeën; kerkhof: ${pool.length - levend.length}`)
const gescoord = await parallel(levend.map(r => () =>
  parallel([1,2,3,4,5].map(n => () =>
    agent(`Scorer ${n}/5: score dit idee onafhankelijk (1-10 per as).\n${JSON.stringify(r)}`,
      { label: `score${n}:${r.idee.titel.slice(0,20)}`, phase: 'Score', schema: SCORE })))
    .then(s => ({ ...r, scores: s.filter(Boolean) }))))
const synthese = await agent(
  `Schrijf het eindrapport volgens het format uit het masterprompt (top 10, per gebied top 3, quick wins, kerkhof, methode, eerste 3 acties) naar docs/onderzoek/bouwkansen-rapport.md. Data:\n${JSON.stringify(gescoord.filter(Boolean)).slice(0, 400000)}`,
  { label: 'synthese', phase: 'Score' })
const critic = await agent(
  `Completeness-critic: welke lens is niet gedraaid, welk gebied is dun, welke claim ongeverifieerd? Lijst de gaten.\nRapport: ${synthese}`,
  { label: 'critic', phase: 'Score' })
return { rapport: synthese, gaten: critic, stats: { ideeën: pool.length, overlevers: levend.length } }
```

> Het skelet is een startpunt: de uitvoerende sessie mag het verbeteren (datum via
> `args` meegeven, batches splitsen bij contextlimieten, fase 5-resultaten meenemen in
> de scoring), maar de fasen, de red-team en de harde regels staan vast.

---

_Geschreven 2026-06-05. Bij uitvoering: eerst fase 0 draaien; dit document veroudert._
