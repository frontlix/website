'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Video, Phone, Camera, Plus, Mic, ImageIcon, Check } from 'lucide-react'
import Image from 'next/image'
import IPhoneMockup from '../IPhoneMockup'
import styles from './AIChatPanel.module.css'

interface AIChatPanelProps {
  isActive: boolean
}

interface ChatMessage {
  id: number
  side: 'ai' | 'user'
  text: string
  time: string
  ticks?: boolean
  type?: 'text' | 'photos'
  greenCheck?: boolean
}

const MESSAGES: ChatMessage[] = [
  {
    id: 1,
    side: 'ai',
    text: 'Hoi Thomas! 👋 Ik ben de assistent van Installatiebedrijf De Vries. Je hebt zojuist een aanvraag gedaan — top! Ik stel je zo een offerte op. Mag ik je een paar korte vragen stellen?',
    time: '14:01',
  },
  { id: 2, side: 'user', text: 'Ja natuurlijk!', time: '14:02', ticks: true },
  {
    id: 3,
    side: 'ai',
    text: 'Super. Om hoeveel m² gaat het ongeveer? Denk aan je oprit, terras of pad. 🏡',
    time: '14:02',
  },
  { id: 4, side: 'user', text: 'Ik schat zo\'n 60 m²', time: '14:03', ticks: true },
  {
    id: 5,
    side: 'ai',
    text: 'Duidelijk! Wanneer wil je dit het liefst gedaan hebben?',
    time: '14:03',
  },
  { id: 6, side: 'user', text: 'Het liefst voor het einde van de maand.', time: '14:04', ticks: true },
  {
    id: 7,
    side: 'ai',
    text: 'Goed te horen. Heb je al foto\'s van de situatie? Dan kan ik de offerte nog nauwkeuriger maken. Stuur ze gerust via WhatsApp! 📸',
    time: '14:04',
  },
  { id: 8, side: 'user', text: '', time: '14:05', ticks: true, type: 'photos' },
  {
    id: 9,
    side: 'ai',
    text: '✅ Bedankt voor de foto\'s! Op basis van jouw aanvraag heb ik alvast een offerte opgesteld. Je ontvangt hem zo in je mail.\n\nIemand van het team neemt vandaag nog contact met je op om alles door te nemen. 🙌',
    time: '14:06',
    greenCheck: true,
  },
]

export default function AIChatPanel({ isActive }: AIChatPanelProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [showTyping, setShowTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!isActive) {
      setVisibleCount(0)
      setShowTyping(false)
      return
    }

    let delay = 300

    for (let i = 0; i < MESSAGES.length; i++) {
      const msg = MESSAGES[i]

      if (msg.side === 'ai') {
        const typingDelay = delay
        timers.current.push(setTimeout(() => setShowTyping(true), typingDelay))
        delay += 400

        const msgDelay = delay
        timers.current.push(
          setTimeout(() => {
            setShowTyping(false)
            setVisibleCount(i + 1)
          }, msgDelay)
        )
        delay += 500
      } else {
        const msgDelay = delay
        timers.current.push(setTimeout(() => setVisibleCount(i + 1), msgDelay))
        delay += 500
      }
    }

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [isActive])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [visibleCount, showTyping])

  return (
    <div className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}>
      <IPhoneMockup statusBarTime="14:01" statusBarVariant="light">
        {/* WhatsApp header */}
        <div className={styles.waHeader}>
          <span className={styles.waBackArrow}>
            <ChevronLeft size={22} />
          </span>
          <div className={styles.waAvatar}>
            <Image src="/logo.png" alt="De Vries" width={30} height={30} className={styles.waAvatarImg} />
          </div>
          <div className={styles.waContactInfo}>
            <span className={styles.waContactName}>Installatiebedrijf De Vries</span>
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

          {MESSAGES.map((msg, idx) => {
            if (idx >= visibleCount) return null
            const isAnimated = idx > 0

            return (
              <div
                key={msg.id}
                className={`${styles.bubbleWrap} ${
                  msg.side === 'user' ? styles.bubbleRight : styles.bubbleLeft
                } ${isAnimated ? styles.bubbleVisible : styles.bubbleStatic}`}
              >
                <div
                  className={`${styles.bubble} ${
                    msg.side === 'user' ? styles.bubbleUser : styles.bubbleAI
                  }`}
                >
                  {msg.type === 'photos' ? (
                    <div className={styles.photoGrid}>
                      <div className={styles.photoPlaceholder}>
                        <ImageIcon size={18} strokeWidth={1.5} />
                      </div>
                      <div className={styles.photoPlaceholder}>
                        <ImageIcon size={18} strokeWidth={1.5} />
                      </div>
                      <span className={styles.bubbleMeta}>
                        <span className={styles.bubbleTime}>{msg.time}</span>
                        {msg.ticks && <span className={styles.ticks}>✓✓</span>}
                      </span>
                    </div>
                  ) : (
                    <>
                      <span>{msg.text}</span>
                      <span className={styles.bubbleMeta}>
                        <span className={styles.bubbleTime}>{msg.time}</span>
                        {msg.ticks && <span className={styles.ticks}>✓✓</span>}
                        {msg.greenCheck && (
                          <span className={styles.greenCheck}>
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {showTyping && (
            <div className={`${styles.bubbleWrap} ${styles.bubbleLeft} ${styles.bubbleVisible}`}>
              <div className={`${styles.bubble} ${styles.bubbleAI} ${styles.typingBubble}`}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
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
