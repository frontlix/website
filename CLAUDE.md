# CLAUDE.md — Frontlix Website

Read this file fully before writing or changing any code.

---

## Always Do First

- Always explain **what you are going to do** before writing code or modifying files
- Always ask for **confirmation** before deleting or renaming files
- Never work on more than **one page or component at a time** without an intermediate check
- If anything is unclear: **ask a question** — never make assumptions
- After every task, give a **short summary** of what changed
- Always add **comments** to complex logic or CSS tricks

---

## Self-Improvement Loop

Every failure is a chance to make the system stronger. When something breaks, always follow these steps:

1. **Identify** what broke
2. **Fix** the tool or file
3. **Verify** the fix works
4. **Update** the workflow / `CLAUDE.md` with the new approach
5. **Move on** with a more robust system

---

## Screenshot Workflow

- Puppeteer is installed as a dev dependency (`npm install --save-dev puppeteer`). `screenshot.mjs` lives in the project root.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten)
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root — use it as-is
- After screenshotting, read the PNG from `temporary screenshots/` — Claude can view and analyze it directly
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Always check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Manual Screenshot Handling

- Any screenshot file dropped or saved in the project root (e.g. `Screenshot 2026-03-*.png`)
  must be **immediately moved** to `./temporary screenshots/` before any other action
- If `./temporary screenshots/` does not exist, create it first
- Renamed format: `screenshot-manual-YYYY-MM-DD-HH-MM.png` (so it stays consistent with auto screenshots)
- After moving, **read and analyze** the screenshot for visual issues:
  - spacing / padding inconsistencies
  - wrong font sizes or weights
  - color deviations from brand tokens
  - alignment or layout issues
- Log findings as a short bullet list, then propose fixes
- Never leave screenshot files in the project root

```

---

**Why this works:** Claude Code reads `CLAUDE.md` before every session. With this rule, the moment it sees a `Screenshot *.png` in the root, it knows to move it, read it, and self-improve — no manual prompting needed.

**Bonus tip:** You can also add this one-liner to `.gitignore` so screenshots never accidentally get committed:
```

temporary screenshots/

---

## Project Overview

- **Company:** Frontlix
- **Type:** Business website / portfolio
- **Goal:** Attract new clients and showcase services
- **Tone:** Professional, modern, tech-forward, premium
- **Language:** Dutch (default), English optional per page

---

## Tech Stack

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** CSS Modules + global CSS custom properties — no Tailwind, no external UI libs
- **Package manager:** `npm` — never use `yarn` or `pnpm`
- **Node version:** LTS (≥ 20)
- **Linting:** ESLint + Prettier
- **Icons:** `lucide-react` (only when necessary)
- **Fonts:** Google Fonts via `next/font`

---

## Brand & Colors

All tokens live in `styles/tokens.css`. Never hardcode colors outside this file.

```css
:root {
  --color-bg: #0a0a0a;
  --color-surface: #111111;
  --color-surface-2: #1a1a1a;

  --color-primary: #1a56ff;
  --color-accent: #00cfff;
  --color-gradient: linear-gradient(135deg, #1a56ff, #00cfff);

  --color-text: #f0f0f0;
  --color-text-muted: #888888;
  --color-border: rgba(255, 255, 255, 0.08);
}
```

- Dark theme always — **never** a white background
- Apply gradient to: headings, CTA buttons, accents, borders (subtle)
- Subtle glassmorphism allowed on cards: `backdrop-filter: blur(12px)`
- Never use bright or warm colors (red, orange, yellow) — strict blue/cyan palette only

---

## Typography

```css
:root {
  --font-heading: "Inter", sans-serif;
  --font-body: "Inter", sans-serif;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;
}
```

---

