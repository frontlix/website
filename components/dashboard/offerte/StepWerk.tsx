'use client'

import { AlertTriangle, Check } from 'lucide-react'
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
  // Hoofdcategorie is een multi-select: oprit én onkruid mogen samen.
  // Bij uitvinken van een categorie ruimen we ook de sub-diensten op
  // die alleen onder die categorie vallen, zodat de selectie consistent
  // blijft met wat de UI nog toont.
  const toggleHoofd = (key: Hoofdcategorie) => {
    const next = data.hoofdcategorie.includes(key)
      ? data.hoofdcategorie.filter((c) => c !== key)
      : [...data.hoofdcategorie, key]
    set('hoofdcategorie', next)
    // Cleanup sub-diensten die nu niet meer beschikbaar zijn
    const allowedSubs = SUB_OPTIES.filter(
      (s) => s.cat === 'both' || next.includes(s.cat as Hoofdcategorie),
    ).map((s) => s.k)
    const cleanedSub = data.sub.filter((s) => allowedSubs.includes(s))
    if (cleanedSub.length !== data.sub.length) set('sub', cleanedSub)
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

      {/* Hoofdcategorie — multi-select. Combinatie van oprit én
          onkruid is toegestaan; de sub-diensten-filter eronder past
          zich automatisch aan op de keuze. */}
      <div>
        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>
          Hoofddienst
        </div>
        <div className={styles.grid2}>
          {HOOFDCATS.map((h) => {
            const active = data.hoofdcategorie.includes(h.k)
            return (
              <button
                key={h.k}
                type="button"
                onClick={() => toggleHoofd(h.k)}
                className={`${styles.checkCard} ${active ? styles.checkCardActive : ''}`}
              >
                <div className={styles.checkCardHead}>
                  <strong className={`${styles.optLabel} ${active ? styles.optLabelActive : ''}`}>{h.l}</strong>
                  <div className={`${styles.checkBox} ${active ? styles.checkBoxActive : ''}`}>
                    {active && <Check size={11} strokeWidth={3} />}
                  </div>
                </div>
                <div className={styles.optSub}>{h.d}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-diensten. Op mobile blijft 'ie 2-koloms (i.t.t. de standaard
          .grid2 die op mobile 1-koloms wordt) zodat het matcht met het
          design — Invegen / Onkruid / Beschermlaag / Onderhoud in een
          2×2 tegel-grid. */}
      <div>
        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>
          Sub-diensten
        </div>
        <div className={styles.dienstenGrid}>
          {SUB_OPTIES.filter(
            (d) =>
              d.cat === 'both' ||
              data.hoofdcategorie.includes(d.cat as Hoofdcategorie),
          ).map((d) => {
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
          {/* Desktop-input. Op mobile verborgen via CSS — daar gebruiken we
              de stepper + presets eronder voor tap-vriendelijker input. */}
          <input
            className={`${styles.input} ${styles.numericInput} ${styles.m2InputDesktop}`}
            type="number"
            value={data.m2}
            onChange={(e) => set('m2', Number(e.target.value))}
          />
          {/* Mobile stepper: −/+ met grote knoppen + grote centrale waarde.
              Verborgen op desktop. */}
          <div className={styles.m2Stepper}>
            <button
              type="button"
              className={styles.m2StepperBtn}
              onClick={() => set('m2', Math.max(0, Number(data.m2) - 5))}
              aria-label="5 m² minder"
            >
              −
            </button>
            <input
              className={styles.m2BigInput}
              type="number"
              value={data.m2}
              onChange={(e) => set('m2', Number(e.target.value))}
              aria-label="Oppervlakte in m²"
            />
            <button
              type="button"
              className={styles.m2StepperBtn}
              onClick={() => set('m2', Number(data.m2) + 5)}
              aria-label="5 m² meer"
            >
              +
            </button>
          </div>
          <div className={styles.m2Presets}>
            {[40, 60, 80, 100, 150].map((v) => (
              <button
                key={v}
                type="button"
                className={`${styles.m2Preset} ${Number(data.m2) === v ? styles.m2PresetActive : ''}`}
                onClick={() => set('m2', v)}
              >
                {v}
              </button>
            ))}
          </div>
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
            <div className={styles.hideOnMobile} style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
              Kies welke type(s) je wil gebruiken — pas aantal zakken en prijs per zak desgewenst aan
            </div>
          </div>

          <ZandTypeRow
            label="Normaal voegzand"
            sub="Standaard kwarts/zilver, voor algemeen voegwerk"
            actief={data.voegzand_normaal_actief}
            m2={data.voegzand_normaal_m2}
            zakken={data.voegzand_normaal_zakken}
            prijs={data.voegzand_normaal_prijs}
            defaultPrijs={2.9}
            onToggle={(v) => set('voegzand_normaal_actief', v)}
            onM2={(v) => set('voegzand_normaal_m2', v)}
            onZakken={(v) => set('voegzand_normaal_zakken', v)}
            onPrijs={(v) => set('voegzand_normaal_prijs', v)}
          />
          <div style={{ height: 10 }} />
          <ZandTypeRow
            label="Onkruidwerend voegzand"
            sub="Polymeer-gebonden, voorkomt onkruidgroei tussen voegen"
            actief={data.voegzand_onkruidwerend_actief}
            m2={data.voegzand_onkruidwerend_m2}
            zakken={data.voegzand_onkruidwerend_zakken}
            prijs={data.voegzand_onkruidwerend_prijs}
            defaultPrijs={20.9}
            onToggle={(v) => set('voegzand_onkruidwerend_actief', v)}
            onM2={(v) => set('voegzand_onkruidwerend_m2', v)}
            onZakken={(v) => set('voegzand_onkruidwerend_zakken', v)}
            onPrijs={(v) => set('voegzand_onkruidwerend_prijs', v)}
          />

          <VoegzandMismatchWarning data={data} />

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
            <div className={styles.hideOnMobile} style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 6 }}>
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
            <div className={`${styles.optSub} ${styles.hideOnMobile}`}>Afdekfolie voor planten/struiken direct naast bestrating</div>
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

// ── VoegzandMismatchWarning ────────────────────────────────────────
// Rode banner wanneer de som van per-type voegzand-m² niet overeenkomt
// met de totale oppervlakte. Blokkeert "Volgende" niet — alleen visueel
// signaal zodat de owner expliciet kiest of de mismatch klopt
// (bijv. opzettelijk alleen 30 m² invegen op een 100 m² oprit).
function VoegzandMismatchWarning({ data }: { data: ManualOfferteData }) {
  const normaalActief = data.voegzand_normaal_actief
  const onkruidwerendActief = data.voegzand_onkruidwerend_actief
  if (!normaalActief && !onkruidwerendActief) return null

  const totaalM2 = Number(data.m2) || 0
  const voegzandTotaal =
    (normaalActief ? Number(data.voegzand_normaal_m2) || 0 : 0) +
    (onkruidwerendActief ? Number(data.voegzand_onkruidwerend_m2) || 0 : 0)

  if (voegzandTotaal === totaalM2) return null

  return (
    <div className={styles.voegzandMismatch} role="alert">
      <AlertTriangle size={14} className={styles.voegzandMismatchIcon} />
      <div>
        <strong>Let op:</strong> oppervlakte komt niet overeen.{' '}
        Totaal voegzand: <strong>{voegzandTotaal} m²</strong>, opgegeven oppervlakte:{' '}
        <strong>{totaalM2} m²</strong>.
      </div>
    </div>
  )
}

// ── ZandTypeRow ────────────────────────────────────────────────────
function ZandTypeRow({
  label, sub, actief, m2, zakken, prijs, defaultPrijs,
  onToggle, onM2, onZakken, onPrijs,
}: {
  label: string
  sub: string
  actief: boolean
  m2: number
  zakken: number
  prijs: number
  defaultPrijs: number
  onToggle: (v: boolean) => void
  onM2: (v: number) => void
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
            {m2} m² · {zakken} zak × €{Number(prijs).toFixed(2)} ={' '}
            <span className={styles.zandSummaryAmount}>€{(Number(zakken) * Number(prijs)).toFixed(2)}</span>
          </div>
        )}
      </button>

      {actief && (
        <div className={styles.zandDetail}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Oppervlakte (m²)</label>
            <input
              className={`${styles.input} ${styles.numericInput}`}
              type="number"
              min="0"
              value={m2}
              onChange={(e) => onM2(Number(e.target.value))}
            />
            <div className={styles.standaardHint}>
              Zakken volgen automatisch uit deze m²
            </div>
          </div>
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
