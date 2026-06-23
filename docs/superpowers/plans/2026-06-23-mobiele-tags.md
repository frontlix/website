# Tags op mobiel (dossier + leadlijst-filter) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De eigenaar kan op de mobiele weergave tags op een lead zetten/eraf halen (in het mobiele dossier) en de mobiele leadlijst filteren op tags (AND).

**Architecture:** Mobiele tegenhanger van de al gebouwde desktop-tags. Het mobiele dossier hergebruikt het bestaande `LeadTagsRow`-component. De mobiele leadlijst filtert client-side, dus elke kaart krijgt zijn `tagIds` mee en de bestaande filter-sheet (`LeadsFilterSheet`) krijgt een Tags-blok met AND-werking in `MobileLeads`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, CSS-modules. Geen nieuwe dependencies. De mobiele routes leven onder `app/dashboard/(app)/...`.

## Global Constraints

- Alleen **kiezen uit bestaande** tags (geen inline-aanmaken); beheren blijft in Instellingen.
- Filter = **AND** (lead matcht alleen met álle gekozen tags).
- Geen auto-tags, bot ongemoeid, desktop-versie ongewijzigd.
- Geen em-dashes/koppeltekens in zichtbare tekst.
- `Tag` = `Database['public']['Tables']['tags']['Row']` (`@/lib/dashboard/database.types`); velden `id`, `naam`, `kleur: string|null`, `icon: string|null`.
- Hergebruik: `LeadTagsRow` (`@/components/dashboard/v2/dossier/LeadTagsRow`), `addTagToLead`/`removeTagFromLead` (`@/lib/dashboard/tag-actions`), `getAllTags`/`getTagsForLead` (`@/lib/dashboard/tag-queries`).
- Verificatie per taak: `npx tsc --noEmit` (geen nieuwe fouten) + de handmatige test. Er is geen component-test-infra voor mobiel-dossier/leads; gedrag wordt handmatig getest na deploy.

---

## Task 1: Tags in het mobiele leaddossier

**Files:**
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx`
- Modify: `components/dashboard/mobile/dossier/MobileLeadDossier.tsx`

**Interfaces:**
- Consumes: `getAllTags`, `getTagsForLead` (`@/lib/dashboard/tag-queries`); `LeadTagsRow` (`@/components/dashboard/v2/dossier/LeadTagsRow`); `Tag`.
- Produces: `MobileLeadDossier` accepteert nu `leadTags: Tag[]` en `allTags: Tag[]`.

- [ ] **Step 1: Mobiele lead-detailpagina haalt tags op en geeft ze door**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`, voeg de import toe:
```tsx
import { getAllTags, getTagsForLead } from '@/lib/dashboard/tag-queries'
```

Breid het `Promise.all`-blok uit met de twee tag-queries:
```tsx
  const [detail, pricing, allTags, leadTags] = await Promise.all([
    getLeadDetail(lead_id),
    getManualOffertePricing(),
    getAllTags(),
    getTagsForLead(lead_id),
  ])
```

Geef ze door aan `<MobileLeadDossier ...>` (voeg de twee props toe aan de bestaande aanroep):
```tsx
        <MobileLeadDossier
          data={mapLeadDetailToDossier(detail)}
          leadTags={leadTags}
          allTags={allTags}
          offerteForm={{
            leadId: lead.lead_id,
            lead,
            prijsregels: detail.prijsregels,
            offertes: detail.offertes,
            fotosCount: detail.fotos.length,
            pricing: seedPricing,
          }}
        />
```

- [ ] **Step 2: MobileLeadDossier rendert LeadTagsRow onder de fact-strip**

In `components/dashboard/mobile/dossier/MobileLeadDossier.tsx`, voeg de imports toe:
```tsx
import { LeadTagsRow } from '@/components/dashboard/v2/dossier/LeadTagsRow'
import type { Tag } from '@/lib/dashboard/database.types'
```

Breid de component-props uit (het type-literal in de signatuur) met `leadTags`/`allTags` en destructure ze:
```tsx
export function MobileLeadDossier({
  data,
  leadTags,
  allTags,
  offerteForm,
}: {
  data: MobileDossierData
  leadTags: Tag[]
  allTags: Tag[]
  offerteForm: MobileOfferteFormProps
}) {
```

