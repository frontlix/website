'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Video, Phone, Plus, Camera, Mic } from 'lucide-react'
import Image from 'next/image'
import IPhoneMockup from '../IPhoneMockup'
import styles from './WhatsAppPanel.module.css'

interface WhatsAppPanelProps {
  isActive: boolean
}

const AI_MESSAGE = 'Hey Marco,\n\nJe offerte is verstuurd. Neem gerust de tijd om de offerte in te zien.\n\nAls je zover bent, kunnen we een afspraak inplannen in de chat of via de onderstaande link.\n\nIk heb deze week nog plek op donderdag of vrijdag.'

const CALENDAR_URL = 'https://calendar.google.com/calendar/appointments/AcZssZ1234567890'

export default function WhatsAppPanel({ isActive }: WhatsAppPanelProps) {
  const [phase, setPhase] = useState<'idle' | 'typing' | 'message'>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const chatRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isActive) {
      setPhase('idle')
      if (scrollTimer.current) {
        clearInterval(scrollTimer.current)
        scrollTimer.current = null
      }
      return
    }

    /* Show typing dots first, then the message */
    const t1 = setTimeout(() => setPhase('typing'), 400)
    const t2 = setTimeout(() => {
      setPhase('message')
      /* After message appears, start slow auto-scroll so the full message is readable on mobile */
      const t3 = setTimeout(() => {
        scrollTimer.current = setInterval(() => {
          const el = chatRef.current
          if (!el) return
          /* Stop scrolling when we've reached the bottom */
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
            if (scrollTimer.current) clearInterval(scrollTimer.current)
            return
          }
          el.scrollTop += 1
        }, 30)
      }, 800)
      timers.current.push(t3)
    }, 1200)
    timers.current.push(t1, t2)

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (scrollTimer.current) {
        clearInterval(scrollTimer.current)
        scrollTimer.current = null
      }
    }
  }, [isActive])

  return (
    <div className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}>
      <IPhoneMockup statusBarTime="14:01" statusBarVariant="light">
        {/* WhatsApp header — same style as AIChatPanel */}
        <div className={styles.waHeader}>
          <span className={styles.waBackArrow}>
            <ChevronLeft size={22} />
          </span>
          <div className={styles.waAvatar}>
            <Image src="/logo.png" alt="Frontlix" width={30} height={30} className={styles.waAvatarImg} />
          </div>
          <div className={styles.waContactInfo}>
            <span className={styles.waContactName}>Frontlix</span>
            <span className={styles.waContactStatus}>online</span>
          </div>
          <div className={styles.waHeaderIcons}>
            <Video size={16} />
            <Phone size={16} />
          </div>
        </div>

        {/* Chat area */}
        <div ref={chatRef} className={styles.chatArea}>
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
            <>
              <div className={`${styles.bubbleWrap} ${styles.bubbleLeft} ${styles.bubbleVisible}`}>
                <div className={`${styles.bubble} ${styles.bubbleAI}`}>
                  {AI_MESSAGE.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < AI_MESSAGE.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                  <span className={styles.bubbleMeta}>
                    <span className={styles.bubbleTime}>14:01</span>
                    <span className={styles.ticks}>✓✓</span>
                  </span>
                </div>
              </div>

              {/* Calendar link bubble */}
              <div className={`${styles.bubbleWrap} ${styles.bubbleLeft} ${styles.bubbleVisible}`}>
                <div className={`${styles.bubble} ${styles.bubbleAI} ${styles.calendarBubble}`}>
                  <span className={styles.calendarIcon}>📅</span>
                  <span className={styles.calendarText}>
                    Plan een afspraak in
                    <span className={styles.calendarLink}>{CALENDAR_URL}</span>
                  </span>
                  <span className={styles.bubbleMeta}>
                    <span className={styles.bubbleTime}>14:01</span>
                    <span className={styles.ticks}>✓✓</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Input bar — same style as AIChatPanel */}
        <div className={styles.chatInputBar}>
          <span className={styles.inputIcon}>
            <Plus size={18} />
          </span>
          <input
            className={styles.chatInput}
            type="text"
            placeholder="Bericht"
            disabled
            tabIndex={-1}
          />
          <span className={styles.inputIcon}>
            <Camera size={18} />
          </span>
          <span className={styles.inputIcon}>
            <Mic size={18} />
          </span>
        </div>
      </IPhoneMockup>
    </div>
  )
}
