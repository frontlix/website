# Plan 5 — Lichte acties + cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Het dashboard wordt **bewerkbaar**. Klanten kunnen dashboard-status wijzigen, notities toevoegen, tags toekennen, leads archiveren en de huidige lijst exporteren als CSV. Alles via Server Actions die direct naar Supabase schrijven (RLS-aware, cookie-session). Geen bot-API calls — die zijn voor zware acties (Plan 6).

**Architecture:** Drie server-action files (`lead-actions.ts`, `note-actions.ts`, `tag-actions.ts`), één API-route voor CSV-streaming, een Client Component upgrade voor elke bestaande UI-component die nu interactief wordt. Plus een SQL-migratie 025 voor de `lead_status_history` auto-fill trigger zodat status-changes auditbaar zijn. Plus een korte cleanup van technische schuld uit Plan 4.

**Tech Stack:** Next.js 15 Server Actions, `@supabase/ssr` (al aanwezig), CSS Modules, Vitest. Geen nieuwe packages.

**Working directory:** `/Users/christiaantromp/Desktop/Frontlix website new/`

**Schoon-straatje bot wordt niet aangeraakt.** SQL-migratie 025 is additief (alleen een trigger op `leads`); bot blijft via service-key schrijven en triggert de trigger zoals een UI-write zou doen — we zorgen dat de trigger geen schade doet bij service-key writes (zie Task 1).

---

## File Structure

**Nieuw:**
```
supabase/migrations-frontlix/025_lead_status_history_trigger.sql

lib/dashboard/
├── lead-actions.ts                                   — server actions voor leads (status, archief)
├── lead-actions.test.ts
├── note-actions.ts                                   — server actions voor notes (add, delete)
├── note-actions.test.ts
├── tag-actions.ts                                    — server actions voor tags (create, add, remove)
├── tag-actions.test.ts
└── tag-queries.ts                                    — getAllTags + getTagsForLead (server-side reads)

components/dashboard/leads/
├── LeadStatusBadges.tsx                              — UPGRADE: dashboard_status wordt dropdown (client)
├── LeadNotes.tsx                                     — UPGRADE: voeg add-note form toe (client)
├── LeadTagsEditor.tsx + .module.css                  — NIEUW: tags-chips + create-new (client)
├── LeadDangerZone.tsx + .module.css                  — NIEUW: archief toggle (client)
└── ExportLeadsButton.tsx + .module.css               — NIEUW: "Exporteer CSV" knop (client)

app/api/dashboard/export/leads-csv/route.ts            — streaming CSV download
```

**Gewijzigd:**
```
app/dashboard/(app)/leads/[lead_id]/page.tsx          — fetch tags + render TagsEditor + DangerZone
app/dashboard/(app)/leads/page.tsx                    — voeg ExportLeadsButton toe
lib/dashboard/lead-queries.ts                         — voeg .limit(100) toe (Plan 4 review)
components/dashboard/leads/LeadPhotos.module.css       — fix `!important` (Plan 4 review)
app/dashboard/(app)/leads/[lead_id]/page.module.css   — verwijder unused .placeholder (Plan 4 review)
```

---

## Approach principles

- **Server Actions, niet API routes.** Alleen CSV-export gebruikt een Route Handler omdat we een streaming Response nodig hebben (geen JSON return).
- **TDD voor server actions.** Tests mocken Supabase. UI-components testen we via end-to-end smoke (Task 12).
- **revalidatePath na elke write.** Forceert Next om data opnieuw te fetchen — anders zien users hun eigen wijziging niet zonder hard refresh.
- **Optimistic UI niet** voor v1. Een korte "Bezig…"-state is genoeg. Optimistic updates komen pas als users klagen.
- **YAGNI**: geen bulk-acties, geen tag-kleurkiezer, geen note-edit (alleen add/delete). Komt later.
- **Frequent commits**: één commit per task.

---

### Task 1: SQL-migratie 025 — auto-fill trigger voor lead_status_history

**Files:**
- Create: `supabase/migrations-frontlix/025_lead_status_history_trigger.sql`

- [ ] **Step 1: Schrijf de migratie**

Bestand `supabase/migrations-frontlix/025_lead_status_history_trigger.sql`:

```sql
-- Migratie 025 (Frontlix dashboard): auto-fill trigger voor dashboard_status changes
--
-- Logt elke wijziging van leads.dashboard_status automatisch naar
-- lead_status_history. Voorkomt dat dashboard-server-actions de history
-- expliciet hoeven te schrijven (en daarmee per ongeluk overslaan).
--
-- Schiet alleen op echte STATUS-wijzigingen — als de UI een UPDATE doet
-- maar dashboard_status niet verandert (bv. notitie toegevoegd elders),
-- gebeurt er niets.
--
-- DRAAIEN: handmatig in schoon-straatje Supabase Studio.
-- AFHANKELIJKHEDEN: 023_dashboard_data_tables.sql (lead_status_history bestaat).

CREATE OR REPLACE FUNCTION log_dashboard_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alleen loggen bij echte wijziging. NULL → 'open' is een wijziging,
  -- 'open' → 'open' niet.
  IF NEW.dashboard_status IS DISTINCT FROM OLD.dashboard_status THEN
    INSERT INTO lead_status_history (
      lead_id,
      oude_status,
      nieuwe_status,
      gewijzigd_door,
      gewijzigd_op
    )
    VALUES (
      NEW.lead_id,
      OLD.dashboard_status,
      COALESCE(NEW.dashboard_status, 'NULL'),  -- nieuwe_status is NOT NULL
      auth.uid(),                              -- service-key writes geven NULL
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lead_dashboard_status_change ON leads;
CREATE TRIGGER on_lead_dashboard_status_change
  AFTER UPDATE OF dashboard_status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_dashboard_status_change();

COMMENT ON TRIGGER on_lead_dashboard_status_change ON leads IS
  'Logt elke wijziging van leads.dashboard_status naar lead_status_history. Service-key writes (bot) zetten gewijzigd_door=NULL — onschadelijk omdat de bot deze kolom niet gebruikt.';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations-frontlix/025_lead_status_history_trigger.sql
git commit -m "feat(db): add auto-fill trigger for lead_status_history on dashboard_status changes"
```

