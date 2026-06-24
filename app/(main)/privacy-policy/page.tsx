import type { Metadata } from 'next'
import { buildBreadcrumbSchema } from '@/lib/breadcrumb-schema'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Privacybeleid | Frontlix',
  description:
    'Lees hoe Frontlix omgaat met jouw persoonsgegevens volgens de AVG. Onze privacy policy beschrijft welke gegevens we verzamelen, hoe we deze beschermen en welke rechten je hebt.',
  alternates: {
    canonical: '/privacy-policy',
    languages: { nl: '/privacy-policy' },
  },
  openGraph: {
    title: 'Privacybeleid | Frontlix',
    description:
      'Lees hoe Frontlix omgaat met jouw persoonsgegevens volgens de AVG. Onze privacy policy beschrijft welke gegevens we verzamelen, hoe we deze beschermen en welke rechten je hebt.',
    url: '/privacy-policy',
    locale: 'nl_NL',
  },
}

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: 'https://frontlix.com' },
  { name: 'Privacy Policy', url: 'https://frontlix.com/privacy-policy' },
])

export default function PrivacyPolicyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>Juridisch</span>
          <h1 className={styles.heroHeading}>Privacy Policy</h1>
          <p className={styles.heroSubtext}>
            Wij hechten veel waarde aan de bescherming van jouw persoonsgegevens.
          </p>
        </div>
      </section>

      {/* Policy content */}
      <section className={styles.content}>
        <div className={styles.contentInner}>
          <h2>1. Verwerkingsverantwoordelijke</h2>
          <p>
            Frontlix, gevestigd te Theresiastraat, Den Haag, is verantwoordelijk voor de verwerking van
            persoonsgegevens zoals weergegeven in deze privacy policy. Deze policy geldt voor het gebruik
            van de website <strong>frontlix.com</strong>. Voor onze dashboard-omgeving op{' '}
            <strong>app.frontlix.com</strong> gelden aanvullende voorwaarden en een aparte
            verwerkersovereenkomst (zie sectie 15).
          </p>
          <ul>
            <li>Bedrijfsnaam: Frontlix</li>
            <li>KvK-nummer: 90193695</li>
            <li>E-mail: info@frontlix.com</li>
            <li>Website: frontlix.com</li>
          </ul>

          <h2>2. Welke gegevens verzamelen wij</h2>
          <p>
            Wij verzamelen alleen die gegevens die nodig zijn om onze dienstverlening te leveren en
            onze website te verbeteren. Onderstaand een overzicht van de gegevens die wij verwerken
            en hoe ze bij ons terechtkomen.
          </p>

          <h3>Contactformulier</h3>
          <ul>
            <li>Naam</li>
            <li>E-mailadres</li>
            <li>Telefoonnummer</li>
            <li>Inhoud van je bericht (optioneel)</li>
          </ul>

          <h3>Projectaanvraag-formulier</h3>
          <ul>
            <li>Voor- en achternaam</li>
            <li>E-mailadres</li>
            <li>Telefoonnummer</li>
            <li>Bedrijfsnaam (optioneel)</li>
            <li>Website (optioneel)</li>
            <li>Aanvullende informatie over je project (optioneel)</li>
          </ul>

          <h3>Demo-aanvraag</h3>
          <ul>
            <li>Telefoonnummer (om de WhatsApp-demo te starten)</li>
            <li>De gegevens die je tijdens de demo zelf met de bot deelt, zie sectie 14</li>
          </ul>

          <h3>Automatisch verzamelde gegevens</h3>
          <ul>
            <li>
              Geanonimiseerde gebruiksstatistieken via Google Analytics 4 en PostHog
              (zie secties 5 en 6)
            </li>
            <li>
              Tijdelijke formulier-invoer voor het meten van formulier-uitval (zie sectie 8)
            </li>
            <li>Technische informatie zoals browser-type, apparaattype en geschatte locatie</li>
          </ul>

          <h2>3. Doel van de verwerking</h2>
          <p>Wij verwerken jouw persoonsgegevens voor de volgende doeleinden:</p>
          <ul>
            <li>Het beantwoorden van vragen of aanvragen via onze formulieren</li>
            <li>Het versturen van bevestigingen via e-mail en WhatsApp na een aanvraag</li>
            <li>Het opnemen van contact om onze dienstverlening te bespreken</li>
            <li>Het demonstreren van ons WhatsApp-offertesysteem (de demo)</li>
            <li>Het verbeteren van onze website, formulieren en dienstverlening op basis van geaggregeerde, geanonimiseerde gebruiksstatistieken</li>
          </ul>

          <h2>4. Rechtsgrond</h2>
          <p>
            Wij verwerken jouw persoonsgegevens op basis van de volgende rechtsgronden uit de
            Algemene Verordening Gegevensbescherming (AVG):
          </p>
          <ul>
            <li>
              <strong>Uitvoering van een (pre-)contractuele relatie:</strong> voor het verwerken
              van je contact-, project- of demo-aanvraag en het opvolgen daarvan.
            </li>
            <li>
              <strong>Gerechtvaardigd belang:</strong> voor het inzicht krijgen in en verbeteren
              van het gebruik van onze website (analytics, heatmaps, session recordings met
              gemaskeerde invoer en formulier-uitval). Wij verzamelen geen gegevens voor
              advertentiedoeleinden, profileren je niet en delen geen data met advertentienetwerken.
              Onze gerechtvaardigde belangen wegen op tegen jouw privacybelang doordat invoer met
              persoonsgegevens automatisch wordt gemaskeerd, IP-adressen worden geanonimiseerd en
              data binnen de EU worden verwerkt.
            </li>
            <li>
              <strong>Wettelijke verplichting:</strong> als wij wettelijk verplicht zijn bepaalde
              gegevens te bewaren of te verstrekken.
            </li>
          </ul>

          <h2>5. Google Analytics 4</h2>
          <p>
            Wij gebruiken Google Analytics 4 (GA4) om inzicht te krijgen in hoe bezoekers onze
            website gebruiken. GA4 verzamelt onder andere gegevens over:
          </p>
          <ul>
            <li>Bezochte pagina&apos;s en de duur van het bezoek</li>
            <li>De manier waarop je op onze website bent gekomen (verwijzende website, zoekmachine)</li>
            <li>Het type apparaat, browser en besturingssysteem</li>
            <li>Geschatte locatie (op land- of stadsniveau, niet exact adres)</li>
          </ul>
          <p>
            Wij hebben Google Analytics zo privacyvriendelijk mogelijk ingesteld:
          </p>
          <ul>
            <li>IP-adressen worden geanonimiseerd</li>
            <li>Er wordt geen data gedeeld met andere Google-diensten voor advertentiedoeleinden</li>
            <li>We hebben een verwerkersovereenkomst met Google gesloten</li>
          </ul>
          <p>
            Je kunt het verzamelen van gegevens door Google Analytics voorkomen door de{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics Opt-out Browser Add-on
            </a>{' '}
            te installeren.
          </p>

          <h2>6. PostHog (product-analytics)</h2>
          <p>
            Naast Google Analytics gebruiken wij PostHog om beter te begrijpen hoe bezoekers onze
            website ervaren. PostHog draait op een EU-server (eu.i.posthog.com), waardoor jouw
            gegevens binnen de Europese Unie worden verwerkt. Met PostHog meten wij:
          </p>
          <ul>
            <li>Pagina-bezoeken en de tijd die je op een pagina doorbrengt</li>
            <li>
              Klikken, scroll-gedrag en formulier-interacties (autocapture) ten behoeve van
              heatmaps en conversie-analyses
            </li>
            <li>
              Geanonimiseerde session recordings, waarbij <strong>alle invoervelden,
              e-mailadressen en wachtwoorden automatisch worden gemaskeerd</strong>: wij zien
              dus géén ingevulde tekst of gevoelige gegevens, alleen anoniem klik- en navigatiegedrag
            </li>
          </ul>
          <p>
            We hebben een verwerkersovereenkomst met PostHog. Op een lokale ontwikkelomgeving
            (localhost) wordt geen data verzameld; alleen op de live website frontlix.com.
          </p>

          <h2>7. Cookies</h2>
          <p>Onze website maakt gebruik van de volgende soorten cookies:</p>

          <h3>Functionele cookies</h3>
          <p>
            Deze cookies zijn noodzakelijk voor het goed functioneren van de website.
            Ze worden niet gebruikt om je te volgen of te identificeren.
          </p>

          <h3>Analytische cookies (Google Analytics 4 en PostHog)</h3>
          <p>
            Deze cookies worden gebruikt om geanonimiseerde statistieken te verzamelen
            over het gebruik van de website.
          </p>
          <ul>
            <li><strong>_ga</strong>: onderscheidt unieke gebruikers (bewaartermijn: 2 jaar)</li>
            <li><strong>_ga_[ID]</strong>: behoudt sessiestatus (bewaartermijn: 2 jaar)</li>
            <li><strong>ph_*</strong>: PostHog-cookies voor sessie- en gebruiksanalyse (bewaartermijn: 1 jaar)</li>
          </ul>

          <h2>8. Formulier-uitval (form-tracking)</h2>
          <p>
            Om te begrijpen waarom bezoekers een formulier soms niet afmaken, slaan wij tijdens het
            invullen tijdelijk de ingevulde velden op met een willekeurig sessie-ID. Dit gebeurt ook
            als je het formulier <em>niet</em> verstuurt. We gebruiken deze gegevens uitsluitend om
            onze formulieren te verbeteren (bijvoorbeeld: bij welk veld haakt iemand af) en nooit
            voor marketingdoeleinden.
          </p>
          <ul>
            <li>
              <strong>Wat wordt opgeslagen:</strong> de velden die je hebt ingevuld, een sessie-ID,
              de naam van het formulier en de pagina-URL.
            </li>
            <li>
              <strong>Bewaartermijn:</strong> maximaal 30 dagen, daarna wordt de data automatisch
              verwijderd.
            </li>
            <li>
              <strong>Opslag:</strong> beveiligd in onze Supabase-database in de EU.
            </li>
            <li>
              <strong>Verwijderen:</strong> wil je dat we jouw form-data eerder verwijderen? Stuur
              een mail naar <a href="mailto:info@frontlix.com">info@frontlix.com</a>.
            </li>
          </ul>

          <h2>9. Opslag en bewaartermijnen</h2>
          <p>
            Wij bewaren persoonsgegevens niet langer dan noodzakelijk voor het doel waarvoor ze
            zijn verzameld.
          </p>
          <ul>
            <li>
              <strong>Contact- en projectformulier-gegevens:</strong> bewaard zolang nodig voor de
              afhandeling van je verzoek, met een maximum van 12 maanden na het laatste contact.
            </li>
            <li>
              <strong>Form-tracking (uitvalmeting):</strong> maximaal 30 dagen na de laatste
              activiteit, daarna automatisch verwijderd.
            </li>
            <li>
              <strong>Demo-gegevens (WhatsApp-demo):</strong> maximaal 30 dagen na de laatste
              activiteit, daarna automatisch verwijderd (zie sectie 14).
            </li>
            <li>
              <strong>Gepersonaliseerde demo-links:</strong> bewaard zolang de demo actief is, met
              een maximum van 12 maanden na aanmaak.
            </li>
            <li>
              <strong>Google Analytics-data:</strong> automatisch verwijderd na 14 maanden.
            </li>
            <li>
              <strong>PostHog-data:</strong> sessie-recordings worden maximaal 30 dagen bewaard,
              geaggregeerde event-data maximaal 12 maanden.
            </li>
          </ul>

          <h2>10. Delen met derden (verwerkers)</h2>
          <p>
            Wij delen jouw persoonsgegevens niet met derden, tenzij dit noodzakelijk is voor de
            uitvoering van onze dienstverlening of wanneer wij hiertoe wettelijk verplicht zijn.
            Met al deze partijen is een verwerkersovereenkomst gesloten:
          </p>
          <ul>
            <li>
              <strong>Supabase (EU-regio):</strong> voor het beveiligd opslaan van formulier-,
              demo- en form-trackingdata in een database en object storage.
            </li>
            <li>
              <strong>Google (Analytics):</strong> voor geanonimiseerde websitestatistieken.
            </li>
            <li>
              <strong>PostHog (EU):</strong> voor geanonimiseerde product-analytics, heatmaps en
              session recordings met gemaskeerde invoer.
            </li>
            <li>
              <strong>Meta (WhatsApp Business API):</strong> voor het versturen van
              WhatsApp-bevestigingen na een formulier-aanvraag en voor het versturen en ontvangen
              van berichten in de demo.
            </li>
            <li>
              <strong>OpenAI:</strong> voor het automatisch begrijpen en beantwoorden van berichten
              en het analyseren van foto&apos;s in de demo (zie sectie 14).
            </li>
            <li>
              <strong>Google Calendar API:</strong> voor het inplannen van afspraken in de
              Frontlix-agenda na een demo of aanvraag.
            </li>
            <li>
              <strong>Hostinger SMTP:</strong> voor het versturen van bevestigings- en
              notificatie-mails vanuit het Frontlix-domein.
            </li>
          </ul>

          <h2>11. Beveiliging</h2>
          <p>
            Wij nemen passende technische en organisatorische maatregelen om jouw persoonsgegevens
            te beschermen tegen verlies, onbevoegde toegang of enige vorm van onrechtmatige
            verwerking. Onze website maakt gebruik van een SSL/TLS-versleutelde verbinding (HTTPS),
            data wordt versleuteld opgeslagen in onze Supabase-database in de EU en toegang tot
            klantdata is beperkt tot bevoegd personeel.
          </p>

          <h2>12. Jouw rechten</h2>
          <p>
            Op grond van de AVG heb je de volgende rechten met betrekking tot jouw persoonsgegevens:
          </p>
          <ul>
            <li><strong>Recht op inzage:</strong> je kunt opvragen welke gegevens wij van je hebben</li>
            <li><strong>Recht op rectificatie:</strong> je kunt verzoeken om onjuiste gegevens te corrigeren</li>
            <li><strong>Recht op verwijdering:</strong> je kunt verzoeken om je gegevens te laten verwijderen</li>
            <li><strong>Recht op beperking:</strong> je kunt verzoeken om de verwerking van je gegevens te beperken</li>
            <li><strong>Recht op dataportabiliteit:</strong> je kunt verzoeken om je gegevens in een gestructureerd formaat te ontvangen</li>
            <li>
              <strong>Recht van bezwaar:</strong> je kunt bezwaar maken tegen de verwerking van je
              gegevens op basis van gerechtvaardigd belang (bijvoorbeeld tegen analytics)
            </li>
          </ul>
          <p>
            Om gebruik te maken van deze rechten kun je contact met ons opnemen via{' '}
            <a href="mailto:info@frontlix.com">info@frontlix.com</a>. Wij reageren binnen 30 dagen
            op jouw verzoek.
          </p>

          <h2>13. Klacht indienen</h2>
          <p>
            Heb je een klacht over de manier waarop wij omgaan met jouw persoonsgegevens? Neem dan
            eerst contact met ons op via{' '}
            <a href="mailto:info@frontlix.com">info@frontlix.com</a>. Je hebt ook altijd het recht
            om een klacht in te dienen bij de{' '}
            <a
              href="https://autoriteitpersoonsgegevens.nl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Autoriteit Persoonsgegevens
            </a>
            , de toezichthouder op het gebied van privacy in Nederland.
          </p>

          <h2>14. WhatsApp Demo (branche-demo)</h2>
          <p>
            Op onze website kun je een demo aanvragen waarin we via WhatsApp laten zien hoe ons
            geautomatiseerde offerte-systeem werkt. Tijdens deze demo voeren we een gesprek met
            je en stellen we automatisch een voorbeeld-offerte op. Hierbij is het belangrijk om
            te weten hoe wij met je gegevens omgaan.
          </p>

          <h3>Welke gegevens verzamelen we via de demo</h3>
          <ul>
            <li>Je naam, e-mailadres en telefoonnummer (uit het demo-formulier)</li>
            <li>De branche die je kiest (zonnepanelen, dakdekker of schoonmaak)</li>
            <li>Antwoorden op de vragen die de demo-bot via WhatsApp stelt (bv. adres, oppervlakte, type werk)</li>
            <li>Optioneel: foto&apos;s die je zelf via WhatsApp meestuurt</li>
            <li>De volledige gespreksgeschiedenis tussen jou en de demo-bot</li>
          </ul>

          <h3>Waarvoor we deze gegevens gebruiken</h3>
          <p>
            Uitsluitend om de demo te laten werken en om de werking van het systeem aan jou te tonen.
            We gebruiken deze gegevens niet voor marketing, niet voor profilering en delen ze niet
            met derden buiten de hieronder genoemde verwerkers.
          </p>

          <h3>Verwerkers (sub-processors)</h3>
          <ul>
            <li>
              <strong>Meta (WhatsApp Business API):</strong> voor het versturen en ontvangen van de
              WhatsApp-berichten zelf
            </li>
            <li>
              <strong>OpenAI (GPT-4o-mini):</strong> voor het begrijpen van je antwoorden, het
              automatisch genereren van vragen en antwoorden, en het analyseren van eventuele
              foto&apos;s die je meestuurt
            </li>
            <li>
              <strong>Supabase (EU-regio):</strong> voor de versleutelde opslag van de
              gespreksdata, foto&apos;s en de gegenereerde PDF-offerte
            </li>
            <li>
              <strong>Google Calendar API:</strong> voor het inplannen van een afspraak in onze
              agenda als je daarvoor kiest aan het einde van de demo
            </li>
            <li>
              <strong>Hostinger SMTP (smtp.hostinger.com):</strong> voor het versturen van de
              demo-offerte e-mail vanuit het Frontlix-domein
            </li>
          </ul>

          <h3>Bewaartermijn</h3>
          <p>
            Demo-gegevens worden maximaal <strong>30 dagen</strong> na de laatste activiteit
            bewaard en worden daarna automatisch verwijderd. Wil je dat we je gegevens eerder
            verwijderen? Stuur een mail naar{' '}
            <a href="mailto:info@frontlix.com">info@frontlix.com</a> en we doen het binnen 7 dagen.
          </p>

          <h3>Demo-disclaimer</h3>
          <p>
            De fictieve bedrijfsnamen in de demo &mdash; &quot;SolarPower Nederland B.V.&quot;,
            &quot;Dakwerken Holland B.V.&quot; en &quot;Glanz Schoonmaak B.V.&quot; &mdash; zijn
            <strong> niet echt</strong>. De gegenereerde offertes zijn voorbeelden bedoeld om de
            werking van ons systeem te tonen en zijn geen geldige offertes voor echte werkzaamheden.
          </p>

          <h2>15. Dashboard-omgeving (app.frontlix.com)</h2>
          <p>
            Voor klanten van Frontlix bieden wij een afgeschermde dashboard-omgeving aan op{' '}
            <strong>app.frontlix.com</strong>. Binnen deze omgeving treedt Frontlix op als{' '}
            <strong>verwerker</strong> in de zin van de AVG: onze klanten zijn
            verwerkings­verantwoordelijke voor de gegevens van hun eigen eindklanten die binnen het
            dashboard worden opgeslagen (zoals leads, agenda-afspraken, inbox-berichten en reviews).
          </p>
          <p>
            Voor het gebruik van app.frontlix.com gelden aanvullende voorwaarden en sluiten wij met
            iedere klant een aparte verwerkersovereenkomst (DPA). De aparte privacy-verklaring voor
            de dashboard-omgeving wordt op een later moment gepubliceerd. Voor vragen hierover kun
            je contact opnemen via <a href="mailto:info@frontlix.com">info@frontlix.com</a>.
          </p>

          <h2>16. Koppeling met je Google-account (Gmail en Google Agenda)</h2>
          <p>
            Klanten van Frontlix kunnen er in het dashboard voor kiezen om hun Google-account te
            koppelen. Wij vragen dan uitsluitend de rechten die strikt nodig zijn voor de gekozen
            functie:
          </p>
          <ul>
            <li>
              <strong>Gmail (labels):</strong> wij maken met jouw toestemming een label aan in je
              Gmail zodat je e-mails met offertes ter goedkeuring kunt groeperen. Je bepaalt zelf
              met een filter welke e-mails dat label krijgen. Wij lezen de inhoud van je e-mails
              niet, versturen geen e-mails namens jou en wijzigen geen andere instellingen.
            </li>
            <li>
              <strong>Google Agenda:</strong> wij lezen je vrije en bezette tijden en plannen
              afspraken in die via de Frontlix-assistent tot stand komen.
            </li>
          </ul>
          <p>
            Hiervoor bewaren wij uitsluitend een versleutelde toegangssleutel (zodat de koppeling
            blijft werken) en de naam en het id van het aangemaakte label. Je kunt de koppeling op
            elk moment verbreken in je Frontlix-instellingen of in je Google-accountinstellingen.
          </p>
          <p>
            <strong>Beperkt gebruik (Limited Use).</strong> Frontlix&apos; gebruik van informatie
            die is verkregen via Google API&apos;s voldoet aan het{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , inclusief de Limited Use-vereisten. Wij gebruiken deze gegevens uitsluitend om de
            hierboven beschreven functies te leveren, delen of verkopen ze niet aan derden, gebruiken
            ze niet voor advertenties en gebruiken ze niet om algemene AI- of machine-learning-modellen
            te trainen.
          </p>

          <h2>17. Wijzigingen</h2>
          <p>
            Wij behouden ons het recht voor om deze privacy policy te wijzigen. Wijzigingen worden
            op deze pagina gepubliceerd. We raden je aan om deze pagina regelmatig te raadplegen
            zodat je op de hoogte bent van eventuele wijzigingen.
          </p>

          <p className={styles.lastUpdated}>
            Laatst bijgewerkt: juni 2026
          </p>
        </div>
      </section>
    </>
  )
}
