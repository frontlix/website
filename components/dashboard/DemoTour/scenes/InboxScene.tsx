'use client'

import type { SceneProps } from '../types'
import { demoChat } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { SceneShell, TypingDots, type CameraFrame } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: klantbericht, fase 2: bot typt, fase 3: botantwoord,
// fase 4: klantbericht, fase 5: bot typt, fase 6: botantwoord
const DURATIONS = [800, 1100, 1300, 1300, 1100, 1300]
// fase waarop bericht 0 t/m 3 uit demoChat verschijnt
const REVEAL_AT = [1, 3, 4, 6]

const CAMERA: readonly CameraFrame[] = [
  { scale: 1, x: 50, y: 50 },
  { scale: 1.18, x: 40, y: 62 }, // inzoomen op het gesprek
]

export function InboxScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Inbox" phase={phase} camera={CAMERA}>
      {/* vast chatvenster: nieuwe berichten duwen oudere omhoog, zoals in WhatsApp */}
      <div className={styles.chatWindow} data-paused={!props.playing}>
        {demoChat.map((msg, i) =>
          phase >= REVEAL_AT[i] ? (
            <div
              key={i}
              className={`${msg.from === 'bot' ? styles.bubbleOut : styles.bubbleIn} ${styles.chatEnter}`}
            >
              {msg.text}
            </div>
          ) : null
        )}
        {(phase === 2 || phase === 5) && <TypingDots />}
      </div>
    </SceneShell>
  )
}
