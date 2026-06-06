'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { berekenLeadCheck, lekVerdeling, type LeadCheckInput, type LekVerdeling } from '@/lib/leadCheck'
import styles from './LeadCheckResult.module.css'

/* Uitslagscherm van de lead-lek-check (design "Druppels"): donkere onthulling
   met lek-goot, bedrag-band, verdeling per oorzaak, demo-CTA en mail-capture.
   Berekening komt 1-op-1 uit lib/leadCheck.ts (conservatief, getest). */

const fmt = (n: number) => Math.round(n).toLocaleString('nl-NL')
const round50 = (n: number) => Math.round(n / 50) * 50

const REACTIE_SUB: Record<LeadCheckInput['speed'], string> = {
  '5min': 'Reactie binnen 5 minuten',
  '1uur': 'Reactie binnen een uur',
  paar_uur: 'Reactie na een paar uur',
  zelfde_dag: 'Reactie nog dezelfde dag',
  volgende_dag: 'Reactie pas de volgende dag',
}
const AVOND_SUB: Record<LeadCheckInput['afterhours'], string> = {
  altijd: 'Je bent altijd bereikbaar',
  soms: 'Niet consequent bereikbaar',
  nee: 'Buiten werktijd dicht',
}
const SHOP_SUB: Record<LeadCheckInput['shoppen'], string> = {
  meestal: 'Klanten vragen meestal elders',
  soms: 'Klanten vragen soms elders',
  zelden: 'Klanten kiezen meestal jou',
}
const SHOP_EFFECT: Record<LekVerdeling['shoppenEffect'], string> = {
  volledig: 'telt volledig mee',
  gedempt: 'dempt het lek',
  sterk_gedempt: 'dempt het lek sterk',
}

function demoHref(score: number): string {
  const bericht = `Ik heb de lead-lek-check gedaan (lek-score ${score} van 100). Ik wil graag een demo plannen.`
  return `/contact?bericht=${encodeURIComponent(bericht)}`
}

/* Vallende druppels op het donkere scherm (decoratie) */
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

/* Mail-capture: POST naar /api/lead-check; de server herberekent en mailt */
function EmailCapture({ invoer, score }: { invoer: LeadCheckInput; score: number }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'bezig' | 'klaar' | 'fout'>('idle')
  /* Honeypot tegen simpele spam-bots: mensen zien dit veld niet */
  const honeypotRef = useRef<HTMLInputElement>(null)

  if (status === 'klaar') {
    return <div className={styles.sentOk}>De volledige analyse is onderweg naar {email}. Kijk zo in je inbox.</div>
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (honeypotRef.current?.value) return /* bot gevuld → stil negeren */
    setStatus('bezig')
    try {
      const res = await fetch('/api/lead-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, invoer }),
      })
      if (!res.ok) throw new Error('mislukt')
      posthog.capture('lead_check_email_submitted', { score })
      /* Form-tracking: completed-event volgens bestaand patroon (silent fail) */
      fetch('/api/form-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          formName: 'lead_check',
          fieldData: { score: String(score) },
          status: 'completed',
          pageUrl: window.location.pathname,
        }),
      }).catch(() => {})
      setStatus('klaar')
    } catch {
      setStatus('fout')
    }
  }

  return (
    <form className={styles.emailcap} onSubmit={submit}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="jouw@email.nl"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="E-mailadres"
      />
      {/* Honeypot: visueel verborgen, bots vullen hem wel in */}
      <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden="true" />
      <button type="submit" className={styles.btnGhost} disabled={status === 'bezig'}>
        {status === 'bezig' ? 'Versturen…' : 'Stuur de volledige analyse'}
      </button>
      {status === 'fout' && <p className={styles.mailFout}>Versturen lukte niet. Probeer het nog eens of plan direct een demo.</p>}
    </form>
  )
}

