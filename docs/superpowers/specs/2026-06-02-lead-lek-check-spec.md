# Lead-lek-check — volledige spec (build-ready)

**Datum:** 2026-06-02 · **Status:** uitgewerkt, nog niet gebouwd · **Context:** [[frontlix-linkedin-growth-strategy-jun2026]]

## Wat het is
Een gratis, 1-minuut-diagnose die een MKB-ondernemer laat zien **hoeveel aanvragen + omzet hij maandelijks misloopt door trage lead-opvolging**. Drie rollen tegelijk:
1. **Website-lead-magneet** (eigen pagina, bv. `/lead-check`) → vangt Frontlix' eigen leads.
2. **Demo-brug in outbound** (DM-versie, trigger-woord "LEKCHECK") → waarde-eerst i.p.v. pitch.
3. **Content** (carousel/video "doe de lead-lek-check") → bereik.

Kernpsychologie: de ondernemer maakt **zelf** de rekensom en voelt zijn eigen pijn. Eerlijk en transparant labelen als **schatting/indicatie** (geen valse precisie → behoudt geloofwaardigheid).

## De 6 vragen (inputs)
1. **Aanvragen per week** via je website/formulier? — getal `A_week`
2. **Hoe snel reageer je meestal** op een nieuwe aanvraag? — keuze `speed`: `5min` / `1uur` / `paar_uur` / `zelfde_dag` / `volgende_dag`
3. **Reageer je ook buiten kantooruren** ('s avonds/weekend)? — keuze `afterhours`: `altijd` / `soms` / `nee`
4. **Welk deel van je aanvragen wordt klant?** — % `conversie` (slider, default 30%)
5. **Gemiddeld orderbedrag?** — euro `orderwaarde`
6. **Vragen klanten meestal ook bij anderen offertes aan?** — keuze `shoppen`: `meestal` / `soms` / `zelden`

## De rekenformule (transparant, conservatief)
```
A_maand        = A_week * 4.33
klanten_maand  = A_maand * (conversie/100)
omzet_maand    = klanten_maand * orderwaarde

# basis-uplift = relatieve extra conversie die haalbaar is met directe (60s) opvolging
base = { 5min:0.00, 1uur:0.08, paar_uur:0.18, zelfde_dag:0.30, volgende_dag:0.45 }[speed]
afterhours_bonus = { altijd:0.00, soms:0.05, nee:0.12 }[afterhours]
shop_mult = { meestal:1.0, soms:0.65, zelden:0.35 }[shoppen]

uplift = min(0.60, (base + afterhours_bonus) * shop_mult)

extra_klanten_maand = klanten_maand * uplift
gemiste_omzet_maand = extra_klanten_maand * orderwaarde
gemiste_omzet_jaar  = gemiste_omzet_maand * 12

lek_score (0-100) = round(uplift / 0.60 * 100)
# Toon bedragen als BAND (onzekerheid): laag = *0.7, hoog = *1.0 van de schatting.
```
**Anker in de copy:** "78% kiest het bedrijf dat als eerste reageert." (NIET de "82%"-claim — die is misgeattribueerd; zie [[frontlix-icp-research-jun2026]].)

## Output (resultaatscherm)
- **Lek-score** 0–100 als visuele gauge (gradient `--color-gradient`).
- **Geschat ~X gemiste aanvragen/maand** en **±€[laag]–€[hoog] misgelopen omzet/maand** (+ /jaar).
- **2–3 verbeterpunten**, conditioneel op de antwoorden:
  - `speed >= paar_uur` → "Sneller reageren is je grootste hefboom: binnen een uur i.p.v. [huidig] kan je conversie merkbaar verhogen."
  - `afterhours != altijd` → "Aanvragen die 's avonds/weekend binnenkomen liggen tot de volgende werkdag — daar lekt het hardst."
  - `conversie < 25` → "Een deel haakt af vóór contact; snelle, persoonlijke opvolging tilt dit op."
  - `shoppen == meestal` → "Je klanten vergelijken — dan wint wie als eerste een goede offerte stuurt."
- **CTA:** "Zo dicht je dit lek: Frontlix reageert binnen 60 seconden, 24/7, en zet je offerte automatisch klaar. → Plan een demo." (vermijd het woord "AI"; gebruik "automatisch / slim / het systeem").

## Als website-pagina (`/lead-check`)
- **Hero:** "Hoeveel leads laat jij liggen? Doe de gratis lead-lek-check — 1 minuut, geen account."
- **Flow:** stapsgewijze form (6 vragen, mobile-first, progress-indicator) → resultaatscherm.
- **Rekenen volledig client-side** (geen backend nodig voor de berekening).
- **Lead-capture (optioneel, krachtig):** "Wil je de volledige analyse + 3 concrete tips? Laat je mail achter." → hergebruik het bestaande `app/api/contact` + `app/api/form-tracking`-patroon. *Meta-bewijs: reageer op die lead binnen 60s met Frontlix zelf — practice what you preach.*
- **Tech/brand:** Next.js App Router-pagina in `app/(main)/lead-check/`, CSS Modules, **alle kleuren uit `styles/tokens.css`** (geen hardcoded), Inter, `--radius-*`, gradient op gauge/CTA, semantic HTML, mobile-first. Icons via `lucide-react` alleen waar nodig. PostHog-events op start/voltooien/CTA.
- **SEO:** `generateMetadata` — titel "Lead-lek-check · Frontlix", korte meta.

## DM-versie (nu, handmatig)
Stel de 6 vragen in een LinkedIn-DM, reken de score met de formule (of een klein scriptje), stuur de uitkomst + 2 verbeterpunten terug. Trigger-woord **LEKCHECK** in posts/profiel/Featured stuurt mensen hierheen. Dit is de waarde-eerste brug die in `linkedin-crm` overgaat naar fase "warme inbound".

## Honesty-regels (niet-onderhandelbaar)
- Alles labelen als **schatting/indicatie**; toon de aannames ("we nemen aan dat…").
- Bedragen als **band**, niet één scherp getal.
- Geen "AI"-woord in de copy (brand-regel).
- Conservatieve factoren; liever onderschatten dan overdrijven (geloofwaardigheid bij een sceptische ondernemer).

## Vervolg
Bouwen als losse Next.js-pagina (`/lead-check`) — losstaand component, past in de must-do kern als demo-brug. Eerst desnoods de handmatige DM-versie gebruiken.
