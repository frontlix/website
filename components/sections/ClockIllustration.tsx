'use client'

import { useMemo } from 'react'
import styles from './ClockIllustration.module.css'

export default function ClockIllustration() {
  /* Generate 60 tick markers around the clock face */
  const markers = useMemo(() => {
    const items = []
    const r = 88
    for (let i = 0; i < 60; i++) {
      const isMajor = i % 5 === 0
      const angle = (i / 60) * 360 * (Math.PI / 180)
      const len = isMajor ? 12 : 7
      const width = isMajor ? 3 : 2
      const x = 100 + r * Math.sin(angle)
      const y = 100 - r * Math.cos(angle)
      items.push(
        <div
          key={i}
          className={styles.marker}
          style={{
            width: `${width}px`,
            height: `${len}px`,
            background: isMajor ? '#94a8cc' : '#d8e0ee',
            left: `${x}px`,
            top: `${y}px`,
            transform: `translate(-50%, -50%) rotate(${(i / 60) * 360}deg)`,
          }}
        />
      )
    }
    return items
  }, [])

  return (
    <div className={styles.wrapper}>
      <div className={styles.scene}>
        <div className={styles.clockGlow} />
        <div className={styles.clock}>
          {markers}

          {/* Hands */}
          <div className={`${styles.hand} ${styles.hourHand}`} />
          <div className={`${styles.hand} ${styles.minuteHand}`} />
          <div className={`${styles.hand} ${styles.secondHand}`} />

          {/* Centre */}
          <div className={styles.centre} />
          <div className={styles.centreInner} />
        </div>
      </div>
    </div>
  )
}
