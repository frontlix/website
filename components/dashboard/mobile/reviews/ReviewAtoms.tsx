import styles from './ReviewAtoms.module.css'

/** Google "G"-merkbadge (geen logo-reproductie). */
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <div className={styles.gMark} style={{ '--g-size': `${size}px` } as React.CSSProperties}>
      <span className={styles.gLetter}>G</span>
    </div>
  )
}

/** Reviewer-avatar: initiaal op merk-kleur (data). */
export function ReviewAvatar({ initial, color, size = 38 }: { initial: string; color: string; size?: number }) {
  return (
    <div
      className={styles.avatar}
      style={{ '--avatar-bg': color, '--avatar-size': `${size}px` } as React.CSSProperties}
    >
      {initial}
    </div>
  )
}
