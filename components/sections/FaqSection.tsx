'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqs } from '@/lib/faq-data'
import styles from './FaqSection.module.css'

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className={styles.section} id="faq">
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.label}>Veelgestelde vragen</span>
          <h2 className={styles.heading}>Alles wat je wilt weten</h2>
          <p className={styles.subtext}>
            Heb je een andere vraag? Neem gerust contact met ons op, we
            helpen je graag verder.
          </p>
        </header>

        <div className={styles.list}>
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className={`${styles.item} ${isOpen ? styles.itemOpen : ''}`}
              >
                <button
                  className={styles.question}
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.questionText}>{faq.question}</span>
                  <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
                    <ChevronDown size={20} />
                  </span>
                </button>
                <div
                  className={styles.answerWrapper}
                  style={{
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                  }}
                >
                  <div className={styles.answerInner}>
                    <p className={styles.answer}>{faq.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
