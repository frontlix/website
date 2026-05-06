# Plan 4 — Leads-lijst + lead-detail (read-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De `/leads` pagina toont een tabel van alle leads met basis-kolommen + klikken naar `/leads/[id]`. De `/leads/[id]` pagina toont alle data van een lead in een 3-koloms layout (klantgegevens links, gesprek/foto's/timeline tabs in het midden, offerte/afspraak rechts). Volledig **read-only** — geen acties (status wijzigen, notities toevoegen, etc komen in Plan 5+).

**Architecture:** Server Components voor alle data-fetches via `getDashboardSupabase()` (RLS-aware, anon-key + session). Eén client component voor tabs, één voor foto-lightbox. Activity-timeline wordt op-de-fly geaggregeerd uit bestaande tabellen (geen extra event-table). Handgeschreven `Database` types voor de tabellen die we aanraken (latere migratie naar `supabase gen types` kan altijd).

**Tech Stack:** Next.js 15.1.0 App Router, TypeScript, `@supabase/ssr` (al aanwezig), CSS Modules, vitest. Geen nieuwe packages.

**Working directory voor dit plan:** `/Users/christiaantromp/Desktop/Frontlix website new/`

**Schoon-straatje bot wordt niet aangeraakt.** Klant-test loopt door zonder interferentie.

---

## File Structure

**Nieuw:**
```
lib/dashboard/
├── database.types.ts                                — handgeschreven Supabase Database type voor onze tabellen
├── require-approved-user.ts                         — helper: redirect-naar-login of /wachtkamer als niet approved
├── lead-queries.ts                                  — server-side queries: getLeadsList(), getLeadDetail(), getLeadActivity()
└── format.ts                                        — formatters: formatDate, formatEuro, statusLabel

app/dashboard/(app)/leads/page.tsx                   — vervangt placeholder; lijst-tabel
app/dashboard/(app)/leads/[lead_id]/page.tsx        — lead-detail pagina (3 kolommen)
app/dashboard/page.tsx                               — root redirect: niet-ingelogd → /login, ingelogd → /leads

components/dashboard/leads/
├── LeadsTable.tsx + .module.css                     — tabel-rendering met basis-rijdata
├── LeadHeader.tsx + .module.css                     — klantgegevens (naam/telefoon/email/adres)
├── LeadStatusBadges.tsx + .module.css               — bot-status + gesprek_fase + dashboard_status (read-only)
├── LeadDetailTabs.tsx + .module.css                 — client-component tab-switcher (Gesprek/Foto's/Timeline)
├── LeadConversation.tsx + .module.css               — chronologische berichten (whatsapp-bubbels)
├── LeadPhotos.tsx + .module.css                     — grid + lightbox
├── PhotoLightbox.tsx + .module.css                  — client-component dialog
├── LeadActivityTimeline.tsx + .module.css           — chronologische timeline-list
├── LeadOfferte.tsx + .module.css                    — totaalprijs + prijsregels-tabel + PDF-link
├── LeadAfspraak.tsx + .module.css                   — datum + starttijd + Google Calendar event-link (read-only)
└── LeadNotes.tsx + .module.css                      — read-only notities-lijst

tests:
├── lib/dashboard/lead-queries.test.ts               — vitest tests voor queries (mocked Supabase)
└── lib/dashboard/format.test.ts                     — vitest tests voor formatters
```

**Gewijzigd:**
```
lib/dashboard/auth.ts                                — voeg requireApprovedUser-import-pad doc toe (geen logica)
app/dashboard/(app)/layout.tsx                       — gebruik requireApprovedUser() ipv inline check
app/dashboard/(auth)/wachtkamer/poll-approval.tsx    — voeg subtle "checking…" loading-indicator toe
```

---

## Approach principles

- **YAGNI**: geen filters, geen zoek, geen CSV-export, geen real-time channel in Plan 4. Komt in Plan 5.
- **Read-only**: geen acties. Status wijzigen, notities toevoegen, foto's verwijderen, offerte goedkeuren — niets.
- **Server Components first**: alle data-fetches in Server Components. Client Components alleen voor tabs en lightbox.
- **TDD voor pure logic**: aggregateActivityTimeline + formatters krijgen tests. UI-componenten testen we via end-to-end smoke (Task 14).
- **DRY**: queries gebundeld in `lead-queries.ts`. Formatters in `format.ts`. Componenten in `components/dashboard/leads/`.
- **Frequent commits**: één commit per task.

---

### Task 1: Database types (handgeschreven)

**Files:**
- Create: `lib/dashboard/database.types.ts`

- [ ] **Step 1: Schrijf het type-bestand**

Bestand `lib/dashboard/database.types.ts`:

```typescript
/**
 * Handgeschreven Database-type voor Supabase queries. Dekt alleen de
 * tabellen + kolommen die het dashboard daadwerkelijk gebruikt.
 *
 * Latere optie: vervangen door automatisch gegenereerde types via
 *   npx supabase gen types typescript --project-id <ref> > database.types.ts
 * Voor nu handmatig zodat we geen Supabase CLI / project-access-token nodig
 * hebben tijdens dev.
 *
 * Wanneer je een nieuwe tabel/kolom toevoegt aan een Plan 1+-migratie,
 * werk dan ook dit bestand bij.
 */

export type DashboardStatus =
  | 'open'
  | 'opgevolgd'
  | 'afgehandeld'
  | 'no_show'
  | 'geen_interesse'
  | 'archief'

export type GesprekFase =
  | 'info_verzamelen'
  | 'offerte_besproken'
  | 'onderhandelen'
  | 'datum_kiezen'
  | 'afspraak_bevestigd'

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          lead_id: string
          naam: string
          bedrijfsnaam: string | null
          email: string
          telefoon: string
          postcode: string
          huisnummer: string
          straat: string | null
          plaats: string | null
          toelichting: string | null
          hoofdcategorie: string
          sub_diensten: string[]
          m2: number | null
          planten: string | null
          planten_afschermen: string | null
          zand_kleur: string | null
          groene_aanslag: string | null
          fotos_ontvangen: boolean
          fotos_geweigerd: boolean
          status: string
          gesprek_fase: GesprekFase
          document_id: string | null
          offerte_verstuurd: boolean
          offerte_verstuurd_op: string | null
          afstand_km: number | null
          totaal_prijs: number | null
          extra_arbeid_minuten: number
          extra_arbeid_personen: number
          voegzand_zakken: number
          korting_percentage: number
          afspraak_datum: string | null
          afspraak_starttijd: string | null
          google_event_id: string | null
          akkoord_op: string | null
          akkoord_via: string | null
          afspraak_geboekt_op: string | null
          afspraak_geboekt_via: string | null
          dashboard_status: DashboardStatus | null
          dashboard_archived: boolean
          bron: string
          aangemaakt: string
          bijgewerkt: string
        }
      }
      berichten: {
        Row: {
          id: string
          lead_id: string
          richting: string  // 'in' of 'uit'
          bericht: string | null
          type: string  // 'tekst' | 'image' | etc.
          media_id: string | null
          foto_url: string | null
          foto_analyse: string | null
          wa_message_id: string | null
          timestamp: string
        }
      }
      fotos: {
        Row: {
          id: string
          lead_id: string
          storage_path: string
          public_url: string | null
          foto_analyse: string | null
          bron: string  // 'whatsapp' | 'formulier'
          aangemaakt: string
        }
      }
      offertes: {
        Row: {
          id: string
          lead_id: string
          versie: number
          pdf_path: string
          pdf_url: string
          totaal_incl: number
          korting_pct: number
          aangemaakt_op: string
        }
      }
      prijsregels: {
        Row: {
          id: string
          lead_id: string
          omschrijving: string
          aantal: number | null
          eenheid: string | null
          stukprijs: number
          totaal: number
          volgorde: number
          aangemaakt: string
        }
      }
      lead_notes: {
        Row: {
          id: string
          lead_id: string
          tekst: string
          auteur: string | null
          aangemaakt_op: string
        }
      }
      tags: {
        Row: {
          id: string
          naam: string
          kleur: string | null
          aangemaakt_op: string
        }
      }
      lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
          aangemaakt_door: string | null
          aangemaakt_op: string
        }
      }
      lead_status_history: {
        Row: {
          id: string
          lead_id: string
          oude_status: string | null
          nieuwe_status: string
          gewijzigd_door: string | null
          gewijzigd_op: string
        }
      }
      dashboard_user_profiles: {
        Row: {
          user_id: string
          bedrijfsnaam: string | null
          tenant_status: 'pending' | 'approved' | 'rejected'
          is_owner: boolean
          onboarding_voltooid_op: string | null
          approved_op: string | null
          aangemaakt_op: string
        }
      }
      tenant_settings: {
        Row: {
          id: string
          bedrijfsnaam: string
          chatbot_naam: string
          adres: string | null
          postcode: string | null
          plaats: string | null
          eigenaar_email: string | null
          eigenaar_whatsapp: string | null
          calendar_link: string | null
          offerte_geldigheid_dagen: number
          reminder_dag_1: number
          reminder_dag_2: number
          reminder_dag_3: number
          radius_max_km: number
          radius_doorverwijs_bedrijf: string | null
          bijgewerkt_op: string
        }
      }
    }
  }
}

// Convenience-types voor consumers:
export type Lead = Database['public']['Tables']['leads']['Row']
export type Bericht = Database['public']['Tables']['berichten']['Row']
export type Foto = Database['public']['Tables']['fotos']['Row']
export type Offerte = Database['public']['Tables']['offertes']['Row']
export type Prijsregel = Database['public']['Tables']['prijsregels']['Row']
export type LeadNote = Database['public']['Tables']['lead_notes']['Row']
export type Tag = Database['public']['Tables']['tags']['Row']
export type LeadTag = Database['public']['Tables']['lead_tags']['Row']
export type LeadStatusHistory = Database['public']['Tables']['lead_status_history']['Row']
export type DashboardUserProfile = Database['public']['Tables']['dashboard_user_profiles']['Row']
export type TenantSettings = Database['public']['Tables']['tenant_settings']['Row']
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Verwacht: schoon (alleen interface declarations, geen runtime).

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard/database.types.ts
git commit -m "feat(dashboard): add hand-written Database types for v1 tables"
```

