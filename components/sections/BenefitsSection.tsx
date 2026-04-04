'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import ProjectModal from '@/components/ui/ProjectModal'
import WhatsAppIllustration from './WhatsAppIllustration'
import ClockIllustration from './ClockIllustration'
import SettingsIllustration from './SettingsIllustration'
import AutomationIllustration from './AutomationIllustration'
import styles from './BenefitsSection.module.css'

interface CountUpProps {
  end: number
  prefix?: string
  suffix?: string
  duration?: number
}

function CountUp({ end, prefix = '', suffix = '', duration = 2500 }: CountUpProps) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  const startAnimation = useCallback(() => {
    if (hasStarted) return
    setHasStarted(true)

    const startTime = performance.now()

    function update(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))

      if (progress < 1) {
        requestAnimationFrame(update)
      }
    }

    requestAnimationFrame(update)
  }, [end, duration, hasStarted])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [startAnimation])

  return (
    <span ref={ref} className={styles.visualValue}>
      {prefix}{count}{suffix}
    </span>
  )
}

const cards = [
  {
    label: 'Gemiddelde reactie',
    sub: 'op elke nieuwe lead',
    countUp: { end: 60, suffix: ' sec' },
    title: 'Reactietijd',
    description:
      'Jouw lead krijgt binnen 60 seconden een persoonlijk WhatsApp bericht.',
  },
  {
    label: 'Beschikbaarheid',
    sub: 'ook buiten werktijden',
    countUp: { end: 24, suffix: '/7' },
    title: 'Altijd beschikbaar',
    description:
      'Ook \'s avonds en in het weekend. Het systeem mist geen enkele aanvraag.',
  },
  {
    label: 'Maatwerk',
    sub: 'op maat voor jouw bedrijf',
    countUp: { end: 100, suffix: '%' },
    title: 'Op maat gebouwd',
    description:
      'Geen standaard chatbot, specifiek gebouwd voor jouw bedrijf en diensten.',
  },
  {
    label: 'Jouw tijdsinvestering',
    sub: 'werk voor jou',
    countUp: { end: 1, prefix: '< ', suffix: ' min' },
    title: 'Volledig automatisch',
    description:
      'Van eerste bericht tot offerte zonder dat jij iets hoeft te doen.',
  },
]

export default function BenefitsSection() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section id="waarom" className={styles.section}>
      <div className={styles.inner}>

        {/* Top: label + heading / description */}
        <div className={styles.top}>
          <div className={styles.topLeft}>
            <div className={styles.labelRow}>
              <span className={styles.labelLine} />
              <span className={styles.labelDot} />
              <span className={styles.label}>Waarom Frontlix?</span>
            </div>
            <h2 className={styles.heading}>
              Jouw concurrenten reageren te laat.
              <br />
              Jij niet meer.
            </h2>
          </div>
          <p className={styles.description}>
            <strong>Elke nieuwe lead</strong> krijgt automatisch een persoonlijk WhatsApp-bericht met offerte. Binnen 60 seconden, 24/7, zonder dat jij iets hoeft te doen.
          </p>
        </div>

        {/* Cards grid */}
        <div className={styles.cards}>
          {cards.map((card, i) => (
            <div key={i} className={styles.card}>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardDesc}>{card.description}</p>
              <div className={styles.cardVisual}>
                <div className={styles.visualMetric}>
                  <span className={styles.visualLabel}>{card.label}</span>
                  <CountUp {...card.countUp} />
                  <span className={styles.visualSub}>{card.sub}</span>
                </div>
              </div>
              {i === 0 && <WhatsAppIllustration />}
              {i === 1 && <ClockIllustration />}
              {i === 2 && <SettingsIllustration />}
              {i === 3 && <AutomationIllustration />}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.cta}>
          <Button variant="primary" size="lg" onClick={() => setModalOpen(true)}>
            Plan een gratis gesprek →
          </Button>
          <Link href="/diensten" className={styles.ctaLink}>
            Bekijk hoe het werkt →
          </Link>
          <ProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
      </div>
    </section>
  )
}
