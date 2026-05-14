'use client'

import { Check } from 'lucide-react'
import {
  type ManualOfferteData,
  type SubDienst,
  type Hoofdcategorie,
  SUB_OPTIES,
  ONDERHOUD_PRIJZEN,
} from '@/lib/dashboard/manual-offerte-types'
import styles from './ManualOfferteModal.module.css'

type SetFn = <K extends keyof ManualOfferteData>(k: K, v: ManualOfferteData[K]) => void

const HOOFDCATS: ReadonlyArray<{ k: Hoofdcategorie; l: string; d: string }> = [
  { k: 'oprit_terras_terrein', l: 'Oprit, Terras of Terreinreiniging', d: 'Bestrating reinigen + invegen' },
  { k: 'onkruidbeheersing',    l: 'Onkruidbeheersing',                  d: 'Preventie + onderhoudsplannen' },
]

const WEEK_OPTIES: ReadonlyArray<{ w: 4 | 8 | 12 | 16; prijs: number }> = [
  { w: 4,  prijs: ONDERHOUD_PRIJZEN[4] },
  { w: 8,  prijs: ONDERHOUD_PRIJZEN[8] },
  { w: 12, prijs: ONDERHOUD_PRIJZEN[12] },
  { w: 16, prijs: ONDERHOUD_PRIJZEN[16] },
]