---

### Task 2: Run migratie 025 in Supabase Studio

Manuele operationele stap. **Niet skipten** — Tasks 4+ schrijven naar `leads.dashboard_status` en we willen dat de trigger meteen logt.

- [ ] **Step 1: Open Supabase Studio voor het schoon-straatje project**

Zelfde project waar 022/023/024 zijn gerund. SQL Editor → New Query.

- [ ] **Step 2: Plak `025_lead_status_history_trigger.sql` en klik Run**

Verwacht: Supabase Studio kan waarschuwen voor `DROP TRIGGER` — klik **Run this query**, idempotent.

Verwacht resultaat: `Success. No rows returned`.

- [ ] **Step 3: Verifieer trigger**

```sql
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname = 'on_lead_dashboard_status_change';
```

Verwacht: 1 rij, `tgrelid = leads`.

- [ ] **Step 4: Test de trigger met een dummy update**

```sql
-- Pak een test-lead (eerste niet-gearchiveerde)
WITH test_lead AS (
  SELECT lead_id FROM leads WHERE dashboard_archived = false LIMIT 1
)
UPDATE leads SET dashboard_status = 'open'
WHERE lead_id IN (SELECT lead_id FROM test_lead);

-- Check dat history-rij is gelogd
SELECT * FROM lead_status_history ORDER BY gewijzigd_op DESC LIMIT 3;
```

Verwacht: minstens 1 nieuwe rij in `lead_status_history` met `nieuwe_status='open'` en `gewijzigd_door=NULL` (want service-key in Studio is bot-context).

- [ ] **Step 5: Cleanup test-data**

```sql
-- Reset de test-lead naar geen status
WITH test_lead AS (
  SELECT lead_id FROM leads WHERE dashboard_archived = false LIMIT 1
)
UPDATE leads SET dashboard_status = NULL
WHERE lead_id IN (SELECT lead_id FROM test_lead);

-- Verwijder de test-history-rijen (laatste twee, één voor SET 'open' en één voor SET NULL)
DELETE FROM lead_status_history
WHERE id IN (
  SELECT id FROM lead_status_history ORDER BY gewijzigd_op DESC LIMIT 2
);
```

- [ ] **Step 6: Smoke-check de bot**

`pm2 logs` op de schoon-straatje VPS — geen nieuwe errors verwacht. Bot raakt `dashboard_status` niet aan, dus de trigger schiet niet voor bot-writes.

---

### Task 3: Plan 4 cleanup (3 small fixes)

**Files:**
- Modify: `lib/dashboard/lead-queries.ts`
- Modify: `components/dashboard/leads/LeadPhotos.module.css`
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.module.css`

- [ ] **Step 1: Voeg `.limit(100)` toe aan getLeadsList**

In `lib/dashboard/lead-queries.ts`, vind de `getLeadsList`-functie. De bestaande call eindigt met:

```typescript
  const { data, error } = await supabase
    .from('leads')
    .select(LIST_COLUMNS)
    .eq('dashboard_archived', false)
    .order('aangemaakt', { ascending: false })
```

Vervang met:

```typescript
  const { data, error } = await supabase
    .from('leads')
    .select(LIST_COLUMNS)
    .eq('dashboard_archived', false)
    .order('aangemaakt', { ascending: false })
    .limit(100)
```

- [ ] **Step 2: Vervang `!important` in LeadPhotos.module.css**

In `components/dashboard/leads/LeadPhotos.module.css`, vind:

```css
.thumb img {
  width: 100% !important;
  height: 100% !important;
}
```

Vervang met:

```css
/* next/image injecteert inline width/height op basis van de width/height props.
   We willen dat de thumbnail de volledige ouder-button vult. CSS-Modules + 
   next/image: gebruik de :where() pseudoclass om specificity te negeren
   zonder !important. */
