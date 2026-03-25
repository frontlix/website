import {
  FileText,
  MessageSquare,
  Camera,
  Calculator,
  ShieldCheck,
  Send,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import StepObserver from './StepObserver'
import styles from './Services.module.css'

const steps = [
  {
    number: '01',
    icon: FileText,
    title: 'Nooit meer een lead missen',
    description:
      'Een potentiële klant vult een formulier in op de website, via een advertentie of social media. De gegevens worden direct opgeslagen en het systeem start automatisch.',
    details: [
      'Formulier, advertentie of social media',
      'Automatische opslag in CRM',
      'Persoonlijk WhatsApp bericht binnen seconden',
    ],
    visual: 'incoming',
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'AI stelt de juiste vragen',
    description:
      'Een AI-assistent neemt het gesprek over via WhatsApp en stelt stap voor stap de juiste vragen. Type oppervlak, afmetingen, materiaal, alles wordt slim uitgevraagd.',
    details: [
      'Natuurlijke WhatsApp conversatie',
      'Slimme follow-up vragen',
      'Automatische data-extractie',
    ],
    visual: 'chat',
  },
  {
    number: '03',
    icon: Camera,
    title: "Foto's automatisch geanalyseerd",
    description:
      "De klant stuurt foto's van de situatie. AI Vision analyseert automatisch het materiaal, de staat en de omvang, zonder dat jij ernaar hoeft te kijken.",
    details: [
      'AI-analyse van elke foto',
      'Automatische opslag in Google Drive',
      'Materiaal- en oppervlakte herkenning',
    ],
    visual: 'photos',
  },
  {
    number: '04',
    icon: Calculator,
    title: 'Offerte in seconden klaar',
    description:
      'Op basis van de verzamelde gegevens en foto-analyse wordt de prijs automatisch berekend. Een professionele PDF-offerte wordt gegenereerd, klaar om te versturen.',
    details: [
      'Prijsberekening op basis van echte data',
      'Professionele PDF-offerte',
      'Inclusief alle specificaties',
    ],
    visual: 'calculate',
  },
  {
    number: '05',
    icon: ShieldCheck,
    title: 'Jij blijft in controle',
    description:
      'Jij ontvangt een email met alle klantgegevens, foto\'s en de berekende offerte. Met één klik keur je goed of pas je aan, volledig in controle.',
    details: [
      'Overzichtelijke email met alle info',
      'Goedkeuren met één klik',
      'Aanpassen via simpel formulier',
    ],
    visual: 'approve',
  },
  {
    number: '06',
    icon: Send,
    title: 'Klant ontvangt alles direct',
    description:
      'Na goedkeuring wordt de offerte automatisch verstuurd via WhatsApp én email. De klant kan direct een afspraak inplannen via een plannings-link.',
    details: [
      'WhatsApp + email verzending',
      'Automatische planning-link',
      'Follow-up herinneringen',
    ],
    visual: 'send',
  },
]

const stats = [
  { value: '24/7', label: 'Bereikbaar' },
  { value: '<2 min', label: 'Reactietijd' },
  { value: '0', label: 'Gemiste leads' },
  { value: '100%', label: 'Automatisch' },
]

export default function Services() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Stats bar */}
        <div className={styles.statsBar}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className={styles.timeline}>
          {steps.map((step, index) => {
            const Icon = step.icon
            const isEven = index % 2 === 1
            return (
              <div key={step.number}>
                <StepObserver
                  className={`${styles.step} ${isEven ? styles.stepReverse : ''}`}
                  activeClassName={styles.stepInView}
                  style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
                >
                  {/* Content side */}
                  <div className={styles.stepContent}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepDescription}>{step.description}</p>
                    <ul className={styles.stepDetails}>
                      {step.details.map((detail) => (
                        <li key={detail} className={styles.stepDetail}>
                          <span className={styles.detailDot} />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Center line with icon */}
                  <div className={styles.stepConnector}>
                    <div className={styles.stepIconWrap}>
                      <Icon size={24} />
                    </div>
                    {index < steps.length - 1 && (
                      <div className={styles.connectorLine} />
                    )}
                  </div>

                  {/* Visual side */}
                  <div className={styles.stepVisual}>
                    <div className={styles.visualCard}>
                      <StepVisual step={step.visual} />
                    </div>
                  </div>
                </StepObserver>

                {/* Mid-page CTA after step 3 */}
                {index === 2 && (
                  <div className={styles.midCta}>
                    <p className={styles.midCtaText}>
                      Benieuwd hoe dit voor jouw bedrijf werkt?
                    </p>
                    <Button href="/contact" variant="primary" size="md">
                      Plan een gratis demo →
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className={styles.bottomCta}>
          <h2 className={styles.ctaHeading}>
            Dit systeem voor jouw bedrijf?
          </h2>
          <p className={styles.ctaText}>
            Wij bouwen dit volledig op maat, afgestemd op jouw diensten,
            prijzen en werkwijze. Binnen een week operationeel.
          </p>
          <Button href="/contact" variant="primary" size="lg">
            Plan een gratis demo →
          </Button>
        </div>
      </div>
    </section>
  )
}

/* Mini visual components for each step */
function StepVisual({ step }: { step: string }) {
  switch (step) {
    case 'incoming':
      return (
        <div className={styles.mockForm}>
          <div className={styles.mockFormHeader}>Contactformulier</div>
          <div className={styles.mockField}>
            <span className={styles.mockLabel}>Naam</span>
            <div className={styles.mockInput}>Jan de Vries</div>
          </div>
          <div className={styles.mockField}>
            <span className={styles.mockLabel}>Telefoon</span>
            <div className={styles.mockInput}>+31 6 1234 5678</div>
          </div>
          <div className={styles.mockField}>
            <span className={styles.mockLabel}>Dienst</span>
            <div className={styles.mockInput}>Terras reinigen</div>
          </div>
          <div className={styles.mockButton}>Verstuur aanvraag</div>
        </div>
      )
    case 'chat':
      return (
        <div className={styles.mockChat}>
          <div className={styles.mockChatHeader}>
            <div className={styles.mockAvatar} />
            <span>WhatsApp</span>
          </div>
          <div className={styles.mockMessages}>
            <div className={`${styles.mockMsg} ${styles.mockMsgOut}`}>
              Hey Jan! Ik heb je aanvraag ontvangen. Om welk type oppervlak gaat het?
            </div>
            <div className={`${styles.mockMsg} ${styles.mockMsgIn}`}>
              Het gaat om onze oprit, zo&apos;n 40m²
            </div>
            <div className={`${styles.mockMsg} ${styles.mockMsgOut}`}>
              Top! Wat voor soort stenen liggen er?
            </div>
            <div className={styles.mockTyping}>
              <span /><span /><span />
            </div>
          </div>
        </div>
      )
    case 'photos':
      return (
        <div className={styles.mockPhotos}>
          <div className={styles.mockPhotoGrid}>
            <div className={styles.mockPhoto}>
              <Camera size={20} />
              <span>Foto 1</span>
            </div>
            <div className={styles.mockPhoto}>
              <Camera size={20} />
              <span>Foto 2</span>
            </div>
          </div>
          <div className={styles.mockAnalysis}>
            <div className={styles.mockAnalysisHeader}>AI Analyse</div>
            <div className={styles.mockAnalysisRow}>
              <span>Ondergrond</span>
              <span className={styles.mockTag}>Klinkers</span>
            </div>
            <div className={styles.mockAnalysisRow}>
              <span>Staat</span>
              <span className={styles.mockTag}>Matig vervuild</span>
            </div>
            <div className={styles.mockAnalysisRow}>
              <span>Geschat</span>
              <span className={styles.mockTag}>~40 m²</span>
            </div>
          </div>
        </div>
      )
    case 'calculate':
      return (
        <div className={styles.mockInvoice}>
          <div className={styles.mockInvoiceHeader}>Offerte #2847</div>
          <div className={styles.mockInvoiceRows}>
            <div className={styles.mockInvoiceRow}>
              <span>Oppervlakte</span>
              <span>40 m²</span>
            </div>
            <div className={styles.mockInvoiceRow}>
              <span>Prijs per m²</span>
              <span>€ 4,50</span>
            </div>
            <div className={styles.mockInvoiceRow}>
              <span>Toeslag planten</span>
              <span>€ 15,00</span>
            </div>
            <div className={`${styles.mockInvoiceRow} ${styles.mockInvoiceTotal}`}>
              <span>Totaal</span>
              <span>€ 195,00</span>
            </div>
          </div>
          <div className={styles.mockPdfBadge}>PDF gegenereerd</div>
        </div>
      )
    case 'approve':
      return (
        <div className={styles.mockEmail}>
          <div className={styles.mockEmailHeader}>
            <span className={styles.mockEmailDot} />
            Offerte ter goedkeuring
          </div>
          <div className={styles.mockEmailBody}>
            <p>Klant: Jan de Vries</p>
            <p>Totaal: € 195,00</p>
            <p>2 foto&apos;s bijgevoegd</p>
          </div>
          <div className={styles.mockEmailActions}>
            <div className={styles.mockBtnApprove}>Goedkeuren</div>
            <div className={styles.mockBtnEdit}>Wijzigen</div>
          </div>
        </div>
      )
    case 'send':
      return (
        <div className={styles.mockDelivery}>
          <div className={styles.mockDeliveryItem}>
            <div className={styles.mockDeliveryIcon}>
              <MessageSquare size={16} />
            </div>
            <div>
              <span className={styles.mockDeliveryTitle}>WhatsApp</span>
              <span className={styles.mockDeliveryStatus}>Bezorgd ✓✓</span>
            </div>
          </div>
          <div className={styles.mockDeliveryItem}>
            <div className={styles.mockDeliveryIcon}>
              <Send size={16} />
            </div>
            <div>
              <span className={styles.mockDeliveryTitle}>Email + PDF</span>
              <span className={styles.mockDeliveryStatus}>Verzonden ✓</span>
            </div>
          </div>
          <div className={styles.mockDeliveryItem}>
            <div className={styles.mockDeliveryIcon}>
              <FileText size={16} />
            </div>
            <div>
              <span className={styles.mockDeliveryTitle}>Planning-link</span>
              <span className={styles.mockDeliveryStatus}>Actief</span>
            </div>
          </div>
        </div>
      )
    default:
      return null
  }
}
