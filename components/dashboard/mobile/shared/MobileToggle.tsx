'use client'

import styles from './MobileToggle.module.css'

type Props = {
  on: boolean
  onChange: (next: boolean) => void
  /** Schaalfactor (1 = 40×24px). Notif-matrix gebruikt 0.85. */
  size?: number
  label?: string
  /** Niet-interactief (bv. kanaal nog niet live, of write bezig). */
  disabled?: boolean
}

/** iOS-stijl switch. Groen = aan. Maat via --tg-scale. */
export function MobileToggle({ on, onChange, size = 1, label, disabled = false }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={styles.toggle}
      data-on={on}
      style={{ '--tg-scale': size } as React.CSSProperties}
      onClick={() => onChange(!on)}
    >
      <span className={styles.knob} />
    </button>
  )
}