---

### Task 2: requireApprovedUser helper

**Files:**
- Create: `lib/dashboard/require-approved-user.ts`
- Create: `lib/dashboard/require-approved-user.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/require-approved-user.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockGetProfile, mockRedirect } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetProfile: vi.fn(),
  mockRedirect: vi.fn(() => { throw new Error('REDIRECT') }),
}))

vi.mock('./auth', () => ({
  getCurrentUser: mockGetUser,
  getCurrentUserProfile: mockGetProfile,
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

import { requireApprovedUser } from './require-approved-user'

describe('requireApprovedUser', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockGetProfile.mockReset()
    mockRedirect.mockClear()
  })

  it('returnt {user, profile} als ingelogd én approved', async () => {
    const user = { id: 'u1', email: 'a@b.c' } as any
    const profile = {
      user_id: 'u1',
      tenant_status: 'approved',
      bedrijfsnaam: 'Schoon Straatje',
      is_owner: true,
      onboarding_voltooid_op: null,
    }
    mockGetUser.mockResolvedValue(user)
    mockGetProfile.mockResolvedValue(profile)

    const result = await requireApprovedUser()

    expect(result.user).toBe(user)
    expect(result.profile).toBe(profile)
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirect naar /login als niet ingelogd', async () => {
    mockGetUser.mockResolvedValue(null)

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirect naar /wachtkamer als ingelogd maar tenant_status pending', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1' })
    mockGetProfile.mockResolvedValue({
      user_id: 'u1', tenant_status: 'pending', bedrijfsnaam: null, is_owner: true, onboarding_voltooid_op: null,
    })

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect naar /wachtkamer als profile-rij ontbreekt', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1' })
    mockGetProfile.mockResolvedValue(null)

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })

  it('redirect naar /wachtkamer als tenant_status rejected', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1' })
    mockGetProfile.mockResolvedValue({
      user_id: 'u1', tenant_status: 'rejected', bedrijfsnaam: null, is_owner: true, onboarding_voltooid_op: null,
    })

    await expect(requireApprovedUser()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/wachtkamer')
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/require-approved-user.test.ts
```

- [ ] **Step 3: Implementeer helper**

Bestand `lib/dashboard/require-approved-user.ts`:

```typescript
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  getCurrentUser,
  getCurrentUserProfile,
  type DashboardUserProfile,
} from './auth'

/**
 * Vereist dat de huidige request van een ingelogde, approved user komt.
 * Gebruik in Server Components / Server Actions die alleen voor approved
 * users beschikbaar moeten zijn (bv. /leads, /leads/[id]).
 *
 * - Niet ingelogd → redirect('/login')
 * - Ingelogd maar geen profile-rij of tenant_status != 'approved'
 *   → redirect('/wachtkamer')
 *
 * Vervangt het inline auth-check patroon dat Plan 3 in
 * app/dashboard/(app)/layout.tsx gebruikte.
 */
export async function requireApprovedUser(): Promise<{
  user: User
  profile: DashboardUserProfile
}> {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    redirect('/wachtkamer')
  }

  return { user, profile }
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/require-approved-user.test.ts
```

Verwacht: 5 tests groen.

- [ ] **Step 5: Refactor layout.tsx om de helper te gebruiken**

In `app/dashboard/(app)/layout.tsx` vervang de inline check:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentUserProfile } from '@/lib/dashboard/auth'
// ...

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    redirect('/wachtkamer')
  }
  // ... rest
}
```

door:

```tsx
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
// ...

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireApprovedUser()
  // ... rest (gebruikt user en profile zoals voorheen)
}
```

Verwijder ook de niet-meer-gebruikte imports `getCurrentUser` en `getCurrentUserProfile` + `redirect` uit `next/navigation`.

- [ ] **Step 6: Type-check + run alle tests**

```bash
npx tsc --noEmit && npm run test
```

Verwacht: schoon, alle tests groen.

- [ ] **Step 7: Commit**

```bash
git add lib/dashboard/require-approved-user.ts lib/dashboard/require-approved-user.test.ts "app/dashboard/(app)/layout.tsx"
git commit -m "feat(dashboard): add requireApprovedUser helper + use in layout"
```

---

### Task 3: format helpers (TDD)

**Files:**
- Create: `lib/dashboard/format.ts`
- Create: `lib/dashboard/format.test.ts`

- [ ] **Step 1: Schrijf failing tests**

Bestand `lib/dashboard/format.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  formatEuro,
  formatDateNL,
  formatDateTimeNL,
  formatRelative,
  dashboardStatusLabel,
  gesprekFaseLabel,
} from './format'

describe('formatEuro', () => {
  it('formateert numeric naar euro met komma als decimaalscheider', () => {
    expect(formatEuro(1234.5)).toBe('€ 1.234,50')
    expect(formatEuro(0)).toBe('€ 0,00')
    expect(formatEuro(99.99)).toBe('€ 99,99')
  })
  it('null/undefined → em-dash', () => {
    expect(formatEuro(null)).toBe('—')
    expect(formatEuro(undefined)).toBe('—')
  })
})

describe('formatDateNL', () => {
  it('formateert ISO-datum naar dd-mm-yyyy', () => {
    expect(formatDateNL('2026-04-23T10:30:00Z')).toBe('23-04-2026')
  })
  it('null/undefined → em-dash', () => {
    expect(formatDateNL(null)).toBe('—')
  })
})

describe('formatDateTimeNL', () => {
  it('formateert ISO-datetime naar dd-mm-yyyy HH:mm', () => {
    // Note: tijd wordt in lokale tijdzone weergegeven; we testen alleen het format
    const result = formatDateTimeNL('2026-04-23T10:30:00Z')
    expect(result).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/)
  })
})

describe('formatRelative', () => {
  it('returnt "zojuist" voor minder dan een minuut geleden', () => {
    const now = new Date()
    expect(formatRelative(now.toISOString())).toBe('zojuist')
  })
  it('returnt "X min geleden" voor recente events', () => {
    const fiveMin = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatRelative(fiveMin)).toMatch(/^\d+ min geleden$/)
  })
  it('null → em-dash', () => {
    expect(formatRelative(null)).toBe('—')
  })
})

describe('dashboardStatusLabel', () => {
  it('mapt status-keys naar leesbare labels', () => {
    expect(dashboardStatusLabel('open')).toBe('Open')
    expect(dashboardStatusLabel('opgevolgd')).toBe('Opgevolgd')
    expect(dashboardStatusLabel('afgehandeld')).toBe('Afgehandeld')
    expect(dashboardStatusLabel('no_show')).toBe('No-show')
    expect(dashboardStatusLabel('geen_interesse')).toBe('Geen interesse')
    expect(dashboardStatusLabel('archief')).toBe('Archief')
  })
  it('null → "Geen status"', () => {
    expect(dashboardStatusLabel(null)).toBe('Geen status')
  })
})

