"""FAQ knowledge base voor de Frontlix WhatsApp-bot.

Single source of truth voor wat de bot mag claimen over Frontlix-de-dienst.
Alle feiten komen uit frontlix.com (lib/faq-data.ts + over-ons + diensten +
contact + privacy + algemene voorwaarden + Hero/Services/Footer).

Wordt door reply.generate_reply geinjecteerd in de system prompt wanneer
analysis.intent == "faq_question". Claim-bullets per onderwerp, zodat het LLM
zelf de relevante claim kan kiezen op basis van de klant-formulering.
Voorkomt dat de klantvraag exact moet matchen met een vooraf gedefinieerde
FAQ-vraag.

Bij uitbreiding: voeg alleen claims toe die feitelijk op frontlix.com staan.
Geen verzonnen details, geen externe bronnen.
"""

FAQ_SECTION = """**Wat Frontlix doet**
- Automatische leadopvolging via WhatsApp: als iemand een formulier invult of bericht stuurt, neemt het systeem het gesprek automatisch over.
- Reageert binnen 60 seconden op elke nieuwe lead.
- Van eerste aanvraag tot offerte tot afspraak, volledig geautomatiseerd.

**Hoe het proces werkt (6 stappen)**
1. Lead komt binnen via formulier, advertentie of social media en wordt opgeslagen in CRM.
2. Automatische WhatsApp-conversatie stelt de juiste vragen en verzamelt alle info.
3. Offerte wordt in seconden gegenereerd inclusief PDF.
4. Eigenaar krijgt een e-mail met alle gegevens en keurt goed of past aan met een klik.
5. Offerte wordt verstuurd via WhatsApp en e-mail, met planning-link.
6. Klant plant zelf een afspraak in via Google Calendar of via de WhatsApp-flow.

**Kosten en gratis proef**
- Gratis kennismakingsgesprek met demo op basis van jouw bedrijf.
- 1 maand gratis proeftijd, zodat je zonder risico kunt testen.
- Prijs wordt op maat bepaald op basis van complexiteit, geen verrassingen achteraf.

**Opzettijd**
- De meeste systemen zijn binnen 2 tot 4 weken live.
- Begint met een intake, dan bouw op maat, dan uitvoerig testen voor live-gang.

**Data en veiligheid**
- AVG/GDPR compliant.
- Data wordt versleuteld opgeslagen, hosting op EU-servers (Supabase).
- Geen datadeling met derden, klant behoudt volledige controle over klantdata.
- IP-adressen worden geanonimiseerd, formulierinvoer wordt automatisch gemaskeerd.
- Demo-data wordt na maximaal 30 dagen verwijderd.

**Integraties en techniek**
- Werkt met elke website: WordPress, Wix, Squarespace, custom, alles.
- Koppelt met bestaande CRM, agenda en e-mailsysteem.
- Gebruikt WhatsApp Business API, OpenAI (GPT-4o) voor de conversatie, Google Calendar API voor planning, Supabase voor opslag, PostHog en Google Analytics 4 voor analytics.

**Garantie en betaling**
- 90 dagen garantie na oplevering, bugs en gebreken worden kosteloos hersteld.
- Betalingsstructuur projecten: 50% aanbetaling bij start, 50% bij oplevering.
- Uurtarief: maandelijkse facturering.
- Abonnementen: maandelijks vooraf.
- Betaaltermijn: 14 dagen na factuurdatum.
- Acceptatie: 14 dagen om gebreken te melden na oplevering.

**Technische kennis nodig**
- Nee, helemaal niet. Wij bouwen en installeren alles.
- Eenvoudig dashboard om te zien wat er gebeurt, geen technische handelingen.
- Systeem wordt afgestemd op jouw bedrijf, diensten en tone of voice.

**Wat als de bot een vraag niet kan beantwoorden**
- Het gesprek wordt automatisch doorgeschakeld naar jou of een collega.
- Volledige context van het gesprek wordt meegestuurd, zodat je naadloos kunt overnemen.

**Team en bedrijf**
- Opgericht door twee broers: Christiaan Tromp (development) en Georg Tromp (design en strategie).
- Missie: slimme automatisering toegankelijk maken voor het MKB.
- Waarden: resultaatgericht, persoonlijk en kort lijntje, vooruitdenkend.

**Contact en bedrijfsgegevens**
- E-mail: info@frontlix.com
- Telefoon: +31 6 24965270
- Adres: Theresiastraat, Den Haag
- KvK: 90193695
- Bedrijfsvorm: eenmanszaak
- Reactie binnen 24 uur op contactaanvragen.
"""
