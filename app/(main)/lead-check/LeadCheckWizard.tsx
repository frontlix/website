'use client'

import { useState } from 'react'
import posthog from 'posthog-js'
import Button from '@/components/ui/Button'
import { GRENZEN, type Afterhours, type LeadCheckInput, type Shoppen, type Speed } from '@/lib/leadCheck'
import LeadCheckResult from './LeadCheckResult'
import styles from './LeadCheckWizard.module.css'

/* Stap -1 = intro, 0..5 = vragen, 6 = uitslag */
const AANTAL_VRAGEN = 6

type KeuzeOptie<T extends string> = { value: T; label: string }

const SPEED_OPTIES: KeuzeOptie<Speed>[] = [
  { value: '5min', label: 'Binnen 5 minuten' },
  { value: '1uur', label: 'Binnen een uur' },
  { value: 'paar_uur', label: 'Binnen een paar uur' },
  { value: 'zelfde_dag', label: 'Dezelfde dag nog' },
  { value: 'volgende_dag', label: 'De volgende werkdag of later' },
]
const AFTERHOURS_OPTIES: KeuzeOptie<Afterhours>[] = [
  { value: 'altijd', label: 'Ja, vrijwel altijd' },
  { value: 'soms', label: 'Soms' },
  { value: 'nee', label: 'Nee, alleen tijdens werktijd' },
]
const SHOPPEN_OPTIES: KeuzeOptie<Shoppen>[] = [
  { value: 'meestal', label: 'Ja, meestal wel' },
  { value: 'soms', label: 'Soms' },
  { value: 'zelden', label: 'Zelden of nooit' },
]

function track(event: string, props?: Record<string, unknown>) {
  posthog.capture(event, props)
}

export default function LeadCheckWizard() {
  const [stap, setStap] = useState(-1)
  const [aanvragenPerWeek, setAanvragenPerWeek] = useState('')
  const [speed, setSpeed] = useState<Speed | null>(null)
  const [afterhours, setAfterhours] = useState<Afterhours | null>(null)
  const [conversiePct, setConversiePct] = useState(30)
  const [orderwaarde, setOrderwaarde] = useState('')
  const [shoppen, setShoppen] = useState<Shoppen | null>(null)

  const start = () => {
    track('lead_check_start')
    setStap(0)
  }

  const naarStap = (volgende: number) => {
    if (volgende > stap && volgende <= AANTAL_VRAGEN) track('lead_check_step', { stap: volgende })
    setStap(volgende)
  }

  const invoer: LeadCheckInput | null =
    speed && afterhours && shoppen
      ? {
          aanvragenPerWeek: Math.min(GRENZEN.aanvragenPerWeek.max, Math.max(0, Number(aanvragenPerWeek) || 0)),
          speed,
          afterhours,
          conversiePct,
          orderwaarde: Math.min(GRENZEN.orderwaarde.max, Math.max(0, Number(orderwaarde) || 0)),
          shoppen,
        }
      : null

  /* ---------- intro ---------- */
  if (stap === -1) {
    return (
      <div className={styles.card}>
        <ul className={styles.introList}>
          <li>6 korte vragen over je aanvragen en opvolging</li>
          <li>Direct je lek-score en een eerlijke omzet-schatting</li>
          <li>Volledig anoniem, je gegevens blijven in je browser</li>
        </ul>
        <Button variant="primary" size="lg" fullWidth onClick={start}>
          Start de check
        </Button>
      </div>
    )
  }

  /* ---------- uitslag ---------- */
  if (stap === AANTAL_VRAGEN && invoer) {
    return <LeadCheckResult invoer={invoer} />
  }

  /* ---------- vragen ---------- */
  return (
    <div className={styles.card}>
      <div
        className={styles.progress}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={AANTAL_VRAGEN}
        aria-valuenow={stap + 1}
      >
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${((stap + 1) / AANTAL_VRAGEN) * 100}%` }} />
        </div>
        <span className={styles.progressLabel}>
          Vraag {stap + 1} van {AANTAL_VRAGEN}
        </span>
      </div>

      {stap === 0 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>
            Hoeveel aanvragen krijg je per week via je website of formulier?
          </legend>
          <input
            type="number"
            inputMode="numeric"
            min={GRENZEN.aanvragenPerWeek.min}
            max={GRENZEN.aanvragenPerWeek.max}
            value={aanvragenPerWeek}
            onChange={(e) => setAanvragenPerWeek(e.target.value)}
            className={styles.input}
            placeholder="Bijv. 8"
            aria-label="Aanvragen per week"
          />
          <Button variant="primary" size="lg" fullWidth disabled={aanvragenPerWeek === ''} onClick={() => naarStap(1)}>
            Volgende
          </Button>
        </fieldset>
      )}

      {stap === 1 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Hoe snel reageer je meestal op een nieuwe aanvraag?</legend>
          <div className={styles.opties}>
            {SPEED_OPTIES.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.optie} ${speed === o.value ? styles.optieActief : ''}`}
                onClick={() => {
                  setSpeed(o.value)
                  naarStap(2)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {stap === 2 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Reageer je ook in de avond en het weekend?</legend>
          <div className={styles.opties}>
            {AFTERHOURS_OPTIES.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.optie} ${afterhours === o.value ? styles.optieActief : ''}`}
                onClick={() => {
                  setAfterhours(o.value)
                  naarStap(3)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {stap === 3 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Welk deel van je aanvragen wordt uiteindelijk klant?</legend>
          <div className={styles.sliderWrap}>
            <input
              type="range"
              min={GRENZEN.conversiePct.min}
              max={GRENZEN.conversiePct.max}
              value={conversiePct}
              onChange={(e) => setConversiePct(Number(e.target.value))}
              className={styles.slider}
              aria-label="Conversiepercentage"
            />
            <span className={styles.sliderWaarde}>{conversiePct}%</span>
          </div>
          <p className={styles.hint}>Weet je het niet precies? Een schatting is prima.</p>
          <Button variant="primary" size="lg" fullWidth onClick={() => naarStap(4)}>
            Volgende
          </Button>
        </fieldset>
      )}

      {stap === 4 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Wat is je gemiddelde orderbedrag?</legend>
          <div className={styles.euroWrap}>
            <span className={styles.euroTeken} aria-hidden="true">
              €
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={GRENZEN.orderwaarde.min}
              max={GRENZEN.orderwaarde.max}
              value={orderwaarde}
              onChange={(e) => setOrderwaarde(e.target.value)}
              className={`${styles.input} ${styles.inputEuro}`}
              placeholder="Bijv. 450"
              aria-label="Gemiddeld orderbedrag in euro"
            />
          </div>
          <Button variant="primary" size="lg" fullWidth disabled={orderwaarde === ''} onClick={() => naarStap(5)}>
            Volgende
          </Button>
        </fieldset>
      )}

      {stap === 5 && (
        <fieldset className={styles.vraag}>
          <legend className={styles.vraagTitel}>Vragen je klanten meestal ook bij anderen een offerte aan?</legend>
          <div className={styles.opties}>
            {SHOPPEN_OPTIES.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`${styles.optie} ${shoppen === o.value ? styles.optieActief : ''}`}
                onClick={() => {
                  setShoppen(o.value)
                  track('lead_check_complete')
                  naarStap(6)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {stap > 0 && (
        <button type="button" className={styles.terug} onClick={() => setStap(stap - 1)}>
          ← Vorige vraag
        </button>
      )}
    </div>
  )
}
