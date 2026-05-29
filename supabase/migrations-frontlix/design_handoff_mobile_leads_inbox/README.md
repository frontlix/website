# Handoff: Mobile Leads & Inbox (Frontlix)

## Overview

Two new mobile screens for the Frontlix dashboard:

- **Leads** — pipeline-oriented overview of all incoming work, grouped by stage (in gesprek, owner-review, offerte uit, ingepland, afgerond). Replaces the desktop 5-column kanban with a phone-friendly segmented list.
- **Inbox** — WhatsApp-style conversation list of all client chats, with full chat-detail view (bubbles, lead-info sheet, Surface AI toggle, search across messages).

Both designs follow the same iOS-native visual language already used by the existing mobile `Overzicht` screen.

---

## About the Design Files

The files in this bundle are **design references created in HTML/JSX** — interactive prototypes that show intended look and behavior. They are not meant to be shipped as-is.

The task is to **recreate these designs in the target codebase's environment** (the Frontlix repo, presumably React + your existing component library) using established patterns. The HTML/JSX files in `source/` use plain React + inline styles for portability; in production, port them to whatever styling system the codebase uses (CSS modules, Tailwind, styled-components, etc.) and replace the mock data with real API integration.

The prototypes use:
- `React.useState` for local state
- Inline styles (no CSS preprocessor)
- A theme object `t` passed via props (light/dark)
- Mock data in JS objects

---

## Fidelity

**High-fidelity.** The mocks are pixel-perfect with final colors, typography, spacing, and interactions. The developer should recreate the UI pixel-perfectly. All hex values, spacing, font sizes, and timings in the README below are the values to ship.

---

## Files

### Prototypes (interactive previews)
- `prototypes/Mobiel - Leads.html` — leads page, light + dark side by side
- `prototypes/Mobiel - Inbox.html` — inbox + chat + search, light + dark
- `prototypes/lib/ios-frame.jsx` — iOS device-frame for previewing
- `prototypes/design-canvas.jsx` — DesignCanvas wrapper for side-by-side comparison

To run a prototype: just open the `.html` file in a browser. No build needed (uses Babel-standalone for JSX).

### Source (the actual designs)
- `source/shared/AShared.jsx` — theme tokens, `AIcon`, `AAvatar`, `ABottomNav`, `ALiveDot`, `fmtA` helper
- `source/shared/MLShared.jsx` — leads mock data + stage metadata
- `source/leads/LAShared.jsx` — leads card atoms (LACard, LAStagePill, LASource)
- `source/leads/LeadsCardInteractive.jsx` — SwipeableCard wrapper + ExpandedPanel
- `source/leads/LeadsFilterSheet.jsx` — bottom-sheet filter UI
- `source/leads/LeadsScreen.jsx` — main leads screen (composition of above)
- `source/inbox/IBShared.jsx` — inbox mock conversations + atoms
- `source/inbox/ICShared.jsx` — WhatsApp palette + MessageBubble + DaySeparator + SystemBanner
- `source/inbox/InboxC.jsx` — main inbox list (timeline-grouped sections + swipe rows)
- `source/inbox/ChatDetail.jsx` — chat screen with header, bubbles, composer, lead-sheet, Surface-toggle
- `source/inbox/InboxSearch.jsx` — search across all messages
- `source/inbox/InboxFlow.jsx` — simple flow controller (list ↔ chat ↔ search)

---

# 1 · LEADS

## Purpose
Mobile equivalent of the desktop leads-kanban. Users (typically the company owner) browse and act on leads from their phone — quickly filter by stage, scan progress, take action (send quote, approve, follow up).

## Layout

**Container:** iOS-style scroll view, full viewport height. Safe-area padding top 54px (status bar), bottom 86px (bottom-nav).

**Sticky header (8px 20px 14px padding):**
- Title `Leads` — 28px / 800 / -0.025em letter-spacing
- Subtitle: `<ALiveDot/> X van Y zichtbaar` — 13px / fgMuted
- Right-aligned action buttons (40×40 circular):
  - Search (chipBg)
  - Filter (chipBg, with badge if active filters)
  - New (accent gradient, 4px 14px shadow)

