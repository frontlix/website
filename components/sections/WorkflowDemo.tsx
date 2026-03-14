'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  BatteryMedium,
  Briefcase,
  MessageSquare,
  Mic,
  Phone,
  Signal,
  Star,
  User,
} from 'lucide-react'
import styles from './WorkflowDemo.module.css'

const STEP_DURATION = 3500
const TOTAL_STEPS = 5

const STEP_LABELS = [
  'Formulier ingevuld',
  'Lead opgeslagen',
  'WhatsApp bericht verstuurd',
  'AI verzamelt informatie',
  'Offerte verstuurd',
]

// ─── Step 1: Form fills itself in field by field ───────────────────────────────
function FormVisual() {
  return (
    <div className={styles.formCard}>
      <div className={styles.formCardHeader}>
        <p className={styles.formTitle}>Offerte aanvragen</p>
      </div>

      <div className={`${styles.formField} ${styles.ff1}`}>
        <label className={styles.fieldLabel}>
          <User size={11} className={styles.fieldIcon} />
          Naam
        </label>
        <div className={styles.fieldInput}>
          <span className={`${styles.fieldValue} ${styles.fv1}`}>Ahmad K.</span>
        </div>
      </div>

      <div className={`${styles.formField} ${styles.ff2}`}>
        <label className={styles.fieldLabel}>
          <Phone size={11} className={styles.fieldIcon} />
          Telefoon
        </label>
        <div className={styles.fieldInput}>
          <span className={`${styles.fieldValue} ${styles.fv2}`}>+31 6 12 34 56 78</span>
        </div>
      </div>

      <div className={`${styles.formField} ${styles.ff3}`}>
        <label className={styles.fieldLabel}>
          <Briefcase size={11} className={styles.fieldIcon} />
          Dienst
        </label>
        <div className={styles.fieldInput}>
          <span className={`${styles.fieldValue} ${styles.fv3}`}>Terrasreiniging ▾</span>
        </div>
      </div>

      <div className={`${styles.formField} ${styles.ff4}`}>
        <label className={styles.fieldLabel}>
          <MessageSquare size={11} className={styles.fieldIcon} />
          Bericht
        </label>
        <div className={`${styles.fieldInput} ${styles.fieldInputTall}`}>
          <span className={`${styles.fieldValue} ${styles.fv4}`}>Ik wil graag een offerte ontvangen.</span>
        </div>
      </div>

      <button className={styles.submitBtn} tabIndex={-1}>
        Aanvragen →
      </button>
      <div className={styles.submitVerzonden}>✓ Verzonden</div>
    </div>
  )
}

