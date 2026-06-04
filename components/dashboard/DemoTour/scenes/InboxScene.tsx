'use client'

import type { SceneProps } from '../types'
import { demoChat } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell, TypingDots } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: klantbericht, fase 2: bot typt, fase 3: botantwoord,
// fase 4: klantbericht, fase 5: bot typt, fase 6: botantwoord
const DURATIONS = [800, 1100, 1300, 1300, 1100, 1300]
// fase waarop bericht 0 t/m 3 uit demoChat verschijnt
const REVEAL_AT = [1, 3, 4, 6]

export function InboxScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Inbox">
      <div className={styles.chat} data-paused={!props.playing}>
        {demoChat.map((msg, i) => (
          <Reveal key={i} at={REVEAL_AT[i]} phase={phase}>
            <div className={msg.from === 'bot' ? styles.bubbleOut : styles.bubbleIn}>
              {msg.text}
            </div>
          </Reveal>
        ))}
        {(phase === 2 || phase === 5) && <TypingDots />}
      </div>
    </SceneShell>
  )
}
