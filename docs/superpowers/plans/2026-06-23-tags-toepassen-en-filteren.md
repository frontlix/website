# Tags toepassen op leads + filteren op tags — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De eigenaar kan in het v2-dashboard handmatig bestaande tags op een lead zetten/eraf halen, en de leadlijst filteren op tags (AND).

**Architecture:** Pure UI-wiring op bestaande backend. Het leaddossier krijgt een nieuw `LeadTagsRow`-component (chips + dropdown) dat de bestaande `addTagToLead`/`removeTagFromLead`-acties aanroept. De leadlijst geeft de gekozen tag-ids via de URL door aan `getLeadsList`, dat het AND-tagfilter al doet; een nieuwe tag-keuze in `LeadsFilter` schrijft die URL-param.

**Tech Stack:** Next.js 15 App Router (server + client components), TypeScript, Supabase, CSS-modules. Geen nieuwe dependencies.

## Global Constraints

- Alleen **kiezen uit bestaande** tags in het dossier; aanmaken/beheren blijft in Instellingen (geen inline-aanmaken).
- Filter op meerdere tags = **AND** (lead matcht alleen met álle gekozen tags).
- Geen automatische tags, de bot blijft ongemoeid, geen tag-CRUD-wijzigingen.
- Geen em-dashes/koppeltekens in zichtbare tekst; komma's/punten.
- `Tag`-velden: `id: string`, `naam: string`, `kleur: string | null`, `icon: string | null` (`Tag = Database['public']['Tables']['tags']['Row']` uit `@/lib/dashboard/database.types`).
- Tag-iconen renderen via `ICON_REGISTRY[iconKey]` uit `@/components/dashboard/instellingen/tag-icons` (fallback `ICON_REGISTRY.Tag`).
- Server-acties: `addTagToLead(leadId, tagId)` / `removeTagFromLead(leadId, tagId)` → `{ ok: true } | { ok: false; error: string }`, beide revalidaten `/leads/<id>`.
- Verificatie per taak: `npx tsc --noEmit` (geen nieuwe fouten) + de handmatige test in de taak. Er is in deze repo geen component-test-infra voor het dossier/leads, dus UI-gedrag wordt handmatig geverifieerd; de AND-filter-logica zit al in `getLeadsList` en heeft bestaande dekking.

---

## Task 1: LeadTagsRow-component (chips + toevoeg-dropdown)

**Files:**
- Create: `components/dashboard/v2/dossier/LeadTagsRow.tsx`
- Create: `components/dashboard/v2/dossier/LeadTagsRow.module.css`

**Interfaces:**
- Consumes: `addTagToLead`, `removeTagFromLead` (`@/lib/dashboard/tag-actions`); `ICON_REGISTRY` (`@/components/dashboard/instellingen/tag-icons`); `Tag` (`@/lib/dashboard/database.types`).
- Produces: `export function LeadTagsRow(props: { leadId: string; leadTags: Tag[]; allTags: Tag[]; live: boolean }): JSX.Element` — voor Task 2.

- [ ] **Step 1: Schrijf het component**