## Spacing & Layout

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  --max-width: 1200px;
  --section-padding: var(--space-24) var(--space-6);
}
```

---

## Folder Structure

```
/
├── CLAUDE.md
├── app/
│   ├── layout.tsx               ← root layout, metadata, fonts
│   ├── page.tsx                 ← Home
│   ├── over-ons/page.tsx        ← About
│   ├── diensten/page.tsx        ← Services
│   └── contact/page.tsx         ← Contact
├── components/
│   ├── ui/                      ← Button, Card, Badge, GradientText
│   └── sections/                ← Navbar, Footer, Hero, Services, About, ContactForm
├── public/
│   ├── logo_frontlix_trans.png
│   └── images/
├── styles/
│   ├── globals.css
│   └── tokens.css               ← all CSS custom properties
└── lib/                         ← utility functions
```

---

## Pages

| Route       | File                    | Sections                                    |
| ----------- | ----------------------- | ------------------------------------------- |
| `/`         | `app/page.tsx`          | Hero, Services preview, About teaser, CTA   |
| `/over-ons` | `app/over-ons/page.tsx` | Story, mission, team                        |
| `/diensten` | `app/diensten/page.tsx` | All services, description, optional pricing |
| `/contact`  | `app/contact/page.tsx`  | Form, contact details                       |

---

## Component Rules

- Every component has its own `.module.css` file alongside the `.tsx` file
- Always type props with a TypeScript interface
- Use `children` prop where it makes sense
- No inline styles — always use CSS custom properties or CSS Modules
- Animations via CSS `@keyframes` or `transition` — no Framer Motion unless explicitly requested

---

## Scripts

```bash
npm run dev       # local dev server at http://localhost:3000
npm run build     # production build
npm run start     # start production server
npm run lint      # run ESLint
npm run format    # run Prettier
```

- Always run `npm run lint` after larger changes
- Always run `npm run build` to verify there are no TypeScript errors

---

## Do's

- Always write **mobile-first** CSS
- Use semantic HTML: `<header>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<nav>`
- Add `alt` text to all images
- Use `next/image` for images and `next/link` for internal navigation
- Give every section a unique `id` for anchor linking
- Apply gradient as `background-clip: text` for special headings

## Don'ts

- No `<div>` where a semantic element fits
- No hardcoded colors outside `tokens.css`
- No `!important` in CSS
- No external UI libraries without explicit approval
- No `yarn` or `pnpm`
- Never use light backgrounds

---

## Deployment

- **Platform:** VPS via Hostinger — Next.js running as a Node.js process
- **Process manager:** PM2
- **Web server:** Nginx as reverse proxy (port 3000)
- **HTTPS:** Let's Encrypt via Certbot

```bash
git pull origin main       # pull latest version
npm install                # install dependencies
npm run build              # create production build
pm2 restart frontlix       # restart server
```

- Never push directly to `main` without a passing local `npm run build`
- `.env.local` is **never** in Git — always in `.gitignore`
- Set production `.env` manually on the VPS

---

## Environment Variables

Names only here — never values.

```env
NEXT_PUBLIC_SITE_URL=      # e.g. https://frontlix.nl
NEXT_PUBLIC_SITE_NAME=     # Frontlix

# Contact form — mail solution not yet chosen:
# RESEND_API_KEY=
# MAIL_USER=
# MAIL_PASS=
```

---

## Contact Form

- **Status:** mail solution not yet chosen
- Fields: Name, Email, Subject, Message
- Send logic goes in `app/api/contact/route.ts`
- Until the mail solution is decided: build the form **without** send logic — UI only

---

## Git Conventions

- **Branches:** `main` (production) — `dev` (development). Always work on `dev`, merge to `main` when ready
- Only push to `main` after a passing `npm run build`
- Every commit = one logical change

```
feat: added hero section
fix: corrected navbar padding on mobile
style: refined gradient on heading
refactor: split Button component
chore: updated dependencies
```

---

## Browser Support

Modern browsers only (Chrome, Firefox, Safari, Edge — last 2 versions). No IE fallbacks needed.

Use freely: `CSS Grid`, `Flexbox`, `CSS custom properties`, `container queries`, `clamp()`, `:has()`, `aspect-ratio`, `backdrop-filter`

---

## Development Phases

**Phase 1 — Foundation**

- [ ] Initialize Next.js project
- [ ] Set up `tokens.css` and `globals.css`
- [ ] Build `Navbar` and `Footer`
- [ ] Integrate logo

**Phase 2 — Pages**

- [x] Home (`Hero`, `Services preview`, `CTA`)
- [x] Services page
- [x] About page
- [x] Contact page + form

**Phase 3 — Polish**

- [ ] Animations and hover effects
- [ ] SEO metadata per page (`generateMetadata`)
- [ ] Responsive fine-tuning (mobile, tablet, desktop)
- [ ] Performance check (`npm run build`)

---

_Last updated: March 2026_