Render `LeadTagsRow` direct NA de `<DossierFactStrip ... />`-regel (regel ~53), vóór `<DossierTabs>`:
```tsx
        <DossierFactStrip facts={factStrip(lead)} />
        <LeadTagsRow leadId={lead.lead_id} leadTags={leadTags} allTags={allTags} live />
        <DossierTabs active={tab} tabs={TABS} onSelect={(k) => setTab(k as Tab)} />
```

(De `(app)`-route vereist een ingelogde, approved user, dus `live` is altijd waar.)

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/christiaantromp/Desktop/Frontlix website/.claude/worktrees/<jouw-worktree>" && npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 4: Handmatige test (na deploy)**

Open op mobiel (of smal venster) een lead. Onder de fact-strip staat nu de tag-rij. "+ tag" → kies een tag → chip verschijnt en blijft na herladen; kruisje → weg.

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/(app)/leads/[lead_id]/page.tsx" components/dashboard/mobile/dossier/MobileLeadDossier.tsx
git commit -m "feat(mobiel): tags tonen + bewerken in het mobiele leaddossier"
```

---

## Task 2: Tag-filter in de mobiele leadlijst

**Files:**
- Modify: `lib/dashboard/tag-queries.ts` (nieuwe query)
- Modify: `components/dashboard/mobile/leads/lead-mappers.ts` (`tagIds` op de kaart)
- Modify: `app/dashboard/(app)/leads/page.tsx` (tag-ids + allTags ophalen en doorgeven)
- Modify: `components/dashboard/mobile/leads/MobileLeads.tsx` (AND-filter + allTags doorgeven)
- Modify: `components/dashboard/mobile/leads/LeadsFilterSheet.tsx` (Tags-sectie)

**Interfaces:**
- Produces: `getTagIdsByLeadIds(leadIds: string[]): Promise<Map<string, string[]>>` (`@/lib/dashboard/tag-queries`); `MobileLeadCard` krijgt `tagIds: string[]`; `AdvFilter` krijgt `tags: Set<string>`; `MobileLeadsData` krijgt `allTags: Tag[]`; `LeadsFilterSheet` krijgt prop `allTags: Tag[]`.

- [ ] **Step 1: Query om tag-ids per lead op te halen**

Voeg onderaan `lib/dashboard/tag-queries.ts` toe:
```tsx
/**
 * Haalt per lead de tag-ids op, voor client-side tag-filtering in de mobiele
 * leadlijst. Eén query over lead_tags, gefilterd op de meegegeven lead-ids.
 */
export async function getTagIdsByLeadIds(
  leadIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (leadIds.length === 0) return out

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('lead_tags')
    .select('lead_id, tag_id')
    .in('lead_id', leadIds)

  if (error) {
    console.error('[getTagIdsByLeadIds] query failed:', error)
    return out
  }

  type Row = { lead_id: string; tag_id: string }
  for (const row of (data as unknown as Row[] | null) ?? []) {
    const arr = out.get(row.lead_id) ?? []
    arr.push(row.tag_id)
    out.set(row.lead_id, arr)
  }
  return out
}
```

- [ ] **Step 2: `tagIds` op de mobiele kaart**

In `components/dashboard/mobile/leads/lead-mappers.ts`, voeg aan `MobileLeadCard` toe:
```tsx
  surfaceContext: string
  tagIds: string[]
}
```

En geef `mapLeadToCard` een vierde parameter + zet het veld:
```tsx
export function mapLeadToCard(
  l: RawLead,
  now: number = Date.now(),
  laatsteInteractieAt?: string | null,
  tagIds: string[] = [],
): MobileLeadCard {
  return {
    id: l.lead_id,
    naam: l.naam ?? 'Onbekend',
    plaats: l.plaats ?? '',
    m2: l.m2,
    dienst: dienstLabel(l),
    stage: leadStage(l),
    prijs: l.totaal_prijs,
    binnen: shortTimeAgo(laatsteInteractieAt ?? l.aangemaakt, now),
    datum: datumLabel(l),
    bron: l.kanaal === 'web' ? 'form' : 'wa',
    urgent: isLeadUrgent(l),
    surfaceContext: botStatusForFase(l.gesprek_fase),
    tagIds,
  }
}
```

- [ ] **Step 3: Mobiele leadlijst-pagina haalt tag-ids + allTags op en geeft ze door**

In `app/dashboard/(app)/leads/page.tsx`, voeg imports toe:
```tsx
import { getAllTags, getTagIdsByLeadIds } from '@/lib/dashboard/tag-queries'
```

Na de bestaande `const lastInboundById = await getLastInboundByLeadIds(shownIds)`-regel, haal tags + alle tags op (`shownIds` bevat al de getoonde + gearchiveerde lead-ids):
```tsx
  const [tagIdsByLead, allTags] = await Promise.all([
    getTagIdsByLeadIds(shownIds),
    getAllTags(),
  ])
