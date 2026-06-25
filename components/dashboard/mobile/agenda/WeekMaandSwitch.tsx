'use client'

// WeekMaandSwitch, klein segmented control (Week | Maand) voor de mobiele
// agenda. Wordt RECHTS op de periode-navigatie-regel getoond in zowel de week-
// als de maandweergave, zodat je vanuit beide kunt wisselen. Instant client-side
// (beide datasets zijn al geladen), geen route-navigatie.

import styles from './WeekMaandSwitch.module.css'

interface WeekMaandSwitchProps {
  view: 'week' | 'maand'
  onChange: (v: 'week' | 'maand') => void
}

export function WeekMaandSwitch({ view, onChange }: WeekMaandSwitchProps) {
  return (
    <div className={styles.switch} role="tablist" aria-label="Weergave">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'week'}
        className={styles.seg}
        data-active={view === 'week' || undefined}
        onClick={() => onChange('week')}
      >
        Week
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'maand'}
        className={styles.seg}
        data-active={view === 'maand' || undefined}
        onClick={() => onChange('maand')}
      >
        Maand
      </button>
    </div>
  )
}
