CLAUDE.md — Frontlix Website
Dit bestand beschrijft de volledige projectopzet voor de Frontlix bedrijfswebsite.
Lees dit bestand altijd volledig voordat je code schrijft of aanpast.

📌 Projectoverzicht

Bedrijfsnaam: Frontlix
Type: Bedrijfswebsite / portfolio
Doel: Nieuwe klanten aantrekken en diensten presenteren
Toon: Professioneel, modern, tech-forward, premium
Taal: Nederlands (standaard), Engels optioneel per pagina


🛠️ Tech Stack

Framework: Next.js (App Router, TypeScript)
Styling: CSS Modules + globale CSS custom properties (geen Tailwind, geen externe UI-libs)
Package manager: npm — gebruik nooit yarn of pnpm
Node versie: LTS (≥ 20)
Linting: ESLint + Prettier
Iconen: lucide-react (alleen indien nodig)
Fonts: Google Fonts via next/font


🎨 Huisstijl
Kleuren (CSS custom properties in styles/tokens.css)
css:root {
  --color-bg:          #0A0A0A;
  --color-surface:     #111111;
  --color-surface-2:   #1A1A1A;

  --color-primary:     #1A56FF;
  --color-accent:      #00CFFF;
  --color-gradient:    linear-gradient(135deg, #1A56FF, #00CFFF);

  --color-text:        #F0F0F0;
  --color-text-muted:  #888888;
  --color-border:      rgba(255, 255, 255, 0.08);

  --color-white:       #FFFFFF;
  --color-black:       #000000;
}
Typografie
css:root {
  --font-heading: 'Inter', sans-serif;   /* Bold, tight letter-spacing */
  --font-body:    'Inter', sans-serif;

  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  1.875rem;
  --text-4xl:  2.25rem;
  --text-5xl:  3rem;
}
Spacing & layout
css:root {
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  16px;
  --radius-xl:  24px;
  --radius-full: 9999px;

  --max-width: 1200px;
  --section-padding: var(--space-24) var(--space-6);
}
Stijlregels

Donker thema altijd — nooit een witte achtergrond
Gradient toepassen op: headings, CTA-knoppen, accenten, borders (subtiel)
Swoosh/speed-gevoel verwerken in animaties (slide-in, glow-effecten)
Glassmorphism subtiel toestaan op cards: backdrop-filter: blur(12px)
Nooit felle of warme kleuren (rood, oranje, geel) — strikt blauw/cyaan palet


📁 Mappenstructuur
/
├── CLAUDE.md
├── app/
│   ├── layout.tsx          ← root layout, metadata, fonts
│   ├── page.tsx            ← Home
│   ├── over-ons/
│   │   └── page.tsx
│   ├── diensten/
│   │   └── page.tsx
│   └── contact/
│       └── page.tsx
├── components/
│   ├── ui/                 ← herbruikbare elementen
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── GradientText.tsx
│   └── sections/           ← paginasecties
│       ├── Navbar.tsx
│       ├── Footer.tsx
│       ├── Hero.tsx
│       ├── Services.tsx
│       ├── About.tsx
│       └── ContactForm.tsx
├── public/
│   ├── logo_frontlix_trans.png
│   └── images/
├── styles/
│   ├── globals.css
│   └── tokens.css          ← alle CSS custom properties
└── lib/                    ← utility functies

📄 Pagina's
RouteBestandSecties/app/page.tsxHero, Services preview, About teaser, CTA/over-onsapp/over-ons/page.tsxVerhaal, missie, team/dienstenapp/diensten/page.tsxAlle diensten, uitleg, tarieven optioneel/contactapp/contact/page.tsxFormulier, contactgegevens

🧩 Componenten — afspraken

Elk component heeft zijn eigen .module.css bestand naast het .tsx bestand
Props altijd voorzien van een TypeScript interface
children prop gebruiken waar logisch
Geen inline styles — altijd CSS custom properties of CSS Modules
Animaties via CSS (@keyframes) of transition, geen Framer Motion tenzij expliciet gevraagd


⚙️ Scripts & Tools
bashnpm run dev       # lokale dev server op http://localhost:3000
npm run build     # productie build
npm run start     # productie server starten
npm run lint      # ESLint uitvoeren
npm run format    # Prettier uitvoeren

Run altijd npm run lint na grotere wijzigingen
Run npm run build om te verifiëren dat er geen TypeScript-fouten zijn


✅ Do's

Altijd mobile-first CSS schrijven
Gebruik semantische HTML: <header>, <main>, <section>, <article>, <footer>, <nav>
Voeg alt-teksten toe aan alle afbeeldingen
Gebruik next/image voor alle afbeeldingen
Gebruik next/link voor interne navigatie
Elke sectie krijgt een unieke id voor ankerlinking
Gradient toepassen als background-clip: text voor speciale headings

❌ Don'ts

Geen <div> gebruiken waar een semantisch element past
Geen hardcoded kleuren buiten tokens.css
Geen !important in CSS
Geen externe UI-libraries zonder expliciete toestemming
Geen yarn of pnpm
Nooit lichte achtergronden — het thema is en blijft donker


🤖 Claude Code gedragsregels
Dit zijn vaste werkafspraken — altijd opvolgen, zonder uitzondering:

Leg altijd eerst uit wat je gaat doen voordat je code schrijft of bestanden aanpast
Vraag altijd bevestiging voordat je bestanden verwijdert of hernoemt
Maak nooit meer dan één pagina of component tegelijk zonder tussentijdse check
Als iets onduidelijk is: stel een vraag in plaats van een aanname te doen
Geef na elke taak een korte samenvatting van wat er is gewijzigd
Voeg altijd comments toe bij complexe logica of CSS-trucs


🚀 Deployment

Platform: VPS via Hostinger
Technologie: Next.js draait als Node.js-proces op de VPS
Procesbeheer: PM2 (houdt de Next.js server actief na herstart)
Webserver: Nginx als reverse proxy (stuurt verkeer door naar Next.js op poort 3000)
HTTPS: Let's Encrypt SSL-certificaat via Certbot

Deployment commando's (op de VPS)
bashgit pull origin main       # laatste versie ophalen
npm install                # dependencies installeren
npm run build              # productie build maken
pm2 restart frontlix       # server herstarten
Belangrijke regels

Nooit direct op main pushen zonder lokale npm run build te draaien
.env.local staat nooit in Git — altijd in .gitignore
Productie .env handmatig instellen op de VPS


🔐 Omgevingsvariabelen
Geheime sleutels staan nooit in de code, altijd in .env.local (lokaal) of als omgevingsvariabele op de VPS.
In CLAUDE.md staan alleen de namen, nooit de waarden.
envNEXT_PUBLIC_SITE_URL=      # bijv. https://frontlix.nl — voor canonical URLs en SEO
NEXT_PUBLIC_SITE_NAME=     # Frontlix

# Contactformulier — mailoplossing nog niet gekozen, later invullen:
# RESEND_API_KEY=
# MAIL_USER=
# MAIL_PASS=

⚠️ Voeg .env.local altijd toe aan .gitignore


📬 Contactformulier

Status: mailoplossing nog niet gekozen
De contactpagina krijgt alvast een formulier met velden: Naam, E-mail, Onderwerp, Bericht
De verzendlogica komt in app/api/contact/route.ts (Next.js API-route)
Zodra de mailkeuze gemaakt is (Resend, Nodemailer of Formspree), wordt deze sectie aangevuld
Tot die tijd bouwt Claude het formulier zonder verzendlogica — alleen de UI


🌿 Git-conventies

Branches: main (productie) en dev (ontwikkeling) — werk altijd op dev, merge naar main als iets klaar is
Commit stijl: gebruik duidelijke prefixen:

feat: hero sectie toegevoegd
fix: navbar padding op mobile gecorrigeerd
style: gradient op heading verfijnd
refactor: Button component opgesplitst
chore: dependencies bijgewerkt

Elke commit beschrijft één logische wijziging — geen bulk-commits
Push naar main alleen na npm run build zonder fouten


🌐 Browserondersteuning

Doelgroep: alleen moderne browsers (Chrome, Firefox, Safari, Edge — laatste 2 versies)
Geen ondersteuning voor Internet Explorer of oudere browsers
Claude mag dus moderne CSS gebruiken zonder fallbacks:

CSS Grid en Flexbox
CSS custom properties (variabelen)
container queries
clamp() voor fluid typography
:has() selector
aspect-ratio
backdrop-filter




🚀 Ontwikkelfases
Fase 1 — Fundament

 Next.js project initialiseren
 tokens.css en globals.css opzetten
 Navbar en Footer bouwen
 Logo integreren

Fase 2 — Pagina's

 Home (Hero, Services preview, CTA)
 Diensten pagina
 Over ons pagina
 Contact pagina + formulier

Fase 3 — Polish

 Animaties en hover-effecten
 SEO-metadata per pagina (generateMetadata)
 Responsive finetuning (mobile, tablet, desktop)
 Performance check (npm run build)

