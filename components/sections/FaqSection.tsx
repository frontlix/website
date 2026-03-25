'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './FaqSection.module.css'

const faqs = [
  {
    question: 'Wat is automatische leadopvolging precies?',
    answer:
      'Wanneer een potentiële klant een formulier invult of een bericht stuurt, neemt onze AI het gesprek over via WhatsApp. De AI stelt de juiste vragen, verzamelt alle informatie die nodig is en stuurt automatisch een offerte, allemaal zonder dat jij iets hoeft te doen.',
  },
  {
    question: 'Moet ik technische kennis hebben?',
    answer:
      'Nee, helemaal niet. Wij bouwen en installeren alles voor je. Na de opzet kun je via een simpel dashboard zien wat er gebeurt, maar je hoeft nergens zelf aan te sleutelen. Wij trainen de AI op jouw bedrijf, diensten en tone of voice.',
  },
  {
    question: 'Hoe snel is het operationeel?',
    answer:
      'De meeste opzetten zijn binnen 2 tot 4 weken live. We beginnen met een intake om jouw bedrijf en werkwijze te begrijpen, bouwen dan het systeem op maat en testen alles uitvoerig voordat het live gaat.',
  },
  {
    question: 'Wat kost het?',
    answer:
      'Dat hangt af van de complexiteit van jouw situatie. We beginnen altijd met een gratis kennismakingsgesprek waarin we jouw wensen bespreken en een inschatting geven. Daarnaast krijg je een maand gratis proeftijd, zodat je zonder risico kunt ervaren wat het oplevert. Geen verrassingen achteraf.',
  },
  {
    question: 'Wat als de AI een vraag niet kan beantwoorden?',
    answer:
      'Dan wordt het gesprek automatisch doorgeschakeld naar jou of een collega. Je krijgt een melding met alle context die de AI al heeft verzameld, zodat je direct kunt inspringen zonder iets te missen.',
  },
  {
    question: 'Werkt het met mijn huidige website en systemen?',
    answer:
      'Ja. Onze oplossing werkt met elke website, of je nu WordPress, Wix, Squarespace of iets anders gebruikt. We koppelen het aan je bestaande formulieren en kunnen ook integreren met tools als je CRM, agenda of e-mailsysteem.',
  },
  {
    question: 'Is mijn data veilig?',
    answer:
      'Absoluut. Alle data wordt versleuteld opgeslagen en verwerkt conform de AVG (GDPR). Wij delen nooit gegevens met derden en je behoudt altijd volledige controle over je klantdata.',
  },
  {
    question: 'Kan ik het eerst uitproberen?',
    answer:
      'Ja. We bieden een gratis kennismakingsgesprek aan waarin we een demo laten zien op basis van jouw bedrijf. Daarnaast krijg je een maand gratis testtijd om het systeem in de praktijk uit te proberen, zo zie je precies wat het oplevert voordat je beslist.',
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className={styles.section} id="faq">
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.label}>Veelgestelde vragen</span>
          <h2 className={styles.heading}>Alles wat je wilt weten</h2>
          <p className={styles.subtext}>
            Heb je een andere vraag? Neem gerust contact met ons op, we
            helpen je graag verder.
          </p>
        </header>

        <div className={styles.list}>
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}
              >
                <button
                  className={styles.question}
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.questionText}>{faq.question}</span>
                  <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
                    <ChevronDown size={20} />
                  </span>
                </button>
                <div
                  className={styles.answerWrapper}
                  style={{
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                  }}
                >
                  <div className={styles.answerInner}>
                    <p className={styles.answer}>{faq.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