**Sticky segmented chips (padding 2px 16px 10px):**
- Horizontal scrollable row of pill-buttons
- Tabs: `Alles · Gesprek · Review · Offerte · Gepland · Klaar` with counts
- Active state: solid `t.fg` background, `t.bg` text
- Inactive: `t.chipBg` background, `t.fg` text + 6px tone-colored dot
- Height 34px / radius 9999 / padding 8px 13px / 13px 600 text

**Active-filter strip (conditional):**
- Only shown when advanced filters applied
- Background: `accent + '10'`, border `accent + '24'`
- Contains: filter icon · "X actief filters · Y resultaten" · "Wis" button

**Lead list (padding 4px 16px 18px, gap 8px):**
- Each row is a `SwipeableCard` containing an `LACard` (medium density)

## LACard (medium density)

Background `t.surface`, border-radius 14px, padding 14px, shadow `0 1px 2px rgba(0,0,0,.04)` (light only).

**Top row** (flex row, gap 12, align center):
1. Avatar (40×40, AAvatar component) with overlapping source-dot bottom-right
2. Name + meta column (flex 1):
   - Name: 15px / 600 / -0.005em / ellipsis
   - Meta: `{plaats} · {m2}m² · {dienst-type}` — 12px / fgMuted / ellipsis
3. Right metric (varies by stage emphasis):
   - **Price emphasis** (review, uit): 17px / 800 price `€1.340`, tabular-nums
   - **Datum emphasis** (gepland, klaar): tinted block with date — radius 9, padding 5×9, stage-color background `c + '14'`, two lines: weekday + date
   - **No metric yet** (gesprek): "Nog geen prijs" two-line muted label

**Bottom row** (flex row, justify space-between, padding-left 52 to align with name column):
- Left: `LAStagePill` (colored pill with dot prefix)
- Right: timestamp `{binnen}` — 11px / fgMuted / tabular-nums

### LAStagePill
- Display: inline-flex, gap 5
- Padding: 2px 8px (sm) / 3px 10px (md)
- Border-radius: 9999
- Background: `stageColor + '14'`
- Color: `stageColor`
- 10.5px / 700 / .01em letter-spacing
- 5px stage-colored dot prefix

### Stage palette (LA_STAGE_META)