.thumb :where(img) {
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 3: Verwijder unused .placeholder class**

In `app/dashboard/(app)/leads/[lead_id]/page.module.css`, verwijder dit blok:

```css
.placeholder {
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 4: Type-check + run tests**

```bash
npx tsc --noEmit && npm run test
```

Verwacht: clean, alle 47 tests groen.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/lead-queries.ts components/dashboard/leads/LeadPhotos.module.css "app/dashboard/(app)/leads/[lead_id]/page.module.css"
git commit -m "chore(dashboard): cleanup from Plan 4 review (limit 100, drop !important, drop unused class)"
```

---

### Task 4: lead-actions — setDashboardStatus + archiveLead + unarchiveLead (TDD)

**Files:**
- Create: `lib/dashboard/lead-actions.ts`
- Create: `lib/dashboard/lead-actions.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/lead-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockEq, mockUpdate, mockFrom, mockRevalidatePath } = vi.hoisted(() => {
  const mockEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  const mockRevalidatePath = vi.fn()
  return { mockEq, mockUpdate, mockFrom, mockRevalidatePath }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import {
  setDashboardStatus,
  archiveLead,
  unarchiveLead,
} from './lead-actions'
import type { DashboardStatus } from './database.types'

describe('setDashboardStatus', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('updatet dashboard_status en revalidate de detail-page', async () => {
    const result = await setDashboardStatus('LEAD-1', 'opgevolgd')

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_status: 'opgevolgd' })
    expect(mockEq).toHaveBeenCalledWith('lead_id', 'LEAD-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads')
    expect(result).toEqual({ ok: true })
  })

  it('accepteert null om status leeg te maken', async () => {
    await setDashboardStatus('LEAD-1', null)

    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_status: null })
  })

  it('returnt error als Supabase faalt', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'rls denied' } })

    const result = await setDashboardStatus('LEAD-1', 'open')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/rls denied/)
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('weigert onbekende status-waarde', async () => {
    const result = await setDashboardStatus(
      'LEAD-1',
      'gibberish' as unknown as DashboardStatus
    )

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/ongeldige status/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('archiveLead', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('zet dashboard_archived=true', async () => {
    const result = await archiveLead('LEAD-1')

    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_archived: true })
    expect(mockEq).toHaveBeenCalledWith('lead_id', 'LEAD-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads')
    expect(result.ok).toBe(true)
  })
})

describe('unarchiveLead', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('zet dashboard_archived=false', async () => {
    await unarchiveLead('LEAD-1')

    expect(mockUpdate).toHaveBeenCalledWith({ dashboard_archived: false })
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/lead-actions.test.ts
```

Verwacht: tests falen op missende module.

- [ ] **Step 3: Implementeer lead-actions.ts**

Bestand `lib/dashboard/lead-actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'
import type { DashboardStatus } from './database.types'

const VALID_STATUSES: ReadonlySet<DashboardStatus> = new Set([
  'open',
  'opgevolgd',
  'afgehandeld',
  'no_show',
  'geen_interesse',
  'archief',
])

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Wijzigt leads.dashboard_status. De BEFORE/AFTER UPDATE trigger
 * (migratie 025) logt automatisch naar lead_status_history.
 *
 * `null` is toegestaan om de status leeg te maken.
 */
export async function setDashboardStatus(
  leadId: string,
  status: DashboardStatus | null
): Promise<ActionResult> {
  if (status !== null && !VALID_STATUSES.has(status)) {
    return { ok: false, error: 'Ongeldige status-waarde' }
  }

  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_status: status })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Markeert een lead als gearchiveerd. getLeadsList filtert deze automatisch
 * weg, dus de lead verdwijnt uit de hoofdlijst.
 */
export async function archiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_archived: true })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

/**
 * Maakt een gearchiveerde lead weer zichtbaar in de hoofdlijst.
 */
export async function unarchiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('leads')
    .update({ dashboard_archived: false })
    .eq('lead_id', leadId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/lead-actions.test.ts
```

Verwacht: 6 tests groen.

- [ ] **Step 5: Type-check + alle tests**

```bash
npx tsc --noEmit && npm run test
```

Verwacht: clean, 47+6 = 53 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/lead-actions.ts lib/dashboard/lead-actions.test.ts
git commit -m "feat(dashboard): add lead-actions (setDashboardStatus, archiveLead, unarchiveLead)"
```

---

### Task 5: LeadStatusBadges → dashboard_status dropdown

**Files:**
- Modify: `components/dashboard/leads/LeadStatusBadges.tsx`
- Modify: `components/dashboard/leads/LeadStatusBadges.module.css`

We veranderen de bestaande Server Component naar een Client Component. Bot-status en gesprek_fase blijven read-only badges; dashboard_status wordt een `<select>` die de server-action aanroept.

- [ ] **Step 1: Vervang LeadStatusBadges.tsx**

Bestand `components/dashboard/leads/LeadStatusBadges.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import type { Lead, DashboardStatus } from '@/lib/dashboard/database.types'
import { dashboardStatusLabel, gesprekFaseLabel } from '@/lib/dashboard/format'
import { setDashboardStatus } from '@/lib/dashboard/lead-actions'
import styles from './LeadStatusBadges.module.css'

const STATUS_OPTIONS: ReadonlyArray<{ value: DashboardStatus | ''; label: string }> = [
  { value: '', label: 'Geen status' },
  { value: 'open', label: 'Open' },
  { value: 'opgevolgd', label: 'Opgevolgd' },
  { value: 'afgehandeld', label: 'Afgehandeld' },
  { value: 'no_show', label: 'No-show' },
  { value: 'geen_interesse', label: 'Geen interesse' },
  { value: 'archief', label: 'Archief' },
]

export function LeadStatusBadges({ lead }: { lead: Lead }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [optimisticStatus, setOptimisticStatus] = useState<DashboardStatus | null>(
    lead.dashboard_status
  )

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value === '' ? null : (e.target.value as DashboardStatus)
    setOptimisticStatus(next)
    setError(null)

    startTransition(async () => {
      const result = await setDashboardStatus(lead.lead_id, next)
      if (!result.ok) {
        setError(result.error)
        // Revert optimistic update
        setOptimisticStatus(lead.dashboard_status)
      }
    })
  }

  return (
    <div className={styles.badges}>
      <div className={styles.row}>
        <span className={styles.label}>Bot-status</span>
        <span className={styles.value}>{lead.status}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Gesprek-fase</span>
        <span className={styles.value}>{gesprekFaseLabel(lead.gesprek_fase)}</span>
      </div>
      <div className={styles.row}>
        <label htmlFor="dashboard-status" className={styles.label}>
          Dashboard-status
        </label>
        <select
          id="dashboard-status"
          className={styles.select}
          value={optimisticStatus ?? ''}
          onChange={onChange}
          disabled={pending}
          aria-label="Dashboard-status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {pending && <p className={styles.hint}>Bezig met opslaan…</p>}
      {error && <p className={styles.error}>{dashboardStatusLabel(optimisticStatus)} kon niet worden opgeslagen: {error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Vervang LeadStatusBadges.module.css**

```css
.badges {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.label {
  color: var(--color-text-muted);
}

.value {
  padding: 2px var(--space-2);
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-weight: 500;
  color: var(--color-text);
}

.select {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
}

.select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.error {
  margin: 0;
  padding: var(--space-2);
  background: rgba(255, 60, 60, 0.08);
  color: #c33;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/leads/LeadStatusBadges.tsx components/dashboard/leads/LeadStatusBadges.module.css
git commit -m "feat(dashboard): make dashboard_status editable via dropdown in LeadStatusBadges"
```

---

### Task 6: note-actions — addNote + deleteNote (TDD)

**Files:**
- Create: `lib/dashboard/note-actions.ts`
- Create: `lib/dashboard/note-actions.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/note-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockInsert,
  mockEq,
  mockDelete,
  mockFrom,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
  const mockEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockDelete = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ insert: mockInsert, delete: mockDelete }))
  const mockRevalidatePath = vi.fn()
  return { mockGetUser, mockInsert, mockEq, mockDelete, mockFrom, mockRevalidatePath }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { addNote, deleteNote } from './note-actions'

describe('addNote', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockInsert.mockReset()
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('insert nieuwe notitie met auteur=auth.uid en revalidate', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await addNote('LEAD-1', 'klant belt morgen')

    expect(mockFrom).toHaveBeenCalledWith('lead_notes')
    expect(mockInsert).toHaveBeenCalledWith({
      lead_id: 'LEAD-1',
      tekst: 'klant belt morgen',
      auteur: 'u1',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })

  it('weigert lege tekst', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await addNote('LEAD-1', '   ')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/leeg/i)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('weigert als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await addNote('LEAD-1', 'tekst')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/niet ingelogd/i)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returnt error bij Supabase-failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockInsert.mockResolvedValueOnce({ error: { message: 'rls denied' } })

    const result = await addNote('LEAD-1', 'tekst')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/rls denied/)
  })
})

describe('deleteNote', () => {
  beforeEach(() => {
    mockEq.mockReset()
    mockEq.mockResolvedValue({ error: null })
    mockDelete.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('delete + revalidate', async () => {
    const result = await deleteNote('NOTE-1', 'LEAD-1')

    expect(mockFrom).toHaveBeenCalledWith('lead_notes')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'NOTE-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/note-actions.test.ts
```

- [ ] **Step 3: Implementeer note-actions.ts**

Bestand `lib/dashboard/note-actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type NoteActionResult = { ok: true } | { ok: false; error: string }

/**
 * Voegt een notitie toe aan een lead. `auteur` wordt automatisch gezet
 * via auth.uid() — RLS-policy in 024 staat alleen INSERT toe als
 * auteur = auth.uid().
 */
export async function addNote(
  leadId: string,
  tekst: string
): Promise<NoteActionResult> {
  const trimmed = tekst.trim()
  if (!trimmed) {
    return { ok: false, error: 'Notitie mag niet leeg zijn.' }
  }

  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Niet ingelogd.' }
  }

  const { error } = await supabase.from('lead_notes').insert({
    lead_id: leadId,
    tekst: trimmed,
    auteur: user.id,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

/**
 * Verwijdert een notitie. RLS-policy laat alleen de auteur dit doen.
 * leadId is nodig voor revalidatePath; het is niet onderdeel van de query
 * (id is uniek).
 */
export async function deleteNote(
  noteId: string,
  leadId: string
): Promise<NoteActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase.from('lead_notes').delete().eq('id', noteId)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/note-actions.test.ts
```

Verwacht: 5 tests groen.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/note-actions.ts lib/dashboard/note-actions.test.ts
git commit -m "feat(dashboard): add note-actions (addNote + deleteNote)"
```

---

### Task 7: LeadNotes → add-note form (client component upgrade)

**Files:**
- Modify: `components/dashboard/leads/LeadNotes.tsx`
- Modify: `components/dashboard/leads/LeadNotes.module.css`

- [ ] **Step 1: Vervang LeadNotes.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import type { LeadNote } from '@/lib/dashboard/database.types'
import { formatRelative } from '@/lib/dashboard/format'
import { addNote, deleteNote } from '@/lib/dashboard/note-actions'
import styles from './LeadNotes.module.css'

export function LeadNotes({
  leadId,
  notes,
  currentUserId,
}: {
  leadId: string
  notes: LeadNote[]
  currentUserId: string
}) {
  const [tekst, setTekst] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = tekst.trim()
    if (!value) return
    setError(null)
    startTransition(async () => {
      const result = await addNote(leadId, value)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setTekst('')
    })
  }

  const onDelete = (noteId: string) => {
    if (!confirm('Notitie verwijderen?')) return
    startTransition(async () => {
      const result = await deleteNote(noteId, leadId)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Notities</h3>

      <form onSubmit={submit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          placeholder="Voeg een interne notitie toe…"
          rows={3}
          disabled={pending}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={styles.submit}
          disabled={pending || !tekst.trim()}
        >
          {pending ? 'Bezig…' : 'Notitie toevoegen'}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className={styles.empty}>Nog geen notities.</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((n) => (
            <li key={n.id} className={styles.note}>
              <p className={styles.tekst}>{n.tekst}</p>
              <div className={styles.metaRow}>
                <span className={styles.meta}>
                  {n.auteur ? 'Medewerker' : 'Onbekend'} · {formatRelative(n.aangemaakt_op)}
                </span>
                {n.auteur === currentUserId && (
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => onDelete(n.id)}
                    disabled={pending}
                    aria-label="Notitie verwijderen"
                  >
                    Verwijder
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vervang LeadNotes.module.css**

```css
.section {
  padding: var(--space-4);
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  font-weight: 600;
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.textarea {
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
  resize: vertical;
}

.textarea:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.textarea:disabled {
  opacity: 0.6;
}

.submit {
  align-self: flex-end;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-gradient);
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: 0;
  padding: var(--space-2);
  background: rgba(255, 60, 60, 0.08);
  color: #c33;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.note {
  padding: var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.tekst {
  margin: 0 0 var(--space-1);
  white-space: pre-wrap;
}

.metaRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.deleteBtn {
  background: none;
  border: none;
  color: #c33;
  font-size: var(--text-xs);
  cursor: pointer;
  padding: 0;
}

.deleteBtn:hover:not(:disabled) {
  text-decoration: underline;
}

.deleteBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: var(--text-sm);
}
```

- [ ] **Step 3: Update detail-page om leadId + currentUserId te passen**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`, vind:

```tsx
          <LeadNotes notes={detail.notes} />
```

Vervang met:

```tsx
          <LeadNotes
            leadId={detail.lead.lead_id}
            notes={detail.notes}
            currentUserId={user.id}
          />
```

We hebben `user` nodig — die komt nu nog niet uit de page. Voeg `requireApprovedUser` toe aan de top van `LeadDetailPage`. Vervang:

```tsx
export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  const { lead_id } = await params
  const detail = await getLeadDetail(lead_id)

  if (!detail) {
    notFound()
  }
```

door:

```tsx
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  const { user } = await requireApprovedUser()
  const { lead_id } = await params
  const detail = await getLeadDetail(lead_id)

  if (!detail) {
    notFound()
  }
```

(De layout doet al `requireApprovedUser`, maar we hebben `user.id` ook in deze page nodig. De extra call is goedkoop want `getCurrentUser` cachet via Supabase's interne session-check.)

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/leads/LeadNotes.tsx components/dashboard/leads/LeadNotes.module.css "app/dashboard/(app)/leads/[lead_id]/page.tsx"
git commit -m "feat(dashboard): make LeadNotes interactive (add + delete-own)"
```

---

### Task 8: tag-queries — getAllTags + getTagsForLead

**Files:**
- Create: `lib/dashboard/tag-queries.ts`

- [ ] **Step 1: Schrijf de queries**

Bestand `lib/dashboard/tag-queries.ts`:

```typescript
import { getDashboardSupabase } from './supabase-server'
import type { Tag } from './database.types'

/**
 * Haalt alle bestaande tags op (voor de dropdown in LeadTagsEditor).
 * Geen tenant-filter want v1 = single-tenant.
 */
export async function getAllTags(): Promise<Tag[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('naam', { ascending: true })

  if (error) {
    console.error('[getAllTags] query failed:', error)
    return []
  }
  return (data as unknown as Tag[] | null) ?? []
}

/**
 * Haalt de tags die aan een specifieke lead gekoppeld zijn. Joint via
 * lead_tags; returnt de Tag-rijen met een tag_id-filter dat klopt.
 */
export async function getTagsForLead(leadId: string): Promise<Tag[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('lead_tags')
    .select('tag_id, tags!inner(*)')
    .eq('lead_id', leadId)

  if (error) {
    console.error('[getTagsForLead] query failed:', error)
    return []
  }

  // Supabase joins return: { tag_id, tags: { id, naam, kleur, ... } }[]
  type LeadTagJoin = { tag_id: string; tags: Tag }
  return ((data as unknown as LeadTagJoin[] | null) ?? []).map((row) => row.tags)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard/tag-queries.ts
git commit -m "feat(dashboard): add tag-queries (getAllTags, getTagsForLead)"
```

---

### Task 9: tag-actions — createTag + addTagToLead + removeTagFromLead (TDD)

**Files:**
- Create: `lib/dashboard/tag-actions.ts`
- Create: `lib/dashboard/tag-actions.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/tag-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetUser,
  mockInsert,
  mockSelect,
  mockSingle,
  mockDelete,
  mockEq,
  mockMatch,
  mockFrom,
  mockRevalidatePath,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockEq = vi.fn(() => Promise.resolve({ error: null }))
  const mockMatch = vi.fn(() => Promise.resolve({ error: null }))
  const mockDelete = vi.fn(() => ({ match: mockMatch }))
  const mockGetUser = vi.fn()
  const mockFrom = vi.fn((table: string) => {
    if (table === 'tags') return { insert: mockInsert }
    if (table === 'lead_tags') return { insert: mockInsert, delete: mockDelete }
    throw new Error(`unexpected table: ${table}`)
  })
  const mockRevalidatePath = vi.fn()
  return {
    mockGetUser,
    mockInsert,
    mockSelect,
    mockSingle,
    mockDelete,
    mockEq,
    mockMatch,
    mockFrom,
    mockRevalidatePath,
  }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))

import { createTag, addTagToLead, removeTagFromLead } from './tag-actions'

describe('createTag', () => {
  beforeEach(() => {
    mockSingle.mockReset()
    mockInsert.mockClear()
    mockSelect.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('insert nieuwe tag en revalidate /leads', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'TAG-1', naam: 'hot lead', kleur: null },
      error: null,
    })

    const result = await createTag('hot lead')

    expect(mockFrom).toHaveBeenCalledWith('tags')
    expect(mockInsert).toHaveBeenCalledWith({ naam: 'hot lead' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.tagId).toBe('TAG-1')
    }
  })

  it('weigert lege naam', async () => {
    const result = await createTag('   ')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/leeg/i)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returnt error bij Supabase-failure (bv. unique-naam botsing)', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value' },
    })

    const result = await createTag('bestaat-al')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/duplicate/)
  })
})

