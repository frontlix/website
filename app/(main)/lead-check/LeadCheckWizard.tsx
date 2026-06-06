'use client'

import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { parseLeadCheckInput, type LeadCheckInput, type Shoppen, type Speed, type Afterhours } from '@/lib/leadCheck'
import LeadCheckResult from './LeadCheckResult'
import styles from './LeadCheckWizard.module.css'

/* Lead-lek-check, design-richting "Druppels" (Claude Design prototype, geport).
   Stap 0 = intro, 1 t/m 6 = vragen, 7 = uitslag. Berekening via lib/leadCheck.ts. */

const AANTAL_VRAGEN = 6
const STORAGE_KEY = 'frontlix-lead-check'
const REKEN_VERTRAGING_MS = 1600 /* bewust spanningsmoment vóór de uitslag */

const DEFAULTS: LeadCheckInput = {
  aanvragenPerWeek: 12,
  speed: 'paar_uur',
  afterhours: 'nee',
  conversiePct: 30,
  orderwaarde: 450,
  shoppen: 'meestal',
}

type Optie<T extends string> = { value: T; label: string; hint?: string }

const SPEED_OPTIES: Optie<Speed>[] = [
  { value: '5min', label: 'Binnen 5 minuten' },
  { value: '1uur', label: 'Binnen een uur' },
  { value: 'paar_uur', label: 'Na een paar uur', hint: 'Tussen twee klussen door' },
  { value: 'zelfde_dag', label: 'Nog dezelfde dag' },
  { value: 'volgende_dag', label: 'Pas de volgende dag' },
]
const AVOND_OPTIES: Optie<Afterhours>[] = [
  { value: 'altijd', label: 'Ja, eigenlijk altijd' },
  { value: 'soms', label: 'Soms, niet consequent', hint: 'Hangt van de drukte af' },
  { value: 'nee', label: 'Nee, buiten werktijd niet' },
]
const SHOPPEN_OPTIES: Optie<Shoppen>[] = [
  { value: 'meestal', label: 'Meestal wel', hint: 'Ze shoppen rond' },
  { value: 'soms', label: 'Soms' },
  { value: 'zelden', label: 'Zelden', hint: 'Ze kiezen meestal jou' },
]

const fmt = (n: number) => Math.round(n).toLocaleString('nl-NL')

