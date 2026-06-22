'use client'

// Echte prijsregels uit pricing_rules (rule_key/label/waarde/eenheid). De
// stepper past de waarde aan; "Tarieven opslaan" stuurt de gewijzigde regels in
// één batch naar updatePricingRulesBatch, de rule_keys komen rechtstreeks uit
// de DB, dus de mapping is betrouwbaar.
//
// Indeling: de regels worden in inklapbare categorie-secties getoond (Reiniging /
// Invegen & voegzand / Onkruidbeheersing / Reiskosten / Overig), dezelfde
// substring-heuristiek als de desktop PrijzenEditor. Er is GEEN categorie-kolom
// in de DB; we leiden 'm puur af uit de rule_key. De eerste niet-lege sectie
// staat open; secties togglen onafhankelijk.
//
// Wat-als simulator (compacte mobiele variant): toont alléén het geschatte
// omzet-effect van de wijziging op basis van de laatste N leads (lineair, via
// computeRevenueDelta). Geen verzonnen getallen, zonder leads of zonder
// wijziging tonen we een eerlijke notitie i.p.v. een cijfer.

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Minus, Plus, Check, AlertTriangle, ChevronRight } from 'lucide-react'
import { updatePricingRulesBatch } from '@/lib/dashboard/pricing-actions'
import { computeRevenueDelta } from '@/lib/dashboard/pricing-impact'
import type { PricingImpactBaseline } from '@/lib/dashboard/pricing-impact-queries'
import type { PricingRule } from '@/components/dashboard/instellingen/setting-types'
import { InstGroupCard, InstPrimaryBtn } from './InstAtoms'
import { deltaPct } from './inst-helpers'
import styles from './InstPrijzen.module.css'

/**
 * Categorie-buckets, zelfde indeling + volgorde als de desktop PrijzenEditor.
 * "overig" vangt onbekende keys op en staat altijd laatst, zodat we nooit een
 * regel verbergen.
 */
const CATEGORIES = [
  { key: 'reiniging', label: 'Reiniging' },
  { key: 'invegen', label: 'Invegen & voegzand' },
  { key: 'onkruid', label: 'Onkruidbeheersing' },
  { key: 'reiskosten', label: 'Reiskosten' },
  { key: 'overig', label: 'Overig' },
] as const
type CategoryKey = (typeof CATEGORIES)[number]['key']

/** Substring-heuristiek op rule_key, werkt los van tenant-eigen namen. */
function categorize(ruleKey: string): CategoryKey {
  const k = ruleKey.toLowerCase()
  if (k.startsWith('reinigen') || k.startsWith('reiniging')) return 'reiniging'
  if (k.includes('voegzand') || k.includes('invegen')) return 'invegen'
  if (
    k.startsWith('onkruidbeheersing') ||
    k.includes('preventief_onkruid') ||
    k.includes('preventieve_onkruid') ||
    k.startsWith('beschermlaag') ||
    k.startsWith('plan_')
  )
    return 'onkruid'
  if (k.startsWith('reiskosten')) return 'reiskosten'
  return 'overig'
}

/**
 * Stap-grootte afgeleid van de huidige waarde. Kleine bedragen (tarieven per
 * m²/km/minuut, doorgaans < €10) stappen fijn met 0,05; grotere waarden
 * (prijs per zak, verhoudingen, drempel-km) stappen met 1 zodat de stepper
 * voor elk rule-type bruikbaar blijft zonder eindeloos tikken.
 */
function stepFor(waarde: number): number {
  return waarde < 10 ? 0.05 : 1
}

/** Waarde ±step, gesnapt op 2 decimalen, niet onder 0. */
function stepValue(current: number, step: number, dir: 1 | -1): number {
  return Math.max(0, +(current + dir * step).toFixed(2))
}

/**
 * Parse handmatige invoer (nl-NL): accepteert zowel komma als punt, negeert
 * duizendtal-punten ("1.234,50"). Geeft null bij leeg/ongeldig/negatief,  * dezelfde regels als de desktop RuleInput. Snappen op 2 decimalen doet de
 * caller via toFixed bij weergave.
 */
function parseValue(s: string): number | null {
  const trimmed = s.trim()
  if (!trimmed) return null
  const cleaned = trimmed.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Weergave-formaat in het invoerveld, 2 decimalen, consistent met de stepper. */
function formatInput(n: number): string {
  return n.toFixed(2)
}

/** € zonder decimalen in nl-NL-notatie. */
function formatEur(n: number): string {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: 0 })
}

/** "13 apr – nu" op basis van de oudste lead-datum. */
function formatPeriod(iso: string | null): string {
  if (!iso) return ''
  const start = new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return `${start} – nu`
}