```

Geef `tagIds` mee aan beide `mapLeadToCard`-aanroepen en `allTags` aan de data:
```tsx
        data={{
          cards: displayed.map((l) =>
            mapLeadToCard(l, nowMs, lastInboundById.get(l.lead_id) ?? null, tagIdsByLead.get(l.lead_id) ?? []),
          ),
          archivedCards: archivedLeads.map((l) =>
            mapLeadToCard(l, nowMs, lastInboundById.get(l.lead_id) ?? null, tagIdsByLead.get(l.lead_id) ?? []),
          ),
          telefoonById: Object.fromEntries(
            [...displayed, ...archivedLeads].map((l) => [l.lead_id, l.telefoon ?? '']),
          ),
          counts: {
            all:     counts.all,
            gesprek: counts.in_gesprek,
            review:  counts.review,
            uit:     counts.offerte_uit,
            gepland: counts.ingepland,
            klaar:   counts.afgerond,
            archief: counts.archief,
          },
          chatbotNaam,
          allTags,
        }}
```

- [ ] **Step 4: MobileLeads krijgt allTags + AND-tagfilter**

In `components/dashboard/mobile/leads/MobileLeads.tsx`:

Voeg de import toe:
```tsx
import type { Tag } from '@/lib/dashboard/database.types'
```

Voeg `allTags` toe aan `MobileLeadsData`:
```tsx
  chatbotNaam: string
  allTags: Tag[]
}
```

Voeg `tags` toe aan `DEFAULT_ADV_FILTER` (leeg = geen tagfilter):
```tsx
const DEFAULT_ADV_FILTER: AdvFilter = {
  stages:     new Set<MobileLeadStage>(['gesprek', 'review', 'uit', 'gepland', 'klaar']),
  bronnen:    new Set<'wa' | 'form'>(['wa', 'form']),
  urgentOnly: false,
  sort:       'binnen',
  tags:       new Set<string>(),
}
```

Voeg in `filterCards`, na de `urgentOnly`-regel, het AND-tagfilter toe:
```tsx
      if (f.urgentOnly) list = list.filter((c) => c.urgent)
      // Advanced filter: tags (AND) — lead matcht alleen met ALLE gekozen tags
      if (f.tags.size > 0) {
        const wanted = [...f.tags]
        list = list.filter((c) => wanted.every((t) => c.tagIds.includes(t)))
      }
```

Tel tags mee in `advCount`:
```tsx
  const advCount =
    (advFilter.stages.size < 5 ? 1 : 0) +
    (advFilter.bronnen.size < 2 ? 1 : 0) +
    (advFilter.urgentOnly ? 1 : 0) +
    (advFilter.sort !== 'binnen' ? 1 : 0) +
    (advFilter.tags.size > 0 ? 1 : 0)
```

Geef `allTags` door aan de sheet:
```tsx
      <LeadsFilterSheet
        open={sheetOpen}
        value={advFilter}
        allTags={data.allTags}
        countFor={countFor}
        onApply={setAdvFilter}
        onClose={() => setSheetOpen(false)}
      />
