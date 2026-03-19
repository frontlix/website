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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TOTAL_CHARS = total

export default function FormPanel({ isActive }: FormPanelProps) {
  const [submitState, setSubmitState] = useState<'idle' | 'pressing' | 'done'>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!isActive) return

    setSubmitState('idle')

    const t1 = setTimeout(() => setSubmitState('pressing'), 800)
    const t2 = setTimeout(() => setSubmitState('done'), 1100)
    timers.current.push(t1, t2)

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [isActive])

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
                  className={`${styles.fieldInput} ${
                    isSelect ? styles.fieldSelect : ''
                  } ${isTextarea ? styles.fieldTextarea : ''}`}
                >
                  {field.value}
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