describe('addTagToLead', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockInsert.mockReset()
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: {}, error: null })
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('insert lead_tags-rij met aangemaakt_door=auth.uid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await addTagToLead('LEAD-1', 'TAG-1')

    expect(mockFrom).toHaveBeenCalledWith('lead_tags')
    expect(mockInsert).toHaveBeenCalledWith({
      lead_id: 'LEAD-1',
      tag_id: 'TAG-1',
      aangemaakt_door: 'u1',
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })

  it('weigert als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await addTagToLead('LEAD-1', 'TAG-1')

    expect(result.ok).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

describe('removeTagFromLead', () => {
  beforeEach(() => {
    mockMatch.mockReset()
    mockMatch.mockResolvedValue({ error: null })
    mockDelete.mockClear()
    mockFrom.mockClear()
    mockRevalidatePath.mockReset()
  })

  it('delete lead_tags-rij + revalidate', async () => {
    const result = await removeTagFromLead('LEAD-1', 'TAG-1')

    expect(mockFrom).toHaveBeenCalledWith('lead_tags')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockMatch).toHaveBeenCalledWith({ lead_id: 'LEAD-1', tag_id: 'TAG-1' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/leads/LEAD-1')
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/tag-actions.test.ts
```

- [ ] **Step 3: Implementeer tag-actions.ts**

Bestand `lib/dashboard/tag-actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { getDashboardSupabase } from './supabase-server'

export type CreateTagResult =
  | { ok: true; tagId: string }
  | { ok: false; error: string }

export type TagActionResult = { ok: true } | { ok: false; error: string }

/**
 * Maakt een nieuwe tag aan. `naam` moet uniek zijn (DB-constraint).
 * Returnt het nieuwe tag.id zodat caller direct kan koppelen aan een lead.
 */
export async function createTag(naam: string): Promise<CreateTagResult> {
  const trimmed = naam.trim()
  if (!trimmed) {
    return { ok: false, error: 'Tag-naam mag niet leeg zijn.' }
  }

  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('tags')
    .insert({ naam: trimmed })
    .select()
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Tag aanmaken mislukt.' }
  }

  revalidatePath('/leads')
  return { ok: true, tagId: (data as unknown as { id: string }).id }
}

/**
 * Koppelt een bestaande tag aan een lead via lead_tags.
 * RLS-policy in 024 vereist aangemaakt_door = auth.uid().
 */
export async function addTagToLead(
  leadId: string,
  tagId: string
): Promise<TagActionResult> {
  const supabase = await getDashboardSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Niet ingelogd.' }
  }

  const { error } = await supabase
    .from('lead_tags')
    .insert({
      lead_id: leadId,
      tag_id: tagId,
      aangemaakt_door: user.id,
    })
    .select()
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

/**
 * Verwijdert een tag van een lead. Tag zelf blijft in tags-tabel.
 */
export async function removeTagFromLead(
  leadId: string,
  tagId: string
): Promise<TagActionResult> {
  const supabase = await getDashboardSupabase()
  const { error } = await supabase
    .from('lead_tags')
    .delete()
    .match({ lead_id: leadId, tag_id: tagId })

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/tag-actions.test.ts
```

Verwacht: 6 tests groen.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/tag-actions.ts lib/dashboard/tag-actions.test.ts
git commit -m "feat(dashboard): add tag-actions (createTag, addTagToLead, removeTagFromLead)"
```

---

### Task 10: LeadTagsEditor component + integratie in detail-page

**Files:**
- Create: `components/dashboard/leads/LeadTagsEditor.tsx` + `.module.css`
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx`

- [ ] **Step 1: LeadTagsEditor.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import type { Tag } from '@/lib/dashboard/database.types'
import { createTag, addTagToLead, removeTagFromLead } from '@/lib/dashboard/tag-actions'
import styles from './LeadTagsEditor.module.css'

export function LeadTagsEditor({
  leadId,
  leadTags,
  allTags,
}: {
  leadId: string
  leadTags: Tag[]
  allTags: Tag[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const leadTagIds = new Set(leadTags.map((t) => t.id))
  const availableTags = allTags.filter((t) => !leadTagIds.has(t.id))

  const handleRemove = (tagId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await removeTagFromLead(leadId, tagId)
      if (!result.ok) setError(result.error)
    })
  }

  const handleAdd = (tagId: string) => {
    setError(null)
    setOpen(false)
    startTransition(async () => {
      const result = await addTagToLead(leadId, tagId)
      if (!result.ok) setError(result.error)
    })
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const naam = newTagName.trim()
    if (!naam) return
    setError(null)
    startTransition(async () => {
      const created = await createTag(naam)
      if (!created.ok) {
        setError(created.error)
        return
      }
      const linked = await addTagToLead(leadId, created.tagId)
      if (!linked.ok) {
        setError(linked.error)
        return
      }
      setNewTagName('')
      setOpen(false)
    })
  }

  return (
    <div className={styles.section}>
      <div className={styles.chips}>
        {leadTags.map((tag) => (
          <span key={tag.id} className={styles.chip}>
            {tag.naam}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => handleRemove(tag.id)}
              disabled={pending}
              aria-label={`Tag ${tag.naam} verwijderen`}
            >
              ×
            </button>
          </span>
        ))}

        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
        >
          + Tag
        </button>
      </div>

      {open && (
        <div className={styles.dropdown}>
          {availableTags.length > 0 && (
            <ul className={styles.options}>
              {availableTags.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    className={styles.optionBtn}
                    onClick={() => handleAdd(tag.id)}
                  >
                    {tag.naam}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleCreate} className={styles.createForm}>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Nieuwe tag…"
              className={styles.createInput}
              disabled={pending}
            />
            <button
              type="submit"
              className={styles.createBtn}
              disabled={pending || !newTagName.trim()}
            >
              Aanmaken
            </button>
          </form>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: LeadTagsEditor.module.css**

```css
.section {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  position: relative;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text);
}

.chipRemove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  color: var(--color-text);
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.chipRemove:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.2);
}

.chipRemove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.addBtn {
  padding: var(--space-1) var(--space-2);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  cursor: pointer;
}

.addBtn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.addBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dropdown {
  margin-top: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.options {
  list-style: none;
  margin: 0 0 var(--space-2);
  padding: 0;
  max-height: 160px;
  overflow-y: auto;
}

.optionBtn {
  width: 100%;
  text-align: left;
  padding: var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
}

.optionBtn:hover {
  background: var(--color-surface);
}

.createForm {
  display: flex;
  gap: var(--space-2);
}

.createInput {
  flex: 1;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.createInput:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.createBtn {
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
}

.createBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: var(--space-2) 0 0;
  padding: var(--space-2);
  background: rgba(255, 60, 60, 0.08);
  color: #c33;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}
```

- [ ] **Step 3: Integreer in detail-page**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`, voeg imports toe:

```tsx
import { LeadTagsEditor } from '@/components/dashboard/leads/LeadTagsEditor'
import { getAllTags, getTagsForLead } from '@/lib/dashboard/tag-queries'
```

In de `LeadDetailPage`-functie, **na** de `getLeadDetail`-call en **voor** de `if (!detail) notFound()`-check, parallelize de tag-fetches. Vervang dit blok:

```tsx
  const { user } = await requireApprovedUser()
  const { lead_id } = await params
  const detail = await getLeadDetail(lead_id)

  if (!detail) {
    notFound()
  }
```

door:

```tsx
  const { user } = await requireApprovedUser()
  const { lead_id } = await params
  const [detail, allTags, leadTags] = await Promise.all([
    getLeadDetail(lead_id),
    getAllTags(),
    getTagsForLead(lead_id),
  ])

  if (!detail) {
    notFound()
  }
```

In de left-column JSX, voeg `<LeadTagsEditor />` toe ná `<LeadStatusBadges />`:

```tsx
        <aside className={styles.colLeft}>
          <LeadHeader lead={detail.lead} />
          <LeadStatusBadges lead={detail.lead} />
          <LeadTagsEditor
            leadId={detail.lead.lead_id}
            leadTags={leadTags}
            allTags={allTags}
          />
        </aside>
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/leads/LeadTagsEditor.tsx components/dashboard/leads/LeadTagsEditor.module.css "app/dashboard/(app)/leads/[lead_id]/page.tsx"
git commit -m "feat(dashboard): add LeadTagsEditor (chips + dropdown + create-new)"
```

---

### Task 11: LeadDangerZone — archiveer-toggle

**Files:**
- Create: `components/dashboard/leads/LeadDangerZone.tsx` + `.module.css`
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx`

- [ ] **Step 1: LeadDangerZone.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { archiveLead, unarchiveLead } from '@/lib/dashboard/lead-actions'
import styles from './LeadDangerZone.module.css'

export function LeadDangerZone({
  leadId,
  archived,
}: {
  leadId: string
  archived: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onToggle = () => {
    if (
      !confirm(
        archived
          ? 'Lead terugzetten naar de hoofdlijst?'
          : 'Lead archiveren? Hij verdwijnt uit de hoofdlijst (data blijft bewaard).'
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = archived
        ? await unarchiveLead(leadId)
        : await archiveLead(leadId)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Acties</h3>
      <button
        type="button"
        className={styles.button}
        onClick={onToggle}
        disabled={pending}
      >
        {pending ? 'Bezig…' : archived ? 'Uit archief halen' : 'Archiveren'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: LeadDangerZone.module.css**

```css
.section {
  padding: var(--space-4);
  border-top: 1px dashed var(--color-border);
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  font-weight: 600;
}

.button {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-sm);
  cursor: pointer;
}

.button:hover:not(:disabled) {
  border-color: #c33;
  color: #c33;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: var(--space-2) 0 0;
  padding: var(--space-2);
  background: rgba(255, 60, 60, 0.08);
  color: #c33;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}
```

- [ ] **Step 3: Integreer in detail-page rechter kolom**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`, voeg import toe:

```tsx
import { LeadDangerZone } from '@/components/dashboard/leads/LeadDangerZone'
```

In de right-column JSX, voeg na `<LeadNotes />` toe:

```tsx
          <LeadDangerZone leadId={detail.lead.lead_id} archived={detail.lead.dashboard_archived} />
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/leads/LeadDangerZone.tsx components/dashboard/leads/LeadDangerZone.module.css "app/dashboard/(app)/leads/[lead_id]/page.tsx"
git commit -m "feat(dashboard): add LeadDangerZone (archive toggle)"
```

---

### Task 12: CSV-export route + ExportLeadsButton

**Files:**
- Create: `app/api/dashboard/export/leads-csv/route.ts`
- Create: `components/dashboard/leads/ExportLeadsButton.tsx` + `.module.css`
- Modify: `app/dashboard/(app)/leads/page.tsx`

- [ ] **Step 1: Route handler**

Bestand `app/api/dashboard/export/leads-csv/route.ts`:

```typescript
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getLeadsList } from '@/lib/dashboard/lead-queries'
import {
  formatEuro,
  formatDateTimeNL,
  dashboardStatusLabel,
  gesprekFaseLabel,
} from '@/lib/dashboard/format'

const CSV_HEADERS = [
  'lead_id',
  'naam',
  'telefoon',
  'hoofdcategorie',
  'm2',
  'totaal_prijs',
  'bot_status',
  'gesprek_fase',
  'dashboard_status',
  'aangemaakt',
  'bijgewerkt',
] as const

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET() {
  // Auth check — alleen approved users mogen exporteren.
  await requireApprovedUser()

  const leads = await getLeadsList()

  const rows: string[] = [CSV_HEADERS.join(',')]
  for (const lead of leads) {
    rows.push(
      [
        csvEscape(lead.lead_id),
        csvEscape(lead.naam),
        csvEscape(lead.telefoon),
        csvEscape(lead.hoofdcategorie),
        csvEscape(lead.m2),
        csvEscape(lead.totaal_prijs !== null ? formatEuro(lead.totaal_prijs) : ''),
        csvEscape(lead.status),
        csvEscape(gesprekFaseLabel(lead.gesprek_fase)),
        csvEscape(dashboardStatusLabel(lead.dashboard_status)),
        csvEscape(formatDateTimeNL(lead.aangemaakt)),
        csvEscape(formatDateTimeNL(lead.bijgewerkt)),
      ].join(',')
    )
  }

  const csv = rows.join('\n')
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 2: ExportLeadsButton.tsx**

```tsx
import { Download } from 'lucide-react'
import styles from './ExportLeadsButton.module.css'

export function ExportLeadsButton() {
  return (
    <a
      href="/api/dashboard/export/leads-csv"
      className={styles.button}
      download
    >
      <Download size={14} />
      Exporteer CSV
    </a>
  )
}
```

- [ ] **Step 3: ExportLeadsButton.module.css**

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--text-sm);
  text-decoration: none;
  cursor: pointer;
}

.button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
```

- [ ] **Step 4: Maak page.module.css voor de /leads page header**

Bestand `app/dashboard/(app)/leads/page.module.css`:

```css
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  gap: var(--space-4);
}
```

- [ ] **Step 5: Voeg knop toe aan /leads page**

Vervang de volledige inhoud van `app/dashboard/(app)/leads/page.tsx` door:

```tsx
import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'
import { ExportLeadsButton } from '@/components/dashboard/leads/ExportLeadsButton'
import styles from './page.module.css'

export default async function LeadsPage() {
  const leads = await getLeadsList()

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Leads</h1>
          <p>{leads.length} {leads.length === 1 ? 'lead' : 'leads'} — niet gearchiveerd, nieuwste eerst.</p>
        </div>
        <ExportLeadsButton />
      </div>
      <LeadsTable leads={leads} />
    </div>
  )
}
```

- [ ] **Step 6: Type-check + commit**

```bash
npx tsc --noEmit
git add "app/api/dashboard/export/leads-csv/route.ts" components/dashboard/leads/ExportLeadsButton.tsx components/dashboard/leads/ExportLeadsButton.module.css "app/dashboard/(app)/leads/page.tsx" "app/dashboard/(app)/leads/page.module.css"
git commit -m "feat(dashboard): add CSV export for leads list"
```

---

### Task 13: Build-verificatie + smoke test

Manuele verificatie dat alles werkt + de build slaagt.

- [ ] **Step 1: `npm run build`**

```bash
cd "/Users/christiaantromp/Desktop/Frontlix website new"
npm run build
```

Verwacht: schone build, alle routes listed inclusief `/api/dashboard/export/leads-csv`.

- [ ] **Step 2: `npm run test`**

Verwacht: ~60 tests groen (47 baseline + ~13 nieuwe).

- [ ] **Step 3: Start dev-server (als nog niet draait)**

```bash
npm run dev
```

- [ ] **Step 4: Login en test elke feature**

In browser op `http://app.localhost:3000`:

1. **Status wijzigen**: open een lead → links onder, dropdown "Dashboard-status" → kies "Open" → "Bezig met opslaan…" verschijnt → status badge updates. In Supabase Studio: `lead_status_history` heeft een nieuwe rij.
2. **Tag toekennen**: links onder de status → "+ Tag" knop → dropdown opent → kies bestaande of typ nieuwe naam + "Aanmaken" → chip verschijnt naast de bestaande tags.
3. **Tag verwijderen**: klik op de × in een chip → chip verdwijnt.
4. **Notitie toevoegen**: rechts in Notities-blok → typ tekst → "Notitie toevoegen" → notitie verschijnt in de lijst.
5. **Notitie verwijderen**: klik "Verwijder" naast je eigen notitie → bevestig → notitie verdwijnt.
6. **Archiveren**: rechts onder in "Acties" → "Archiveren" → bevestig → terug naar `/leads` → de lead is uit de lijst verdwenen. Open `/leads/<lead_id>` direct → "Uit archief halen"-knop verschijnt → klik → terug naar lijst.
7. **CSV-export**: op `/leads` → "Exporteer CSV" knop → bestand downloadt, naam `leads-YYYY-MM-DD.csv`. Open in Excel/Numbers → koppen kloppen, data kloppen.

- [ ] **Step 5: Smoke-check de bot**

`pm2 logs` of waar je bot-logs leest — geen nieuwe errors. Bot-writes naar leads triggeren geen status-history (want dashboard_status verandert niet).

---

## Summary checklist

Aan het einde van Plan 5:

- [ ] SQL-migratie 025 gerund + trigger geverifieerd
- [ ] `lib/dashboard/lead-actions.ts` + tests groen
- [ ] `lib/dashboard/note-actions.ts` + tests groen
- [ ] `lib/dashboard/tag-actions.ts` + tests groen
- [ ] `lib/dashboard/tag-queries.ts` werkend
- [ ] LeadStatusBadges editable
- [ ] LeadNotes editable (add + delete-own)
- [ ] LeadTagsEditor functioneel
- [ ] LeadDangerZone (archive/unarchive) functioneel
- [ ] CSV-export werkt
- [ ] Plan 4 cleanup toegepast (.limit(100), !important fix, unused class verwijderd)
- [ ] `npm run build` slaagt
- [ ] End-to-end smoke test groen

Plan 6 (zware acties via bot-API: offerte goedkeuren/aanpassen, afspraak boeken/verzetten) is **uitgesteld** zolang de schoon-straatje testfase loopt — die endpoints raken de bot wel.

Plan 7 (instellingen-suite — bedrijfsinfo/diensten/prijzen/medewerkers/account/AVG) kan beginnen zodra de bot-config-migratie naar DB is doorgevoerd (zie `postponed.md`).
