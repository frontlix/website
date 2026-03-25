'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import ProjectModal from '@/components/ui/ProjectModal'
import styles from './ProfilesSection.module.css'

/* Inline SVG illustration for the "missed leads" card */
function LeadIllustration() {
  return (
    <svg viewBox="20 56 590 120" xmlns="http://www.w3.org/2000/svg" className={styles.cardIllustration}>

      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {/* Tijdlijn */}
      <line x1="80" y1="130" x2="600" y2="130" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" strokeDasharray="6 4" />

      {/* Stap 1: Lead komt binnen */}
      <circle cx="100" cy="90" r="24" fill="#0ea5e9" />
      <circle cx="100" cy="80" r="9" fill="white" />
      <path d="M86 100 Q86 90 100 90 Q114 90 114 100" fill="white" />
      <circle cx="100" cy="130" r="8" fill="#0ea5e9" />
      <text x="100" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#374151" fontWeight="600">Lead komt binnen</text>

      {/* Stap 2: 12 uur later */}
      <circle cx="240" cy="90" r="24" fill="rgba(0,0,0,0.04)" stroke="#64748b" strokeWidth="1.5" />
      <circle cx="240" cy="86" r="12" fill="none" stroke="#64748b" strokeWidth="1.5" />
      <line x1="240" y1="80" x2="240" y2="86" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
      <line x1="240" y1="86" x2="247" y2="90" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
      <circle cx="240" cy="130" r="8" fill="#64748b" />
      <text x="240" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#374151" fontWeight="600">12 uur later</text>

      {/* Stap 3: Lead haakt af */}
      <g opacity="0.7">
        <circle cx="380" cy="90" r="24" fill="#64748b" />
        <circle cx="380" cy="80" r="9" fill="white" opacity="0.6" />
        <path d="M366 100 Q366 90 380 90 Q394 90 394 100" fill="white" opacity="0.6" />
        <circle cx="395" cy="72" r="10" fill="#f59e0b" />
        <text x="395" y="76" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700" fill="white">?</text>
        <circle cx="380" cy="130" r="8" fill="#64748b" />
        <text x="380" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#6b7280" fontWeight="600">Lead haakt af</text>
      </g>

      {/* Stap 4: Lead verloren */}
      <g opacity="0.4">
        <circle cx="520" cy="90" r="24" fill="#475569" />
        <circle cx="520" cy="80" r="9" fill="white" />
        <path d="M506 100 Q506 90 520 90 Q534 90 534 100" fill="white" />
        <path d="M510 80 L530 100" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M530 80 L510 100" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="520" cy="130" r="8" fill="#475569" />
        <text x="520" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#6b7280" fontWeight="600">Lead verloren</text>
      </g>

      {/* Pijlen */}
      <path d="M125 130 L225 130" fill="none" stroke="#0ea5e9" strokeWidth="2.5" markerEnd="url(#arr)" />
      <path d="M265 130 L365 130" fill="none" stroke="#64748b" strokeWidth="2.5" markerEnd="url(#arr)" />
      <path d="M405 130 L505 130" fill="none" stroke="#475569" strokeWidth="2.5" markerEnd="url(#arr)" />
    </svg>
  )
}

/* Inline SVG illustration for the "manual follow-up" card */
function ManualWorkIllustration() {
  return (
    <svg viewBox="20 56 590 120" xmlns="http://www.w3.org/2000/svg" className={styles.cardIllustration}>

      <defs>
        <marker id="arr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {/* Tijdlijn */}
      <line x1="80" y1="130" x2="600" y2="130" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" strokeDasharray="6 4" />

      {/* Stap 1: Lead binnen */}
      <g>
        <circle cx="100" cy="90" r="24" fill="#0ea5e9" />
        <circle cx="100" cy="80" r="9" fill="white" />
        <path d="M86 100 Q86 90 100 90 Q114 90 114 100" fill="white" />
        <circle cx="100" cy="130" r="8" fill="#0ea5e9" />
        <text x="100" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#374151" fontWeight="600">Lead binnen</text>
      </g>

      {/* Stap 2: Offerte met de hand */}
      <g>
        <rect x="218" y="70" width="44" height="40" rx="4" fill="rgba(0,0,0,0.04)" stroke="#f59e0b" strokeWidth="1.5" />
        <line x1="226" y1="80" x2="254" y2="80" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="226" y1="86" x2="250" y2="86" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <line x1="226" y1="92" x2="246" y2="92" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <line x1="226" y1="98" x2="252" y2="98" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <circle cx="240" cy="130" r="8" fill="#f59e0b" />
        <text x="240" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#374151" fontWeight="600">Offerte met de hand</text>
      </g>

      {/* Stap 3: Reminder vergeten */}
      <g opacity="0.7">
        <circle cx="385" cy="86" r="24" fill="rgba(0,0,0,0.04)" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="385" cy="82" r="12" fill="none" stroke="#64748b" strokeWidth="1.5" />
        <line x1="385" y1="76" x2="385" y2="82" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <line x1="385" y1="82" x2="392" y2="86" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <text x="385" y="106" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700" fill="#64748b">?</text>
        <circle cx="385" cy="130" r="8" fill="#64748b" />
        <text x="385" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#6b7280" fontWeight="600">Reminder vergeten</text>
      </g>

      {/* Stap 4: Kans gemist */}
      <g opacity="0.4">
        <circle cx="525" cy="86" r="24" fill="#475569" />
        <circle cx="525" cy="76" r="9" fill="white" />
        <path d="M511 96 Q511 86 525 86 Q539 86 539 96" fill="white" />
        <path d="M515 76 L535 96" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M535 76 L515 96" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="525" cy="130" r="8" fill="#475569" />
        <text x="525" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#6b7280" fontWeight="600">Kans gemist</text>
      </g>

      {/* Pijlen */}
      <path d="M125 130 L225 130" fill="none" stroke="#0ea5e9" strokeWidth="2.5" markerEnd="url(#arr2)" />
      <path d="M265 130 L365 130" fill="none" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arr2)" />
      <path d="M410 130 L505 130" fill="none" stroke="#475569" strokeWidth="2.5" markerEnd="url(#arr2)" />
    </svg>
  )
}

