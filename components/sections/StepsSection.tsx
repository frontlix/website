'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import ProjectModal from '@/components/ui/ProjectModal'
import styles from './StepsSection.module.css'

const steps = [
  {
    number: '01.',
    title: 'Intake & Strategie',
    bullets: [
      'We brengen jouw diensten, doelgroep en huidige leadstroom in kaart.',
      'We bepalen welke vragen het systeem moet stellen om een lead te kwalificeren.',
      'We stippelen de volledige flow uit: van eerste contact tot offerte én automatische afspraak.',
    ],
    result: 'Een op maat gemaakt plan dat aansluit op hoe jouw bedrijf werkt.',
  },
  {
    number: '02.',
    title: 'Bouw & Installatie',
    bullets: [
      'We bouwen de volledige workflow uit, van binnenkomende lead tot verstuurde offerte én automatisch ingeplande afspraak.',
      'Het systeem stelt automatisch de juiste vragen en verzamelt alle benodigde informatie.',
      'Op basis van de antwoorden wordt direct een offerte op maat gegenereerd.',
    ],
    result: 'Een volledig werkend systeem, getest en klaar voor gebruik.',
  },
  {
    number: '03.',
    title: 'Live & Optimalisatie',
    bullets: [
      'We zetten het systeem live en monitoren de eerste gesprekken.',
      'We verfijnen de gespreksflow op basis van echte resultaten.',
      'Jij krijgt een melding zodra er een nieuwe offerte klaarstaat of een afspraak ingepland is.',
    ],
    result: 'Een systeem dat steeds beter wordt, zonder dat jij er naar omkijkt.',
  },
]

const TOP_START_DESKTOP = 100
const TOP_INCREMENT_DESKTOP = 30
const TOP_START_MOBILE = 70
const TOP_INCREMENT_MOBILE = 25

export default function StepsSection() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const getTopValues = () => {
      const isMobile = window.innerWidth < 768
      return {
        start: isMobile ? TOP_START_MOBILE : TOP_START_DESKTOP,
        increment: isMobile ? TOP_INCREMENT_MOBILE : TOP_INCREMENT_DESKTOP,
      }
    }

    const handleScroll = () => {
      const cards = cardsRef.current
      const { start, increment } = getTopValues()
      cards.forEach((card, i) => {
        if (!card) return
        const stickyTop = start + i * increment
        // Update inline top to match current breakpoint
        card.style.top = `${stickyTop}px`
        const rect = card.getBoundingClientRect()
        const distanceFromTop = stickyTop - rect.top
        const progress = Math.max(0, Math.min(1, distanceFromTop / 200))

        if (i < cards.length - 1) {
          const scale = 1 - progress * 0.04
          const opacity = 1 - progress * 0.3
          card.style.transform = `scale(${scale})`
          card.style.opacity = `${opacity}`
        } else {
          card.style.transform = 'scale(1)'
          card.style.opacity = '1'
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section className={styles.section} ref={sectionRef}>
      <div className={styles.inner}>
        <div className={styles.layout}>
          {/* Left column — sticky intro */}
          <div className={styles.left}>
            <div className={styles.labelRow}>
              <span className={styles.labelLine} />
              <span className={styles.labelDot} />
              <span className={styles.label}>Onze werkwijze</span>
            </div>
            <h2 className={styles.heading}>
              Van idee tot resultaat in drie stappen
            </h2>
            <p className={styles.subtext}>
              Een helder proces zodat jij precies weet wat je kunt verwachten, van eerste gesprek tot livegang en daarna.
            </p>
            <Button variant="primary" size="lg" onClick={() => setModalOpen(true)}>
              Plan een gratis gesprek →
            </Button>
            <ProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
          </div>

          {/* Right column — stacking cards */}
          <div className={styles.right}>
            <div className={styles.steps}>
              {steps.map((step, i) => (
                <div
                  key={step.number}
                  className={styles.step}
                  ref={(el) => { cardsRef.current[i] = el }}
                  style={{
                    top: `${TOP_START_DESKTOP + i * TOP_INCREMENT_DESKTOP}px`,
                    zIndex: i + 1,
                  }}
                >
                  <div className={styles.stepHeader}>
                    <span className={styles.stepNumber}>{step.number}</span>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                  </div>
                  <ul className={styles.stepBullets}>
                    {step.bullets.map((bullet, j) => (
                      <li key={j} className={styles.stepBullet}>{bullet}</li>
                    ))}
                  </ul>
                  <div className={styles.stepResult}>
                    <span className={styles.stepResultLabel}>Resultaat: </span>
                    {step.result}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
