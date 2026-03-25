import {
  FileText,
  MessageSquare,
  Camera,
  Calculator,
  ShieldCheck,
  Send,
} from 'lucide-react'
import DemoButton from '@/components/ui/DemoButton'
import StepObserver, { TimelineProvider } from './StepObserver'
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
        <TimelineProvider totalSteps={steps.length}>
        <div className={styles.timeline}>
          {steps.map((step, index) => {
            const Icon = step.icon
            const isEven = index % 2 === 1
            return (
              <div key={step.number}>
                <StepObserver
                  index={index}
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
                    <DemoButton variant="primary" size="md">
                      Plan een gratis demo →
                    </DemoButton>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </TimelineProvider>

        {/* CTA */}
        <div className={styles.bottomCta}>
          <h2 className={styles.ctaHeading}>
            Dit systeem voor jouw bedrijf?
          </h2>
          <p className={styles.ctaText}>
            Wij bouwen dit volledig op maat, afgestemd op jouw diensten,
            prijzen en werkwijze. Binnen een week operationeel.
          </p>
          <DemoButton variant="primary" size="lg">
            Plan een gratis demo →
          </DemoButton>
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
          <div className={styles.mockFormHeader}>Nieuwe aanvraag</div>
          <div className={styles.mockField}>
            <span className={styles.mockLabel}>Naam</span>
            <div className={styles.mockInput}>Lisa Bakker</div>
          </div>
          <div className={styles.mockField}>
            <span className={styles.mockLabel}>Telefoon</span>
            <div className={styles.mockInput}>+31 6 •••• ••78</div>
          </div>
          <div className={styles.mockField}>
            <span className={styles.mockLabel}>Interesse</span>
            <div className={styles.mockInput}>Vrijblijvende offerte</div>
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
              Hoi Lisa! Bedankt voor je aanvraag. Kan je kort omschrijven wat je nodig hebt?
            </div>
            <div className={`${styles.mockMsg} ${styles.mockMsgIn}`}>
              Ja, ik zoek een offerte voor mijn project
            </div>
            <div className={`${styles.mockMsg} ${styles.mockMsgOut}`}>
              Top! Kun je een paar details delen zodat ik het goed kan inschatten?
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
              <span>Type</span>
              <span className={styles.mockTag}>Herkend</span>
            </div>
            <div className={styles.mockAnalysisRow}>
              <span>Conditie</span>
              <span className={styles.mockTag}>Beoordeeld</span>
            </div>
            <div className={styles.mockAnalysisRow}>
              <span>Omvang</span>
              <span className={styles.mockTag}>Ingeschat</span>
            </div>
          </div>
        </div>
      )
    case 'calculate':
      return (
        <div className={styles.mockInvoice}>
          <div className={styles.mockInvoiceHeader}>Offerte #1042</div>
          <div className={styles.mockInvoiceRows}>
            <div className={styles.mockInvoiceRow}>
              <span>Dienst</span>
              <span>Op maat</span>
            </div>
            <div className={styles.mockInvoiceRow}>
              <span>Specificaties</span>
              <span>Automatisch ingevuld</span>
            </div>
            <div className={styles.mockInvoiceRow}>
              <span>Korting</span>
              <span>Berekend</span>
            </div>
            <div className={`${styles.mockInvoiceRow} ${styles.mockInvoiceTotal}`}>
              <span>Totaal</span>
              <span>€ •••,••</span>
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
            <p>Klant: Lisa Bakker</p>
            <p>Offerte: klaar voor review</p>
            <p>Bijlagen: 2 bestanden</p>
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