| Stage   | tone   | color hex   | Emphasis |
|---------|--------|-------------|----------|
| gesprek | blue   | `t.accent` (#1A56FF) | meta     |
| review  | amber  | `t.warning` (#F59E0B) | price    |
| uit     | violet | `#7C3AED`            | price    |
| gepland | green  | `t.success` (#10B981) | datum    |
| klaar   | gray   | `t.fgMuted`          | datum    |

---

## SwipeableCard (interactive wrapper)

Wraps `LACard` to add:
1. **Drag-to-reveal action lades** on both sides
2. **Tap-to-expand** into an inline `ExpandedPanel` below the card

### Swipe physics
- Drag with `pointerdown/move/up` events
- `dx` clamped to `±(SC_REVEAL + 24)` where `SC_REVEAL = 144px`
- On release:
  - `dx > 40` → snap to `+144` (left actions visible)
  - `dx < -40` → snap to `-144`
  - Otherwise → snap to 0
- Transition: `transform .25s cubic-bezier(.32,.72,0,1)`

### Swipe actions (revealed under the card)

**Left side (revealed by swipe →)** — contact actions:
- Bel — gradient `linear-gradient(135deg, accent, accent2)` / white text
- WA — `t.wa` (WhatsApp green) / white text

**Right side (revealed by swipe ←)** — admin actions:
- Snooze — `t.warning` / white
- Archief — `t.danger` / white

Each button: 14px radius, icon 18px stroke 2.2, label below 10.5px / 700.

**Hide action lades when the card is in `expanded` state.**

### Tap behavior
- If `moved` flag set during drag → no tap (just snap)
- If `dx != 0` → snap back, no tap
- Otherwise → toggle expanded

---

## ExpandedPanel (inline drilldown)

Appears below the card when tapped, with `0.25s` slide-down + fade animation.

Container:
- Background `t.surface`, border-radius 14, border `1px solid stageColor + '30'`
- Margin-top 6px from card
- Shadow `0 1px 2px rgba(0,0,0,.04)` (light)

**Structure:**

1. **Top color strip** (gradient `linear-gradient(135deg, stageColor+'1A', stageColor+'06')`, padding 10×14, bottom-border)
   - Stage label (uppercase 11/700/.06em, stage color)
   - Close button (chevron-down + "Sluit")

2. **Stats grid** (4 columns, padding 14×14)
   - Oppervlak · Foto's · Offerte · Binnen
   - Each stat: 14/700 value (tabular-nums) + 10/600/.04em uppercase label

3. **Dienst** (padding 12×14, border-bottom)
   - 10/700/.06em uppercase "Dienst" label + 13px body

4. **Surface context** (padding 12×14, border-bottom)
   - 22×22 accent-gradient sparkle icon
   - 13px body: "Surface · {context-line}"

5. **Action buttons** (grid 2 columns, padding 12, gap 6)
   - Primary action (full width, accent gradient, white) varies by stage:
     - gesprek → "Stuur offerte"
     - review → "Goedkeuren"
     - uit → "WhatsApp opvolgen"
     - gepland → "Open afspraak"
     - klaar → "Vraag review"
   - Two secondary actions (chipBg, fg text)

6. **"Open volledig dossier"** button (transparent, 1px border, full-width)
   - Calls `onOpenLead(id)` → navigates to existing lead-detail route

---

## Filter Sheet

Triggered by header filter button. Bottom-sheet with backdrop.

**Backdrop:**
- Position absolute, inset 0
- Background `rgba(0,0,0,0.36)`
- Animation `lasFade .2s ease-out`

**Sheet:**
- Position bottom, full width
- Background `t.surface`, top-radius 22, padding-top 8
- max-height 88%, scrollable
- Animation `lasSlide .3s cubic-bezier(.32,.72,0,1)` — translate from `110%` to `0`
- Drag-handle: 38×5 pill, fgMuted+'50', centered top

**Header (padding 0 20 14):**
- "Filters" 19/800/-0.02em + badge with active count
- "Sluit" text button (accent)

**Sections (each 18px bottom margin):**

1. **Fase** (multi-select)
   - Section label 12/700/.06em uppercase
   - Sublabel 11.5px / fgMuted
   - Flex-wrap chips, gap 6
   - Each chip: padding 8×12, minHeight 36, radius 9999
     - On: `c + '20'` bg, `c` text, `1px solid c+'50'` border, check-icon prefix
     - Off: `t.chipBg` bg, `t.fgSoft` text

2. **Bron** (2-col grid)
   - WhatsApp (`t.wa` color) · Formulier (accent)
   - Buttons: flex 1, padding 10×12, minHeight 42, radius 12

3. **Snel filter — Alleen urgent** (toggle)
   - Full-width button, padding 12×14, minHeight 48, radius 12
   - On: `danger + '14'` bg, danger text, 40×24 toggle switch with white knob

4. **Sorteer op** (2-col grid)
   - 4 options: Binnengekomen / Offerteprijs / Naam (A–Z) / Fase
   - On: `accent + '14'` bg + `accent + '40'` border

**Footer (padding 8×20, flex gap 8):**
- "Wis" button (chipBg)
- "Toon X leads" primary button (accent gradient, live count, shadow)

---

## Lead Mock Data (MLShared.jsx)

11 leads. Structure:

```js
{
  id: 'L-2087',
  naam: 'Jeroen de Vries',
  plaats: 'Delft',
  stage: 'gesprek',  // 'gesprek'|'review'|'uit'|'gepland'|'klaar'
  dienst: 'Oprit · invegen + beschermlaag',
  m2: 145,
  fotos: 4,
  prijs: null,          // number or null
  bot: 'Surface stelt 2 vervolgvragen',
  binnen: '2 min',      // human-readable timestamp
  tone: 'blue',         // 'blue'|'amber'|'red'|'green'|'gray'
  actie: 'Stuur offerte',
  actieIcon: 'doc',
  why: 'Foto\'s ontvangen — offerte klaar voor review',
  bron: 'wa',           // 'wa'|'form'
  urgent: false,        // boolean
  datum: 'di 19 mei',   // optional, for scheduled/done
}
```

Replace this with real API data on integration. The `tone` field drives status-color; keep it.

---

# 2 · INBOX

## Purpose
WhatsApp-style chat inbox for client conversations. The Frontlix product has a built-in AI ("Surface") that auto-replies. Users monitor what Surface is doing, take over when needed, and respond to escalations.

## Architecture

The inbox has 3 screens, owned by `InboxFlow` (a simple state-machine):
- `list` — `InboxC` (the inbox list)
- `chat` — `ChatDetail` (chat conversation)
- `search` — `InboxSearch`

Navigation between them is local component-state. In production, hook this into the codebase's router.

---

## Screen A · InboxC (the list)

### Layout
Same shell as Leads: 54 top + 86 bottom safe area, scrollable.

**Header:** `IBHeader` component
- Title "Inbox"
- Subtitle: `<ALiveDot/> X live · Y ongelezen`
- Right: search button only (40×40, chipBg, search icon)

### Sections

The list is grouped into up to 5 sections, rendered in order. Sections with 0 items are hidden.

| Key    | Label       | Icon  | Tint            | Condition                          |
|--------|-------------|-------|-----------------|------------------------------------|
| pinned | Gepind      | pin   | `#D97706`       | `c.pinned === true`                |
| live   | Nu actief   | bolt  | `t.danger`      | timestamp matches `/^\d+m$/` or `nu` |
| today  | Vandaag     | clock | `t.accent`      | timestamp matches `/^\d+u$/`       |
| yest   | Gisteren    | cal   | `t.fgMuted`     | timestamp === 'gist'               |
| older  | Eerder      | doc   | `t.fgMuted`     | everything else                    |

**Definition of "Nu actief"**: any conversation with activity in the last 30 minutes (timestamps like "nu", "2m", "12m", "24m"). Pure time-based — does not include escalations.

### Section header
- 22×22 icon-tile with `tint + '18'` bg, tint-colored icon
- Section label 13/700/-0.005em
- Count chip (chipBg, 11/700/9999-radius)
- Optional sublabel ("· Laatste 30 minuten" for Nu actief)
- Hot indicator (`live` only): 6px pulsing dot with halo, `icPulse` animation (1.6s ease-in-out infinite)
- Right: "Markeer gelezen" text-button (accent) — only when section has unread

### Section content
Card-group container:
- Background `t.surface`, radius 12, overflow hidden, light shadow
- Each row separated by `0.5px solid borderSoft`
- No padding (rows handle their own padding)

### SwipeableInboxRow

Same swipe physics as `SwipeableCard` (`ICR_REVEAL = 144`, `ICR_THRESHOLD = 40`).

**Left actions (swipe →):** Bel (accent gradient) + WA (`t.wa`)
**Right actions (swipe ←):** Snooze (`t.warning`) + Archief (`t.danger`)

Tap (no movement) → `onOpenChat(id)`

### InboxRow (the row content)

Flex row, gap 12, padding 11×14.

1. **Avatar 40×40** with online-dot (12×12 success-colored, 2.5px white border on `t.surface` ring)
2. **Content (flex 1):**
   - Top row: name (14.5/`unread?700:600`) + timestamp (11px, accent if unread or danger if highlight)
   - Bottom row (margin-top 2, gap 6):
     - Sparkle prefix (12×12 rounded gradient `#0C7AB8 → #074F77` with sparkle icon) if speaker is surface
     - Voice indicator if voice msg
     - Preview text (12.5px, `unread?fg:fgMuted`, ellipsis)
     - Unread badge (`IBUnread`: 20×20 minWidth, accent bg, white, 9999 radius)

---

## Screen B · ChatDetail

### Layout
Flex column, full height.

**Header** (flex-shrink 0, padding 6×8×8):
- Background: `#075E54` (WA headerGreen) / `#1F2C33` dark
- Color: white
- Shadow: `0 1px 1px rgba(0,0,0,.15)`
- z-index 2

Contents (flex row, gap 6):
- Back button (36×36, transparent, back-arrow icon)
- Identity button (flex 1, tap → opens lead-sheet):
  - 36×36 avatar with online-dot (border-color matches header)
  - Name (16/600/-0.005em white)
  - Status line (12px / `rgba(255,255,255,.75)`): "online · tik voor info" or "tik voor info · {plaats}"
- Phone-button (40×40, phone icon white)
- Menu-button (40×40, three-dot icon white)

### Surface-toggle banner

Sits **below** the chat header, **above** the chat area.

**ON state:**
- Background light: `#E1F1FB` · dark: `rgba(12,122,184,.20)`
- Border-bottom: 0.5px subtle
- Padding 8×14
- Flex row gap 10:
  - 26×26 rounded square with blue gradient `linear-gradient(135deg, #0C7AB8, #074F77)`, white sparkle icon, shadow `0 2px 6px #0C7AB840`
  - Text column:
    - "Surface beantwoordt automatisch" (12.5/700 in `#0C7AB8`)
    - "Tik om Surface uit te zetten" (11px / 55% alpha)
  - Toggle switch 42×24, blue bg, white 20×20 knob shifted right

**OFF state:**
- Background light: `#F5EDE3` · dark: `rgba(255,255,255,.05)`
- 26×26 tile bg: `#FBE4C4` (light) / `#3A2F25` (dark), pause-icon (`#D97706`)
- "Jij neemt het gesprek over" (12.5/700 in `#8B5A2B` light / `#F0B36B` dark)
- "Surface gepauzeerd — berichten gaan via jou"
- Toggle: gray bg, knob shifted left
- **TypingBubble is hidden** when Surface is off

### Chat area
Scrollable (flex 1, overflow-y auto), background `WA.chatBg` (`#ECE5DD` light / `#0B141A` dark) with a subtle SVG-doodle overlay pattern (circles + triangles, opacity 0.04 on light / 0.024 on dark).

### MessageBubble

| From    | Side  | Background light | Background dark | Text color light | Text color dark |
|---------|-------|------------------|-----------------|------------------|-----------------|
| klant   | LEFT  | `#FFFFFF`        | `#1F2C33`       | `#111B21`        | `#E9EDEF`       |
| owner   | RIGHT | `#DCF8C6`        | `#005C4B`       | `#111B21`        | `#E9EDEF`       |
| surface | RIGHT | `#D7EEFB`        | `#103E5C`       | `#0B3F5C`        | `#A9D6F5`       |

**Important:** Surface speaks on behalf of the user — bubble is on the RIGHT, same side as owner. Color distinguishes them (Surface = blue, owner = green).

**Bubble style:**
- max-width 78%, padding 6×9×7 (or 6×10×6×6 for voice)
- Radius 7.5, with one "tail-cut" corner:
  - Right-side: top-right is 0 (unless `m.continued`)
  - Left-side: top-left is 0 (unless `m.continued`)
- Shadow `0 1px 0.5px rgba(0,0,0,.13)`
- Font 14.5 / line-height 1.34 / word-break: break-word
- white-space pre-wrap (preserves \n in mock data)

**Surface label** (above bubble, only on first of a run, when `!m.continued`):
- 11px / 700 / surface-accent color `#0C7AB8`
- Inline-flex with 12×12 sparkle tile (blue gradient)
- "Surface" text

**Time + ticks** (float right, ml 8, mt 1, mb -2):
- 11px / `wa.meta` (`#667781` light / `#8696A0` dark), tabular-nums
- Owner-only: read-tick svg (double check)
  - Color: `WA.tickBlue` (`#53BDEB`) if `m.read`, else `wa.meta`

### Voice bubble
- minWidth 180
- Play button 30×30 circle (`#FFFFFF40` on green, `#00000010` on white), inline SVG triangle
- Waveform: 22 vertical bars, width 2.5, varying height by `sin(i*1.7+1)*14+4`, opacity 0.55
- Duration `0:XX` 11px tabular-nums right-aligned

### DaySeparator
Centered pill: 12/500 / uppercase / `.04em`, color `#54656F` / `#8696A0` dark, background `rgba(255,255,255,.7)` / `rgba(11,20,26,.4)` dark, padding 5×13, radius 9999, soft shadow.

### SystemBanner
Like DaySeparator but slightly larger pill, multi-line allowed. Used once at the top: "Lead binnengekomen via WhatsApp · 1 dag geleden".

### TypingBubble (Surface only)
Rendered at bottom of chat when Surface is ON. Right-aligned. Surface-bubble style. Content:
- 13×13 sparkle gradient tile
- "Surface aan het typen" 12/600
- 3 animated dots (4×4, surface-fg, `typBlink 1.2s ease-in-out infinite`, staggered delay 0 / 0.16s / 0.32s, opacity 25% → 100%)

---

## Composer

Flex row, padding 6×6×8, padding-bottom safe-area. Background `#F0F0F0` light / `#1F2C33` dark.

**Input pill** (flex 1, radius 22, padding 4×4×4×6, white bg / `#2A3942` dark, light shadow):
- Emoji button (36×36, smiley-svg in `#54656F` / `#8696A0` dark)
- `<input>` (flex 1, transparent, 16px, "Bericht" placeholder)
- Attachment button (36×36, paperclip-svg)
- Camera button (36×36, only when no text)

**Send/Mic button** (46×46 circle, `WA.headerGreen`, white icon, shadow `0 2px 6px rgba(0,0,0,.18)`):
- No text → microphone icon (rect-stem + arc base)
- Has text → paper-plane send icon

---

## Lead-Info Bottom Sheet

Triggered by tap on header (name area).

Backdrop: `rgba(0,0,0,0.45)`, fade-in `.2s`.

Sheet: full-width, bottom-anchored, top-radius 22, `t.surface`, slide animation from `110%` (300ms cubic-bezier).

**Contents:**

1. **Drag handle** (38×5 pill)
2. **Identity row** (padding 0×20×14):
   - 56×56 avatar
   - Name 19/700/-0.015em, ellipsis
   - Meta `{id} · {plaats}` 13px / fgMuted
   - Stage pill (right)
3. **Stats grid** (4 cols, chipBg radius 12 padding 14×4):
   - Oppervlak / Foto's / Offerte / Laatste
4. **Dienst section** (label + body)
5. **Acties grid** (2 cols, gap 6):
   - "Stuur offerte" (primary accent-gradient)
   - "Plan afspraak" (chipBg)
   - "Surface overnemen" (chipBg)
   - "Archiveer" (chipBg)
6. **Sluit** button (full-width chipBg)

---

## Screen C · InboxSearch

Full-screen search.

**Header** (padding 4×12×12, flex row gap 8):
- Back button (40×40 transparent)
- Search input pill (flex 1, chipBg, radius 12, padding 9×12):
  - Search icon prefix
  - autoFocus input
  - X button to clear

**Empty state** (when query length < 2):
Card with usage tips:
- "Zoek door alle berichten — niet alleen op naam."
- 'Probeer: "factuur", "korting", "maandag".'
- "Resultaten worden gegroepeerd per gesprek."

**Results:**
- Indexes across `IC_MESSAGES` (all messages of all conversations)
- Matches: `m.body.toLowerCase().includes(query.toLowerCase())`
- Groups by `leadId`
- Limits: top 40 messages total

**Result row** (per group):
- Avatar 36 + name + match-count
- Up to 3 hit-snippets:
  - For klant: shows `m.time` prefix
  - For surface: shows blue gradient sparkle prefix
  - Snippet text with context (±30 chars before / +60 after match)
  - Match itself wrapped in `<mark>` with `accent + '40'` background, fg text, 3px radius
  - "…" prefix/suffix when truncated

---

## Inbox Mock Data (IBShared.jsx)

Built from `ML_LEADS` plus chat-specific fields:

```js
{
  ...lead,
  lastMsg: 'Hier zijn de foto\'s van mijn oprit, alvast bedankt!',
  speaker: 'klant',     // 'klant'|'surface'|'owner' — who spoke last
  unread: 2,            // count of unread messages
  online: true,         // klant currently online
  pinned: true,
  typing: 'surface',    // optional
  voice: false,
  voiceLen: 14,         // seconds, if voice
  escalated: false,     // needs your attention
  timestamp: 'nu',      // bucket-friendly string
}
```

Sort order:
- `pinned` first
- then `unread > 0` first within each group
- then by `order` (arrival)

---

## Chat Mock Data (ICShared.jsx)

`IC_MESSAGES[leadId]` is an array of:
- `{ system: true, body: '...' }` — system banner
- `{ day: 'gisteren' }` — day separator
- `{ id, from, time, body, voice?, voiceLen?, read?, continued? }` — message bubble

`from` is `'klant'|'surface'|'owner'`.

Only one full conversation is mocked for the prototype (`L-2087`). For integration, replace with paginated message fetch keyed by lead-id.

---

# Interactions & Behavior

## Animations

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Swipe-card snap | transform | 250ms | `cubic-bezier(.32,.72,0,1)` |
| ExpandedPanel reveal | opacity + translateY(-6px) | 250ms | `cubic-bezier(.32,.72,0,1)` |
| Filter-sheet backdrop | opacity | 200ms | ease-out |
| Filter-sheet slide | translateY(110% → 0) | 300ms | `cubic-bezier(.32,.72,0,1)` |
| Lead-sheet (chat) | same as filter | | |
| Live-section pulse | scale + opacity | 1.6s loop | ease-in-out |
| Typing dots | opacity 25% → 100% | 1.2s loop | ease-in-out, staggered 160ms |
| Search-input fade in | opacity | 200ms | ease-out |
| Filter toggle knob | left | 150ms | linear |

## Navigation flows

**Leads:**
- Tap card → ExpandedPanel inline (no nav)
- "Open volledig dossier" → existing lead-detail route
- "+" header → existing "new quote" modal (currently calls `window.__openManualQuote?.()`)

**Inbox:**
- Tap row → ChatDetail
- Tap chat header (name) → LeadInfoSheet
- Header back-button → back to list
- Header phone/menu → not yet wired
- Surface-toggle → flips state (no API call yet in mock)
- Search button → InboxSearch
- Search result row → ChatDetail of that lead

---

# Design Tokens (from `AShared.jsx`)

Two themes: `makeATheme({ dark: false })` and `makeATheme({ dark: true })`. Both expose:

| Token       | Light                | Dark                |
|-------------|----------------------|---------------------|
| `bg`        | `#F7F8FA`            | `#0B0F14`           |
| `surface`   | `#FFFFFF`            | `#161B22`           |
| `chipBg`    | `#EFF1F4`            | `#22272E`           |
| `fg`        | `#0F172A`            | `#E6EDF3`           |
| `fgSoft`    | `#475569`            | `#9AA5B1`           |
| `fgMuted`   | `#94A3B8`            | `#6B7280`           |
| `border`    | `#E2E8F0`            | `#30363D`           |
| `borderSoft`| `#EEF1F4`            | `#21262D`           |
| `accent`    | `#1A56FF`            | `#3B82F6`           |
| `accent2`   | `#5B6CFF`            | `#6B7BFF`           |
| `success`   | `#10B981`            | `#34D399`           |
| `warning`   | `#F59E0B`            | `#FBBF24`           |
| `danger`    | `#EF4444`            | `#F87171`           |
| `wa`        | `#25D366`            | `#25D366`           |

(Confirm exact values in `source/shared/AShared.jsx` — these are the reference.)

## WhatsApp palette (Inbox chat only)

```js
const WA = {
  headerGreen:  '#075E54',     // chat header bg light
  brandGreen:   '#25D366',     // brand / send button
  teal:         '#128C7E',     // classic WA teal
  outBg:        '#DCF8C6',     // outgoing bubble (owner) light
  outBgDark:    '#005C4B',
  inBg:         '#FFFFFF',     // incoming (klant) light
  inBgDark:     '#1F2C33',
  chatBg:       '#ECE5DD',     // chat background light
  chatBgDark:   '#0B141A',
  surfaceBg:        '#D7EEFB', // Surface bubble light (WA-blue derived)
  surfaceBgDark:    '#103E5C',
  surfaceText:      '#0B3F5C',
  surfaceTextDark:  '#A9D6F5',
  surfaceAccent:    '#0C7AB8',
  link:         '#34B7F1',
  tickBlue:     '#53BDEB',     // read receipts
  meta:         '#667781',     // timestamps grey light
  metaDark:     '#8696A0',
};
```

## Border-radius scale
- 7.5px — message bubbles
- 9px / 10px / 11px — small chips/cards
- 12px — medium card / chip-bg sections
- 14px — cards
- 16px — large cards / hero
- 22px — bottom-sheet top-radius
- 9999px — pills, buttons

## Typography scale
All sizes in px. System font stack (no custom font required).

| Size | Weight | Use                                |
|------|--------|------------------------------------|
| 10   | 600/700 | Stat-labels, micro-meta (uppercase) |
| 11   | 500-700 | Timestamps, badges                  |
| 12   | 600/700 | Section headers, meta               |
| 12.5–13 | 400-600 | Body, preview text                |
| 13.5–14.5 | 600/700 | Row names, card titles          |
| 15.5–16 | 600/700 | Chat header name, names           |
| 17    | 800     | Price values                        |
| 19    | 700     | Sheet titles                        |
| 22    | 800     | Section titles                      |
| 28    | 800     | Screen titles (Leads / Inbox)       |

Letter-spacing: -0.025em (display titles) · -0.015em (large headings) · -0.01em (tabular numbers) · -0.005em (names) · .04em (uppercase labels) · .06em (section labels)

## Spacing scale (px)
Used consistently: 2, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 26, 38, 42, 44, 46, 48, 54, 86

---

# State Management

Each screen owns its local state. Hoist into the app's state-management (Redux/Zustand/React Query) as appropriate.

## LeadsScreen
```js
filter       // string, segmented-chip selection ('all'|stage-key)
searchOpen   // boolean
search       // string
expandedId   // string|null
sheetOpen    // boolean
advFilter    // { stages:Set, bronnen:Set, urgentOnly:bool, sort:string }
```

## InboxFlow
```js
view  // { name: 'list'|'chat'|'search', chatId?: string }
```

## ChatDetail
```js
draft        // string (composer input)
sheetOpen    // boolean (lead-info)
surfaceOn    // boolean (Surface auto-reply toggle)
```

## InboxSearch
```js
q  // string
```

---

# Responsive behavior

Designs are **mobile-only** (target 402×874 viewport — iPhone-class). Desktop versions exist separately in the Frontlix codebase. On wider viewports, the mobile shell renders inside an iOS device-frame in the prototypes; in production it should activate below a breakpoint (e.g. `<768px`) or via a "mobile preview" toggle.

---

# Integration notes

In the existing Frontlix codebase:
- A `MobileFlow.jsx` already exists that handles routing within the mobile shell (`overzicht` / `leads` / `inbox` / `agenda` / `reviews`).
- The leads screen integrates at `page === 'leads'` calling `<LeadsScreen t={t} showBottomNav={false} onOpenLead={(id) => navigate('leads/' + id)}/>`.
- The inbox screen integrates at `page === 'inbox'` calling `<InboxFlow dark={!!t.dark}/>`.

When you port:
1. Strip inline styles → adopt your styling system.
2. Replace `window.AIcon` / `window.AAvatar` etc. with proper imports.
3. Replace mock data with API hooks.
4. Wire navigation to your router.
5. Replace the `window.__openManualQuote?.()` global with an explicit handler.
6. Add real API calls behind the Surface-toggle (when user flips it, send a "pause AI" command to the backend).
7. Real message-send (`Composer`): currently `draft` is local state, button doesn't submit.

---

# Assets

No external assets are required — all icons are inline SVG via the `AIcon` component. Avatars are auto-generated colored circles with initials (no external avatar service).

Logo file `assets/frontlix-logo.png` is referenced only by the prototype HTML favicon, not by the design components.
