import {
  FileText,
  MessageSquare,
  Calculator,
  ShieldCheck,
  Send,
  CalendarCheck,
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
    icon: Calculator,
    title: 'Offerte in seconden klaar',
    description:
      'Op basis van de verzamelde gegevens wordt de prijs automatisch berekend. Een professionele PDF-offerte wordt gegenereerd, klaar om te versturen.',
    details: [
      'Prijsberekening op basis van echte data',
      'Professionele PDF-offerte',
      'Inclusief alle specificaties',
    ],
    visual: 'calculate',
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: 'Jij blijft in controle',
    description:
      'Jij ontvangt een email met alle klantgegevens en de berekende offerte. Met één klik keur je goed of pas je aan, volledig in controle.',
    details: [
      'Overzichtelijke email met alle info',
      'Goedkeuren met één klik',
      'Aanpassen via simpel formulier',
    ],
    visual: 'approve',
  },
  {
    number: '05',
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
  {
    number: '06',
    icon: CalendarCheck,
    title: 'Afspraak automatisch ingepland',
    description:
      'Na de offerte ontvangt de klant via WhatsApp een uitnodiging om een afspraak in te plannen. Met één klik kiest de klant een moment dat past, zonder heen-en-weer gemail.',
    details: [
      'Automatisch WhatsApp-bericht met planning-link',
      'Klant plant zelf in via Google Calendar',
      'Jij ontvangt een bevestiging',
    ],
    visual: 'schedule',
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
            prijzen en werkwijze. Binnen twee tot vier weken operationeel.
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
            <svg className={styles.mockAvatar} viewBox="0 0 24 24" fill="#25d366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
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
    case 'schedule':
      return (
        <div className={styles.mockSchedule}>
          <div className={styles.mockScheduleHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span>WhatsApp</span>
          </div>
          <div className={styles.mockScheduleBody}>
            <div className={`${styles.mockMsg} ${styles.mockMsgOut}`}>
              Je offerte staat klaar! Wil je een afspraak inplannen? 📅
            </div>
            <div className={styles.mockCalendarCard}>
              <CalendarCheck size={18} />
              <div>
                <span className={styles.mockCalendarTitle}>Plan een afspraak</span>
                <span className={styles.mockCalendarLink}>calendar.google.com/...</span>
              </div>
            </div>
            <div className={`${styles.mockMsg} ${styles.mockMsgIn}`}>
              Donderdag 14:00 past perfect!
            </div>
            <div className={styles.mockConfirmBadge}>
              <CalendarCheck size={14} />
              Afspraak bevestigd
            </div>
          </div>
        </div>
      )
    default:
      return null
  }
}