```

- [ ] **Step 5: LeadsFilterSheet krijgt een Tags-sectie**

In `components/dashboard/mobile/leads/LeadsFilterSheet.tsx`:

Voeg imports toe:
```tsx
import { ICON_REGISTRY } from '@/components/dashboard/instellingen/tag-icons'
import type { IconKey } from '@/lib/dashboard/tag-presets'
import type { Tag } from '@/lib/dashboard/database.types'
```

Breid `AdvFilter` uit:
```tsx
export type AdvFilter = {
  stages: Set<MobileLeadStage>
  bronnen: Set<'wa' | 'form'>
  urgentOnly: boolean
  sort: 'binnen' | 'prijs' | 'naam' | 'fase'
  tags: Set<string>
}
```

Voeg `allTags: Tag[]` toe aan `LeadsFilterSheetProps` en aan de destructuring van de component.

Voeg een draft-state voor tags toe (naast de andere `useState`-regels):
```tsx
  const [tags, setTags]           = useState<Set<string>>(value.tags)
```

Sync hem in het `useEffect` open-blok:
```tsx
      setSort(value.sort)
      setTags(value.tags)
```

In `wipe()` reset naar leeg:
```tsx
    setSort('binnen')
    setTags(new Set<string>())
```

In `apply()` en `resultCount` neem tags mee:
```tsx
  function apply() {
    onApply({ stages, bronnen, urgentOnly, sort, tags })
    onClose()
  }
```
```tsx
  const resultCount = countFor({ stages, bronnen, urgentOnly, sort, tags })
```

Voeg een Tags-`FilterSection` toe direct NA de "Sorteer op"-sectie (vóór `<div className={styles.footer}>`), alleen als er tags zijn:
```tsx
        {allTags.length > 0 && (
          <FilterSection title="Tags" sub="Alleen leads met alle gekozen tags">
            <div className={styles.chipRow}>
              {allTags.map((t) => {
                const Icon = ICON_REGISTRY[(t.icon as IconKey) ?? 'Tag'] ?? ICON_REGISTRY.Tag
                const on = tags.has(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.faseChip}
                    data-on={on ? 'true' : undefined}
                    onClick={() => toggle(tags, setTags, t.id)}
                  >
                    <span style={{ color: t.kleur ?? '#64748b', display: 'inline-flex' }}>
                      <Icon size={12} strokeWidth={2.2} />
                    </span>
                    {t.naam}
                  </button>
                )
              })}
            </div>
          </FilterSection>
        )}
```

(Hergebruikt `styles.chipRow` + `styles.faseChip` van de Fase-sectie; `toggle` bestaat al.)

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten (alle aanroepen van `MobileLeads`/`LeadsFilterSheet`/`mapLeadToCard` leveren nu de nieuwe velden).

- [ ] **Step 7: Handmatige test (na deploy)**

Op mobiel: open Filters → onderaan een Tags-blok. Kies één tag → alleen leads met die tag; teller +1. Kies een tweede → alleen leads met beide (AND). "Wis" → tags weg.

- [ ] **Step 8: Commit**

```bash
git add lib/dashboard/tag-queries.ts components/dashboard/mobile/leads/lead-mappers.ts "app/dashboard/(app)/leads/page.tsx" components/dashboard/mobile/leads/MobileLeads.tsx components/dashboard/mobile/leads/LeadsFilterSheet.tsx
git commit -m "feat(mobiel): filter de leadlijst op tags (AND) in de filter-sheet"
```

---

## Self-Review (uitgevoerd bij het schrijven)

- **Spec/ontwerp-dekking:** Deel 1 (mobiel dossier-tags) = Task 1 (LeadTagsRow hergebruikt). Deel 2 (mobiel filter, AND, client-side via tagIds op de kaart) = Task 2. Buiten scope (CRUD/auto/bot/desktop) niet aangeraakt.
- **Placeholder-scan:** geen TBD/TODO; alle code volledig; tsc + handmatige test als gates (geen mobiele component-testinfra).
- **Type-consistentie:** `AdvFilter.tags: Set<string>` consistent tussen LeadsFilterSheet (definitie), MobileLeads (DEFAULT + filter + advCount) en de draft-state. `MobileLeadCard.tagIds: string[]` consistent tussen lead-mappers (definitie + mapLeadToCard) en MobileLeads (`c.tagIds`). `MobileLeadsData.allTags: Tag[]` consistent tussen de pagina (levert), MobileLeads (prop) en LeadsFilterSheet (`allTags`-prop). `getTagIdsByLeadIds` → `Map<string,string[]>` matcht het gebruik `tagIdsByLead.get(...)`.
