import type { Metadata } from 'next'
import Link from 'next/link'
import LeadCheckWizard from './LeadCheckWizard'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Lead-lek-check: bereken hoeveel omzet je misloopt | Frontlix',
  description:
    'Gratis check: zie in 1 minuut hoeveel aanvragen en omzet je misloopt door trage opvolging. 78% van de klanten kiest het bedrijf dat als eerste reageert.',
  alternates: {
    canonical: '/lead-check',
    languages: { nl: '/lead-check' },
  },
  openGraph: {
    title: 'Hoeveel omzet lekt er ongemerkt weg uit jouw bedrijf?',
    description:
      'Doe de gratis lead-lek-check: 6 vragen, 1 minuut, geen account. Zie direct hoeveel aanvragen en omzet je laat liggen door trage opvolging.',
    url: '/lead-check',
    locale: 'nl_NL',
  },
}

/* FAQ: één bron voor zowel de zichtbare sectie als de structured data */
const FAQS = [
  {
    vraag: 'Wat is een lead-lek-check?',
    antwoord:
      'Een gratis zelftest van 6 vragen die laat zien hoeveel aanvragen en omzet jouw bedrijf misloopt door trage of gemiste opvolging. Je vult hem in 1 minuut in, zonder account, en krijgt direct een eerlijke schatting als bandbreedte.',
  },
  {
    vraag: 'Hoe snel moet ik reageren op een offerteaanvraag?',
    antwoord:
      'Hoe sneller, hoe beter: 78% van de klanten kiest het bedrijf dat als eerste reageert. Wie binnen 5 minuten reageert, heeft een veel grotere kans op de klus dan wie pas dezelfde dag of de volgende werkdag antwoordt. Juist in de avond en het weekend lekt het hardst, omdat aanvragen dan vaak blijven liggen.',
  },
  {
    vraag: 'Hoeveel klanten loop ik mis door trage opvolging?',
    antwoord:
      'Dat hangt af van je aantal aanvragen, je reactiesnelheid, je bereikbaarheid buiten kantooruren en of je klanten meerdere offertes opvragen. De check rekent het voor jouw situatie uit met bewust voorzichtige aannames, zodat de uitkomst eerder te laag dan te hoog is.',
  },
  {
    vraag: 'Is de check gratis en anoniem?',
    antwoord:
      'Ja. De berekening gebeurt volledig op je eigen apparaat en je hoeft geen gegevens achter te laten. Alleen als je de volledige analyse per mail wilt ontvangen, vul je je e-mailadres in.',
  },
  {
    vraag: 'Hoe dicht ik mijn lead-lek?',
    antwoord:
      'Door elke aanvraag direct op te volgen, ook in de avond en het weekend. Frontlix doet dat automatisch: binnen 60 seconden krijgt elke nieuwe lead persoonlijk antwoord via WhatsApp en wordt je offerte klaargezet. Zo gaat geen aanvraag meer stilletjes verloren.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.vraag,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.antwoord,
    },
  })),
}

/* De wizard is zelf het hele scherm (intro, vragen, uitslag); daaronder staat
   een server-gerenderde uitleg-sectie voor bezoekers die meer willen lezen
   (en voor zoekmachines: indexeerbare tekst plus FAQ-structured-data). */
export default function LeadCheckPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section id="lead-check" className={styles.section}>
        <LeadCheckWizard />
      </section>

      <section id="lead-check-uitleg" className={styles.uitleg} aria-labelledby="uitleg-titel">
        <div className={styles.uitlegInner}>
          <h2 id="uitleg-titel" className={styles.uitlegTitel}>
            Waarom snelle opvolging klanten oplevert
          </h2>
          <p className={styles.uitlegTekst}>
            Iemand die een aanvraag doet, is op dat moment op zoek. Niet volgende week, maar nu. Uit onderzoek blijkt
            dat 78% van de klanten kiest voor het bedrijf dat als eerste reageert. Elke minuut dat een aanvraag blijft
            liggen, groeit de kans dat diezelfde klant bij een concurrent tekent.
          </p>
          <p className={styles.uitlegTekst}>
            Voor de meeste dienstverleners lekt het op drie plekken: de reactietijd overdag, aanvragen die in de avond
            en het weekend binnenkomen, en klanten die meerdere offertes opvragen en kiezen voor wie het snelst een
            goed voorstel stuurt. De check hierboven rekent voor jouw situatie uit hoe groot dat lek ongeveer is.
          </p>

          <h2 className={styles.uitlegTitel}>Veelgestelde vragen</h2>
          <dl className={styles.faq}>
            {FAQS.map((faq) => (
              <div key={faq.vraag} className={styles.faqItem}>
                <dt className={styles.faqVraag}>{faq.vraag}</dt>
                <dd className={styles.faqAntwoord}>{faq.antwoord}</dd>
              </div>
            ))}
          </dl>

          <p className={styles.uitlegCta}>
            Benieuwd hoe je elk lek dicht zonder er zelf bovenop te zitten?{' '}
            <Link href="/contact" className={styles.uitlegLink}>
              Plan een vrijblijvende demo
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}