/* ── decoratie: vallende druppels (puur visueel) ── */
function Drips({ n, fall }: { n: number; fall: number }) {
  const posities = ['30%', '50%', '70%', '42%', '60%']
  return (
    <div className={styles.dripStage} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className={styles.drip}
          style={
            {
              left: posities[i % posities.length],
              '--fall': `${fall}px`,
              animationDuration: `${2.4 + (i % 3) * 0.3}s`,
              animationDelay: `${i * 0.5}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

function Opt({ label, hint, selected, onClick }: { label: string; hint?: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.opt} ${selected ? styles.optSel : ''}`} onClick={onClick}>
      <span className={styles.optDot} aria-hidden="true" />
      <span className={styles.optLabel}>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </button>
  )
}

export default function LeadCheckWizard() {
  const [stap, setStap] = useState(0)
  const [s, setS] = useState<LeadCheckInput>(DEFAULTS)
  const [computing, setComputing] = useState(false)

  const set = <K extends keyof LeadCheckInput>(k: K, v: LeadCheckInput[K]) => setS((p) => ({ ...p, [k]: v }))

  /* Voortgang en antwoorden bewaren zodat een onderbroken check verdergaat */
  useEffect(() => {
    try {
      const opgeslagen = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as {
        stap?: number
        s?: unknown
      } | null
      if (!opgeslagen) return
      const invoer = parseLeadCheckInput(opgeslagen.s)
      if (!invoer) return
      setS(invoer)
      const herstelStap = Number(opgeslagen.stap)
      if (Number.isInteger(herstelStap) && herstelStap >= 0 && herstelStap <= 7) setStap(herstelStap)
    } catch {
      /* corrupte opslag negeren */
    }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stap, s }))
    } catch {
      /* opslag vol of geblokkeerd: stil negeren */
    }
  }, [stap, s])

  const start = () => {
    posthog.capture('lead_check_start')
    setStap(1)
  }
  const naar = (volgende: number) => {
    if (volgende > stap) posthog.capture('lead_check_step', { stap: volgende })
    setStap(volgende)
  }
  const terug = () => setStap((x) => Math.max(1, x - 1))
  const klaar = () => {
    posthog.capture('lead_check_complete')
    setComputing(true)
    setTimeout(() => {
      setComputing(false)
      setStap(7)
    }, REKEN_VERTRAGING_MS)
  }
  const opnieuw = () => {
    setS(DEFAULTS)
    setStap(0)
  }

  let inhoud: React.ReactNode

  if (stap === 0) {
    /* ── intro ── */
    inhoud = (
      <div className={styles.screen}>
        <div className={styles.lekgutter} aria-hidden="true">
          <i style={{ height: '30%' }} />
        </div>
        <Drips n={3} fall={300} />
        <div className={styles.bodyPad}>
          <div className={styles.eyebrow}>Gratis zelftest · 1 minuut</div>
          <h1 className={styles.introTitel}>
            Hoeveel omzet lekt er ongemerkt <span className={styles.gradText}>weg</span> uit je bedrijf?
          </h1>
          <p className={styles.introTekst}>
            Zes korte vragen over je eigen bedrijf. Daarna zie je je eigen cijfers terug. Geen verkooppraatje.
          </p>
          <div className={styles.puddleStage}>
            <div className={`${styles.puddle} ${styles.puddleGroot}`} />
            <div className={`${styles.puddle} ${styles.puddleKlein}`} />
          </div>
          <button type="button" className={styles.btnPrimary} onClick={start}>
            Start de lek-check <span className={styles.btnPijl}>→</span>
          </button>
          <div className={styles.trust}>
            <span>
              <i aria-hidden="true" />1 minuut
            </span>
            <span>
              <i aria-hidden="true" />
              Geen account
            </span>
            <span>
              <i aria-hidden="true" />
              Anoniem
            </span>
          </div>
        </div>
      </div>
    )
  } else if (stap === 7) {
    inhoud = <LeadCheckResult invoer={s} onRestart={opnieuw} onAanpassen={() => setStap(1)} />
  } else {
    /* ── vragen ── */
    inhoud = (
      <div className={styles.screen}>
        <div className={styles.topbar}>
          <button type="button" className={styles.terugKnop} onClick={terug} disabled={stap === 1} aria-label="Vorige vraag">
            ←
          </button>
          <div
            className={styles.qbar}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={AANTAL_VRAGEN}
            aria-valuenow={stap}
            aria-label={`Vraag ${stap} van ${AANTAL_VRAGEN}`}
          >
            {Array.from({ length: AANTAL_VRAGEN }).map((_, i) => (
              <i key={i} className={i < stap ? styles.qbarDone : ''} />
            ))}
          </div>
        </div>

        {/* key=stap zodat elke vraag opnieuw in-animeert */}
        <div className={`${styles.bodyPad} ${styles.rise}`} key={stap}>
          {stap === 1 && (
            <>
              <div className={styles.qnum}>
                Vraag <b>1</b> / 6
              </div>
              <div className={styles.qtitle}>Hoeveel aanvragen krijg je gemiddeld per week?</div>
              <div className={styles.qhint}>Een ruwe schatting is prima.</div>
              <div className={styles.bignum}>
                <div className={`${styles.bignumWaarde} ${styles.gradText}`}>{s.aanvragenPerWeek}</div>
                <div className={styles.bignumUnit}>aanvragen / week</div>
              </div>
              <input
                className={styles.slider}
                type="range"
                min={0}
                max={50}
                value={s.aanvragenPerWeek}
                onChange={(e) => set('aanvragenPerWeek', Number(e.target.value))}
                aria-label="Aanvragen per week"
              />
              <div className={styles.sliderLabels}>
                <span>0</span>
                <span>50+</span>
              </div>
              <button type="button" className={`${styles.btnPrimary} ${styles.naarOnder}`} onClick={() => naar(2)}>
                Volgende →
              </button>
            </>
          )}

          {stap === 2 && (
            <>
              <div className={styles.qnum}>
                Vraag <b>2</b> / 6
              </div>
              <div className={styles.qtitle}>Hoe snel reageer je meestal op een aanvraag?</div>
              <div className={styles.qhint}>Op een gewone werkdag, gemiddeld.</div>
              <div className={styles.opts}>
                {SPEED_OPTIES.map((o) => (
                  <Opt key={o.value} label={o.label} hint={o.hint} selected={s.speed === o.value} onClick={() => set('speed', o.value)} />
                ))}
              </div>
              <button type="button" className={`${styles.btnPrimary} ${styles.naarOnder}`} onClick={() => naar(3)}>
                Volgende →
              </button>
            </>
          )}

          {stap === 3 && (
            <>
              <div className={styles.qnum}>
                Vraag <b>3</b> / 6
              </div>
              <div className={styles.qtitle}>Ben je &#39;s avonds en in het weekend bereikbaar?</div>
              <div className={styles.qhint}>Juist dán komen veel aanvragen binnen.</div>
              <div className={styles.opts}>
                {AVOND_OPTIES.map((o) => (
                  <Opt key={o.value} label={o.label} hint={o.hint} selected={s.afterhours === o.value} onClick={() => set('afterhours', o.value)} />
                ))}
              </div>
              <button type="button" className={`${styles.btnPrimary} ${styles.naarOnder}`} onClick={() => naar(4)}>
                Volgende →
              </button>
            </>
          )}

          {stap === 4 && (
            <>
              <div className={styles.qnum}>
                Vraag <b>4</b> / 6
              </div>
              <div className={styles.qtitle}>Welk deel van je aanvragen wordt klant?</div>
              <div className={styles.qhint}>Ongeveer, je conversie.</div>
              <div className={styles.bignum}>
                <div className={`${styles.bignumWaarde} ${styles.gradText}`}>{s.conversiePct}%</div>
                <div className={styles.bignumUnit}>wordt klant</div>
              </div>
              <input
                className={styles.slider}
                type="range"
                min={1}
                max={100}
                value={s.conversiePct}
                onChange={(e) => set('conversiePct', Number(e.target.value))}
                aria-label="Conversiepercentage"
              />
              <div className={styles.sliderLabels}>
                <span>1%</span>
                <span>100%</span>
              </div>
              <button type="button" className={`${styles.btnPrimary} ${styles.naarOnder}`} onClick={() => naar(5)}>
                Volgende →
              </button>
            </>
          )}

          {stap === 5 && (
            <>
              <div className={styles.qnum}>
                Vraag <b>5</b> / 6
              </div>
              <div className={styles.qtitle}>Wat levert een gemiddelde klus op?</div>
              <div className={styles.qhint}>De omzet van één opdracht, ongeveer.</div>
              <div className={styles.bignum}>
                <div className={`${styles.bignumWaarde} ${styles.gradText}`}>€{fmt(s.orderwaarde)}</div>
                <div className={styles.bignumUnit}>per opdracht</div>
              </div>
              <div className={styles.chips}>
                {[250, 450, 800, 1500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.chip} ${s.orderwaarde === v ? styles.chipSel : ''}`}
                    onClick={() => set('orderwaarde', v)}
                  >
                    €{fmt(v)}
                  </button>
                ))}
              </div>
              <input
                className={`${styles.slider} ${styles.sliderRuim}`}
                type="range"
                min={100}
                max={3000}
                step={50}
                value={s.orderwaarde}
                onChange={(e) => set('orderwaarde', Number(e.target.value))}
                aria-label="Gemiddeld orderbedrag in euro"
              />
              <div className={styles.sliderLabels}>
                <span>€100</span>
                <span>€3.000</span>
              </div>
              <button type="button" className={`${styles.btnPrimary} ${styles.naarOnder}`} onClick={() => naar(6)}>
                Volgende →
              </button>
            </>
          )}

          {stap === 6 && (
            <>
              <div className={styles.qnum}>
                Vraag <b>6</b> / 6 · laatste
              </div>
              <div className={styles.qtitle}>Vragen je klanten ook elders een offerte op?</div>
              <div className={styles.qhint}>Eerlijk antwoord. Dit bepaalt hoe hard snelheid meetelt.</div>
              <div className={styles.opts}>
                {SHOPPEN_OPTIES.map((o) => (
                  <Opt key={o.value} label={o.label} hint={o.hint} selected={s.shoppen === o.value} onClick={() => set('shoppen', o.value)} />
                ))}
              </div>
              <button type="button" className={`${styles.btnPrimary} ${styles.naarOnder}`} onClick={klaar}>
                Toon mijn uitslag
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.frame}>
      {inhoud}
      {computing && (
        <div className={styles.computing} role="status">
          <div className={styles.compRing} aria-hidden="true" />
          <div className={styles.compTekst}>We rekenen jouw lek uit…</div>
        </div>
      )}
    </div>
  )
}