export function StepWerk({ data, set }: { data: ManualOfferteData; set: SetFn }) {
  const toggleSub = (key: SubDienst) => {
    set('sub', data.sub.includes(key) ? data.sub.filter((s) => s !== key) : [...data.sub, key])
  }
  const hasInvegen = data.sub.includes('invegen')

  return (
    <>
      <div>
        <div className={styles.sectionLabel}>Wat moet er gebeuren?</div>
        <div className={styles.sectionSub}>
          De gekozen diensten bepalen de pricing-regels in de volgende stap
        </div>
      </div>

      {/* Hoofdcategorie */}
      <div>
        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>Hoofddienst</div>
        <div className={styles.grid2}>
          {HOOFDCATS.map((h) => {
            const active = data.hoofdcategorie === h.k
            return (
              <button
                key={h.k}
                type="button"
                onClick={() => set('hoofdcategorie', h.k)}
                className={`${styles.optCard} ${active ? styles.optCardActive : ''}`}
              >
                <div className={`${styles.optDot} ${active ? styles.optDotActive : ''}`} />
                <div style={{ flex: 1 }}>
                  <div className={`${styles.optLabel} ${active ? styles.optLabelActive : ''}`}>{h.l}</div>
                  <div className={styles.optSub}>{h.d}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-diensten */}
      <div>
        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>
          Sub-diensten{' '}
          <span style={{ color: 'var(--fg-muted)', fontWeight: 400, textTransform: 'none' }}>
            (meerdere mogelijk)
          </span>
        </div>
        <div className={styles.grid2}>
          {SUB_OPTIES.filter((d) => d.cat === 'both' || d.cat === data.hoofdcategorie).map((d) => {
            const active = data.sub.includes(d.k)
            return (
              <button
                key={d.k}
                type="button"
                onClick={() => toggleSub(d.k)}
                className={`${styles.checkCard} ${active ? styles.checkCardActive : ''}`}
              >
                <div className={styles.checkCardHead}>
                  <strong className={`${styles.optLabel} ${active ? styles.optLabelActive : ''}`}>{d.l}</strong>
                  <div className={`${styles.checkBox} ${active ? styles.checkBoxActive : ''}`}>
                    {active && <Check size={11} strokeWidth={3} />}
                  </div>
                </div>
                <div className={styles.optSub}>{d.d}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Onderhoud-weken-selector */}
      {data.sub.includes('onderhoud') && (
        <div className={styles.weeksBox}>
          <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>Frequentie onderhoudsplan</div>
          <div className={styles.weeksGrid}>
            {WEEK_OPTIES.map((opt) => {
              const active = data.onderhoud_weken === opt.w
              return (
                <button
                  key={opt.w}
                  type="button"
                  onClick={() => set('onderhoud_weken', opt.w)}
                  className={`${styles.weekBtn} ${active ? styles.weekBtnActive : ''}`}
                >
                  <div className={styles.weekNum}>
                    {opt.w}
                    <span className={styles.weekUnit}>wk</span>
                  </div>
                  <div className={styles.weekPrice}>€{opt.prijs.toFixed(2)}/m²</div>
                </button>
              )
            })}
          </div>
          <div className={styles.weeksHint}>
            Hoe hoger de frequentie, hoe lager de prijs per beurt — maar wel meer beurten per jaar.
            {data.m2 > 0 && (
              <strong style={{ color: 'var(--fg-soft)', marginLeft: 6 }}>
                Per beurt: €{(Number(data.m2) * ONDERHOUD_PRIJZEN[data.onderhoud_weken]).toFixed(2)}
              </strong>
            )}
          </div>
        </div>
      )}

      {/* Specs */}
      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Oppervlakte (m²) *</label>
          <input
            className={`${styles.input} ${styles.numericInput}`}
            type="number"
            value={data.m2}
            onChange={(e) => set('m2', Number(e.target.value))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Korstmos aanwezig</label>
          <div className={styles.toggleRow}>
            {(['nee', 'ja'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set('korstmos', v)}
                className={`${styles.toggleBtn} ${data.korstmos === v ? styles.toggleBtnActive : ''}`}
              >
                {v === 'ja' ? 'Ja (+10% toeslag)' : 'Nee'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Voegzand */}
      {hasInvegen && (
        <div className={styles.voegzandBlock}>
          <div className={styles.voegzandHead}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Voegzand</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
              Kies welke type(s) je wil gebruiken — pas aantal zakken en prijs per zak desgewenst aan
            </div>
          </div>

          <ZandTypeRow
            label="Normaal voegzand"
            sub="Standaard kwarts/zilver, voor algemeen voegwerk"
            actief={data.voegzand_normaal_actief}
            zakken={data.voegzand_normaal_zakken}
            prijs={data.voegzand_normaal_prijs}
            defaultPrijs={2.9}
            onToggle={(v) => set('voegzand_normaal_actief', v)}
            onZakken={(v) => set('voegzand_normaal_zakken', v)}
            onPrijs={(v) => set('voegzand_normaal_prijs', v)}
          />
          <div style={{ height: 10 }} />
          <ZandTypeRow
            label="Onkruidwerend voegzand"
            sub="Polymeer-gebonden, voorkomt onkruidgroei tussen voegen"
            actief={data.voegzand_onkruidwerend_actief}
            zakken={data.voegzand_onkruidwerend_zakken}
            prijs={data.voegzand_onkruidwerend_prijs}
            defaultPrijs={20.9}
            onToggle={(v) => set('voegzand_onkruidwerend_actief', v)}
            onZakken={(v) => set('voegzand_onkruidwerend_zakken', v)}
            onPrijs={(v) => set('voegzand_onkruidwerend_prijs', v)}
          />

          {/* Kleur */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>Kleur voegzand</div>
            <div className={styles.grid2}>
              <KleurChip
                label="Naturel"
                hex="#C6BBA1"
                actief={data.kleur_naturel}
                onToggle={(v) => set('kleur_naturel', v)}
              />
              <KleurChip
                label="Antraciet"
                hex="#3A3A3A"
                actief={data.kleur_antraciet}
                onToggle={(v) => set('kleur_antraciet', v)}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
              Vink beide aan als de klant een mix wil (bijv. naturel op pad + antraciet rond terras)
            </div>
          </div>
        </div>
      )}

      {/* Plantenafscherming */}
      <div className={styles.voegzandBlock}>
        <button
          type="button"
          onClick={() => set('planten_afschermen_actief', !data.planten_afschermen_actief)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent', border: 'none', width: '100%',
            textAlign: 'left', cursor: 'pointer', padding: 0,
          }}
        >
          <div className={`${styles.checkBox} ${data.planten_afschermen_actief ? styles.checkBoxActive : ''}`}>
            {data.planten_afschermen_actief && <Check size={12} strokeWidth={3} />}
          </div>
          <div style={{ flex: 1 }}>
            <div className={`${styles.optLabel} ${data.planten_afschermen_actief ? styles.optLabelActive : ''}`}>
              Plantenafscherming nodig
            </div>
            <div className={styles.optSub}>Afdekfolie voor planten/struiken direct naast bestrating</div>
          </div>
        </button>

        {data.planten_afschermen_actief && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Aantal rollen</label>
              <input
                className={`${styles.input} ${styles.numericInput}`}
                type="number"
                min="0"
                value={data.planten_afschermen_rollen}
                onChange={(e) => set('planten_afschermen_rollen', Number(e.target.value))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Prijs per rol</label>
              <div className={styles.euroRow}>
                <span className={styles.euroLabel}>€</span>
                <input
                  className={`${styles.input} ${styles.numericInput}`}
                  type="number"
                  step="0.01"
                  value={data.planten_afschermen_prijs}
                  onChange={(e) => set('planten_afschermen_prijs', Number(e.target.value))}
                />
              </div>
              <div className={styles.standaardHint}>Standaard € 8,50</div>
            </div>
          </div>
        )}
      </div>

      {/* Groene aanslag */}
      <button
        type="button"
        onClick={() => set('groene_aanslag', data.groene_aanslag === 'ja' ? 'nee' : 'ja')}
        className={`${styles.checkCard} ${data.groene_aanslag === 'ja' ? styles.checkCardActive : ''}`}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className={`${styles.checkBox} ${data.groene_aanslag === 'ja' ? styles.checkBoxActive : ''}`}>
            {data.groene_aanslag === 'ja' && <Check size={12} strokeWidth={3} />}
          </div>
          <div>
            <div className={`${styles.optLabel} ${data.groene_aanslag === 'ja' ? styles.optLabelActive : ''}`}>
              Groene aanslag aanwezig
            </div>
            <div className={styles.optSub}>Notitie voor uitvoerder (geen prijs-impact)</div>
          </div>
        </div>
      </button>
    </>
  )
}

// ── ZandTypeRow ────────────────────────────────────────────────────
function ZandTypeRow({
  label, sub, actief, zakken, prijs, defaultPrijs,
  onToggle, onZakken, onPrijs,
}: {
  label: string
  sub: string
  actief: boolean
  zakken: number
  prijs: number
  defaultPrijs: number
  onToggle: (v: boolean) => void
  onZakken: (v: number) => void
  onPrijs: (v: number) => void
}) {
  return (
    <div className={`${styles.zandRow} ${actief ? styles.zandRowActive : ''}`}>
      <button type="button" onClick={() => onToggle(!actief)} className={styles.zandHead}>
        <div className={`${styles.checkBox} ${actief ? styles.checkBoxActive : ''}`}>
          {actief && <Check size={12} strokeWidth={3} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={`${styles.optLabel} ${actief ? styles.optLabelActive : ''}`}>{label}</div>
          <div className={styles.optSub}>{sub}</div>
        </div>
        {actief && Number(zakken) > 0 && (
          <div className={styles.zandSummary}>
            {zakken} zak × €{Number(prijs).toFixed(2)} ={' '}
            <span className={styles.zandSummaryAmount}>€{(Number(zakken) * Number(prijs)).toFixed(2)}</span>
          </div>
        )}
      </button>

      {actief && (
        <div className={styles.zandDetail}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Aantal zakken</label>
            <input
              className={`${styles.input} ${styles.numericInput}`}
              type="number"
              min="0"
              value={zakken}
              onChange={(e) => onZakken(Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Prijs per zak</label>
            <div className={styles.euroRow}>
              <span className={styles.euroLabel}>€</span>
              <input
                className={`${styles.input} ${styles.numericInput}`}
                type="number"
                step="0.01"
                value={prijs}
                onChange={(e) => onPrijs(Number(e.target.value))}
              />
            </div>
            <div className={styles.standaardHint}>Standaard € {defaultPrijs.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function KleurChip({ label, hex, actief, onToggle }: { label: string; hex: string; actief: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!actief)}
      className={`${styles.kleurChip} ${actief ? styles.kleurChipActive : ''}`}
    >
      <div className={styles.kleurSwatch} style={{ background: hex }} />
      <div style={{ flex: 1 }}>
        <div className={`${styles.optLabel} ${actief ? styles.optLabelActive : ''}`}>{label}</div>
      </div>
      <div className={`${styles.checkBox} ${actief ? styles.checkBoxActive : ''}`}>
        {actief && <Check size={11} strokeWidth={3} />}
      </div>
    </button>
  )
}