/* Inline SVG illustration for the "low conversion" card */
function ConversionIllustration() {
  return (
    <svg viewBox="20 56 590 120" xmlns="http://www.w3.org/2000/svg" className={styles.cardIllustration}>

      <defs>
        <marker id="arr3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {/* Tijdlijn */}
      <line x1="80" y1="130" x2="600" y2="130" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" strokeDasharray="6 4" />

      {/* Stap 1: 10 aanvragen */}
      <g>
        <text x="100" y="88" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="700" fill="#0ea5e9">10</text>
        <circle cx="100" cy="130" r="8" fill="#0ea5e9" />
        <text x="100" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#374151" fontWeight="600">Aanvragen</text>
      </g>

      {/* Stap 2: 4 reacties */}
      <g>
        <text x="240" y="88" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="700" fill="#f59e0b">5</text>
        <circle cx="240" cy="130" r="8" fill="#f59e0b" />
        <text x="240" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#374151" fontWeight="600">Reacties</text>
      </g>

      {/* Stap 3: 2 gesprekken */}
      <g opacity="0.7">
        <text x="385" y="88" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="700" fill="#64748b">2</text>
        <circle cx="385" cy="130" r="8" fill="#64748b" />
        <text x="385" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#6b7280" fontWeight="600">Gesprekken</text>
      </g>

      {/* Stap 4: 1 klant */}
      <g opacity="0.4">
        <text x="525" y="88" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="36" fontWeight="700" fill="#ef4444">1</text>
        <circle cx="525" cy="130" r="8" fill="#475569" />
        <text x="525" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fill="#6b7280" fontWeight="600">Klant</text>
      </g>

      {/* Pijlen */}
      <path d="M125 130 L222 130" fill="none" stroke="#0ea5e9" strokeWidth="2.5" markerEnd="url(#arr3)" />
      <path d="M265 130 L368 130" fill="none" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arr3)" />
      <path d="M410 130 L508 130" fill="none" stroke="#475569" strokeWidth="2.5" markerEnd="url(#arr3)" />
    </svg>
  )
}

interface PainCard {
  illustration?: React.ReactNode
  pain: string
  explanation: string
  solutions: string[]
}

const painCards: PainCard[] = [
  {
    illustration: <LeadIllustration />,
    pain: 'Voor ik het weet is een warme lead alweer afgehaakt',
    explanation:
      'Je hebt het druk en voor je het weet is een warme lead koud. Dat is zonde, want de interesse was er wel.',
    solutions: [
      'Elke lead krijgt meteen een reactie, zonder dat jij iets hoeft te doen',
      'Geen enkele lead glipt er meer tussendoor',
      'Je krijgt een seintje zodra een lead actie onderneemt',
    ],
  },
  {
    illustration: <ManualWorkIllustration />,
    pain: 'Ik stuur offertes en follow-ups nog handmatig en dat kost mij veel tijd',
    explanation:
      'Elke lead apart opvolgen, offertes met de hand maken, reminders in je hoofd bijhouden, het is een tijdvreter waar je nooit klaar mee bent.',
    solutions: [
      'Offertes en follow-ups gaan automatisch de deur uit',
      'Elke lead krijgt op het juiste moment het juiste bericht',
      'Jij houdt de regie, zonder het handwerk',
    ],
  },
  {
    illustration: <ConversionIllustration />,
    pain: 'Ik krijg wel aanvragen binnen, maar de meeste worden uiteindelijk niks',
    explanation:
      'Mensen tonen interesse, maar ergens tussen het eerste contact en de deal vallen ze af. Je weet niet precies waar of waarom.',
    solutions: [
      'Elke lead wordt automatisch op het juiste moment opgevolgd',
      'Je ziet precies waar leads afhaken en waarom',
      'Meer klanten uit dezelfde hoeveelheid aanvragen',
    ],
  },
]

export default function ProfilesSection() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Herken jij dit?</h2>
          <p className={styles.subtitle}>De meeste MKB-ondernemers lopen tegen dezelfde problemen aan.</p>
        </div>

        <div className={styles.grid}>
          {painCards.map((card) => (
            <div key={card.pain} className={`${styles.card} ${styles.cardGradient}`}>
              {card.illustration}
              <h3 className={styles.cardPain}>{card.pain}</h3>
              <p className={styles.cardDescription}>{card.explanation}</p>
              <div className={styles.solutions}>
                <span className={styles.solutionLabel}>Zo lossen wij dit op:</span>
                {card.solutions.map((solution) => (
                  <span key={solution} className={styles.solution}>
                    <span className={styles.solutionDot} />
                    {solution}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.ctaWrapper}>
          <Button variant="primary" size="lg" onClick={() => setModalOpen(true)}>
            Gratis kennismaking →
          </Button>
          <ProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
      </div>
    </section>
  )
}
