'use client'

import type { SceneProps } from '../types'
import { demoLead, demoOfferte } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: knop "Nieuwe offerte" met klik-effect, fase 2: venster opent,
// fase 3: regel 1, fase 4: regel 2, fase 5: totaal, fase 6: verstuurd
const DURATIONS = [900, 900, 900, 900, 800, 900]

export function OfferteHandmatigScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Offertes">
      <Reveal at={1} phase={phase}>
        <div className={`${styles.fakeBtn} ${phase >= 1 && phase < 3 ? styles.fakeBtnClicked : ''}`}>
          + Nieuwe offerte
        </div>
      </Reveal>
      <Reveal at={2} phase={phase}>
        <div className={styles.docCard}>
          <div className={styles.docHead}>Nieuwe offerte, {demoLead.naam}</div>
          {demoOfferte.regels.map((regel, i) => (
            <Reveal key={regel.omschrijving} at={3 + i} phase={phase}>
              <div className={styles.docRow}>
                <span>
                  {regel.omschrijving}
                  <em className={styles.docDetail}>{regel.detail}</em>
                </span>
                <strong>{regel.bedrag}</strong>
              </div>
            </Reveal>
          ))}
          <Reveal at={5} phase={phase}>
            <div className={styles.docTotal}>
              <span>Totaal incl. btw</span>
              <strong>{demoOfferte.totaal}</strong>
            </div>
          </Reveal>
        </div>
      </Reveal>
      <Reveal at={6} phase={phase}>
        <div className={styles.statusPill}>Verstuurd naar de klant</div>
      </Reveal>
    </SceneShell>
  )
}
