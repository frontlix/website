'use client'

import { useState } from 'react'
import { Sparkles, Minus, Plus } from 'lucide-react'
import { InstGroupCard, InstPrimaryBtn } from './InstAtoms'
import { stepPrice, deltaPct } from './inst-helpers'
import { INST_PRICE } from './instellingen-mock'
import styles from './InstPrijzen.module.css'

/** Prijzen-detailscherm met wat-als-simulator.
 *  v1: lokale state + placeholder simulator-stats (zie TODO). */
export function InstPrijzen() {
  // Lokale prijs-state: { [k]: number }, geseed vanuit de mock-basis.
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(INST_PRICE.map((p) => [p.k, p.v])),
  )
  // Basisprijzen blijven constant — vergelijkingsbron voor delta + "changed".
  // Vergelijk op 2 decimalen: stepPrice kan float-drift geven (bv. 3.9500000000000002),
  // waardoor een +/- round-trip anders ten onrechte "changed" blijft.
  const base = Object.fromEntries(INST_PRICE.map((p) => [p.k, p.v]))
  const changed = INST_PRICE.some((p) => vals[p.k].toFixed(2) !== p.v.toFixed(2))

  const step = (k: string, dir: 1 | -1) => {
    const item = INST_PRICE.find((x) => x.k === k)
    if (!item) return
    setVals((v) => ({ ...v, [k]: stepPrice(v[k], item.step, dir) }))
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Deze tarieven gebruikt Surface om automatisch offertes te berekenen.
      </p>

      <InstGroupCard>
        {INST_PRICE.map((p, i) => {
          const pct = deltaPct(vals[p.k], base[p.k])
          return (
            <div
              key={p.k}
              className={styles.row}
              data-last={i === INST_PRICE.length - 1 || undefined}
            >
              <div className={styles.rowText}>
                <div className={styles.rowLabel}>{p.l}</div>
                {pct !== 0 && (
                  // data-dir kleurt de delta-regel (groen omhoog / rood omlaag).
                  <div className={styles.delta} data-dir={pct > 0 ? 'up' : 'down'}>
                    {pct > 0 ? '+' : ''}
                    {pct}% vs nu
                  </div>
                )}
              </div>

              <div className={styles.stepper}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => step(p.k, -1)}
                  aria-label={`Verlaag ${p.l}`}
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <div className={styles.value}>
                  €{vals[p.k].toFixed(2)}
                  <span className={styles.unit}>{p.unit}</span>
                </div>
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => step(p.k, 1)}
                  aria-label={`Verhoog ${p.l}`}
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )
        })}
      </InstGroupCard>

      {/* Simulator-kaart: gradient + witte tekst zodra er iets gewijzigd is. */}
      <div className={styles.sim} data-changed={changed || undefined}>
        <div className={styles.simHead}>
          <div className={styles.simIcon}>
            <Sparkles size={16} aria-hidden="true" />
          </div>
          <div className={styles.simHeadText}>
            <div className={styles.simTitle}>Wat-als simulator</div>
            <div className={styles.simSub}>
              {changed
                ? 'Op basis van je laatste 30 leads'
                : 'Pas een prijs aan om het effect te zien'}
            </div>
          </div>
        </div>

        {changed && (
          // TODO: wire to pricing-impact (computeRevenueDelta / getPricingImpactBaseline)
          <div className={styles.simStats}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Omzet-effect</div>
              <div className={styles.statValue}>+€1.240</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Gesch. conversie</div>
              <div className={styles.statValue}>61%</div>
            </div>
          </div>
        )}
      </div>

      <InstPrimaryBtn disabled={!changed}>Tarieven opslaan</InstPrimaryBtn>
    </div>
  )
}
