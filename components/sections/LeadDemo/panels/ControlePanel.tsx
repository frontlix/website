'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import styles from './ControlePanel.module.css'

interface ControlePanelProps {
  isActive: boolean
}

export default function ControlePanel({ isActive }: ControlePanelProps) {
  const [phase, setPhase] = useState<'buttons' | 'pressing' | 'approved'>('buttons')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!isActive) {
      setPhase('buttons')
      return
    }

    /* After 2s: press animation, then approved */
    const t1 = setTimeout(() => setPhase('pressing'), 2000)
    const t2 = setTimeout(() => setPhase('approved'), 2300)
    timers.current.push(t1, t2)

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [isActive])

  return (
    <div className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}>
      <div className={styles.emailCard}>
        {/* Email header */}
        <div className={styles.emailHeader}>
          <div className={styles.emailHeaderRow}>
            <span className={styles.emailHeaderLabel}>Van:</span>
            <span className={styles.emailHeaderValue}>Frontlix Systeem &lt;systeem@frontlix.nl&gt;</span>
          </div>
          <div className={styles.emailHeaderRow}>
            <span className={styles.emailHeaderLabel}>Aan:</span>
            <span className={styles.emailHeaderValue}>eigenaar@frontlix.nl</span>
          </div>
          <div className={styles.emailHeaderRow}>
            <span className={styles.emailHeaderLabel}>Onderwerp:</span>
            <span className={styles.emailHeaderValue}>Nieuwe offerte ter goedkeuring — Marco Visser</span>
          </div>
        </div>

        {/* Email body */}
        <div className={styles.emailBody}>
          {/* Notification */}
          <div className={styles.notificationRow}>
            <span className={styles.notificationIcon}>
              <Bell size={16} />
            </span>
            Nieuwe offerte wacht op jouw goedkeuring
          </div>

          <div className={styles.separator} />

          {/* Summary card */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Klant</span>
              <span className={styles.summaryValue}>Marco Visser</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Service</span>
              <span className={styles.summaryValue}>Website & Lead Automatisering</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Bedrag</span>
              <span className={styles.summaryPrice}>€149/maand</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Geldig tot</span>
              <span className={styles.summaryValue}>14 april 2026</span>
            </div>
          </div>

          {/* Actions or approved message */}
          {phase !== 'approved' ? (
            <div className={styles.actions}>
              <button
                className={`${styles.btnApprove} ${phase === 'pressing' ? styles.btnApprovePressed : ''}`}
                tabIndex={-1}
              >
                ✓ Goedkeuren
              </button>
              <button className={styles.btnEdit} tabIndex={-1}>
                ✎ Wijzigen
              </button>
            </div>
          ) : (
            <div className={`${styles.approvedMessage} ${styles.approvedVisible}`}>
              <Check size={18} />
              Goedgekeurd door eigenaar
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