/* Bottom-sheet met de aannames achter de berekening */
function AssumptionsSheet({ invoer, onClose }: { invoer: LeadCheckInput; onClose: () => void }) {
  const r = berekenLeadCheck(invoer)
  const rows: [string, string][] = [
    ['Aanvragen per week', `${invoer.aanvragenPerWeek} (door jou ingevuld)`],
    ['Maand-aanvragen', `${fmt(invoer.aanvragenPerWeek * 4.33)} (× 4,33 weken)`],
    ['Reactiesnelheid en bereikbaarheid', 'bepalen welk deel koud wordt'],
    ['Conversie', `${invoer.conversiePct}% wordt normaal klant`],
    ['Gemiddeld orderbedrag', `€${fmt(invoer.orderwaarde)}`],
    ['Klanten shoppen', 'hoe hard snelheid meetelt'],
    ['Bandbreedte', 'we tonen 70% tot 100% van de schatting'],
    ['Geschat lek', `€${fmt(round50(r.omzetMaand.laag))} tot €${fmt(round50(r.omzetMaand.hoog))} per maand`],
  ]
  return (
    <div className={styles.sheetWrap}>
      <div className={styles.sheetScrim} onClick={onClose} />
      <div className={styles.sheet} role="dialog" aria-label="Zo rekenen we">
        <div className={styles.sheetGrab} aria-hidden="true" />
        <div className={styles.sheetEyebrow}>Zo rekenen we</div>
        <h2 className={styles.sheetTitel}>Open en eerlijk gerekend</h2>
        <p className={styles.sheetTekst}>
          Alles is een schatting en we rekenen liever te laag dan te hoog. De berekening gebeurt op je eigen apparaat.
        </p>
        {rows.map(([k, v]) => (
          <div className={styles.assumprow} key={k}>
            <b>{k}</b>
            <span>{v}</span>
          </div>
        ))}
        <button type="button" className={styles.btnPrimary} onClick={onClose}>
          Begrepen
        </button>
      </div>
    </div>
  )
}

interface Props {
  invoer: LeadCheckInput
  onRestart: () => void
  onAanpassen: () => void
}

