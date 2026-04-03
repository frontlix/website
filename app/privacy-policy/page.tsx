import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy | Frontlix',
  description:
    'Lees hoe Frontlix omgaat met jouw persoonsgegevens. Onze privacy policy beschrijft welke gegevens we verzamelen en hoe we deze beschermen.',
}

export default function PrivacyPolicyPage() {
  return (
    <>
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
            persoonsgegevens zoals weergegeven in deze privacy policy.
          </p>
          <ul>
            <li>Bedrijfsnaam: Frontlix</li>
            <li>KvK-nummer: 90193695</li>
            <li>E-mail: info@frontlix.com</li>
            <li>Website: frontlix.com</li>
          </ul>

          <h2>2. Welke gegevens verzamelen wij</h2>
          <p>
            Wij verzamelen persoonsgegevens die je zelf aan ons verstrekt via het
            contactformulier op onze website. Het gaat om de volgende gegevens:
          </p>
          <ul>
            <li>Naam</li>
            <li>E-mailadres</li>
            <li>Onderwerp van je bericht</li>
            <li>Inhoud van je bericht</li>
          </ul>
          <p>
            Daarnaast verzamelen wij automatisch geanonimiseerde gegevens over het gebruik
            van onze website via Google Analytics 4 (zie sectie 5).
          </p>

          <h2>3. Doel van de verwerking</h2>
          <p>Wij verwerken jouw persoonsgegevens voor de volgende doeleinden:</p>
          <ul>
            <li>Het beantwoorden van jouw vraag of aanvraag via het contactformulier</li>
            <li>Het opnemen van contact om onze dienstverlening te bespreken</li>
            <li>Het verbeteren van onze website en dienstverlening op basis van gebruiksstatistieken</li>
          </ul>

          <h2>4. Rechtsgrond</h2>
          <p>
            Wij verwerken jouw persoonsgegevens op basis van de volgende rechtsgronden
            uit de Algemene Verordening Gegevensbescherming (AVG):
          </p>
          <ul>
            <li>
              <strong>Gerechtvaardigd belang:</strong> het beantwoorden van contactverzoeken
              en het verbeteren van onze dienstverlening
            </li>
            <li>
              <strong>Toestemming:</strong> voor het plaatsen van analytische cookies
              (Google Analytics 4)
            </li>
          </ul>

          <h2>5. Google Analytics 4</h2>
          <p>
            Wij gebruiken Google Analytics 4 (GA4) om inzicht te krijgen in hoe bezoekers
            onze website gebruiken. GA4 verzamelt onder andere gegevens over:
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

          <h2>6. Cookies</h2>
          <p>Onze website maakt gebruik van de volgende soorten cookies:</p>

          <h3>Functionele cookies</h3>
          <p>
            Deze cookies zijn noodzakelijk voor het goed functioneren van de website.
            Ze worden niet gebruikt om je te volgen of te identificeren.
          </p>

          <h3>Analytische cookies (Google Analytics 4)</h3>
          <p>
            Deze cookies worden gebruikt om geanonimiseerde statistieken te verzamelen
            over het gebruik van de website. De cookies worden geplaatst door Google en
            hebben een bewaartermijn van maximaal 14 maanden.
          </p>
          <ul>
            <li><strong>_ga</strong> — onderscheidt unieke gebruikers (bewaartermijn: 2 jaar)</li>
            <li><strong>_ga_[ID]</strong> — behoudt sessiestatus (bewaartermijn: 2 jaar)</li>
          </ul>

          <h2>7. Opslag en bewaartermijnen</h2>
          <p>
            Gegevens die via het contactformulier worden ingediend, worden opgeslagen in
            onze database en per e-mail doorgestuurd naar ons. Wij bewaren deze gegevens
            niet langer dan noodzakelijk voor het doel waarvoor ze zijn verzameld.
          </p>
          <ul>
            <li>
              <strong>Contactformulier gegevens:</strong> worden bewaard zolang nodig voor
              de afhandeling van je verzoek, met een maximum van 12 maanden na het laatste contact
            </li>
            <li>
              <strong>Google Analytics data:</strong> wordt automatisch na 14 maanden verwijderd
            </li>
          </ul>

          <h2>8. Delen met derden</h2>
          <p>
            Wij delen jouw persoonsgegevens niet met derden, tenzij dit noodzakelijk is
            voor de uitvoering van onze dienstverlening of wanneer wij hiertoe wettelijk
            verplicht zijn. De enige derde partij waarmee wij werken is:
          </p>
          <ul>
            <li>
              <strong>Google (Analytics):</strong> voor het verzamelen van geanonimiseerde
              websitestatistieken. Google verwerkt deze gegevens in overeenstemming met hun
              eigen privacybeleid.
            </li>
          </ul>

          <h2>9. Beveiliging</h2>
          <p>
            Wij nemen passende technische en organisatorische maatregelen om jouw
            persoonsgegevens te beschermen tegen verlies, onbevoegde toegang, of enige
            vorm van onrechtmatige verwerking. Onze website maakt gebruik van een
            SSL/TLS-versleutelde verbinding (HTTPS).
          </p>

          <h2>10. Jouw rechten</h2>
          <p>
            Op grond van de AVG heb je de volgende rechten met betrekking tot jouw
            persoonsgegevens:
          </p>
          <ul>
            <li><strong>Recht op inzage:</strong> je kunt opvragen welke gegevens wij van je hebben</li>
            <li><strong>Recht op rectificatie:</strong> je kunt verzoeken om onjuiste gegevens te corrigeren</li>
            <li><strong>Recht op verwijdering:</strong> je kunt verzoeken om je gegevens te laten verwijderen</li>
            <li><strong>Recht op beperking:</strong> je kunt verzoeken om de verwerking van je gegevens te beperken</li>
            <li><strong>Recht op dataportabiliteit:</strong> je kunt verzoeken om je gegevens in een gestructureerd formaat te ontvangen</li>
            <li><strong>Recht van bezwaar:</strong> je kunt bezwaar maken tegen de verwerking van je gegevens</li>
          </ul>
          <p>
            Om gebruik te maken van deze rechten kun je contact met ons opnemen via{' '}
            <a href="mailto:info@frontlix.com">info@frontlix.com</a>. Wij reageren
            binnen 30 dagen op jouw verzoek.
          </p>

          <h2>11. Klacht indienen</h2>
          <p>
            Heb je een klacht over de manier waarop wij omgaan met jouw persoonsgegevens?
            Neem dan eerst contact met ons op via{' '}
            <a href="mailto:info@frontlix.com">info@frontlix.com</a>. Je hebt ook altijd
            het recht om een klacht in te dienen bij de{' '}
            <a
              href="https://autoriteitpersoonsgegevens.nl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Autoriteit Persoonsgegevens
            </a>
            , de toezichthouder op het gebied van privacy in Nederland.
          </p>

          <h2>12. Wijzigingen</h2>
          <p>
            Wij behouden ons het recht voor om deze privacy policy te wijzigen. Wijzigingen
            worden op deze pagina gepubliceerd. We raden je aan om deze pagina regelmatig
            te raadplegen zodat je op de hoogte bent van eventuele wijzigingen.
          </p>

          <p className={styles.lastUpdated}>
            Laatst bijgewerkt: maart 2026
          </p>
        </div>
      </section>
    </>
  )
}
