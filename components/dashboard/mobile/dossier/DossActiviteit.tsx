'use client'

import { DossLabel, DossTimelineItem } from './DossAtoms'
import type { DossActity } from './dossier-mock'
import styles from './DossActiviteit.module.css'

// ── DossActiviteit ──
// Activiteit-tab: tijdlijn-label + surface-kaart van DossTimelineItem's, gevoed
// met de echte aggregateActivityTimeline (props) i.p.v. de DOSS-mock.
type DossActiviteitProps = {
  activity: DossActity[]
}

export function DossActiviteit({ activity }: DossActiviteitProps) {
  return (
    <div>
      <DossLabel>Tijdlijn</DossLabel>
      <div className={styles.card}>
        {activity.map((a, i, arr) => (
          <DossTimelineItem
            key={i}
            icon={a.icon}
            tone={a.tone}
            text={a.t}
            time={a.time}
            connector={i < arr.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