/** Prijzen-detailscherm: inklapbare categorieën, steppers + omzet-simulator. */
export function InstPrijzen({
  rules,
  baseline,
}: {
  rules: PricingRule[]
  baseline: PricingImpactBaseline | null
}) {
  // Lokale prijs-state: { [rule_key]: number }, geseed uit de echte regels.
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(rules.map((r) => [r.rule_key, r.waarde])),
  )
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Groepeer per categorie (volgorde = sort_order uit de query); alleen
  // niet-lege secties tonen we.
  const grouped = useMemo(() => {
    const out: Record<CategoryKey, PricingRule[]> = {
      reiniging: [],
      invegen: [],
      onkruid: [],
      reiskosten: [],
      overig: [],
    }
    for (const r of rules) out[categorize(r.rule_key)].push(r)
    return out
  }, [rules])
  const visibleCats = useMemo(
    () => CATEGORIES.filter((c) => grouped[c.key].length > 0),
    [grouped],
  )

  // Inklap-state: eerste niet-lege sectie open, rest dicht. Onafhankelijk
  // togglen (meerdere mogen tegelijk open).
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    visibleCats[0] ? { [visibleCats[0].key]: true } : {},
  )
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))

  // Basisprijzen blijven constant, vergelijkingsbron voor delta + "changed".
  const base = Object.fromEntries(rules.map((r) => [r.rule_key, r.waarde]))
  const changedKeys = rules
    .filter((r) => vals[r.rule_key].toFixed(2) !== r.waarde.toFixed(2))
    .map((r) => r.rule_key)
  const changed = changedKeys.length > 0

  // Geschat omzet-effect: lineair Σ(volume × prijsdelta) over de baseline-leads.
  const hasBaseline = baseline != null && baseline.leadCount > 0
  const revenueDelta = hasBaseline
    ? computeRevenueDelta(
        baseline.volumes,
        base,
        Object.fromEntries(changedKeys.map((k) => [k, vals[k]])),
      )
    : 0
  const newRevenue = (baseline?.baselineRevenue ?? 0) + revenueDelta
  const dir = revenueDelta > 0 ? 'up' : revenueDelta < 0 ? 'down' : undefined
  const showTile = hasBaseline && changed

  // Eerlijke sub-tekst: pas een echt cijfer beloven als we leads én een
  // wijziging hebben.
  const simSub = !hasBaseline
    ? 'Nog te weinig leads om het omzet-effect te schatten'
    : !changed
      ? 'Pas een tarief aan om het geschatte omzet-effect te zien'
      : `Op basis van je laatste ${baseline.leadCount} ${baseline.leadCount === 1 ? 'lead' : 'leads'}${
          formatPeriod(baseline.periodStart) ? ` (${formatPeriod(baseline.periodStart)})` : ''
        }`

  const step = (key: string, dir: 1 | -1) => {
    setVals((v) => ({ ...v, [key]: stepValue(v[key], stepFor(v[key]), dir) }))
    setError(null)
    setSavedFlash(false)
  }

  // Absolute waarde uit handmatige invoer (PrijsInput). Snappen op 2 decimalen
  // zodat de vergelijking met de basis (changedKeys) consistent blijft.
  const setVal = (key: string, n: number) => {
    setVals((v) => ({ ...v, [key]: +n.toFixed(2) }))
    setError(null)
    setSavedFlash(false)
  }

  const handleSave = () => {
    if (!changed) return
    const changes = changedKeys.map((rule_key) => ({ rule_key, waarde: vals[rule_key] }))
    setError(null)
    startTransition(async () => {
      const res = await updatePricingRulesBatch(changes)
      if (res.ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 2000)
        // Ververs de server-component → verse `rules`-prop wordt de nieuwe
        // baseline, zodat de delta-pills + "gewijzigd"-staat clearen en de
        // opslaan-knop disabled raakt (zelfde patroon als desktop PrijzenEditor).
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Deze tarieven gebruikt Surface om automatisch offertes te berekenen.
      </p>

      <InstGroupCard>
        {visibleCats.map((cat) => {
          const catRules = grouped[cat.key]
          const isOpen = !!open[cat.key]
          // Niet-opgeslagen wijzigingen in deze (mogelijk dichtgeklapte) sectie.
          const pendingHere = catRules.filter((r) => changedKeys.includes(r.rule_key)).length
          return (
            <div key={cat.key} className={styles.cat}>
              <button
                type="button"
                className={styles.catHeader}
                onClick={() => toggle(cat.key)}
                aria-expanded={isOpen}
              >
                <ChevronRight
                  size={16}
                  className={styles.chevron}
                  data-open={isOpen || undefined}
                  aria-hidden="true"
                />
                <span className={styles.catLabel}>{cat.label}</span>
                {pendingHere > 0 && !isOpen && (
                  <span
                    className={styles.catDot}
                    aria-label={`${pendingHere} niet-opgeslagen wijziging${pendingHere === 1 ? '' : 'en'}`}
                  />
                )}
                <span className={styles.catCount}>{catRules.length}</span>
              </button>

              {isOpen && (
                <div className={styles.catBody}>
                  {catRules.map((r, i) => {
                    const pct = deltaPct(vals[r.rule_key], base[r.rule_key])
                    return (
                      <div
                        key={r.rule_key}
                        className={styles.row}
                        data-last={i === catRules.length - 1 || undefined}
                      >
                        <div className={styles.rowText}>
                          <div className={styles.rowLabel}>{r.label}</div>
                          {pct !== 0 && (
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
                            onClick={() => step(r.rule_key, -1)}
                            aria-label={`Verlaag ${r.label}`}
                          >
                            <Minus size={14} aria-hidden="true" />
                          </button>
                          <PrijsInput
                            value={vals[r.rule_key]}
                            eenheid={r.eenheid}
                            ariaLabel={`Waarde voor ${r.label}`}
                            onChange={(n) => setVal(r.rule_key, n)}
                          />
                          <button
                            type="button"
                            className={styles.stepBtn}
                            onClick={() => step(r.rule_key, 1)}
                            aria-label={`Verhoog ${r.label}`}
                          >
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {rules.length === 0 && (
          <div className={styles.row} data-last>
            <div className={styles.rowText}>
              <div className={styles.rowLabel}>Geen prijsregels gevonden.</div>
            </div>
          </div>
        )}
      </InstGroupCard>

      {/* Wat-als simulator, compacte mobiele variant: alléén het omzet-effect. */}
      <div className={styles.sim}>
        <div className={styles.simHead}>
          <div className={styles.simIcon}>
            <Sparkles size={16} aria-hidden="true" />
          </div>
          <div className={styles.simHeadText}>
            <div className={styles.simTitle}>Wat-als simulator</div>
            <div className={styles.simSub}>{simSub}</div>
          </div>
        </div>
        {showTile && (
          <div className={styles.simStats}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Omzet-effect ({baseline.leadCount} leads)</div>
              <div className={styles.statValue} data-dir={dir}>
                {dir === 'up' ? '+' : dir === 'down' ? '−' : ''}€ {formatEur(Math.abs(revenueDelta))}
              </div>
              <div className={styles.statFootnote}>
                van €{formatEur(baseline.baselineRevenue)} naar €{formatEur(newRevenue)}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error} role="status">
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {savedFlash && !error && (
        <div className={styles.savedFlash}>
          <Check size={13} aria-hidden="true" /> Opgeslagen
        </div>
      )}

      <InstPrimaryBtn disabled={!changed || isPending} onClick={handleSave}>
        {isPending ? 'Opslaan…' : 'Tarieven opslaan'}
      </InstPrimaryBtn>
    </div>
  )
}

/* ── PrijsInput ─────────────────────────────────────────────────────────────
 * Tikbaar tekstveld om het tarief handmatig in te typen (numeriek toetsenbord
 * via inputMode="decimal"; accepteert komma én punt). De steppers blijven voor
 * fijn bijstellen. Houdt een eigen text-buffer zodat tussenstappen als "3," niet
 * direct terug-formatteren; synct extern alleen wanneer de gebruiker niet typt
 * (bv. na een stepper-klik of een save-reset). Zelfde gedrag als de desktop
 * RuleInput: Enter = bevestigen, Escape = terug naar de huidige waarde. */
function PrijsInput({
  value,
  eenheid,
  ariaLabel,
  onChange,
}: {
  value: number
  eenheid: string | null
  ariaLabel: string
  onChange: (n: number) => void
}) {
  const [text, setText] = useState(() => formatInput(value))
  const [invalid, setInvalid] = useState(false)
  // Onderdruk de externe sync tijdens actief typen (anders snapt "3," meteen weg).
  const userTyping = useRef(false)

  useEffect(() => {
    if (userTyping.current) return
    setText(formatInput(value))
  }, [value])

  const handleChange = (next: string) => {
    userTyping.current = true
    setText(next)
    if (invalid) setInvalid(false)
    // Live doorgeven zodat de delta-pill + omzet-tegel meebewegen tijdens typen.
    const parsed = parseValue(next)
    if (parsed !== null) onChange(parsed)
  }

  const commit = () => {
    userTyping.current = false
    const parsed = parseValue(text)
    if (parsed === null) {
      // Ongeldig/leeg → markeer kort en herstel de laatste geldige waarde.
      setInvalid(true)
      setText(formatInput(value))
      return
    }
    setInvalid(false)
    onChange(parsed)
    setText(formatInput(parsed))
  }

  // Het hele veld is een <label>: een tik ergens binnen het kader (ook op de
  // eenheid of de padding) zet native de cursor in de input, groter tikvlak en
  // robuust op iOS Safari, waar een tik náást de smalle input anders niets doet.
  return (
    <label className={styles.valueWrap} data-invalid={invalid || undefined}>
      <input
        type="text"
        inputMode="decimal"
        className={styles.valueInput}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') {
            userTyping.current = false
            setText(formatInput(value))
            setInvalid(false)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        aria-label={ariaLabel}
      />
      {eenheid && <span className={styles.unit}>{eenheid}</span>}
    </label>
  )
}
