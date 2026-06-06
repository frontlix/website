'use client'

import { useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import Button from '@/components/ui/Button'
import { berekenLeadCheck, euro, verbeterpunten, type LeadCheckInput } from '@/lib/leadCheck'
import styles from './LeadCheckResult.module.css'

/* Halve-cirkel-gauge; kleuren via CSS-variabelen (geen hardcoded hex, brand-regel) */
function ScoreGauge({ score }: { score: number }) {
  const RADIUS = 80
  const HALVE_OMTREK = Math.PI * RADIUS
  const vulling = (score / 100) * HALVE_OMTREK
  return (
    <svg viewBox="0 0 200 112" className={styles.gauge} role="img" aria-label={`Lek-score ${score} van 100`}>
      <defs>
        <linearGradient id="lekGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'var(--color-primary)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--color-accent)' }} />
        </linearGradient>
      </defs>
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="var(--color-surface-2)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="url(#lekGradient)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${vulling} ${HALVE_OMTREK}`}
      />
      <text x="100" y="84" textAnchor="middle" className={styles.gaugeScore}>
        {score}
      </text>
      <text x="100" y="104" textAnchor="middle" className={styles.gaugeLabel}>
        lek-score van 100
      </text>
    </svg>
  )
}

export default function LeadCheckResult({ invoer }: { invoer: LeadCheckInput }) {
  const resultaat = berekenLeadCheck(invoer)
  const punten = verbeterpunten(invoer)

  const [email, setEmail] = useState('')
  const [mailStatus, setMailStatus] = useState<'idle' | 'bezig' | 'klaar' | 'fout'>('idle')
  /* Honeypot tegen simpele spam-bots: mensen zien dit veld niet */
  const honeypotRef = useRef<HTMLInputElement>(null)

  /* Score één keer naar PostHog (lead_check_complete heeft de score nog niet) */
  useEffect(() => {
    posthog.capture('lead_check_result', { score: resultaat.score })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const geenAanvragen = invoer.aanvragenPerWeek === 0
  const perfecteScore = resultaat.score === 0

  const ctaBericht = `Ik deed de lead-lek-check (score ${resultaat.score} van 100) en wil graag een demo plannen.`

  async function verstuurMail(e: React.FormEvent) {
    e.preventDefault()
    if (honeypotRef.current?.value) return /* bot gevuld → stil negeren */
    setMailStatus('bezig')
    try {
      const res = await fetch('/api/lead-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, invoer }),
      })
      if (!res.ok) throw new Error('mislukt')
      posthog.capture('lead_check_email_submitted', { score: resultaat.score })
      /* Form-tracking: completed-event volgens bestaand patroon (silent fail) */
      fetch('/api/form-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          formName: 'lead_check',
          fieldData: { score: String(resultaat.score) },
          status: 'completed',
          pageUrl: window.location.pathname,
        }),
      }).catch(() => {})
      setMailStatus('klaar')
    } catch {
      setMailStatus('fout')
    }
  }

  /* Randgeval: zonder aanvragen valt er niets te rekenen */
  if (geenAanvragen) {
    return (
      <div className={styles.card}>
        <h2 className={styles.titel}>Nog geen aanvragen via je website?</h2>
        <p className={styles.tekst}>
          Zonder aanvragen valt er nog niets te lekken. Zodra je formulier leads oplevert, helpt snelle opvolging je
          om er klanten van te maken. Benieuwd hoe je meer aanvragen binnenhaalt én direct opvolgt?
        </p>
        <Button variant="primary" size="lg" fullWidth href={`/contact?bericht=${encodeURIComponent(ctaBericht)}`}>
          Plan een vrijblijvende demo
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <ScoreGauge score={resultaat.score} />

      {perfecteScore ? (
        <p className={styles.tekst}>
          Knap werk: je opvolging zit al heel strak. Wil je dit niveau vasthouden zonder er zelf bovenop te zitten?
          Dan laten we je graag zien hoe dat automatisch kan.
        </p>
      ) : (
        <>
          <div className={styles.cijfers}>
            <div className={styles.cijferBlok}>
              <span className={styles.cijferWaarde}>≈ {Math.max(1, Math.round(resultaat.gemisteKlantenMaand))}</span>
              <span className={styles.cijferLabel}>gemiste klanten per maand (schatting)</span>
            </div>
            <div className={styles.cijferBlok}>
              <span className={styles.cijferWaarde}>
                {euro(resultaat.omzetMaand.laag)} tot {euro(resultaat.omzetMaand.hoog)}
              </span>
              <span className={styles.cijferLabel}>misgelopen omzet per maand (indicatie)</span>
            </div>
            <div className={styles.cijferBlok}>
              <span className={styles.cijferWaarde}>
                {euro(resultaat.omzetJaar.laag)} tot {euro(resultaat.omzetJaar.hoog)}
              </span>
              <span className={styles.cijferLabel}>op jaarbasis (indicatie)</span>
            </div>
          </div>

          {punten.length > 0 && (
            <div className={styles.punten}>
              <h3 className={styles.puntenTitel}>Waar het bij jou lekt</h3>
              <ul className={styles.puntenLijst}>
                {punten.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <details className={styles.aannames}>
        <summary>Zo rekenen we</summary>
        <p>
          We rekenen met conservatieve factoren: 78% van de klanten kiest het bedrijf dat als eerste reageert. We
          nemen aan dat snellere en ruimere opvolging een deel van je gemiste aanvragen alsnog binnenhaalt. De
          uitkomst is een indicatie, geen belofte. Daarom tonen we een bandbreedte en ronden we af.
        </p>
      </details>

      <div className={styles.ctas}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          href={`/contact?bericht=${encodeURIComponent(ctaBericht)}`}
          onClick={() => posthog.capture('lead_check_cta_demo', { score: resultaat.score })}
        >
          Zo dicht je dit lek: plan een demo
        </Button>
        <p className={styles.ctaSub}>
          Frontlix reageert binnen 60 seconden op elke aanvraag, dag en nacht, en zet je offerte automatisch klaar.
        </p>
      </div>

      {mailStatus === 'klaar' ? (
        <p className={styles.mailSucces}>Verstuurd! Check je inbox voor de volledige analyse.</p>
      ) : (
        <form className={styles.mailForm} onSubmit={verstuurMail}>
          <label htmlFor="leadcheck-email" className={styles.mailLabel}>
            Liever eerst rustig nalezen? Ontvang de volledige analyse met 3 concrete tips per mail.
          </label>
          <div className={styles.mailRij}>
            <input
              id="leadcheck-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jouw@bedrijf.nl"
              className={styles.mailInput}
            />
            <Button type="submit" variant="secondary" size="md" disabled={mailStatus === 'bezig'}>
              {mailStatus === 'bezig' ? 'Versturen...' : 'Stuur de analyse'}
            </Button>
          </div>
          {/* Honeypot: visueel verborgen, bots vullen hem wel in */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className={styles.honeypot}
            aria-hidden="true"
          />
          {mailStatus === 'fout' && (
            <p className={styles.mailFout}>Versturen lukte niet. Probeer het nog eens of plan direct een demo.</p>
          )}
        </form>
      )}
    </div>
  )
}
