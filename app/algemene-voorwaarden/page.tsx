import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Algemene Voorwaarden | Frontlix',
  description:
    'Lees de algemene voorwaarden van Frontlix. Deze voorwaarden zijn van toepassing op al onze diensten en overeenkomsten.',
  alternates: {
    canonical: '/algemene-voorwaarden',
    languages: { nl: '/algemene-voorwaarden' },
  },
  openGraph: {
    title: 'Algemene Voorwaarden | Frontlix',
    description:
      'Lees de algemene voorwaarden van Frontlix. Deze voorwaarden zijn van toepassing op al onze diensten en overeenkomsten.',
    url: '/algemene-voorwaarden',
    locale: 'nl_NL',
  },
}

export default function AlgemeneVoorwaardenPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.label}>Juridisch</span>
          <h1 className={styles.heroHeading}>Algemene Voorwaarden</h1>
          <p className={styles.heroSubtext}>
            Deze voorwaarden zijn van toepassing op alle diensten en overeenkomsten van Frontlix.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className={styles.content}>
        <div className={styles.contentInner}>
          <h2>1. Definities</h2>
          <ul>
            <li>
              <strong>Frontlix:</strong> de eenmanszaak Frontlix, gevestigd te Theresiastraat,
              Den Haag, ingeschreven bij de Kamer van Koophandel onder nummer 90193695.
            </li>
            <li>
              <strong>Opdrachtgever:</strong> de natuurlijke of rechtspersoon die een
              overeenkomst aangaat met Frontlix.
            </li>
            <li>
              <strong>Overeenkomst:</strong> elke afspraak tussen Frontlix en de opdrachtgever
              tot het leveren van diensten.
            </li>
            <li>
              <strong>Diensten:</strong> alle werkzaamheden die Frontlix verricht in het kader
              van de overeenkomst, waaronder het bouwen van automatiseringen, integraties,
              WhatsApp-bots en overige software-oplossingen.
            </li>
            <li>
              <strong>Project:</strong> het geheel van werkzaamheden zoals beschreven in de
              offerte of overeenkomst.
            </li>
          </ul>

          <h2>2. Toepasselijkheid</h2>
          <ul>
            <li>
              Deze algemene voorwaarden zijn van toepassing op alle aanbiedingen, offertes,
              overeenkomsten en leveringen van Frontlix.
            </li>
            <li>
              Afwijkingen van deze voorwaarden zijn alleen geldig indien schriftelijk
              overeengekomen.
            </li>
            <li>
              De toepasselijkheid van eventuele inkoop- of andere voorwaarden van de
              opdrachtgever wordt uitdrukkelijk van de hand gewezen.
            </li>
          </ul>

          <h2>3. Offertes en aanbiedingen</h2>
          <ul>
            <li>
              Alle offertes en aanbiedingen van Frontlix zijn vrijblijvend, tenzij
              uitdrukkelijk anders vermeld.
            </li>
            <li>
              Een offerte is geldig gedurende 30 dagen na de datum van verzending,
              tenzij anders aangegeven.
            </li>
            <li>
              Frontlix kan niet aan een offerte worden gehouden indien de opdrachtgever
              redelijkerwijs kan begrijpen dat de offerte een kennelijke vergissing of
              verschrijving bevat.
            </li>
          </ul>

          <h2>4. Uitvoering van de overeenkomst</h2>
          <ul>
            <li>
              Frontlix zal de overeenkomst naar beste inzicht en vermogen uitvoeren,
              overeenkomstig de eisen van goed vakmanschap.
            </li>
            <li>
              Frontlix heeft het recht om werkzaamheden te laten verrichten door derden,
              maar voert in principe alle werkzaamheden zelf uit.
            </li>
            <li>
              De opdrachtgever zorgt ervoor dat alle gegevens en materialen die nodig zijn
              voor de uitvoering van de overeenkomst tijdig worden aangeleverd.
            </li>
            <li>
              Indien de opdrachtgever niet tijdig de benodigde informatie aanlevert, heeft
              Frontlix het recht om de uitvoering op te schorten en eventuele extra kosten
              in rekening te brengen.
            </li>
          </ul>

          <h2>5. Levertijden</h2>
          <ul>
            <li>
              Opgegeven levertijden zijn indicatief en gelden nooit als fatale termijn,
              tenzij uitdrukkelijk schriftelijk anders is overeengekomen.
            </li>
            <li>
              Bij overschrijding van een levertijd dient de opdrachtgever Frontlix
              schriftelijk in gebreke te stellen en een redelijke termijn te bieden om
              alsnog na te komen.
            </li>
          </ul>

          <h2>6. Prijzen en betaling</h2>
          <ul>
            <li>
              Alle genoemde prijzen zijn exclusief btw, tenzij anders vermeld.
            </li>
            <li>
              Frontlix hanteert de volgende betalingsstructuur: 50% van het totaalbedrag
              is verschuldigd bij aanvang van het project (aanbetaling), het resterende
              bedrag is verschuldigd na oplevering van het project.
            </li>
            <li>
              Bij projecten op uurtarief wordt maandelijks gefactureerd op basis van
              de gewerkte uren, tenzij anders overeengekomen.
            </li>
            <li>
              Bij projecten op abonnementsbasis is het maandelijkse bedrag vooraf
              verschuldigd, tenzij anders overeengekomen.
            </li>
            <li>
              Betaling dient te geschieden binnen 14 dagen na factuurdatum, tenzij
              anders overeengekomen.
            </li>
            <li>
              Bij niet-tijdige betaling is de opdrachtgever van rechtswege in verzuim
              en is Frontlix gerechtigd de wettelijke handelsrente in rekening te brengen,
              vermeerderd met buitengerechtelijke incassokosten.
            </li>
          </ul>

          <h2>7. Meerwerk</h2>
          <ul>
            <li>
              Indien tijdens de uitvoering van de overeenkomst blijkt dat aanvullende
              werkzaamheden noodzakelijk zijn of door de opdrachtgever worden gewenst,
              zullen partijen in overleg treden over de aanpassing van de overeenkomst.
            </li>
            <li>
              Frontlix is gerechtigd meerwerk in rekening te brengen wanneer er sprake
              is van aanvullende wensen of gewijzigde specificaties van de opdrachtgever.
            </li>
            <li>
              Meerwerk wordt vooraf besproken en schriftelijk bevestigd voordat de
              werkzaamheden worden uitgevoerd.
            </li>
          </ul>

          <h2>8. Oplevering en acceptatie</h2>
          <ul>
            <li>
              Na oplevering van het project heeft de opdrachtgever 14 dagen de tijd om
              het opgeleverde te beoordelen en eventuele gebreken te melden.
            </li>
            <li>
              Indien de opdrachtgever niet binnen 14 dagen na oplevering reageert, wordt
              het project geacht te zijn geaccepteerd.
            </li>
            <li>
              Kleine gebreken die de werking niet wezenlijk beïnvloeden, zijn geen reden
              om de acceptatie te weigeren.
            </li>
          </ul>

          <h2>9. Garantie</h2>
          <ul>
            <li>
              Frontlix biedt een garantieperiode van 90 dagen na oplevering van het project.
            </li>
            <li>
              Tijdens de garantieperiode zal Frontlix kosteloos bugs en gebreken herstellen
              die aantoonbaar het gevolg zijn van onjuist uitgevoerde werkzaamheden.
            </li>
            <li>
              De garantie vervalt indien de opdrachtgever of een derde zonder toestemming
              van Frontlix wijzigingen aanbrengt aan het opgeleverde werk.
            </li>
            <li>
              De garantie omvat geen gebreken die het gevolg zijn van externe factoren,
              zoals wijzigingen in software van derden, hosting-omgevingen of API&apos;s
              waarvan het project afhankelijk is.
            </li>
          </ul>

          <h2>10. Intellectueel eigendom</h2>
          <ul>
            <li>
              Na volledige betaling van het overeengekomen bedrag gaan alle intellectuele
              eigendomsrechten op het opgeleverde werk over naar de opdrachtgever.
            </li>
            <li>
              Zolang de opdrachtgever niet volledig heeft betaald, berusten alle rechten
              bij Frontlix.
            </li>
            <li>
              Frontlix behoudt het recht om het project op te nemen in zijn portfolio,
              tenzij de opdrachtgever hier schriftelijk bezwaar tegen maakt.
            </li>
          </ul>

          <h2>11. Geheimhouding</h2>
          <ul>
            <li>
              Beide partijen zijn verplicht tot geheimhouding van alle vertrouwelijke
              informatie die zij in het kader van de overeenkomst hebben verkregen.
            </li>
            <li>
              Deze geheimhoudingsplicht geldt ook na beëindiging van de overeenkomst.
            </li>
          </ul>

          <h2>12. Aansprakelijkheid</h2>
          <ul>
            <li>
              De aansprakelijkheid van Frontlix is beperkt tot het bedrag dat in het
              betreffende geval door de aansprakelijkheidsverzekering wordt uitgekeerd,
              vermeerderd met het eigen risico.
            </li>
            <li>
              Indien geen verzekering van toepassing is, is de aansprakelijkheid beperkt
              tot maximaal het factuurbedrag van het betreffende project, met een maximum
              van de over de laatste drie maanden gefactureerde bedragen.
            </li>
            <li>
              Frontlix is niet aansprakelijk voor indirecte schade, waaronder gevolgschade,
              gederfde winst, gemiste besparingen of schade door bedrijfsstagnatie.
            </li>
            <li>
              De opdrachtgever vrijwaart Frontlix tegen alle aanspraken van derden die
              verband houden met de door Frontlix geleverde diensten.
            </li>
          </ul>

          <h2>13. Overmacht</h2>
          <ul>
            <li>
              In geval van overmacht is Frontlix niet gehouden tot het nakomen van
              enige verplichting. Onder overmacht wordt onder meer verstaan:
              ziekte, stroomuitval, internetstoring, pandemie, overheidsmaatregelen
              of tekortkomingen van toeleveranciers.
            </li>
            <li>
              Indien de overmacht langer dan 60 dagen voortduurt, hebben beide
              partijen het recht om de overeenkomst te ontbinden.
            </li>
          </ul>

          <h2>14. Opschorting en ontbinding</h2>
          <ul>
            <li>
              Frontlix is gerechtigd de nakoming van de verplichtingen op te schorten
              of de overeenkomst te ontbinden indien de opdrachtgever niet, niet tijdig
              of niet volledig aan zijn verplichtingen voldoet.
            </li>
            <li>
              Bij ontbinding door toedoen van de opdrachtgever behoudt Frontlix het
              recht op betaling voor reeds verrichte werkzaamheden.
            </li>
            <li>
              De aanbetaling van 50% wordt niet gerestitueerd bij annulering door de
              opdrachtgever, tenzij Frontlix nog geen werkzaamheden heeft verricht.
            </li>
          </ul>

          <h2>15. Wijzigingen</h2>
          <p>
            Frontlix behoudt zich het recht voor om deze algemene voorwaarden te
            wijzigen. Gewijzigde voorwaarden zijn van toepassing op nieuwe
            overeenkomsten. Op lopende overeenkomsten blijven de voorwaarden van
            toepassing die golden op het moment van het sluiten van de overeenkomst.
          </p>

          <h2>16. Toepasselijk recht en geschillen</h2>
          <ul>
            <li>
              Op alle overeenkomsten tussen Frontlix en de opdrachtgever is
              Nederlands recht van toepassing.
            </li>
            <li>
              Geschillen worden bij voorkeur in onderling overleg opgelost.
              Indien dit niet lukt, is de bevoegde rechter in Den Haag
              exclusief bevoegd.
            </li>
          </ul>

          <h2>17. Contact</h2>
          <p>
            Voor vragen over deze algemene voorwaarden kun je contact opnemen via{' '}
            <a href="mailto:info@frontlix.com">info@frontlix.com</a>.
          </p>

          <p className={styles.lastUpdated}>
            Laatst bijgewerkt: maart 2026
          </p>
        </div>
      </section>
    </>
  )
}
