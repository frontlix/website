import {
  ClipboardList,
  MessageCircle,
  Bot,
  FileText,
  UserCheck,
  Send,
} from 'lucide-react'
import styles from './Pipeline.module.css'

const PIPELINE_STEPS = [
  { id: 1, icon: ClipboardList, title: 'Formulier ingediend', subtitle: 'Lead binnengehaald' },
  { id: 2, icon: MessageCircle, title: 'WhatsApp verzonden', subtitle: 'Bericht afgeleverd' },
  { id: 3, icon: Bot, title: 'AI start gesprek', subtitle: 'Frontlix AI actief' },
  { id: 4, icon: FileText, title: 'Offerte opstellen', subtitle: 'Document gegenereerd' },
  { id: 5, icon: UserCheck, title: 'Controle eigenaar', subtitle: 'Wacht op goedkeuring' },
  { id: 6, icon: Send, title: 'Offerte verstuurd', subtitle: 'Email verzonden' },
]

interface PipelineProps {
  currentStep: number
  showComplete: boolean
}

export default function Pipeline({ currentStep, showComplete }: PipelineProps) {
  /* Progress fill: 0% at step 0, grows through step positions, 100% at step 6 */
  const getProgressPercent = () => {
    if (currentStep <= 0) return 0
    if (currentStep >= 6) return 100
    /* 5 gaps between 6 steps — each step adds ~20%, offset by half for centering */
    return ((currentStep - 1) / 5) * 100 + 10
  }

  return (
    <div className={styles.column}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerLeft}>
          <span className={styles.headerIcon}>⚡</span>
          <span className={styles.headerTitle}>Automatisering pipeline</span>
        </span>
        <span className={`${styles.completeBadge} ${showComplete ? styles.completeVisible : ''}`}>
          ✓ compleet
        </span>
      </div>

      {/* Steps */}
      <div className={styles.stepsList}>
        {/* Progress track with fill */}
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ height: `${getProgressPercent()}%` }}
          />
        </div>

        {PIPELINE_STEPS.map((step) => {
          const isDone = currentStep > step.id
          const isActive = currentStep === step.id
          const Icon = step.icon

          return (
            <div key={step.id} className={styles.stepRow}>
              {/* Circle indicator */}
              <div
                className={`${styles.circle} ${
                  isDone ? styles.circleDone : isActive ? styles.circleActive : styles.circleFuture
                }`}
              >
                {isDone && (
                  <svg className={styles.checkSvg} viewBox="0 0 12 12">
                    <path className={styles.checkPath} d="M2.5 6.5L5 9L9.5 3.5" />
                  </svg>
                )}
              </div>

              {/* Card */}
              <div
                className={`${styles.card} ${
                  isDone ? styles.cardDone : isActive ? styles.cardActive : ''
                }`}
              >
                <span className={styles.cardIcon}>
                  <Icon size={16} />
                </span>
                <div className={styles.cardInfo}>
                  <span className={styles.cardTitle}>{step.title}</span>
                  <span className={styles.cardSubtitle}>{step.subtitle}</span>
                </div>
                <span className={`${styles.klarBadge} ${isDone ? styles.klarVisible : ''}`}>
                  KLAAR
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
