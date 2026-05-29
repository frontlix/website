'use client'

import { DossLabel, DossTimelineItem } from './DossAtoms'
import { DOSS } from './dossier-mock'
import styles from './DossActiviteit.module.css'

// ── DossActiviteit ──
// Activiteit-tab: tijdlijn-label + surface-kaart van DossTimelineItem's.
// De connector tussen items wordt voor alle behalve de laatste getekend.
// (Port van handoff DossActivity, regels 179–199.)
export function DossActiviteit() {
  return (
    <div>
      <DossLabel>Tijdlijn</DossLabel>
      <div className={styles.card}>
        {DOSS.activity.map((a, i, arr) => (
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
