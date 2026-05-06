'use client'

import styles from './LiveIndicator.module.css'

export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <span
      className={`${styles.indicator} ${
        connected ? styles.live : styles.offline
      }`}
      title={connected ? 'Realtime verbonden' : 'Realtime niet verbonden'}
    >
      <span className={styles.dot} aria-hidden="true" />
      {connected ? 'Live' : 'Offline'}
    </span>
  )
}