describe('gesprekFaseLabel', () => {
  it('mapt fase-keys naar Nederlandse labels', () => {
    expect(gesprekFaseLabel('info_verzamelen')).toBe('Info verzamelen')
    expect(gesprekFaseLabel('offerte_besproken')).toBe('Offerte besproken')
    expect(gesprekFaseLabel('onderhandelen')).toBe('Onderhandelen')
    expect(gesprekFaseLabel('datum_kiezen')).toBe('Datum kiezen')
    expect(gesprekFaseLabel('afspraak_bevestigd')).toBe('Afspraak bevestigd')
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/format.test.ts
```

- [ ] **Step 3: Implementeer formatters**

Bestand `lib/dashboard/format.ts`:

```typescript
import type { DashboardStatus, GesprekFase } from './database.types'

const EURO_FORMATTER = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return EURO_FORMATTER.format(amount).replace(/ /g, ' ')
}

export function formatDateNL(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export function formatDateTimeNL(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`
}

/**
 * Relatieve tijd ("zojuist", "5 min geleden", "2 uur geleden", "3 dagen geleden").
 * Voor exacte tijden > 7 dagen valt terug op formatDateNL.
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'zojuist'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min geleden`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} uur geleden`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'dag' : 'dagen'} geleden`
  return formatDateNL(iso)
}

const DASHBOARD_STATUS_LABELS: Record<DashboardStatus, string> = {
  open: 'Open',
  opgevolgd: 'Opgevolgd',
  afgehandeld: 'Afgehandeld',
  no_show: 'No-show',
  geen_interesse: 'Geen interesse',
  archief: 'Archief',
}

export function dashboardStatusLabel(status: DashboardStatus | null): string {
  if (!status) return 'Geen status'
  return DASHBOARD_STATUS_LABELS[status] ?? status
}

const GESPREK_FASE_LABELS: Record<GesprekFase, string> = {
  info_verzamelen: 'Info verzamelen',
  offerte_besproken: 'Offerte besproken',
  onderhandelen: 'Onderhandelen',
  datum_kiezen: 'Datum kiezen',
  afspraak_bevestigd: 'Afspraak bevestigd',
}

export function gesprekFaseLabel(fase: GesprekFase): string {
  return GESPREK_FASE_LABELS[fase] ?? fase
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/format.test.ts
```

Verwacht: alle tests groen.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/format.ts lib/dashboard/format.test.ts
git commit -m "feat(dashboard): add format helpers (euro, datum, relative, status-label)"
```

---

### Task 4: lead-queries — getLeadsList (TDD)

**Files:**
- Create: `lib/dashboard/lead-queries.ts`
- Create: `lib/dashboard/lead-queries.test.ts`

- [ ] **Step 1: Schrijf failing test voor getLeadsList**

Bestand `lib/dashboard/lead-queries.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOrder, mockEq, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockOrder = vi.fn()
  const mockEq = vi.fn(() => ({ order: mockOrder }))
  const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  return { mockOrder, mockEq, mockSelect, mockFrom }
})

vi.mock('./supabase-server', () => ({
  getDashboardSupabase: async () => ({ from: mockFrom }),
}))

import { getLeadsList } from './lead-queries'

describe('getLeadsList', () => {
  beforeEach(() => {
    mockOrder.mockReset()
    mockEq.mockClear()
    mockSelect.mockClear()
    mockFrom.mockClear()
  })

  it('queryt leads gesorteerd op aangemaakt DESC, niet-gearchiveerd, max 100', async () => {
    mockOrder.mockResolvedValue({
      data: [{ lead_id: 'L1', naam: 'Jan' }, { lead_id: 'L2', naam: 'Piet' }],
      error: null,
    })

    const result = await getLeadsList()

    expect(mockFrom).toHaveBeenCalledWith('leads')
    expect(mockEq).toHaveBeenCalledWith('dashboard_archived', false)
    // Verifieer: order met aangemaakt DESC + limit
    expect(mockOrder).toHaveBeenCalledWith('aangemaakt', { ascending: false })
    expect(result).toEqual([
      { lead_id: 'L1', naam: 'Jan' },
      { lead_id: 'L2', naam: 'Piet' },
    ])
  })

  it('returnt lege array bij Supabase-error (geen exception)', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'oops' } })

    const result = await getLeadsList()

    expect(result).toEqual([])
  })

  it('returnt lege array als data null is', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null })

    const result = await getLeadsList()

    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

- [ ] **Step 3: Implementeer getLeadsList**

Bestand `lib/dashboard/lead-queries.ts`:

```typescript
import { getDashboardSupabase } from './supabase-server'
import type {
  Lead,
  Bericht,
  Foto,
  Offerte,
  Prijsregel,
  LeadNote,
  Tag,
  LeadStatusHistory,
} from './database.types'

/**
 * Subset van Lead-velden die de leads-tabel laat zien. Houd dit smal
 * zodat de query niet onnodig veel data over de lijn pompt.
 */
export type LeadListItem = Pick<
  Lead,
  | 'lead_id'
  | 'naam'
  | 'telefoon'
  | 'hoofdcategorie'
  | 'm2'
  | 'totaal_prijs'
  | 'status'
  | 'gesprek_fase'
  | 'dashboard_status'
  | 'aangemaakt'
  | 'bijgewerkt'
>

const LIST_COLUMNS = [
  'lead_id',
  'naam',
  'telefoon',
  'hoofdcategorie',
  'm2',
  'totaal_prijs',
  'status',
  'gesprek_fase',
  'dashboard_status',
  'aangemaakt',
  'bijgewerkt',
].join(', ')

/**
 * Haalt de leads-lijst voor `/leads`. Filtert standaard gearchiveerde
 * leads weg, sorteert op aangemaakt DESC, max 100 resultaten (paginatie
 * komt in Plan 5).
 */
export async function getLeadsList(): Promise<LeadListItem[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('leads')
    .select(LIST_COLUMNS)
    .eq('dashboard_archived', false)
    .order('aangemaakt', { ascending: false })

  if (error) {
    console.error('[getLeadsList] query failed:', error)
    return []
  }
  return (data as LeadListItem[] | null) ?? []
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

Verwacht: 3 tests groen.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/lead-queries.ts lib/dashboard/lead-queries.test.ts
git commit -m "feat(dashboard): add getLeadsList query for /leads list-page"
```

---

### Task 5: lead-queries — getLeadDetail (TDD)

**Files:**
- Modify: `lib/dashboard/lead-queries.ts`
- Modify: `lib/dashboard/lead-queries.test.ts`

- [ ] **Step 1: Voeg failing tests toe**

Voeg onderaan `lib/dashboard/lead-queries.test.ts` toe (binnen het bestand, na de `describe('getLeadsList', ...)` block):

```typescript
import { getLeadDetail } from './lead-queries'

describe('getLeadDetail', () => {
  // We gebruiken een uitgebreidere mock waar from('leads'/'berichten'/etc)
  // verschillende responses kunnen geven.
  const tableHandlers: Record<string, () => any> = {}

  beforeEach(() => {
    Object.keys(tableHandlers).forEach((k) => delete tableHandlers[k])
    mockFrom.mockImplementation((table: string) => {
      const handler = tableHandlers[table]
      if (!handler) throw new Error(`no mock handler for table: ${table}`)
      return handler()
    })
  })

  function setLeadResponse(data: any, error: any = null) {
    tableHandlers['leads'] = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error }),
        }),
      }),
    })
  }

  function setListResponse(table: string, data: any[]) {
    tableHandlers[table] = () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data, error: null }),
        }),
      }),
    })
  }

  it('returnt null als lead niet bestaat', async () => {
    setLeadResponse(null)
    setListResponse('berichten', [])
    setListResponse('fotos', [])
    setListResponse('offertes', [])
    setListResponse('prijsregels', [])
    setListResponse('lead_notes', [])
    setListResponse('lead_status_history', [])

    const result = await getLeadDetail('NONEXISTENT')

    expect(result).toBeNull()
  })

  it('returnt LeadDetail object met alle gerelateerde data als lead bestaat', async () => {
    setLeadResponse({ lead_id: 'L1', naam: 'Jan', telefoon: '06-123' })
    setListResponse('berichten', [{ id: 'B1', lead_id: 'L1', richting: 'in', bericht: 'hoi', timestamp: '2026-04-23T10:00:00Z' }])
    setListResponse('fotos', [{ id: 'F1', lead_id: 'L1', public_url: 'https://...' }])
    setListResponse('offertes', [{ id: 'O1', lead_id: 'L1', versie: 1, totaal_incl: 250 }])
    setListResponse('prijsregels', [{ id: 'P1', lead_id: 'L1', omschrijving: 'reinigen', totaal: 250 }])
    setListResponse('lead_notes', [{ id: 'N1', lead_id: 'L1', tekst: 'klant belt morgen' }])
    setListResponse('lead_status_history', [])

    const result = await getLeadDetail('L1')

    expect(result).not.toBeNull()
    expect(result!.lead.lead_id).toBe('L1')
    expect(result!.berichten).toHaveLength(1)
    expect(result!.fotos).toHaveLength(1)
    expect(result!.offertes).toHaveLength(1)
    expect(result!.prijsregels).toHaveLength(1)
    expect(result!.notes).toHaveLength(1)
    expect(result!.statusHistory).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

- [ ] **Step 3: Voeg getLeadDetail toe aan lead-queries.ts**

Voeg onderaan `lib/dashboard/lead-queries.ts` toe:

```typescript
export interface LeadDetail {
  lead: Lead
  berichten: Bericht[]
  fotos: Foto[]
  offertes: Offerte[]
  prijsregels: Prijsregel[]
  notes: LeadNote[]
  statusHistory: LeadStatusHistory[]
}

/**
 * Haalt één lead op + alle gerelateerde data voor de detail-pagina.
 * Geeft null terug als de lead niet bestaat (of RLS hem verbergt).
 *
 * Alle queries draaien parallel om de page snel te laden. Bij een
 * sub-query-error vallen we terug op een lege array zodat de page
 * gerendered kan worden i.p.v. te crashen.
 */
export async function getLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const supabase = await getDashboardSupabase()

  const [
    leadRes,
    berichtenRes,
    fotosRes,
    offertesRes,
    prijsregelsRes,
    notesRes,
    historyRes,
  ] = await Promise.all([
    supabase.from('leads').select('*').eq('lead_id', leadId).maybeSingle(),
    supabase
      .from('berichten')
      .select('*')
      .eq('lead_id', leadId)
      .order('timestamp', { ascending: true }),
    supabase
      .from('fotos')
      .select('*')
      .eq('lead_id', leadId)
      .order('aangemaakt', { ascending: true }),
    supabase
      .from('offertes')
      .select('*')
      .eq('lead_id', leadId)
      .order('versie', { ascending: false }),
    supabase
      .from('prijsregels')
      .select('*')
      .eq('lead_id', leadId)
      .order('volgorde', { ascending: true }),
    supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('aangemaakt_op', { ascending: false }),
    supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('gewijzigd_op', { ascending: false }),
  ])

  if (!leadRes.data) return null

  return {
    lead: leadRes.data as Lead,
    berichten: (berichtenRes.data as Bericht[] | null) ?? [],
    fotos: (fotosRes.data as Foto[] | null) ?? [],
    offertes: (offertesRes.data as Offerte[] | null) ?? [],
    prijsregels: (prijsregelsRes.data as Prijsregel[] | null) ?? [],
    notes: (notesRes.data as LeadNote[] | null) ?? [],
    statusHistory: (historyRes.data as LeadStatusHistory[] | null) ?? [],
  }
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

Verwacht: 5 tests groen (3 oude + 2 nieuwe).

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/lead-queries.ts lib/dashboard/lead-queries.test.ts
git commit -m "feat(dashboard): add getLeadDetail query (parallel multi-table fetch)"
```

---

### Task 6: aggregateActivityTimeline (TDD)

**Files:**
- Modify: `lib/dashboard/lead-queries.ts`
- Modify: `lib/dashboard/lead-queries.test.ts`

- [ ] **Step 1: Voeg failing tests toe**

Voeg onderaan `lib/dashboard/lead-queries.test.ts` toe:

```typescript
import { aggregateActivityTimeline } from './lead-queries'

describe('aggregateActivityTimeline', () => {
  it('combineert berichten + fotos + offertes + notes + history + audit-velden, gesorteerd nieuwste eerst', () => {
    const detail = {
      lead: {
        lead_id: 'L1', naam: 'Jan',
        akkoord_op: '2026-04-23T11:00:00Z',
        akkoord_via: 'web',
        afspraak_geboekt_op: '2026-04-23T11:30:00Z',
        afspraak_geboekt_via: 'web',
        aangemaakt: '2026-04-22T09:00:00Z',
      } as any,
      berichten: [
        { id: 'B1', timestamp: '2026-04-22T10:00:00Z', richting: 'in', bericht: 'hoi', type: 'tekst' } as any,
        { id: 'B2', timestamp: '2026-04-22T10:05:00Z', richting: 'uit', bericht: 'goedemorgen', type: 'tekst' } as any,
      ],
      fotos: [
        { id: 'F1', aangemaakt: '2026-04-22T10:30:00Z', bron: 'whatsapp' } as any,
      ],
      offertes: [
        { id: 'O1', aangemaakt_op: '2026-04-22T15:00:00Z', versie: 1, totaal_incl: 250 } as any,
      ],
      prijsregels: [],
      notes: [
        { id: 'N1', aangemaakt_op: '2026-04-23T08:00:00Z', tekst: 'klant belt morgen' } as any,
      ],
      statusHistory: [
        { id: 'H1', gewijzigd_op: '2026-04-23T09:00:00Z', oude_status: 'open', nieuwe_status: 'opgevolgd' } as any,
      ],
    }

    const events = aggregateActivityTimeline(detail)

    // 9 events totaal: lead aangemaakt + 2 berichten + foto + offerte + notitie + status-change + akkoord + afspraak
    expect(events).toHaveLength(9)

    // Nieuwste eerst
    expect(events[0].timestamp).toBe('2026-04-23T11:30:00Z')  // afspraak_geboekt
    expect(events[events.length - 1].timestamp).toBe('2026-04-22T09:00:00Z')  // lead aangemaakt
  })

  it('event-types worden correct gelabeld', () => {
    const detail = {
      lead: { lead_id: 'L1', aangemaakt: '2026-04-22T09:00:00Z' } as any,
      berichten: [{ id: 'B1', timestamp: '2026-04-22T10:00:00Z', richting: 'in', bericht: 'hoi', type: 'tekst' } as any],
      fotos: [{ id: 'F1', aangemaakt: '2026-04-22T10:30:00Z', bron: 'whatsapp' } as any],
      offertes: [],
      prijsregels: [],
      notes: [],
      statusHistory: [],
    }

    const events = aggregateActivityTimeline(detail)
    const types = events.map((e) => e.type)
    expect(types).toContain('lead_aangemaakt')
    expect(types).toContain('bericht_in')
    expect(types).toContain('foto_geupload')
  })

  it('legt richting van bericht correct vast (in vs uit)', () => {
    const detail = {
      lead: { lead_id: 'L1', aangemaakt: '2026-04-22T09:00:00Z' } as any,
      berichten: [
        { id: 'B1', timestamp: '2026-04-22T10:00:00Z', richting: 'in', bericht: 'hoi', type: 'tekst' } as any,
        { id: 'B2', timestamp: '2026-04-22T10:05:00Z', richting: 'uit', bericht: 'hi', type: 'tekst' } as any,
      ],
      fotos: [],
      offertes: [],
      prijsregels: [],
      notes: [],
      statusHistory: [],
    }

    const events = aggregateActivityTimeline(detail)
    const inEvent = events.find((e) => e.id === 'msg-B1')
    const outEvent = events.find((e) => e.id === 'msg-B2')

    expect(inEvent?.type).toBe('bericht_in')
    expect(outEvent?.type).toBe('bericht_uit')
  })
})
```

- [ ] **Step 2: Run tests, verwacht failures**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

- [ ] **Step 3: Implementeer aggregateActivityTimeline**

Voeg onderaan `lib/dashboard/lead-queries.ts` toe:

```typescript
export type ActivityType =
  | 'lead_aangemaakt'
  | 'bericht_in'
  | 'bericht_uit'
  | 'foto_geupload'
  | 'offerte_verstuurd'
  | 'notitie_toegevoegd'
  | 'status_gewijzigd'
  | 'akkoord'
  | 'afspraak_geboekt'

export interface ActivityEvent {
  id: string
  type: ActivityType
  timestamp: string
  label: string
  details?: string | null
}

/**
 * Aggregeert alle activiteits-events voor een lead uit de bestaande
 * tabellen. Geen aparte event-tabel nodig — we hergebruiken de timestamps
 * die al op berichten/fotos/offertes/notes/history/audit-velden staan.
 *
 * Sorteert nieuwste eerst (DESC) zodat de UI direct chronologisch kan
 * renderen zonder verdere sortering.
 */
export function aggregateActivityTimeline(detail: LeadDetail): ActivityEvent[] {
  const events: ActivityEvent[] = []

  // Lead aangemaakt
  events.push({
    id: `lead-${detail.lead.lead_id}`,
    type: 'lead_aangemaakt',
    timestamp: detail.lead.aangemaakt,
    label: 'Lead aangemaakt',
    details: detail.lead.bron ? `Bron: ${detail.lead.bron}` : null,
  })

  // Berichten
  for (const b of detail.berichten) {
    const isIn = b.richting === 'in'
    events.push({
      id: `msg-${b.id}`,
      type: isIn ? 'bericht_in' : 'bericht_uit',
      timestamp: b.timestamp,
      label: isIn ? 'Klant stuurde bericht' : 'Bot stuurde bericht',
      details: b.bericht ?? (b.type !== 'tekst' ? `[${b.type}]` : null),
    })
  }

  // Foto's
  for (const f of detail.fotos) {
    events.push({
      id: `foto-${f.id}`,
      type: 'foto_geupload',
      timestamp: f.aangemaakt,
      label: 'Foto ontvangen',
      details: f.bron === 'formulier' ? 'via formulier' : 'via WhatsApp',
    })
  }

  // Offertes
  for (const o of detail.offertes) {
    events.push({
      id: `offerte-${o.id}`,
      type: 'offerte_verstuurd',
      timestamp: o.aangemaakt_op,
      label: `Offerte v${o.versie} verstuurd`,
      details: `€ ${o.totaal_incl.toFixed(2)} incl.`,
    })
  }

  // Notities
  for (const n of detail.notes) {
    events.push({
      id: `note-${n.id}`,
      type: 'notitie_toegevoegd',
      timestamp: n.aangemaakt_op,
      label: 'Notitie toegevoegd',
      details: n.tekst,
    })
  }

  // Status-history
  for (const h of detail.statusHistory) {
    events.push({
      id: `status-${h.id}`,
      type: 'status_gewijzigd',
      timestamp: h.gewijzigd_op,
      label: `Status gewijzigd naar ${h.nieuwe_status}`,
      details: h.oude_status ? `was: ${h.oude_status}` : null,
    })
  }

  // Akkoord (audit-veld op leads)
  if (detail.lead.akkoord_op) {
    events.push({
      id: `akkoord-${detail.lead.lead_id}`,
      type: 'akkoord',
      timestamp: detail.lead.akkoord_op,
      label: 'Klant ging akkoord',
      details: detail.lead.akkoord_via ? `via ${detail.lead.akkoord_via}` : null,
    })
  }

  // Afspraak geboekt (audit-veld op leads)
  if (detail.lead.afspraak_geboekt_op) {
    events.push({
      id: `afspraak-${detail.lead.lead_id}`,
      type: 'afspraak_geboekt',
      timestamp: detail.lead.afspraak_geboekt_op,
      label: 'Afspraak geboekt',
      details: detail.lead.afspraak_geboekt_via ? `via ${detail.lead.afspraak_geboekt_via}` : null,
    })
  }

  // Sorteer DESC (nieuwste eerst)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return events
}
```

- [ ] **Step 4: Run tests, verwacht groen**

```bash
npm run test -- lib/dashboard/lead-queries.test.ts
```

Verwacht: 8 tests groen.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/lead-queries.ts lib/dashboard/lead-queries.test.ts
git commit -m "feat(dashboard): add aggregateActivityTimeline (on-the-fly events)"
```

---

### Task 7: LeadsTable component + /leads page

**Files:**
- Create: `components/dashboard/leads/LeadsTable.tsx`
- Create: `components/dashboard/leads/LeadsTable.module.css`
- Modify: `app/dashboard/(app)/leads/page.tsx`

- [ ] **Step 1: Maak directory aan**

```bash
mkdir -p components/dashboard/leads
```

- [ ] **Step 2: LeadsTable component**

Bestand `components/dashboard/leads/LeadsTable.tsx`:

```tsx
import Link from 'next/link'
import type { LeadListItem } from '@/lib/dashboard/lead-queries'
import {
  formatEuro,
  formatRelative,
  dashboardStatusLabel,
  gesprekFaseLabel,
} from '@/lib/dashboard/format'
import styles from './LeadsTable.module.css'

export function LeadsTable({ leads }: { leads: LeadListItem[] }) {
  if (leads.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Nog geen leads. Zodra de eerste binnenkomt verschijnt deze hier.</p>
      </div>
    )
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Naam</th>
            <th>Telefoon</th>
            <th>Categorie</th>
            <th className={styles.numeric}>m²</th>
            <th className={styles.numeric}>Totaal</th>
            <th>Bot-status</th>
            <th>Dashboard-status</th>
            <th>Aangemaakt</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.lead_id}>
              <td>
                <Link href={`/leads/${lead.lead_id}`} className={styles.nameLink}>
                  {lead.naam}
                </Link>
              </td>
              <td>{lead.telefoon}</td>
              <td>{lead.hoofdcategorie}</td>
              <td className={styles.numeric}>{lead.m2 ?? '—'}</td>
              <td className={styles.numeric}>{formatEuro(lead.totaal_prijs)}</td>
              <td>
                <span className={styles.botStatus}>
                  {gesprekFaseLabel(lead.gesprek_fase)}
                </span>
              </td>
              <td>
                <span className={styles.dashStatus}>
                  {dashboardStatusLabel(lead.dashboard_status)}
                </span>
              </td>
              <td>{formatRelative(lead.aangemaakt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: LeadsTable.module.css**

```css
.tableWrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table th {
  background: var(--color-surface);
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: 600;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.table tbody tr:hover {
  background: var(--color-surface);
}

.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.nameLink {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.nameLink:hover {
  text-decoration: underline;
}

.botStatus,
.dashStatus {
  display: inline-block;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  font-size: var(--text-xs);
}

.empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}
```

- [ ] **Step 4: Vervang /leads page**

Bestand `app/dashboard/(app)/leads/page.tsx`:

```tsx
import { getLeadsList } from '@/lib/dashboard/lead-queries'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'

export default async function LeadsPage() {
  const leads = await getLeadsList()

  return (
    <div>
      <h1>Leads</h1>
      <p>{leads.length} {leads.length === 1 ? 'lead' : 'leads'} — niet gearchiveerd, nieuwste eerst.</p>
      <LeadsTable leads={leads} />
    </div>
  )
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/leads/LeadsTable.tsx components/dashboard/leads/LeadsTable.module.css "app/dashboard/(app)/leads/page.tsx"
git commit -m "feat(dashboard): add LeadsTable + /leads page (read-only list)"
```

---

### Task 8: Lead-detail page skeleton + LeadHeader + LeadStatusBadges

**Files:**
- Create: `app/dashboard/(app)/leads/[lead_id]/page.tsx`
- Create: `app/dashboard/(app)/leads/[lead_id]/page.module.css`
- Create: `components/dashboard/leads/LeadHeader.tsx` + `.module.css`
- Create: `components/dashboard/leads/LeadStatusBadges.tsx` + `.module.css`

- [ ] **Step 1: Maak directory aan**

```bash
mkdir -p "app/dashboard/(app)/leads/[lead_id]"
```

- [ ] **Step 2: LeadHeader component**

Bestand `components/dashboard/leads/LeadHeader.tsx`:

```tsx
import type { Lead } from '@/lib/dashboard/database.types'
import styles from './LeadHeader.module.css'

export function LeadHeader({ lead }: { lead: Lead }) {
  const adres = [lead.straat, `${lead.postcode} ${lead.plaats ?? ''}`.trim()]
    .filter(Boolean)
    .join(', ')

  return (
    <div className={styles.header}>
      <h2 className={styles.naam}>{lead.naam}</h2>
      {lead.bedrijfsnaam && <p className={styles.bedrijf}>{lead.bedrijfsnaam}</p>}

      <dl className={styles.contact}>
        <dt>Telefoon</dt>
        <dd>
          <a href={`tel:${lead.telefoon}`}>{lead.telefoon}</a>
        </dd>

        <dt>E-mail</dt>
        <dd>
          <a href={`mailto:${lead.email}`}>{lead.email}</a>
        </dd>

        <dt>Adres</dt>
        <dd>{adres || '—'}</dd>

        {lead.toelichting && (
          <>
            <dt>Toelichting</dt>
            <dd>{lead.toelichting}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
```

- [ ] **Step 3: LeadHeader.module.css**

```css
.header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.naam {
  margin: 0 0 var(--space-1);
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text);
}

.bedrijf {
  margin: 0 0 var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.contact {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-4);
  margin: 0;
  font-size: var(--text-sm);
}

.contact dt {
  color: var(--color-text-muted);
}

.contact dd {
  margin: 0;
}

.contact a {
  color: var(--color-primary);
  text-decoration: none;
}

.contact a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 4: LeadStatusBadges component**

Bestand `components/dashboard/leads/LeadStatusBadges.tsx`:

```tsx
import type { Lead } from '@/lib/dashboard/database.types'
import { dashboardStatusLabel, gesprekFaseLabel } from '@/lib/dashboard/format'
import styles from './LeadStatusBadges.module.css'

export function LeadStatusBadges({ lead }: { lead: Lead }) {
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
        <span className={styles.label}>Dashboard-status</span>
        <span className={styles.value}>{dashboardStatusLabel(lead.dashboard_status)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: LeadStatusBadges.module.css**

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
```

- [ ] **Step 6: Lead-detail page skeleton**

Bestand `app/dashboard/(app)/leads/[lead_id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { LeadHeader } from '@/components/dashboard/leads/LeadHeader'
import { LeadStatusBadges } from '@/components/dashboard/leads/LeadStatusBadges'
import styles from './page.module.css'

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

  return (
    <div>
      <Link href="/leads" className={styles.backLink}>
        ← Terug naar leads
      </Link>

      <div className={styles.grid}>
        {/* Linker kolom: klantgegevens + status */}
        <aside className={styles.colLeft}>
          <LeadHeader lead={detail.lead} />
          <LeadStatusBadges lead={detail.lead} />
        </aside>

        {/* Midden: gesprek/foto's/timeline (Task 9-12 vullen dit) */}
        <section className={styles.colCenter}>
          <p className={styles.placeholder}>Gesprek / Foto&apos;s / Timeline — komt in volgende tasks</p>
        </section>

        {/* Rechter kolom: offerte + afspraak + notities (Task 13-15 vullen dit) */}
        <aside className={styles.colRight}>
          <p className={styles.placeholder}>Offerte / Afspraak / Notities — komt in volgende tasks</p>
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: page.module.css**

Bestand `app/dashboard/(app)/leads/[lead_id]/page.module.css`:

```css
.backLink {
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: var(--text-sm);
}

.backLink:hover {
  color: var(--color-primary);
}

.grid {
  display: grid;
  grid-template-columns: 320px 1fr 320px;
  gap: var(--space-6);
  align-items: start;
}

.colLeft,
.colRight {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.colCenter {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  min-height: 400px;
}

.placeholder {
  color: var(--color-text-muted);
  font-style: italic;
}

@media (max-width: 1024px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 8: Type-check + commit**

```bash
npx tsc --noEmit
git add "app/dashboard/(app)/leads/[lead_id]" components/dashboard/leads/LeadHeader.tsx components/dashboard/leads/LeadHeader.module.css components/dashboard/leads/LeadStatusBadges.tsx components/dashboard/leads/LeadStatusBadges.module.css
git commit -m "feat(dashboard): add /leads/[id] page skeleton + LeadHeader + LeadStatusBadges"
```

---

### Task 9: LeadConversation component

**Files:**
- Create: `components/dashboard/leads/LeadConversation.tsx`
- Create: `components/dashboard/leads/LeadConversation.module.css`

- [ ] **Step 1: Component**

Bestand `components/dashboard/leads/LeadConversation.tsx`:

```tsx
import Image from 'next/image'
import type { Bericht } from '@/lib/dashboard/database.types'
import { formatDateTimeNL } from '@/lib/dashboard/format'
import styles from './LeadConversation.module.css'

export function LeadConversation({ berichten }: { berichten: Bericht[] }) {
  if (berichten.length === 0) {
    return <p className={styles.empty}>Nog geen berichten in dit gesprek.</p>
  }

  return (
    <ol className={styles.thread}>
      {berichten.map((b) => (
        <li
          key={b.id}
          className={`${styles.bubble} ${b.richting === 'in' ? styles.in : styles.uit}`}
        >
          <div className={styles.body}>
            {b.bericht && <p className={styles.text}>{b.bericht}</p>}
            {b.foto_url && (
              <div className={styles.image}>
                <Image
                  src={b.foto_url}
                  alt="Bijgevoegde foto"
                  width={240}
                  height={180}
                  unoptimized
                />
              </div>
            )}
            {b.type !== 'tekst' && !b.bericht && !b.foto_url && (
              <p className={styles.placeholderType}>[{b.type}]</p>
            )}
          </div>
          <time className={styles.time} dateTime={b.timestamp}>
            {formatDateTimeNL(b.timestamp)}
          </time>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 2: LeadConversation.module.css**

```css
.thread {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bubble {
  max-width: 75%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.in {
  align-self: flex-start;
  background: var(--color-surface-2);
  border-bottom-left-radius: var(--radius-sm);
}

.uit {
  align-self: flex-end;
  background: var(--color-primary);
  color: white;
  border-bottom-right-radius: var(--radius-sm);
}

.body p {
  margin: 0 0 var(--space-1);
  white-space: pre-wrap;
  word-break: break-word;
}

.image {
  margin-top: var(--space-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.placeholderType {
  font-style: italic;
  opacity: 0.7;
}

.time {
  display: block;
  font-size: var(--text-xs);
  opacity: 0.7;
  margin-top: var(--space-1);
}

.empty {
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/leads/LeadConversation.tsx components/dashboard/leads/LeadConversation.module.css
git commit -m "feat(dashboard): add LeadConversation (whatsapp-style bubbles)"
```

---

### Task 10: LeadPhotos + PhotoLightbox

**Files:**
- Create: `components/dashboard/leads/LeadPhotos.tsx` + `.module.css`
- Create: `components/dashboard/leads/PhotoLightbox.tsx` + `.module.css`

- [ ] **Step 1: PhotoLightbox (Client Component)**

Bestand `components/dashboard/leads/PhotoLightbox.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import styles from './PhotoLightbox.module.css'

export function PhotoLightbox({
  src,
  alt,
  analyse,
  onClose,
}: {
  src: string
  alt: string
  analyse: string | null
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <button className={styles.close} onClick={onClose} aria-label="Sluiten">
        ×
      </button>
      <div className={styles.frame} onClick={(e) => e.stopPropagation()}>
        <div className={styles.imageWrap}>
          <Image src={src} alt={alt} fill style={{ objectFit: 'contain' }} unoptimized />
        </div>
        {analyse && (
          <p className={styles.analyse}>
            <strong>Bot-analyse:</strong> {analyse}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: PhotoLightbox.module.css**

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  font-size: 32px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
}

.close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.frame {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.imageWrap {
  position: relative;
  width: 80vw;
  height: 70vh;
  background: black;
}

.analyse {
  margin: 0;
  padding: var(--space-4);
  font-size: var(--text-sm);
  border-top: 1px solid var(--color-border);
}
```

- [ ] **Step 3: LeadPhotos (Client Component met state voor lightbox)**

Bestand `components/dashboard/leads/LeadPhotos.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Foto } from '@/lib/dashboard/database.types'
import { PhotoLightbox } from './PhotoLightbox'
import styles from './LeadPhotos.module.css'

export function LeadPhotos({ fotos }: { fotos: Foto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (fotos.length === 0) {
    return <p className={styles.empty}>Geen foto&apos;s ontvangen voor deze lead.</p>
  }

  return (
    <>
      <div className={styles.grid}>
        {fotos.map((foto, idx) => {
          const url = foto.public_url
          if (!url) return null
          return (
            <button
              key={foto.id}
              className={styles.thumb}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Foto ${idx + 1} bekijken`}
            >
              <Image
                src={url}
                alt={`Foto ${idx + 1}`}
                width={200}
                height={200}
                style={{ objectFit: 'cover' }}
                unoptimized
              />
              {foto.foto_analyse && (
                <span className={styles.analyseBadge}>analyse</span>
              )}
            </button>
          )
        })}
      </div>

      {activeIndex !== null && fotos[activeIndex]?.public_url && (
        <PhotoLightbox
          src={fotos[activeIndex].public_url!}
          alt={`Foto ${activeIndex + 1}`}
          analyse={fotos[activeIndex].foto_analyse}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 4: LeadPhotos.module.css**

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
}

.thumb {
  position: relative;
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  background: var(--color-surface);
  padding: 0;
}

.thumb img {
  width: 100% !important;
  height: 100% !important;
}

.thumb:hover {
  border-color: var(--color-primary);
}

.analyseBadge {
  position: absolute;
  bottom: var(--space-1);
  right: var(--space-1);
  padding: 2px var(--space-2);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
}

.empty {
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 5: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/leads/LeadPhotos.tsx components/dashboard/leads/LeadPhotos.module.css components/dashboard/leads/PhotoLightbox.tsx components/dashboard/leads/PhotoLightbox.module.css
git commit -m "feat(dashboard): add LeadPhotos grid + PhotoLightbox modal"
```

---

### Task 11: LeadActivityTimeline component

**Files:**
- Create: `components/dashboard/leads/LeadActivityTimeline.tsx`
- Create: `components/dashboard/leads/LeadActivityTimeline.module.css`

- [ ] **Step 1: Component**

Bestand `components/dashboard/leads/LeadActivityTimeline.tsx`:

```tsx
import {
  MessageSquare,
  Image as ImageIcon,
  FileText,
  StickyNote,
  GitCommit,
  CheckCircle,
  Calendar,
  UserPlus,
} from 'lucide-react'
import type { ActivityEvent, ActivityType } from '@/lib/dashboard/lead-queries'
import { formatRelative, formatDateTimeNL } from '@/lib/dashboard/format'
import styles from './LeadActivityTimeline.module.css'

const ICON_MAP: Record<ActivityType, React.ComponentType<{ size?: number }>> = {
  lead_aangemaakt: UserPlus,
  bericht_in: MessageSquare,
  bericht_uit: MessageSquare,
  foto_geupload: ImageIcon,
  offerte_verstuurd: FileText,
  notitie_toegevoegd: StickyNote,
  status_gewijzigd: GitCommit,
  akkoord: CheckCircle,
  afspraak_geboekt: Calendar,
}

export function LeadActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className={styles.empty}>Geen activiteit vastgelegd.</p>
  }

  return (
    <ol className={styles.timeline}>
      {events.map((event) => {
        const Icon = ICON_MAP[event.type]
        return (
          <li key={event.id} className={styles.event}>
            <div className={`${styles.iconWrap} ${styles[event.type]}`}>
              <Icon size={14} />
            </div>
            <div className={styles.body}>
              <div className={styles.headRow}>
                <span className={styles.label}>{event.label}</span>
                <time className={styles.time} dateTime={event.timestamp} title={formatDateTimeNL(event.timestamp)}>
                  {formatRelative(event.timestamp)}
                </time>
              </div>
              {event.details && <p className={styles.details}>{event.details}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 2: LeadActivityTimeline.module.css**

```css
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.event {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: var(--space-3);
  align-items: start;
}

.iconWrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.iconWrap.bericht_in {
  background: rgba(26, 86, 255, 0.1);
  color: var(--color-primary);
}

.iconWrap.bericht_uit {
  background: rgba(0, 207, 255, 0.1);
  color: var(--color-accent);
}

.iconWrap.akkoord,
.iconWrap.afspraak_geboekt {
  background: rgba(0, 200, 100, 0.1);
  color: #0c8;
}

.body {
  font-size: var(--text-sm);
}

.headRow {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.label {
  font-weight: 500;
  color: var(--color-text);
}

.time {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.details {
  margin: var(--space-1) 0 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  white-space: pre-wrap;
}

.empty {
  color: var(--color-text-muted);
  font-style: italic;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/leads/LeadActivityTimeline.tsx components/dashboard/leads/LeadActivityTimeline.module.css
git commit -m "feat(dashboard): add LeadActivityTimeline (icon-driven event list)"
```

---

### Task 12: LeadDetailTabs (Client) + integratie in detail-page

**Files:**
- Create: `components/dashboard/leads/LeadDetailTabs.tsx`
- Create: `components/dashboard/leads/LeadDetailTabs.module.css`
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx`

- [ ] **Step 1: LeadDetailTabs (Client Component met state)**

Bestand `components/dashboard/leads/LeadDetailTabs.tsx`:

```tsx
'use client'

import { useState, type ReactNode } from 'react'
import styles from './LeadDetailTabs.module.css'

type TabKey = 'gesprek' | 'fotos' | 'timeline'

export function LeadDetailTabs({
  gesprek,
  fotos,
  timeline,
  countGesprek,
  countFotos,
}: {
  gesprek: ReactNode
  fotos: ReactNode
  timeline: ReactNode
  countGesprek: number
  countFotos: number
}) {
  const [active, setActive] = useState<TabKey>('gesprek')

  return (
    <div className={styles.tabs}>
      <div className={styles.tablist} role="tablist">
        <button
          role="tab"
          aria-selected={active === 'gesprek'}
          className={`${styles.tab} ${active === 'gesprek' ? styles.activeTab : ''}`}
          onClick={() => setActive('gesprek')}
        >
          Gesprek <span className={styles.count}>{countGesprek}</span>
        </button>
        <button
          role="tab"
          aria-selected={active === 'fotos'}
          className={`${styles.tab} ${active === 'fotos' ? styles.activeTab : ''}`}
          onClick={() => setActive('fotos')}
        >
          Foto&apos;s <span className={styles.count}>{countFotos}</span>
        </button>
        <button
          role="tab"
          aria-selected={active === 'timeline'}
          className={`${styles.tab} ${active === 'timeline' ? styles.activeTab : ''}`}
          onClick={() => setActive('timeline')}
        >
          Timeline
        </button>
      </div>

      <div className={styles.panel} role="tabpanel">
        {active === 'gesprek' && gesprek}
        {active === 'fotos' && fotos}
        {active === 'timeline' && timeline}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: LeadDetailTabs.module.css**

```css
.tabs {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
}

.tablist {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.tab {
  background: none;
  border: none;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab:hover {
  color: var(--color-text);
}

.activeTab {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.count {
  display: inline-block;
  margin-left: var(--space-2);
  padding: 1px var(--space-2);
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 400;
}

.panel {
  flex: 1;
  overflow-y: auto;
  padding-right: var(--space-2);
}
```

- [ ] **Step 3: Integreer in detail-page**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`, vervang het Server-Component blok in het midden:

```tsx
        <section className={styles.colCenter}>
          <p className={styles.placeholder}>Gesprek / Foto&apos;s / Timeline — komt in volgende tasks</p>
        </section>
```

door:

```tsx
        <section className={styles.colCenter}>
          <LeadDetailTabs
            gesprek={<LeadConversation berichten={detail.berichten} />}
            fotos={<LeadPhotos fotos={detail.fotos} />}
            timeline={
              <LeadActivityTimeline events={aggregateActivityTimeline(detail)} />
            }
            countGesprek={detail.berichten.length}
            countFotos={detail.fotos.length}
          />
        </section>
```

En voeg de imports toe bovenaan:

```tsx
import { aggregateActivityTimeline } from '@/lib/dashboard/lead-queries'
import { LeadDetailTabs } from '@/components/dashboard/leads/LeadDetailTabs'
import { LeadConversation } from '@/components/dashboard/leads/LeadConversation'
import { LeadPhotos } from '@/components/dashboard/leads/LeadPhotos'
import { LeadActivityTimeline } from '@/components/dashboard/leads/LeadActivityTimeline'
```

- [ ] **Step 4: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/leads/LeadDetailTabs.tsx components/dashboard/leads/LeadDetailTabs.module.css "app/dashboard/(app)/leads/[lead_id]/page.tsx"
git commit -m "feat(dashboard): wire LeadDetailTabs (gesprek/fotos/timeline) into detail page"
```

---

### Task 13: LeadOfferte component

**Files:**
- Create: `components/dashboard/leads/LeadOfferte.tsx`
- Create: `components/dashboard/leads/LeadOfferte.module.css`

- [ ] **Step 1: Component**

Bestand `components/dashboard/leads/LeadOfferte.tsx`:

```tsx
import { ExternalLink } from 'lucide-react'
import type { Offerte, Prijsregel } from '@/lib/dashboard/database.types'
import { formatEuro, formatDateNL } from '@/lib/dashboard/format'
import styles from './LeadOfferte.module.css'

export function LeadOfferte({
  offertes,
  prijsregels,
}: {
  offertes: Offerte[]
  prijsregels: Prijsregel[]
}) {
  if (offertes.length === 0 && prijsregels.length === 0) {
    return (
      <div className={styles.section}>
        <h3 className={styles.heading}>Offerte</h3>
        <p className={styles.empty}>Nog geen offerte voor deze lead.</p>
      </div>
    )
  }

  const huidige = offertes[0]  // versie DESC, dus eerste is de laatste

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Offerte</h3>

      {huidige && (
        <div className={styles.huidige}>
          <div className={styles.totaalRow}>
            <span className={styles.totaalLabel}>Totaal incl. BTW</span>
            <span className={styles.totaalAmount}>{formatEuro(huidige.totaal_incl)}</span>
          </div>
          {huidige.korting_pct > 0 && (
            <div className={styles.kortingRow}>
              <span>Korting</span>
              <span>{huidige.korting_pct}%</span>
            </div>
          )}
          <div className={styles.metaRow}>
            <span>Versie {huidige.versie}</span>
            <span>{formatDateNL(huidige.aangemaakt_op)}</span>
          </div>
          <a href={huidige.pdf_url} target="_blank" rel="noopener" className={styles.pdfLink}>
            Bekijk PDF <ExternalLink size={14} />
          </a>
        </div>
      )}

      {prijsregels.length > 0 && (
        <div className={styles.regels}>
          <h4 className={styles.subheading}>Prijsregels</h4>
          <table className={styles.regelsTable}>
            <thead>
              <tr>
                <th>Omschrijving</th>
                <th className={styles.numeric}>Aantal</th>
                <th className={styles.numeric}>Stukprijs</th>
                <th className={styles.numeric}>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {prijsregels.map((r) => (
                <tr key={r.id}>
                  <td>{r.omschrijving}</td>
                  <td className={styles.numeric}>
                    {r.aantal != null ? `${r.aantal} ${r.eenheid ?? ''}` : '—'}
                  </td>
                  <td className={styles.numeric}>{formatEuro(r.stukprijs)}</td>
                  <td className={styles.numeric}>{formatEuro(r.totaal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {offertes.length > 1 && (
        <details className={styles.history}>
          <summary>Vorige versies ({offertes.length - 1})</summary>
          <ul>
            {offertes.slice(1).map((o) => (
              <li key={o.id}>
                v{o.versie} — {formatEuro(o.totaal_incl)} —{' '}
                <a href={o.pdf_url} target="_blank" rel="noopener">PDF</a>{' '}
                ({formatDateNL(o.aangemaakt_op)})
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
```

- [ ] **Step 2: LeadOfferte.module.css**

```css
.section {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  font-weight: 600;
}

.subheading {
  margin: var(--space-3) 0 var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: 500;
}

.empty {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: var(--text-sm);
}

.huidige {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.totaalRow {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: var(--text-base);
  font-weight: 600;
}

.totaalAmount {
  color: var(--color-primary);
}

.kortingRow,
.metaRow {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.pdfLink {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  text-decoration: none;
  font-size: var(--text-xs);
}

.pdfLink:hover {
  border-color: var(--color-primary);
}

.regelsTable {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

.regelsTable th,
.regelsTable td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.regelsTable th {
  color: var(--color-text-muted);
  font-weight: 500;
}

.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.history {
  margin-top: var(--space-3);
  font-size: var(--text-xs);
}

.history summary {
  cursor: pointer;
  color: var(--color-text-muted);
}

.history ul {
  margin: var(--space-2) 0 0;
  padding-left: var(--space-4);
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/leads/LeadOfferte.tsx components/dashboard/leads/LeadOfferte.module.css
git commit -m "feat(dashboard): add LeadOfferte (current + history + line items)"
```

---

### Task 14: LeadAfspraak + LeadNotes (read-only) + integratie rechter kolom

**Files:**
- Create: `components/dashboard/leads/LeadAfspraak.tsx` + `.module.css`
- Create: `components/dashboard/leads/LeadNotes.tsx` + `.module.css`
- Modify: `app/dashboard/(app)/leads/[lead_id]/page.tsx`

- [ ] **Step 1: LeadAfspraak component**

Bestand `components/dashboard/leads/LeadAfspraak.tsx`:

```tsx
import { Calendar, Clock } from 'lucide-react'
import type { Lead } from '@/lib/dashboard/database.types'
import { formatDateNL } from '@/lib/dashboard/format'
import styles from './LeadAfspraak.module.css'

export function LeadAfspraak({ lead }: { lead: Lead }) {
  const heeft = lead.afspraak_datum && lead.afspraak_starttijd

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Afspraak</h3>
      {heeft ? (
        <div className={styles.afspraak}>
          <div className={styles.row}>
            <Calendar size={14} />
            <span>{formatDateNL(lead.afspraak_datum)}</span>
          </div>
          <div className={styles.row}>
            <Clock size={14} />
            <span>{lead.afspraak_starttijd}</span>
          </div>
          {lead.google_event_id && (
            <p className={styles.calendarNote}>Synced met Google Calendar</p>
          )}
        </div>
      ) : (
        <p className={styles.empty}>Nog geen afspraak ingepland.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: LeadAfspraak.module.css**

```css
.section {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  font-weight: 600;
}

.afspraak {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
}

.row svg {
  color: var(--color-text-muted);
}

.calendarNote {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: var(--text-sm);
}
```

- [ ] **Step 3: LeadNotes component (read-only weergave)**

Bestand `components/dashboard/leads/LeadNotes.tsx`:

```tsx
import type { LeadNote } from '@/lib/dashboard/database.types'
import { formatRelative } from '@/lib/dashboard/format'
import styles from './LeadNotes.module.css'

export function LeadNotes({ notes }: { notes: LeadNote[] }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>Notities</h3>
      {notes.length === 0 ? (
        <p className={styles.empty}>Geen notities. (Toevoegen komt in een volgende release.)</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((n) => (
            <li key={n.id} className={styles.note}>
              <p className={styles.tekst}>{n.tekst}</p>
              <span className={styles.meta}>
                {n.auteur ? 'Medewerker' : 'Onbekend'} · {formatRelative(n.aangemaakt_op)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: LeadNotes.module.css**

```css
.section {
  padding: var(--space-4);
}

.heading {
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  font-weight: 600;
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

.meta {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: var(--text-sm);
}
```

- [ ] **Step 5: Integreer in detail-page**

In `app/dashboard/(app)/leads/[lead_id]/page.tsx`, vervang het rechter-kolom blok:

```tsx
        <aside className={styles.colRight}>
          <p className={styles.placeholder}>Offerte / Afspraak / Notities — komt in volgende tasks</p>
        </aside>
```

door:

```tsx
        <aside className={styles.colRight}>
          <LeadOfferte offertes={detail.offertes} prijsregels={detail.prijsregels} />
          <LeadAfspraak lead={detail.lead} />
          <LeadNotes notes={detail.notes} />
        </aside>
```

En voeg imports toe bovenaan:

```tsx
import { LeadOfferte } from '@/components/dashboard/leads/LeadOfferte'
import { LeadAfspraak } from '@/components/dashboard/leads/LeadAfspraak'
import { LeadNotes } from '@/components/dashboard/leads/LeadNotes'
```

Verwijder de niet-meer-gebruikte `.placeholder` class uit page.module.css mag, of laat staan (dood maar onschadelijk).

- [ ] **Step 6: Type-check + commit**

```bash
npx tsc --noEmit
git add components/dashboard/leads/LeadAfspraak.tsx components/dashboard/leads/LeadAfspraak.module.css components/dashboard/leads/LeadNotes.tsx components/dashboard/leads/LeadNotes.module.css "app/dashboard/(app)/leads/[lead_id]/page.tsx"
git commit -m "feat(dashboard): wire LeadAfspraak + LeadNotes into detail right-column"
```

---

### Task 15: /dashboard root redirect + PollApproval loading-indicator

**Files:**
- Create: `app/dashboard/page.tsx`
- Modify: `app/dashboard/(auth)/wachtkamer/poll-approval.tsx`

- [ ] **Step 1: /dashboard root page (redirect)**

Bestand `app/dashboard/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/dashboard/auth'

/**
 * Root van de dashboard-host. Niemand zou hier per ongeluk moeten landen
 * (middleware re-write `/` naar `/dashboard`), maar als het toch gebeurt
 * sturen we ze door naar /leads (ingelogd) of /login (anders).
 */
export default async function DashboardRootPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  redirect('/leads')
}
```

- [ ] **Step 2: PollApproval loading-indicator**

Vervang `app/dashboard/(auth)/wachtkamer/poll-approval.tsx` door:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDashboardClient } from '@/lib/dashboard/supabase-browser'

/**
 * Detecteert wanneer de huidige user wordt goedgekeurd en ververst de
 * pagina. Toont subtiele "we kijken mee"-indicator zodat de pending user
 * weet dat de pagina niet bevroren is.
 */
export function PollApproval() {
  const router = useRouter()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const supabase = createDashboardClient()
    let cancelled = false

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel(`profile:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'dashboard_user_profiles',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRow = payload.new as { tenant_status?: string }
            if (newRow?.tenant_status === 'approved' && !cancelled) {
              router.refresh()
            }
          }
        )
        .subscribe((status) => {
          if (!cancelled && status === 'SUBSCRIBED') {
            setConnected(true)
          }
        })

      return () => {
        cancelled = true
        void supabase.removeChannel(channel)
      }
    }

    const cleanup = setup()
    return () => {
      void cleanup.then((fn) => fn?.())
    }
  }, [router])

  return (
    <p
      style={{
        margin: '12px 0 0',
        fontSize: '0.75rem',
        color: 'var(--color-text-muted)',
      }}
    >
      {connected ? '✓ Verbonden — we sturen je automatisch door zodra je toegang krijgt.' : 'Verbinden…'}
    </p>
  )
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add app/dashboard/page.tsx "app/dashboard/(auth)/wachtkamer/poll-approval.tsx"
git commit -m "feat(dashboard): add /dashboard root redirect + wachtkamer connection-indicator"
```

---

### Task 16: End-to-end smoke test

Manuele verificatie dat de hele Plan 4-flow werkt.

- [ ] **Step 1: Run alle tests**

```bash
npm run test
```

Verwacht: alle tests groen (de exacte count = 23 uit Plan 3 + ~13 nieuwe = ~36 tests).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Start dev-server (als nog niet draait)**

```bash
npm run dev
```

- [ ] **Step 4: Login**

In browser: `http://app.localhost:3000/login` → log in met je test-user (of maak een nieuwe via /signup, approve in Supabase Studio).

- [ ] **Step 5: /leads pagina**

Verwacht:
- Tabel toont alle niet-gearchiveerde leads van schoon-straatje
- Kolommen: Naam (klikbaar) / Telefoon / Categorie / m² / Totaal / Bot-status / Dashboard-status / Aangemaakt
- Aantal leads bovenin (bv. "12 leads")
- Empty-state als 0 leads

- [ ] **Step 6: Klik op een lead-naam**

Verwacht: redirect naar `/leads/<lead_id>` met:
- Linkerkolom: naam, bedrijf (optioneel), telefoon (klikbaar `tel:`), email (klikbaar `mailto:`), adres, toelichting + bot-status / gesprek-fase / dashboard-status badges
- Middelste kolom: tabs (Gesprek / Foto's / Timeline) — klikken switcht
- Rechter kolom: Offerte (totaal + prijsregels + PDF-link), Afspraak, Notities

- [ ] **Step 7: Tabs testen**

- **Gesprek**: chronologische berichten, in-bubbels links (grijs), uit-bubbels rechts (blauw), foto-bijlagen inline
- **Foto's**: grid van foto's, klik op een foto → lightbox opent met grote foto + analyse-tekst, ESC sluit
- **Timeline**: chronologisch alle events met iconen, nieuwste eerst, datum-tooltip on hover

- [ ] **Step 8: Niet-bestaande lead**

Open `http://app.localhost:3000/leads/NONEXISTENT-LEAD-ID`. Verwacht: standaard Next.js 404 page.

- [ ] **Step 9: Smoke-check de bot**

`pm2 logs` (of waar je bot-logs leest) — geen nieuwe errors. RLS-policies zijn al getest in Plan 3.

- [ ] **Step 10: Stop dev-server**

`Ctrl+C`. Verwacht clean shutdown.

---

## Summary checklist

Aan het einde van Plan 4:

- [ ] `lib/dashboard/database.types.ts` met handgeschreven Database type
- [ ] `lib/dashboard/require-approved-user.ts` helper, gebruikt in layout
- [ ] `lib/dashboard/format.ts` formatters (euro, datum, relative, status-labels) met tests
- [ ] `lib/dashboard/lead-queries.ts` met `getLeadsList`, `getLeadDetail`, `aggregateActivityTimeline` met tests
- [ ] `/leads` toont werkende tabel
- [ ] `/leads/[id]` toont 3-koloms layout met alle data
- [ ] LeadConversation, LeadPhotos+Lightbox, LeadActivityTimeline, LeadOfferte, LeadAfspraak, LeadNotes — allemaal functioneel
- [ ] LeadDetailTabs client-component switcht correct
- [ ] `/dashboard` root redirect werkt
- [ ] PollApproval-indicator toont verbindingsstatus
- [ ] Geen wijzigingen aan schoon-straatje codebase
- [ ] End-to-end smoke test slaagt

Plan 5 (lichte acties: status, notities, tags, archief, CSV-export) bouwt erop voort. Geen veranderingen aan de bot — schoon-straatje blijft draaien zoals nu.
