'use client'

import { useEffect, useRef, useState } from 'react'
import { ClipboardList, ChevronDown } from 'lucide-react'
import styles from './FormPanel.module.css'

interface FormPanelProps {
  isActive: boolean
}

const FIELDS = [
  { label: 'Naam', value: 'Marco Visser', type: 'text' },
  { label: 'Mobiel', value: '+31 6 12 34 56 78', type: 'text' },
  { label: 'Email', value: 'marco@visseradvies.nl', type: 'text' },
  { label: 'Locatie', value: 'Amsterdam', type: 'text' },
  { label: 'Service', value: 'Website & Lead Automatisering', type: 'select' },
  { label: 'Extra info', value: 'We verliezen te veel leads door trage opvolging', type: 'textarea' },
]

/* Calculate cumulative character boundaries per field */
const FIELD_BOUNDARIES: number[] = []
let total = 0
for (const f of FIELDS) {
  total += f.value.length
  FIELD_BOUNDARIES.push(total)
}
const TOTAL_CHARS = total

export default function FormPanel({ isActive }: FormPanelProps) {
  const [charsTyped, setCharsTyped] = useState(0)
  const [submitState, setSubmitState] = useState<'idle' | 'pressing' | 'done'>('idle')
  const timers = useRef<ReturnType<typeof setTimeout | typeof setInterval>[]>([])

  useEffect(() => {
    if (!isActive) return

    setCharsTyped(0)
    setSubmitState('idle')

    let currentFieldIdx = 0
    let charCount = 0

    const typeNextChar = () => {
      charCount++
      setCharsTyped(charCount)

      if (charCount >= TOTAL_CHARS) {
        /* All fields typed — show submit button */
        clearInterval(interval)
        const t1 = setTimeout(() => setSubmitState('pressing'), 400)
        const t2 = setTimeout(() => setSubmitState('done'), 700)
        timers.current.push(t1, t2)
        return
      }

      /* Check if we just completed a field — pause before next */
      if (charCount >= FIELD_BOUNDARIES[currentFieldIdx]) {
        currentFieldIdx++
        clearInterval(interval)
        const t = setTimeout(() => {
          interval = setInterval(typeNextChar, 15)
          timers.current.push(interval as unknown as ReturnType<typeof setTimeout>)
        }, 200)
        timers.current.push(t)
      }
    }

    /* Start typing after a brief delay */
    let interval: ReturnType<typeof setInterval>
    const startTimer = setTimeout(() => {
      interval = setInterval(typeNextChar, 15)
      timers.current.push(interval as unknown as ReturnType<typeof setTimeout>)
    }, 300)
    timers.current.push(startTimer)

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [isActive])

  /* Derive per-field text from total charsTyped */
  const getFieldText = (fieldIdx: number): string => {
    const fieldStart = fieldIdx === 0 ? 0 : FIELD_BOUNDARIES[fieldIdx - 1]
    const fieldEnd = FIELD_BOUNDARIES[fieldIdx]

    if (charsTyped <= fieldStart) return ''
    if (charsTyped >= fieldEnd) return FIELDS[fieldIdx].value
    return FIELDS[fieldIdx].value.slice(0, charsTyped - fieldStart)
  }

  /* Which field is currently being typed */
  const activeFieldIdx = FIELD_BOUNDARIES.findIndex((boundary) => charsTyped < boundary)

  return (
    <div className={`${styles.panel} ${isActive ? styles.panelActive : ''}`}>
      <div className={styles.formCard}>
        {/* Form header */}
        <div className={styles.formHeader}>
          <span className={styles.formHeaderIcon}>
            <ClipboardList size={20} />
          </span>
          <div className={styles.formHeaderInfo}>
            <span className={styles.formTitle}>Offerte aanvraag</span>
          </div>
        </div>

        {/* Form fields */}
        <div className={styles.formBody}>
          {FIELDS.map((field, idx) => {
            const text = getFieldText(idx)
            const isTyping = activeFieldIdx === idx && charsTyped > 0
            const isTextarea = field.type === 'textarea'
            const isSelect = field.type === 'select'

            return (
              <div
                key={field.label}
                className={`${styles.fieldGroup} ${isActive ? styles.fieldStagger : ''}`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <span className={styles.fieldLabel}>{field.label}</span>
                <div
                  className={`${styles.fieldInput} ${isTyping ? styles.fieldInputActive : ''} ${
                    isSelect ? styles.fieldSelect : ''
                  } ${isTextarea ? styles.fieldTextarea : ''}`}
                >
                  {text || '\u00A0'}
                  {isTyping && <span className={styles.cursor} />}
                  {isSelect && (
                    <span className={styles.fieldSelectIcon}>
                      <ChevronDown size={14} />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit button */}
        <div
          className={`${styles.submitWrap} ${isActive ? styles.fieldStagger : ''}`}
          style={{ animationDelay: `${FIELDS.length * 80}ms` }}
        >
          <button
            className={`${styles.submitBtn} ${
              submitState === 'pressing' ? styles.submitPressing : ''
            } ${submitState === 'done' ? styles.submitDone : ''}`}
            tabIndex={-1}
          >
            {submitState === 'done' ? '✓ Verstuurd' : 'Verstuur'}
          </button>
        </div>
      </div>
    </div>
  )
}