// ─── Step 2: Lead row slides into spreadsheet ──────────────────────────────────
function SheetVisual() {
  return (
    <div className={styles.sheetCard}>
      <div className={styles.newLeadLabel}>Nieuwe lead ontvangen...</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Naam</th>
            <th className={styles.th}>Dienst</th>
            <th className={styles.th}>Status</th>
            <th className={styles.th}>Tijd</th>
          </tr>
        </thead>
        <tbody>
          <tr className={styles.oldRow}>
            <td className={styles.td}>Pieter V.</td>
            <td className={styles.td}>Dakgoten</td>
            <td className={styles.td}>
              <span className={styles.badgeSent}>Verstuurd</span>
            </td>
            <td className={styles.td}>gisteren</td>
          </tr>
          <tr className={styles.oldRow}>
            <td className={styles.td}>Sara M.</td>
            <td className={styles.td}>Schilderwerk</td>
            <td className={styles.td}>
              <span className={styles.badgeSent}>Verstuurd</span>
            </td>
            <td className={styles.td}>2 dagen</td>
          </tr>
          <tr className={styles.newRow}>
            <td className={`${styles.td} ${styles.tdAccentBorder}`}>Ahmad K.</td>
            <td className={styles.td}>Terrasreiniging</td>
            <td className={styles.td}>
              <span className={styles.badgeNew}>Nieuw</span>
            </td>
            <td className={`${styles.td} ${styles.tdAccent}`}>zojuist</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Step 3: Phone with outgoing WhatsApp message ─────────────────────────────
function WhatsAppOutVisual() {
  return (
    <div className={styles.phoneWrap}>
      <div className={styles.phone}>
        {/* Side button on right edge */}
        <div className={styles.phoneSideBtn} />

        <div className={styles.phoneSpeaker} />
        <div className={styles.phoneScreen}>
          {/* Front camera dot */}
          <div className={styles.phoneCameraArea}>
            <div className={styles.phoneCameraDot} />
          </div>

          {/* Status bar */}
          <div className={styles.phoneStatusBar}>
            <span className={styles.statusTime}>12:41</span>
            <div className={styles.statusIcons}>
              <Signal size={10} />
              <BatteryMedium size={10} />
            </div>
          </div>

          {/* WhatsApp chat header */}
          <div className={styles.waHeader}>
            <div className={styles.waAvatarWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_frontlix_trans.png" alt="Frontlix" className={styles.waAvatarImg} />
            </div>
            <div className={styles.waHeaderInfo}>
              <span className={styles.waName}>Digitale Assistent</span>
              <span className={styles.waStatus}>online</span>
            </div>
          </div>

          {/* Message area */}
          <div className={styles.phoneMessages}>
            <div className={styles.phoneBubble}>
              Hoi! Bedankt voor je aanvraag. Ik ben de digitale assistent en
              help je verder. Waarvoor kan ik je helpen?
            </div>
            <div className={styles.phoneReadReceipt}>✓✓ Gelezen</div>
          </div>

          {/* WhatsApp input bar */}
          <div className={styles.waInputBar}>
            <div className={styles.waInputField}>
              <span className={styles.waInputPlaceholder}>Bericht</span>
            </div>
            <Mic size={14} className={styles.waInputMic} />
          </div>
        </div>
        <div className={styles.phoneHome} />
      </div>
    </div>
  )
}

// ─── Step 4: AI back-and-forth conversation ────────────────────────────────────
function ChatExchangeVisual() {
  return (
    <div className={styles.chatCard}>
      {/* Header with Frontlix logo */}
      <div className={styles.chatHeader}>
        <div className={styles.logoAvatar}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_frontlix_trans.png" alt="Frontlix" />
        </div>
        <div className={styles.chatHeaderInfo}>
          <span className={styles.chatName}>Digitale Assistent</span>
          <div className={styles.onlineLine}>
            <span className={styles.onlineDot} />
            <span className={styles.onlineText}>Online</span>
          </div>
        </div>
      </div>

      {/* Bubbles */}
      <div className={styles.chatBubbles}>
        {/* 1. Klant */}
        <div className={styles.bubbleWrap}>
          <div className={`${styles.cBubble} ${styles.cIn} ${styles.cm1}`}>
            Hoi, ik wil een terras laten reinigen
          </div>
          <span className={`${styles.bubbleTime} ${styles.timeLeft} ${styles.cm1}`}>12:41</span>
        </div>

        {/* 2. AI */}
        <div className={styles.bubbleWrap}>
          <div className={`${styles.cBubble} ${styles.cOut} ${styles.cm2}`}>
            Hoi! Hoeveel m² is het terras ongeveer?
          </div>
          <span className={`${styles.bubbleTime} ${styles.timeRight} ${styles.cm2}`}>12:41</span>
        </div>

        {/* 3. Klant */}
        <div className={styles.bubbleWrap}>
          <div className={`${styles.cBubble} ${styles.cIn} ${styles.cm3}`}>
            Zo&apos;n 40 m²
          </div>
          <span className={`${styles.bubbleTime} ${styles.timeLeft} ${styles.cm3}`}>12:42</span>
        </div>

        {/* 4. AI */}
        <div className={styles.bubbleWrap}>
          <div className={`${styles.cBubble} ${styles.cOut} ${styles.cm4}`}>
            Wat voor soort steen? (bijv. tegels, klinkers, natuursteen)
          </div>
          <span className={`${styles.bubbleTime} ${styles.timeRight} ${styles.cm4}`}>12:42</span>
        </div>

        {/* 5. Klant */}
        <div className={styles.bubbleWrap}>
          <div className={`${styles.cBubble} ${styles.cIn} ${styles.cm5}`}>
            Gewone betonnen tegels
          </div>
          <span className={`${styles.bubbleTime} ${styles.timeLeft} ${styles.cm5}`}>12:43</span>
        </div>

        {/* 6. AI */}
        <div className={styles.bubbleWrap}>
          <div className={`${styles.cBubble} ${styles.cOut} ${styles.cm6}`}>
            Top! Ik stel een offerte voor je op. Wat is je e-mailadres?
          </div>
          <span className={`${styles.bubbleTime} ${styles.timeRight} ${styles.cm6}`}>12:43</span>
        </div>

        {/* Typing indicator — ●●● bouncing dots */}
        <div className={styles.typingIndicator}>
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
          <span className={styles.typingDot} />
        </div>
      </div>
    </div>
  )
}

// ─── Step 5: Email client mockup ──────────────────────────────────────────────
function QuoteVisual() {
  return (
    <div className={styles.emailClient}>
      {/* Email app top bar */}
      <div className={styles.emailTopBar}>
        <ArrowLeft size={15} className={styles.emailTopIcon} />
        <span className={styles.emailSubject}>Uw offerte van Frontlix</span>
        <Star size={15} className={styles.emailTopIcon} />
      </div>

      {/* Sender row */}
      <div className={styles.emailSenderRow}>
        <div className={styles.logoAvatar}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_frontlix_trans.png" alt="Frontlix" />
        </div>
        <div className={styles.emailSenderInfo}>
          <span className={styles.emailSenderName}>Frontlix Automatisering</span>
          <span className={styles.emailSenderAddr}>noreply@frontlix.nl</span>
        </div>
        <span className={styles.emailTimestamp}>zojuist</span>
      </div>
      <div className={styles.emailToRow}>
        Aan: <span className={styles.emailToAddr}>ahmad.k@gmail.com</span>
      </div>

      {/* Email body */}
      <div className={styles.emailBody}>
        {/* Dark banner */}
        <div className={styles.emailBanner}>
          <span className={styles.emailBannerTitle}>FRONTLIX</span>
          <span className={styles.emailBannerSub}>Uw offerte is klaar</span>
        </div>

        <p className={styles.emailGreeting}>Beste Ahmad,</p>
        <p className={styles.emailIntro}>
          Op basis van uw aanvraag hebben wij automatisch een offerte opgesteld.
          Hieronder vindt u een overzicht.
        </p>

        <div className={styles.emailTable}>
          <div className={`${styles.emailRow} ${styles.er1}`}>
            <span className={styles.emailKey}>Dienst</span>
            <span className={styles.emailVal}>Terrasreiniging</span>
          </div>
          <div className={`${styles.emailRow} ${styles.er2}`}>
            <span className={styles.emailKey}>Oppervlakte</span>
            <span className={styles.emailVal}>40 m²</span>
          </div>
          <div className={`${styles.emailRow} ${styles.er3}`}>
            <span className={styles.emailKey}>Steentype</span>
            <span className={styles.emailVal}>Betonnen tegels</span>
          </div>
          <div className={`${styles.emailRow} ${styles.er4}`}>
            <span className={styles.emailKey}>Offerte nr.</span>
            <span className={styles.emailVal}>#0042</span>
          </div>
          <div className={`${styles.emailRow} ${styles.er5}`}>
            <span className={styles.emailKey}>Geldig t/m</span>
            <span className={styles.emailVal}>28 maart 2026</span>
          </div>
        </div>

        <div className={styles.emailCtaWrap}>
          <button className={styles.emailCta} tabIndex={-1}>
            Offerte bekijken &amp; bevestigen →
          </button>
        </div>

        <p className={styles.emailFooter}>
          Dit is een automatisch gegenereerd bericht via Frontlix Automatisering
        </p>
      </div>
    </div>
  )
}

const VISUALS = [
  FormVisual,
  SheetVisual,
  WhatsAppOutVisual,
  ChatExchangeVisual,
  QuoteVisual,
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkflowDemo() {
  const [activeStep, setActiveStep] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Transition state: `displayed` is what's shown, `leaving` is the outgoing step
  const [displayed, setDisplayed] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  const leavingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(
      () => setActiveStep((s) => (s + 1) % TOTAL_STEPS),
      STEP_DURATION,
    )
  }, [])

  useEffect(() => {
    startInterval()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startInterval])

  // Drive the enter/exit transition whenever activeStep changes
  useEffect(() => {
    if (activeStep === displayed) return
    if (leavingTimerRef.current) clearTimeout(leavingTimerRef.current)
    setLeaving(displayed)
    setDisplayed(activeStep)
    leavingTimerRef.current = setTimeout(() => setLeaving(null), 600)
  }, [activeStep, displayed])

  useEffect(() => {
    return () => {
      if (leavingTimerRef.current) clearTimeout(leavingTimerRef.current)
    }
  }, [])

  const handleDotClick = (index: number) => {
    setActiveStep(index)
    startInterval()
  }

  const CurrentVisual = VISUALS[displayed]
  const LeavingVisual = leaving !== null ? VISUALS[leaving] : null

  // Progress for the stepper line gradient overlay
  const lineProgress = `${(activeStep / (TOTAL_STEPS - 1)) * 100}%`

  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        {/* Section heading */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.heading}>
            <span className={styles.gradientText}>Zo werkt het</span>
          </h2>
          <p className={styles.subheading}>
            Van eerste contact tot offerte — volledig automatisch
          </p>
        </div>

        {/* Browser chrome frame */}
        <div className={styles.mockupFrame}>
          <div className={styles.mockupBar}>
            <div className={styles.chromeDots}>
              <span className={styles.dotRed} />
              <span className={styles.dotYellow} />
              <span className={styles.dotGreen} />
            </div>
            <span className={styles.addressBar}>app.frontlix.nl</span>
            <span className={styles.liveBadge}>● LIVE</span>
          </div>

          <div className={styles.mockupBody}>

            {/* LEFT: Vertical stepper */}
            <nav
              className={styles.stepper}
              aria-label="Processtappen"
              style={{ '--line-progress': lineProgress } as React.CSSProperties}
            >
              <div className={styles.stepperLine} aria-hidden="true" />
              {STEP_LABELS.map((label, i) => (
                <button
                  key={i}
                  className={[
                    styles.stepItem,
                    i === activeStep ? styles.stepActive : '',
                    i < activeStep ? styles.stepDone : '',
                  ].join(' ')}
                  onClick={() => handleDotClick(i)}
                  aria-label={`Ga naar stap ${i + 1}: ${label}`}
                  aria-current={i === activeStep ? 'step' : undefined}
                >
                  <div className={styles.dotWrap}>
                    <span className={styles.stepDot}>
                      {/* Done: checkmark. Active/upcoming: number */}
                      {i < activeStep ? (
                        <span className={styles.dotCheck}>✓</span>
                      ) : (
                        <span className={styles.dotNum}>{i + 1}</span>
                      )}
                      {i === activeStep && (
                        <span key={activeStep} className={styles.dotFill} />
                      )}
                    </span>
                  </div>
                  <span className={styles.stepLabel}>{label}</span>
                </button>
              ))}
            </nav>

            {/* RIGHT: Step visual with enter/exit transitions */}
            <div className={styles.visualPanel}>
              {/* Outgoing visual — plays exit animation then is removed */}
              {LeavingVisual && leaving !== null && (
                <div
                  key={`leave-${leaving}`}
                  className={styles.visualExit}
                  aria-hidden="true"
                >
                  <LeavingVisual />
                </div>
              )}
              {/* Current visual — plays enter animation */}
              <div key={`enter-${displayed}`} className={styles.visualEnter}>
                <CurrentVisual />
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
