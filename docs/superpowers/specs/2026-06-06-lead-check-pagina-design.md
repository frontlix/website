# Lead-check-pagina — definitief design

**Datum:** 2026-06-06 · **Status:** design akkoord, klaar voor implementatieplan
**Basis:** [2026-06-02-lead-lek-check-spec.md](./2026-06-02-lead-lek-check-spec.md) (6 vragen, rekenformule, honesty-regels blijven 1-op-1 gelden)
**Besluit:** eigenaar herziet op 2026-06-06 bewust het parkeer-besluit van ~2026-06-01 ("pagina niet bouwen"); de volledige `/lead-check`-pagina wordt nu gebouwd. Onbeantwoorde-lead-radar (nr. 1 uit het bouwkansen-rapport) is door de eigenaar afgestreept.

## Vandaag besloten (bovenop de basis-spec)

1. **Flow = wizard:** 6 vragen, één per scherm, voortgangsbalk + "vraag X/6", terugknop, grote tikbare antwoordknoppen. Na vraag 6 direct het uitslagscherm.
2. **Mail-capture zit in de MVP:** na de uitslag een optioneel mailveld ("Wil je de volledige analyse met 3 concrete tips? Laat je mail achter"). Submit stuurt antwoorden + uitslag naar Frontlix via het bestaande `app/api/contact`-patroon (nodemailer) zodat de eigenaar binnen een minuut persoonlijk kan opvolgen (practice what you preach). Form-tracking-event mee via het bestaande `app/api/form-tracking`-patroon.
3. **Zichtbaar in navigatie:** link "Lead-check" in Navbar én Footer, plus een kleine teaser-sectie op de homepage met startknop.
4. **CTA-bestemming:** primaire knop "Plan een demo" linkt naar `/contact` met vooringevuld onderwerp (lead-check-uitslag als context). Ondersteunt het contactformulier nog geen voorinvulling via query-param, dan wordt die kleine uitbreiding onderdeel van dit werk. Mail-capture is de secundaire actie.

## Componenten en bestanden

| Onderdeel | Plek | Doel |
|---|---|---|
| Pagina | `app/(main)/lead-check/page.tsx` | Server component: hero, metadata, rendert de wizard |
| Wizard | `app/(main)/lead-check/LeadCheckWizard.tsx` + `.module.css` | Client component: vraagstappen, state, uitslagscherm, mail-capture |
| Rekenlogica | `lib/leadCheck.ts` | Pure functies (formule uit basis-spec 1-op-1), geen React, los testbaar |
| Tests | `lib/leadCheck.test.ts` | Unit-tests op formule, randgevallen en band-berekening |
| Navigatie | bestaande Navbar/Footer-sections | Link "Lead-check" toevoegen |
| Homepage-teaser | bestaande homepage-sections | Kleine sectie met 1 zin + startknop naar `/lead-check` |

## Dataflow

Invoer (6 antwoorden) → `lib/leadCheck.ts` rekent client-side score + banden → uitslagscherm. Geen backend-call voor de berekening. Alleen bij mail-submit: POST naar bestaand contact-endpoint (mail naar eigenaar met antwoorden + uitslag) + form-tracking-event. PostHog-events vanuit de wizard: `lead_check_start`, `lead_check_step` (met stapnummer), `lead_check_complete` (met score), `lead_check_cta_demo`, `lead_check_email_submitted`.

## Randgevallen

- `A_week = 0` → vriendelijke melding ("zonder aanvragen valt er nog niets te lekken") + zachte CTA, geen rekenuitslag.
- Score 0 (alles al supersnel) → compliment-variant + zachtere demo-uitnodiging.
- Invoer begrensd: `A_week` 0–500, `orderwaarde` €0–€100.000, conversie 1–100%; geen negatieve waarden mogelijk.
- Mail-submit faalt → nette foutmelding, uitslag blijft staan, demo-knop blijft werken.

## Brand- en copy-regels (hard)

- Alle kleuren/spacing/radius uit `styles/tokens.css`; CSS Modules; mobile-first; semantic HTML; invoervelden ≥16px (iOS-zoom).
- Honesty-regels uit de basis-spec: alles als schatting/band, aannames tonen ("zo rekenen we"), anker "78% kiest het bedrijf dat als eerste reageert", conservatieve factoren.
- Geen "AI"-woord in de copy; geen streepjes als leesteken in klantgerichte teksten.
- Gauge en CTA in `--color-gradient`; geen warme kleuren.

## Testen en verificatie

- Unit-tests op `lib/leadCheck.ts` (vitest): bekende invoer → verwachte score/banden, alle randgevallen.
- Visuele verificatie via de bestaande screenshot-workflow (`node screenshot.mjs http://localhost:3000/lead-check`) op mobiel- en desktop-viewport.
- Verifiëren met `tsc`/lint; geen `next build` tijdens een draaiende dev-server (projectregel).

## Buiten scope (bewust)

- Geen PDF-rapport, geen benchmark-data-laag, geen persoonlijke deel-links (dat waren aparte, lager gescoorde varianten uit het bouwkansen-rapport).
- Geen wijziging aan de DM-versie/linkedin-crm-skill.
