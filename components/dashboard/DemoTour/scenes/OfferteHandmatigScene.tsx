'use client'

import type { SceneProps } from '../types'
import { demoLead, demoOfferte } from '../demo-data'
import { useSceneTimeline } from '../useSceneTimeline'
import { Reveal, SceneShell, type CameraFrame, type CursorMark } from './SceneShell'
import styles from './scenes.module.css'

// fase 1: muis beweegt naar de knop, fase 2: klik op "Nieuwe offerte",
// fase 3: venster opent (camera zoomt in), fase 4: klik en regel 1
// verschijnt, fase 5: klik en regel 2 verschijnt, fase 6: totaal en de
// muis glijdt naar Versturen, fase 7: klik en de offerte gaat de deur uit
const DURATIONS = [800, 600, 900, 1000, 1000, 800, 900]

const FULL: CameraFrame = { scale: 1, x: 50, y: 50 }
const ZOOM: CameraFrame = { scale: 1.15, x: 45, y: 55 }
const CAMERA: readonly CameraFrame[] = [FULL, FULL, FULL, ZOOM, ZOOM, ZOOM, ZOOM, ZOOM]
const CURSOR: readonly CursorMark[] = [
  { x: 50, y: 50, hidden: true },
  { x: 24, y: 26 }, // naar de knop Nieuwe offerte
  { x: 24, y: 26, click: true },
  { x: 24, y: 26 },
  { x: 45, y: 42, click: true }, // regel 1 toevoegen
  { x: 45, y: 52, click: true }, // regel 2 toevoegen
  { x: 68, y: 76 }, // naar Versturen
  { x: 68, y: 76, click: true },
]

export function OfferteHandmatigScene(props: SceneProps) {
  const phase = useSceneTimeline(DURATIONS, props)
  return (
    <SceneShell title="Offertes" phase={phase} camera={CAMERA} cursor={CURSOR}>
      <div className={`${styles.fakeBtn} ${phase === 2 ? styles.fakeBtnClicked : ''}`}>
        + Nieuwe offerte
      </div>
      <Reveal at={3} phase={phase}>
        <div className={styles.docCard}>
          <div className={styles.docHead}>Nieuwe offerte, {demoLead.naam}</div>
          {demoOfferte.regels.map((regel, i) => (
            <Reveal key={regel.omschrijving} at={4 + i} phase={phase}>
              <div className={styles.docRow}>
                <span>
                  {regel.omschrijving}
                  <em className={styles.docDetail}>{regel.detail}</em>
                </span>
                <strong>{regel.bedrag}</strong>
              </div>
            </Reveal>
          ))}
          <Reveal at={6} phase={phase}>
            <div className={styles.docTotal}>
              <span>Totaal incl. btw</span>
              <strong>{demoOfferte.totaal}</strong>
            </div>
          </Reveal>
        </div>
      </Reveal>
      <Reveal at={6} phase={phase}>
        <div className={styles.fakeBtn}>Versturen via WhatsApp</div>
      </Reveal>
      <Reveal at={7} phase={phase}>
        <div className={styles.statusPill}>Verstuurd naar de klant</div>
      </Reveal>
    </SceneShell>
  )
}
