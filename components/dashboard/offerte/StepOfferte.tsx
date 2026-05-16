'use client'

import { formatEuro } from '@/lib/dashboard/format'
import type {
  ManualOfferteData,
  RegelComputed,
  TotalsComputed,
} from '@/lib/dashboard/manual-offerte-types'
import styles from './ManualOfferteModal.module.css'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

export function StepOfferte({
  data,
  set,
  rules,
  totals,
}: {
  data: ManualOfferteData
  set: SetFn
  rules: RegelComputed[]
  totals: TotalsComputed
}) {
  return (
    <>
      <div>
        <div className={styles.sectionLabel}>Offerte-regels</div>
        <div className={styles.sectionSub}>
          Auto-berekend op basis van wat je hebt ingevoerd. Voeg extra arbeid toe of pas korting aan.
        </div>
      </div>

      <div className={styles.regelsList}>
        {rules.length === 0 && (
          <div className={styles.regelEmpty}>
            Geen regels — ga terug naar &ldquo;Werk&rdquo; en kies minstens een dienst
          </div>
        )}
        {rules.map((r, i) => (
          <div key={i} className={styles.regelRow}>
            <div className={styles.regelDesc}>
              <div className={styles.regelDescText}>{r.desc}</div>
              <div className={styles.regelDescMeta}>
                {r.aantal} {r.eenheid} × {formatEuro(r.prijs)}
              </div>
            </div>
            <div className={styles.regelTotaal}>{formatEuro(r.totaal)}</div>
          </div>
        ))}
      </div>

      {/* Extra arbeid */}
      <div>
        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>Extra arbeid (optioneel)</div>
        <div className={styles.extraGrid}>
          <input
            className={styles.input}
            placeholder="Omschrijving (bv. Struiken beschermen)"
            value={data.extra_arbeid_omschrijving}
            onChange={(e) => set('extra_arbeid_omschrijving', e.target.value)}
          />
          <div className={styles.numericField}>
            <input
              className={`${styles.input} ${styles.numericInput}`}
              type="number"
              min={0}
              placeholder="0"
              value={data.extra_arbeid_minuten}
              onChange={(e) => set('extra_arbeid_minuten', Number(e.target.value))}
            />
            <span className={styles.numericFieldHint}>minuten</span>
          </div>
          <div className={styles.numericField}>
            <input
              className={`${styles.input} ${styles.numericInput}`}
              type="number"
              min={0}
              placeholder="0"
              value={data.extra_arbeid_personen}
              onChange={(e) => set('extra_arbeid_personen', Number(e.target.value))}
            />
            <span className={styles.numericFieldHint}>personen</span>
          </div>
        </div>
      </div>

      {/* Korting — slider + handmatig invulbare % (tot 40%) */}
      <div>
        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>Korting</div>
        <div className={styles.kortingRow}>
          <input
            type="range"
            min={0}
            max={40}
            value={data.korting_percentage}
            onChange={(e) => set('korting_percentage', Number(e.target.value))}
            className={styles.kortingRange}
          />
          <div className={styles.kortingPctInputWrap}>
            <input
              type="number"
              min={0}
              max={40}
              value={data.korting_percentage}
              onChange={(e) => {
                const raw = Number(e.target.value)
                const clamped = Math.max(0, Math.min(40, Number.isFinite(raw) ? raw : 0))
                set('korting_percentage', clamped)
              }}
              className={styles.kortingPctInput}
              aria-label="Korting percentage"
            />
            <span className={styles.kortingPctSuffix}>%</span>
          </div>
          <input
            className={styles.input}
            placeholder="Toelichting (bv. Kennismakingskorting)"
            value={data.korting_omschrijving}
            onChange={(e) => set('korting_omschrijving', e.target.value)}
            style={{ flex: 2 }}
          />
        </div>
      </div>

      {/* Totals */}
      <div className={styles.totalsBox}>
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Subtotaal</span>
          <span className={styles.totalValue}>{formatEuro(totals.subtotal)}</span>
        </div>
        {totals.korstmosToeslag > 0 && (
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Korstmos toeslag (10%)</span>
            <span className={styles.totalValue}>{formatEuro(totals.korstmosToeslag)}</span>
          </div>
        )}
        {totals.kortingBedrag > 0 && (
          <div className={`${styles.totalRow} ${styles.totalRowSuccess}`}>
            <span className={styles.totalLabel} style={{ color: 'inherit' }}>
              Korting ({totals.discount}%)
            </span>
            <span className={styles.totalValue}>– {formatEuro(totals.kortingBedrag)}</span>
          </div>
        )}
        <div className={styles.totalRowExcl}>
          <span>Excl. BTW</span>
          <span className={styles.totalValue}>{formatEuro(totals.total)}</span>
        </div>
        <div className={styles.totalRowIncl}>
          <span className={styles.totalRowInclLabel}>Totaal incl. BTW</span>
          <span className={styles.totalRowInclValue}>{formatEuro(totals.total + totals.btw)}</span>
        </div>
      </div>
    </>
  )
}
