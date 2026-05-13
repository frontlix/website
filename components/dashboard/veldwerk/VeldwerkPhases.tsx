'use client'

import { useState } from 'react'
import { Check, Truck, MapPin, Wrench, CheckCircle2 } from 'lucide-react'
import styles from './VeldwerkPhases.module.css'

export type Phase = 'onderweg' | 'aangekomen' | 'bezig' | 'klaar'

const PHASES: ReadonlyArray<{ k: Phase; l: string; Icon: typeof Truck }> = [
  { k: 'onderweg',   l: 'Onderweg',   Icon: Truck },
  { k: 'aangekomen', l: 'Aangekomen', Icon: MapPin },
  { k: 'bezig',      l: 'Aan het werk', Icon: Wrench },
  { k: 'klaar',      l: 'Klaar',      Icon: CheckCircle2 },
]

/**
 * Visuele stepper voor de monteur op locatie. State is voorlopig
 * uitsluitend client-side — een latere iteratie syncet naar een
 * `lead_field_state` tabel of via /dashboard-api zodat kantoor live
 * de status ziet.
 */
export function VeldwerkPhases({ leadNaam }: { leadNaam: string }) {
  const [phase, setPhase] = useState<Phase>('onderweg')
  const phaseIndex = PHASES.findIndex((p) => p.k === phase)

  return (
    <div className={styles.wrap}>
      <div className={styles.stepper}>
        {PHASES.map((p, i) => {
          const done = i < phaseIndex
          const active = i === phaseIndex
          return (
            <button
              type="button"
              key={p.k}
              onClick={() => setPhase(p.k)}
              className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}
            >
              <span className={styles.stepIcon}>
                {done ? <Check size={14} strokeWidth={3} /> : <p.Icon size={14} />}
              </span>
              <span className={styles.stepLabel}>{p.l}</span>
            </button>
          )
        })}
      </div>

      <PhaseBody phase={phase} leadNaam={leadNaam} />

      {phase !== 'klaar' && (
        <button
          type="button"
          className={styles.nextBtn}
          onClick={() => setPhase(PHASES[Math.min(phaseIndex + 1, PHASES.length - 1)].k)}
        >
          {phaseIndex === 0 && 'Aangekomen op locatie'}
          {phaseIndex === 1 && 'Begin met werken'}
          {phaseIndex === 2 && 'Klus is klaar'}
        </button>
      )}
    </div>
  )
}

function PhaseBody({ phase, leadNaam }: { phase: Phase; leadNaam: string }) {
  if (phase === 'onderweg') {
    return (
      <div className={styles.body}>
        <h3 className={styles.bodyTitle}>Onderweg naar {leadNaam}</h3>
        <p className={styles.bodyText}>
          Tik onderaan zodra je bij de klant bent. We sturen automatisch een berichtje:
          “We zijn er binnen 5 minuten.”
        </p>
        <div className={styles.actionsGrid}>
          <a href="https://maps.apple.com/" target="_blank" rel="noopener" className={styles.actionLink}>
            Open in Maps
          </a>
          <button type="button" className={styles.actionLink}>
            Bel klant
          </button>
        </div>
      </div>
    )
  }
  if (phase === 'aangekomen') {
    return (
      <div className={styles.body}>
        <h3 className={styles.bodyTitle}>Aangekomen — check-in</h3>
        <p className={styles.bodyText}>Maak een foto van de uitgangssituatie (vóór).</p>
        <label className={styles.upload}>
          <input type="file" accept="image/*" capture="environment" hidden />
          <span>📷 Foto vóór toevoegen</span>
        </label>
        <textarea className={styles.notes} placeholder="Opmerkingen vóór de klus (optioneel)" rows={3} />
      </div>
    )
  }
  if (phase === 'bezig') {
    return (
      <div className={styles.body}>
        <h3 className={styles.bodyTitle}>Aan het werk</h3>
        <ul className={styles.checklist}>
          <li><input type="checkbox" /> Bestrating reinigen</li>
          <li><input type="checkbox" /> Voegen invegen</li>
          <li><input type="checkbox" /> Naveeg + opruimen</li>
        </ul>
        <textarea className={styles.notes} placeholder="Materiaal-gebruik / opmerkingen" rows={3} />
      </div>
    )
  }
  return (
    <div className={styles.body}>
      <h3 className={styles.bodyTitle}>Klus klaar — overhandiging</h3>
      <p className={styles.bodyText}>Maak een foto van het resultaat (ná).</p>
      <label className={styles.upload}>
        <input type="file" accept="image/*" capture="environment" hidden />
        <span>📷 Foto ná toevoegen</span>
      </label>
      <button type="button" className={styles.submitBtn}>Verstuur opleverbon</button>
    </div>
  )
}