```tsx
// components/dashboard/v2/dossier/LeadTagsRow.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { addTagToLead, removeTagFromLead } from "@/lib/dashboard/tag-actions";
import { ICON_REGISTRY } from "@/components/dashboard/instellingen/tag-icons";
import type { IconKey } from "@/lib/dashboard/tag-presets";
import type { Tag } from "@/lib/dashboard/database.types";
import styles from "./LeadTagsRow.module.css";

interface LeadTagsRowProps {
  leadId: string;
  leadTags: Tag[];
  allTags: Tag[];
  /** false in demo-fallback (geen sessie): chips zijn read-only. */
  live: boolean;
}

function TagIcon({ tag }: { tag: Tag }) {
  const Icon = ICON_REGISTRY[(tag.icon as IconKey) ?? "Tag"] ?? ICON_REGISTRY.Tag;
  return <Icon size={12} strokeWidth={2.2} />;
}

export function LeadTagsRow({ leadId, leadTags, allTags, live }: LeadTagsRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Klik-buiten + Escape sluiten de toevoeg-dropdown.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const leadTagIds = new Set(leadTags.map((t) => t.id));
  const beschikbaar = allTags.filter((t) => !leadTagIds.has(t.id));

  function add(tagId: string) {
    setOpen(false);
    startTransition(async () => {
      const res = await addTagToLead(leadId, tagId);
      if (res.ok) router.refresh();
    });
  }

  function remove(tagId: string) {
    startTransition(async () => {
      const res = await removeTagFromLead(leadId, tagId);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className={styles.row} ref={wrapRef}>
      {leadTags.map((t) => (
        <span
          key={t.id}
          className={styles.chip}
          style={{ borderColor: t.kleur ?? "#64748b", color: t.kleur ?? "#64748b" }}
        >
          <TagIcon tag={t} />
          {t.naam}
          {live ? (
            <button
              type="button"
              className={styles.chipX}
              onClick={() => remove(t.id)}
              disabled={pending}
              aria-label={`Tag ${t.naam} verwijderen`}
            >
              <X size={11} strokeWidth={2.6} />
            </button>
          ) : null}
        </span>
      ))}

      {live ? (
        <div className={styles.adder}>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setOpen((v) => !v)}
            disabled={pending}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <Plus size={13} strokeWidth={2.4} />
            tag
          </button>
          {open ? (
            <div className={styles.menu} role="menu">
              {beschikbaar.length === 0 ? (
                <div className={styles.menuEmpty}>
                  Geen tags beschikbaar. Maak nieuwe tags in Instellingen.
                </div>
              ) : (
                beschikbaar.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={styles.menuItem}
                    onClick={() => add(t.id)}
                    role="menuitem"
                  >
                    <span style={{ color: t.kleur ?? "#64748b", display: "inline-flex" }}>
                      <TagIcon tag={t} />
                    </span>
                    {t.naam}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Schrijf de CSS**

```css
/* components/dashboard/v2/dossier/LeadTagsRow.module.css */
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  position: relative;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border: 1px solid;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--rb-surface, #fff);
  line-height: 1;
}
.chipX {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
}
.chipX:hover { opacity: 1; }
.chipX:disabled { opacity: 0.4; cursor: default; }
.adder { position: relative; display: inline-flex; }
.addBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border: 1px dashed var(--rb-border, #cbd5e1);
  border-radius: 999px;
  background: transparent;
  color: var(--rb-text-muted, #64748b);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.addBtn:hover { color: var(--rb-text, #0f172a); border-color: var(--rb-text-muted, #94a3b8); }
.addBtn:disabled { opacity: 0.5; cursor: default; }
.menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  min-width: 180px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
  background: var(--rb-surface, #fff);
  border: 1px solid var(--rb-border, #e2e8f0);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.menuItem {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 9px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: var(--rb-text, #0f172a);
  cursor: pointer;
  text-align: left;
}
.menuItem:hover { background: var(--rb-hover, #f1f5f9); }
.menuEmpty {
  padding: 8px 9px;
  font-size: 12px;
  color: var(--rb-text-muted, #64748b);
}
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/christiaantromp/Desktop/Frontlix website/.claude/worktrees/tags" && npx tsc --noEmit`
Expected: geen nieuwe fouten (component compileert; nog niet gebruikt = ongebruikte-export is geen tsc-fout).

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/v2/dossier/LeadTagsRow.tsx components/dashboard/v2/dossier/LeadTagsRow.module.css
git commit -m "feat(dossier): LeadTagsRow component (chips + toevoeg-dropdown)"
```

---

## Task 2: Tags tonen + bewerken in het leaddossier

**Files:**
- Modify: `app/dashboard/v2/leads/[lead_id]/page.tsx`
- Modify: `components/dashboard/v2/dossier/DossierView.tsx`

**Interfaces:**
- Consumes: `LeadTagsRow` (Task 1); `getAllTags`, `getTagsForLead` (`@/lib/dashboard/tag-queries`); `Tag` (`@/lib/dashboard/database.types`).
- Produces: `DossierView` accepteert nu `leadTags?: Tag[]` en `allTags?: Tag[]`.

- [ ] **Step 1: Lead-detailpagina haalt tags op en geeft ze door**

In `app/dashboard/v2/leads/[lead_id]/page.tsx`, voeg de imports toe:

```tsx
import { getAllTags, getTagsForLead } from "@/lib/dashboard/tag-queries";
```

Vervang in de sessie-tak het `Promise.all`-blok en de `return` door (tags erbij ophalen + doorgeven):

```tsx
  const [detail, pricing, allTags, leadTags] = await Promise.all([
    getLeadDetail(lead_id),
    getManualOffertePricing(),
    getAllTags(),
    getTagsForLead(lead_id),
  ]);
  if (!detail) {
    notFound();
  }

  const lead = mapLeadDetailToV2Lead(detail);
  const dossier = mapLeadDetailToDossierData(detail, pricing);

  return (
    <DossierView
      lead={lead}
      dossier={dossier}
      leadId={detail.lead.lead_id}
      botPaused={detail.lead.bot_gepauzeerd}
      archivedInitial={detail.lead.dashboard_archived}
      leadTags={leadTags}
      allTags={allTags}
    />
  );
```

(De demo-fallback `return <DossierView lead={lead} />;` blijft ongewijzigd; `leadTags`/`allTags` zijn optioneel.)

- [ ] **Step 2: DossierView accepteert de props en rendert LeadTagsRow**

In `components/dashboard/v2/dossier/DossierView.tsx`, voeg de imports toe:

```tsx
import { LeadTagsRow } from "./LeadTagsRow";
import type { Tag } from "@/lib/dashboard/database.types";
```

Breid het `DossierViewProps`-type uit met (zoek de bestaande props-interface/-type van DossierView en voeg toe):

```tsx
  leadTags?: Tag[];
  allTags?: Tag[];
```

Voeg ze toe aan de destructuring van de component-parameters:

```tsx
export function DossierView({
  lead,
  dossier,
  leadId,
  botPaused,
  archivedInitial,
  leadTags,
  allTags,
}: DossierViewProps) {
```

Render `LeadTagsRow` in de kop, direct NA de `meta`-regel (binnen `styles.kopMain`, na de `<div className={styles.meta}>...</div>`):

```tsx
          <div className={styles.meta}>
            {lead.dienst} · {lead.plaats} · via {lead.bron} · laatste bericht {data.binnen}
          </div>
          {leadId ? (
            <LeadTagsRow
              leadId={leadId}
              leadTags={leadTags ?? []}
              allTags={allTags ?? []}
              live={live}
            />
          ) : null}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 4: Handmatige test (geen aparte test-infra voor het dossier)**

1. Start/gebruik de draaiende dashboard (of `npm run dev` in de worktree).
2. Open een lead-dossier. Onder de naam/meta staat nu de tag-rij.
3. Klik "+ tag" → kies een bestaande tag → chip verschijnt; herlaad de pagina → chip blijft (server heeft `lead_tags` geschreven).
4. Klik het kruisje op een chip → chip verdwijnt; herlaad → blijft weg.
5. Als alle tags al op de lead zitten: dropdown toont "Geen tags beschikbaar..."-tekst.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/v2/leads/[lead_id]/page.tsx components/dashboard/v2/dossier/DossierView.tsx
git commit -m "feat(dossier): tags tonen + toevoegen/verwijderen op een lead"
```

---

## Task 3: Tag-filter in de leadlijst

**Files:**
- Modify: `app/dashboard/v2/leads/page.tsx`
- Modify: `components/dashboard/v2/leads/LeadsView.tsx`
- Modify: `components/dashboard/v2/leads/LeadsFilter.tsx`

**Interfaces:**
- Consumes: `getLeadsList(filters?, options?)` met `filters.tags: string[]` (AND-pre-filter, bestaat al); `getAllTags` (`@/lib/dashboard/tag-queries`); `Tag`.
- Produces: `LeadsView` accepteert `allTags: Tag[]`; `LeadsFilter` accepteert `allTags: Tag[]`.

- [ ] **Step 1: Leadlijst-pagina parset tags, filtert via getLeadsList, en levert allTags**

In `app/dashboard/v2/leads/page.tsx`:

Voeg de import toe:
```tsx
import { getAllTags } from "@/lib/dashboard/tag-queries";
```

Voeg `tags` toe aan het `searchParams`-type:
```tsx
  searchParams: Promise<{
    q?: string;
    bron?: string;
    urgent?: string;
    sort?: string;
    archief?: string;
    tags?: string;
  }>;
```

Direct na `const sp = await searchParams;`, parse de tag-ids:
```tsx
  const tagIds = sp.tags ? sp.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const tagFilter = tagIds && tagIds.length > 0 ? { tags: tagIds } : undefined;
```

In de **archief-tak** (`if (isArchief)`), vervang de fetch + return door:
```tsx
  if (isArchief) {
    const [archivedLeads, allTags] = await Promise.all([
      getLeadsList(tagFilter, { archived: true }),
      getAllTags(),
    ]);
    const filtered = applyLeadsFilters(archivedLeads, sp);
    return (
      <LeadsView
        leads={mapLeadsToV2(filtered)}
        pipeline={[]}
        archived
        archivedCount={archivedLeads.length}
        allTags={allTags}
      />
    );
  }
```

In de **actieve tak**, vervang het `Promise.all` + de return door:
```tsx
  const [allLeads, archivedLeads, allTags] = await Promise.all([
    getLeadsList(tagFilter),
    getLeadsList(undefined, { archived: true }),
    getAllTags(),
  ]);

  const filtered = applyLeadsFilters(allLeads, sp);

  return (
    <LeadsView
      leads={mapLeadsToV2(filtered)}
      pipeline={buildPipelineFromLeads(filtered)}
      archivedCount={archivedLeads.length}
      allTags={allTags}
    />
  );
```

In de **demo-fallback** (`if (!session)`), geef een lege lijst mee zodat het type klopt:
```tsx
      <LeadsView
        leads={isArchief ? [] : LEADS}
        pipeline={PIPELINE}
        archived={isArchief}
        archivedCount={0}
        allTags={[]}
      />
```

- [ ] **Step 2: LeadsView geeft allTags door aan LeadsFilter**

In `components/dashboard/v2/leads/LeadsView.tsx`:

Voeg de import toe:
```tsx
import type { Tag } from "@/lib/dashboard/database.types";
```

Voeg `allTags: Tag[]` toe aan de props-interface van `LeadsView` en aan de destructuring (`export function LeadsView({ leads, pipeline, archived, archivedCount, allTags }: ...)`).

Geef hem door waar `<LeadsFilter />` gerenderd wordt (regel ~43):
```tsx
          <LeadsFilter allTags={allTags} />
```

- [ ] **Step 3: LeadsFilter krijgt een Tags-sectie**

In `components/dashboard/v2/leads/LeadsFilter.tsx`:

Voeg imports toe:
```tsx
import { ICON_REGISTRY } from "@/components/dashboard/instellingen/tag-icons";
import type { IconKey } from "@/lib/dashboard/tag-presets";
import type { Tag } from "@/lib/dashboard/database.types";
```

Wijzig de signatuur naar een props-object:
```tsx
export function LeadsFilter({ allTags }: { allTags: Tag[] }) {
```

Lees de geselecteerde tags uit de URL en breid `activeCount` uit (na de bestaande `sort`-regel):
```tsx
  const selectedTags = (() => {
    const raw = searchParams.get("tags");
    return raw ? raw.split(",").filter(Boolean) : [];
  })();

  const activeCount =
    (bron === "wa" || bron === "form" ? 1 : 0) +
    (urgent ? 1 : 0) +
    (sort !== "binnen" ? 1 : 0) +
    selectedTags.length;
```

Voeg een toggle-helper toe (onder `setParam`):
```tsx
  function toggleTag(tagId: string) {
    const next = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId];
    setParam("tags", next.length > 0 ? next.join(",") : null);
  }
```

Wis ook `tags` in `clearAll`:
```tsx
    params.delete("sort");
    params.delete("tags");
```

Voeg de Tags-sectie toe in de popover, direct NA de "Sorteer op"-sectie (vóór `<div className={styles.footer}>`):
```tsx
          {allTags.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Tags (alle gekozen)</div>
              <div className={styles.sortList}>
                {allTags.map((t) => {
                  const Icon = ICON_REGISTRY[(t.icon as IconKey) ?? "Tag"] ?? ICON_REGISTRY.Tag;
                  const on = selectedTags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.sortItem}
                      data-on={on ? "true" : undefined}
                      onClick={() => toggleTag(t.id)}
                    >
                      <span style={{ color: t.kleur ?? "#64748b", display: "inline-flex", marginRight: 6 }}>
                        <Icon size={14} strokeWidth={2.2} />
                      </span>
                      {t.naam}
                      {on ? <Check size={14} strokeWidth={2.6} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
```

(De `Check`-import bestaat al in dit bestand. `styles.section`/`sectionLabel`/`sortList`/`sortItem` bestaan al; we hergebruiken ze.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: geen fouten (alle call-sites van `LeadsView`/`LeadsFilter` leveren nu `allTags`).

- [ ] **Step 5: Handmatige test**

1. Open de leadlijst, klik "Filters". Onderaan staat nu een "Tags"-blok met je tags.
2. Vink één tag aan → lijst toont alleen leads met die tag; de filter-teller telt +1; de URL bevat `?tags=<id>`.
3. Vink een tweede tag aan → alleen leads die **beide** tags hebben (AND).
4. "Wis filters" → tags verdwijnen, alle leads terug.
5. Werkt ook op de archief-lijst (`?archief=1`).

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/v2/leads/page.tsx components/dashboard/v2/leads/LeadsView.tsx components/dashboard/v2/leads/LeadsFilter.tsx
git commit -m "feat(leads): filter de leadlijst op tags (AND) via getLeadsList"
```

---

## Self-Review (uitgevoerd bij het schrijven)

- **Spec-dekking:** Deel 1 (dossier-tag-UI) = Task 1 + 2. Deel 2 (filter) = Task 3. "Kiezen uit bestaande" (geen createTag in het dossier) ✓. AND-filter via bestaande `getLeadsList` ✓. Buiten scope (CRUD/auto/bot) niet aangeraakt ✓.
- **Placeholder-scan:** geen TBD/TODO; alle code volledig uitgeschreven; tsc + handmatige test als gates (er is geen dossier/leads-component-testinfra, de AND-filter is bestaande, geteste code).
- **Type-consistentie:** `LeadTagsRow`-props (leadId/leadTags/allTags/live) consistent tussen Task 1 en 2. `Tag` overal uit `@/lib/dashboard/database.types`. `allTags` als prop op `LeadsView` (Task 3 stap 1+2) en `LeadsFilter` (Task 3 stap 2+3) consistent. `getLeadsList(tagFilter, ...)` matcht de bestaande `getLeadsList(filters?, options?)`-signatuur met `filters.tags: string[]`.
