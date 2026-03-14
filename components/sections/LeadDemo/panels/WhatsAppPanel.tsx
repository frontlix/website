'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import IPhoneMockup from '../IPhoneMockup'
import styles from './WhatsAppPanel.module.css'

interface WhatsAppPanelProps {
  isActive: boolean
}

const AI_MESSAGE = 'Hoi Marco! 👋 Ik ben de assistent van Frontlix. Je hebt zojuist interesse getoond in onze diensten — fijn dat je er bent. Mag ik je een paar korte vragen stellen?'

export default function WhatsAppPanel({ isActive }: WhatsAppPanelProps) {
  const [phase, setPhase] = useState<'idle' | 'typing' | 'message'>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!isActive) {
      setPhase('idle')
      return
    }

    /* Show typing dots first, then the message */
    const t1 = setTimeout(() => setPhase('typing'), 400)
    const t2 = setTimeout(() => setPhase('message'), 1200)
    timers.current.push(t1, t2)

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [isActive])

  return (
    <div className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}>
      <IPhoneMockup statusBarTime="14:01">
        {/* WhatsApp header */}
        <div className={styles.waHeader}>
          <span className={styles.waBackArrow}>
            <ArrowLeft size={18} />
          </span>
          <div className={styles.waAvatar}>F</div>
          <div className={styles.waContactInfo}>
            <span className={styles.waContactName}>Frontlix</span>
            <span className={styles.waContactStatus}>online</span>
          </div>
        </div>

        {/* Chat area */}
        <div className={styles.chatArea}>
          <div className={styles.dateSep}>VANDAAG</div>

          {/* Typing indicator */}
          {phase === 'typing' && (
            <div className={`${styles.bubbleWrap} ${styles.bubbleLeft} ${styles.bubbleVisible}`}>
              <div className={`${styles.bubble} ${styles.bubbleAI} ${styles.typingBubble}`}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
            </div>
          )}

          {/* AI message */}
          {phase === 'message' && (
            <div className={`${styles.bubbleWrap} ${styles.bubbleLeft} ${styles.bubbleVisible}`}>
              <div className={`${styles.bubble} ${styles.bubbleAI}`}>
                {AI_MESSAGE}
              </div>
              <span className={styles.bubbleTime}>
                14:01 <span className={styles.ticks}>✓✓</span>
              </span>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className={styles.chatInputBar}>
          <input
            className={styles.chatInput}
            type="text"
            placeholder="Typ een bericht..."
            disabled
            tabIndex={-1}
          />
          <button className={styles.sendBtn} tabIndex={-1} aria-hidden="true">
            <Send size={12} />
          </button>
        </div>
      </IPhoneMockup>
    </div>
  )
}
