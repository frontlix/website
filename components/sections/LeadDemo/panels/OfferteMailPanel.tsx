import { Check } from 'lucide-react'
import styles from './OfferteMailPanel.module.css'

interface OfferteMailPanelProps {
  isActive: boolean
}

export default function OfferteMailPanel({ isActive }: OfferteMailPanelProps) {
  return (
    <div className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}>
      <div className={`${styles.emailCard} ${isActive ? styles.emailCardVisible : ''}`}>
        {/* Email header */}
        <div className={styles.emailHeader}>
          <div className={styles.emailHeaderRow}>
            <span className={styles.emailHeaderLabel}>Van:</span>
            <span className={styles.emailHeaderValue}>Frontlix &lt;offerte@frontlix.nl&gt;</span>
          </div>
          <div className={styles.emailHeaderRow}>
            <span className={styles.emailHeaderLabel}>Aan:</span>
            <span className={styles.emailHeaderValue}>marco@visseradvies.nl</span>
          </div>
          <div className={styles.emailHeaderRow}>
            <span className={styles.emailHeaderLabel}>Onderwerp:</span>
            <span className={styles.emailHeaderValue}>Uw persoonlijke offerte — Frontlix</span>
          </div>
        </div>

        {/* Email body */}
        <div className={styles.emailBody}>
          <span className={styles.emailLogo}>Frontlix</span>
          <span className={styles.emailGreeting}>Beste Marco,</span>
          <span className={styles.emailText}>
            Bedankt voor je interesse. Op basis van ons gesprek hebben we een persoonlijke offerte
            voor je samengesteld.
          </span>

          {/* Quote card */}
          <div className={styles.quoteCard}>
            <div className={styles.quoteCardBorder} />
            <div className={styles.quoteCardBody}>
              <div className={styles.quoteRow}>
                <span className={styles.quoteLabel}>Service</span>
                <span className={styles.quoteValue}>Website & Lead Automatisering</span>
              </div>
              <div className={styles.quoteRow}>
                <span className={styles.quoteLabel}>Pakket</span>
                <span className={styles.quoteValue}>Professional</span>
              </div>
              <div className={styles.quoteRow}>
                <span className={styles.quoteLabel}>Maandelijks</span>
                <span className={styles.quotePrice}>€149/maand</span>
              </div>
              <div className={styles.quoteRow}>
                <span className={styles.quoteLabel}>Inclusief</span>
                <span className={styles.quoteValue}>
                  AI Lead opvolging, CRM integratie, WhatsApp automatisering
                </span>
              </div>
            </div>
          </div>

          {/* CTA button with shimmer */}
          <div className={styles.ctaWrap}>
            <button className={styles.ctaButton} tabIndex={-1}>
              Bekijk volledige offerte →
            </button>
          </div>

          {/* Sign-off */}
          <div className={styles.separator} />
          <div className={styles.signoff}>
            Met vriendelijke groet,
            <br />
            <span className={styles.signoffName}>Team Frontlix</span>
          </div>
        </div>

        {/* Footer status */}
        <div className={`${styles.footerStatus} ${isActive ? styles.footerStatusVisible : ''}`}>
          <Check size={14} />
          Offerte succesvol verzonden
        </div>
      </div>
    </div>
  )
}