export default function LeadCheckResult({ invoer, onRestart, onAanpassen }: Props) {
  const resultaat = useMemo(() => berekenLeadCheck(invoer), [invoer])
  const verdeling = useMemo(() => lekVerdeling(invoer), [invoer])
  const [sheet, setSheet] = useState(false)

  /* Score één keer naar PostHog */
  useEffect(() => {
    posthog.capture('lead_check_result', { score: resultaat.score })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── randgeval: geen aanvragen ── */
  if (invoer.aanvragenPerWeek <= 0) {
    return (
      <div className={styles.screenLicht}>
        <div className={styles.bodyCentered}>
          <div className={styles.eyebrow}>Lead-lek-check</div>
          <h1 className={styles.lichtTitel}>Nog geen aanvragen om te checken.</h1>
          <p className={styles.lichtTekst}>
            Zodra de telefoon weer gaat, reken je hier in een minuut uit hoeveel je laat liggen. Tot die tijd valt er
            niets te lekken.
          </p>
          <button type="button" className={styles.btnPrimary} onClick={onAanpassen}>
            Mijn antwoorden aanpassen
          </button>
        </div>
      </div>
    )
  }

  /* ── randgeval: score 0, niets lekt ── */
  if (resultaat.score === 0) {
    return (
      <div className={styles.screenLicht}>
        <div className={styles.bodyPad}>
          <div className={styles.eyebrow}>Jouw lek-check · score 0 van 100</div>
          <h1 className={styles.lichtTitel}>
            Hier lekt vrijwel <span className={styles.gradText}>niets</span> weg.
          </h1>
          <p className={styles.lichtTekst}>
            Je reageert snel, je bent goed bereikbaar en klanten kiezen voor jou. Zo houd je het lek dicht.
          </p>
          <div className={styles.perfectMidden}>
            <div>
              <div className={`${styles.perfectNul} ${styles.gradText}`}>0</div>
              <div className={styles.perfectLabel}>lek-score van 100</div>
            </div>
          </div>
          <Link
            className={styles.btnPrimary}
            href={demoHref(0)}
            onClick={() => posthog.capture('lead_check_cta_demo', { score: 0 })}
          >
            Benieuwd hoe je dit zo houdt? Plan een demo
          </Link>
          <button type="button" className={styles.opnieuwLink} onClick={onRestart}>
            opnieuw invullen
          </button>
        </div>
      </div>
    )
  }

  /* ── normale uitslag (donker) ── */
  const revLo = round50(resultaat.omzetMaand.laag)
  const revHi = round50(resultaat.omzetMaand.hoog)
  const jaarLoK = Math.round(resultaat.omzetJaar.laag / 1000)
  const jaarHiK = Math.round(resultaat.omzetJaar.hoog / 1000)
  const klantLo = Math.max(1, Math.floor(resultaat.gemisteKlantenMaand * 0.7))
  const klantHi = Math.max(1, Math.ceil(resultaat.gemisteKlantenMaand))

  const rijen = [
    {
      label: 'Reactietijd overdag',
      sub: REACTIE_SUB[invoer.speed],
      waarde: verdeling.reactieMaand > 0 ? `ca. €${fmt(round50(verdeling.reactieMaand))}` : 'geen lek',
      droog: verdeling.reactieMaand <= 0,
    },
    {
      label: "'s Avonds en weekend",
      sub: AVOND_SUB[invoer.afterhours],
      waarde: verdeling.avondMaand > 0 ? `ca. €${fmt(round50(verdeling.avondMaand))}` : 'geen lek',
      droog: verdeling.avondMaand <= 0,
    },
    {
      /* Concurrentie is in ons conservatieve model een dempfactor, geen aparte
         geldbron; daarom kwalitatief in plaats van een euro-bedrag */
      label: 'Concurrentie',
      sub: SHOP_SUB[invoer.shoppen],
      waarde: SHOP_EFFECT[verdeling.shoppenEffect],
      droog: verdeling.shoppenEffect !== 'volledig',
    },
  ]

  return (
    <div className={styles.screenDonker}>
      <Drips n={4} fall={820} />
      <div className={styles.bodyPad}>
        <div className={`${styles.eyebrowLicht} ${styles.rv}`}>Jouw lek-check · score {resultaat.score} van 100</div>
        <h1 className={`${styles.donkerTitel} ${styles.rv}`} style={{ animationDelay: '.06s' }}>
          Er lekt elke maand omzet weg.
        </h1>

        <div className={styles.rv} style={{ animationDelay: '.16s' }}>
          <div className={styles.metricLabel}>Geschat per maand</div>
          <div className={styles.metricBedrag}>
            <span>
              €{fmt(revLo)} tot €{fmt(revHi)}
            </span>
          </div>
          <div className={styles.metricSub}>
            ≈ €{jaarLoK}k tot €{jaarHiK}k per jaar ·{' '}
            {klantHi <= 1 ? 'ongeveer 1 gemiste klant' : `${klantLo} tot ${klantHi} gemiste klanten`} · schatting als
            bandbreedte
          </div>
        </div>

        <div className={styles.divider} />
        <div className={`${styles.leakHead} ${styles.rv}`} style={{ animationDelay: '.26s' }}>
          Waar het weglekt
        </div>
        <div className={styles.rv} style={{ animationDelay: '.26s' }}>
          {rijen.map((rij) => (
            <div className={styles.leakrow} key={rij.label}>
              <span className={`${styles.leakDrop} ${rij.droog ? styles.leakDropDry : ''}`} aria-hidden="true" />
              <span className={styles.leakLabel}>
                {rij.label}
                <small>{rij.sub}</small>
              </span>
              <span className={`${styles.leakWaarde} ${rij.droog ? styles.leakWaardeDry : ''}`}>{rij.waarde}</span>
            </div>
          ))}
        </div>
        <div className={`${styles.anker} ${styles.rv}`} style={{ animationDelay: '.36s' }}>
          <b>78%</b> kiest het bedrijf dat als eerste reageert.
        </div>

        <div className={styles.acties}>
          <Link
            className={styles.btnWit}
            href={demoHref(resultaat.score)}
            onClick={() => posthog.capture('lead_check_cta_demo', { score: resultaat.score })}
          >
            Plan een demo en dicht het lek
          </Link>
          <EmailCapture invoer={invoer} score={resultaat.score} />
          <div className={styles.assump}>
            <button type="button" className={styles.assumpLink} onClick={() => setSheet(true)}>
              zo rekenen we
            </button>
            {' · '}
            <button type="button" className={styles.assumpLink} onClick={onRestart}>
              opnieuw
            </button>
          </div>
        </div>
      </div>
      {sheet && <AssumptionsSheet invoer={invoer} onClose={() => setSheet(false)} />}
    </div>
  )
}
