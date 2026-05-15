import { Wallet, Inbox, TrendingUp, Clock } from 'lucide-react'
import type { ComponentType, ReactElement } from 'react'

/**
 * Vier KPI's op de overzicht-pagina. Eén is altijd "active" (hero, met
 * donut + grote getal); de overige drie tonen als compacte mini-cards.
 */
export type KpiKey = 'omzet' | 'leads' | 'conversie' | 'reactietijd'

export const KPI_KEYS: ReadonlyArray<KpiKey> = ['omzet', 'leads', 'conversie', 'reactietijd']

export type KpiUnit = 'eur' | 'count' | 'pct' | 's'

/**
 * Hardcoded doelen voor v1. Worden later editable via tenant_settings.
 * Pas hier aan om de progress-donut anders te schalen.
 */
export const KPI_DOELEN = {
  omzet_maand: 25_000,
  leads_week: 18,
  conversie_pct: 70,
  reactietijd_doel_s: 60,
} as const

export type KpiMetric = {
  key: KpiKey
  label: string
  /** Het getal dat groot in beeld komt (en op de mini-cards). */
  value: number
  unit: KpiUnit
  /** Doel-waarde voor donut-progress (zelfde unit als value). */
  doel: number
  /** Vorige-periode-waarde voor de "vs vorige week"-diff. */
  prevValue: number
  /** Range-tekst onder de waarde (bv. "Lopende maand"). */
  rangeLabel: string
  /** Vergelijkings-tekst ("vs vorige week"). */
  compareLabel: string
  /** Voor reactietijd: lager is beter, dus diff-teken inverteren. */
  invertDelta?: boolean
  /** Icon voor de mini-card + hero-badge. */
  iconKind: 'wallet' | 'inbox' | 'trending' | 'clock'
}

const ICONS: Record<KpiMetric['iconKind'], ComponentType<{ size?: number; strokeWidth?: number }>> = {
  wallet: Wallet,
  inbox: Inbox,
  trending: TrendingUp,
  clock: Clock,
}

export function renderIcon(kind: KpiMetric['iconKind'], size = 18): ReactElement {
  const Cmp = ICONS[kind]
  return <Cmp size={size} strokeWidth={2.25} />
}

// ── Helpers voor weergave ───────────────────────────────────────────

export function formatKpiValue(value: number, unit: KpiUnit): {
  prefix?: string
  number: string
  suffix?: string
} {
  if (unit === 'eur') {
    return { prefix: '€ ', number: value.toLocaleString('nl-NL') }
  }
  if (unit === 'pct') {
    return { number: value.toLocaleString('nl-NL'), suffix: ' %' }
  }
  if (unit === 's') {
    return { number: value.toLocaleString('nl-NL'), suffix: ' s' }
  }
  // count
  return { number: value.toLocaleString('nl-NL') }
}

/**
 * Diff t.o.v. vorige periode, met richting + formatting.
 * `up` = "goede richting" (voor reactietijd betekent dat DAALT).
 */
export function computeDelta(metric: KpiMetric): {
  up: boolean
  /** Tekst zoals "+€3.1k", "+22%", "+8 pt", "−12s" */
  display: string
  /** Voor "Uitschieter"-badge: ≥20% absoluut verschil. */
  uitschieter: boolean
} {
  const diff = metric.value - metric.prevValue
  const absDiff = Math.abs(diff)
  const goingUp = metric.invertDelta ? diff < 0 : diff > 0

  // Uitschieter: ≥20% afwijking t.o.v. vorige periode (mits prev > 0)
  const ratio = metric.prevValue > 0 ? absDiff / metric.prevValue : 0
  const uitschieter = metric.prevValue > 0 && ratio >= 0.2

  // Geen verandering of geen vorige data
  if (absDiff === 0 || metric.prevValue === 0) {
    return { up: true, display: '—', uitschieter: false }
  }

  const sign = diff > 0 ? '+' : '−' // unicode minus zodat 't strakker oogt

  if (metric.unit === 'eur') {
    return {
      up: goingUp,
      display: `${sign}€ ${formatShortEur(absDiff)}`,
      uitschieter,
    }
  }
  if (metric.unit === 'pct') {
    return {
      up: goingUp,
      display: `${sign}${absDiff.toFixed(0)} pt`,
      uitschieter,
    }
  }
  if (metric.unit === 's') {
    return {
      up: goingUp,
      display: `${sign}${absDiff.toFixed(0)} s`,
      uitschieter,
    }
  }
  // count → percentage-vorm (zoals leads "+22%")
  const pct = (absDiff / metric.prevValue) * 100
  return {
    up: goingUp,
    display: `${sign}${pct.toFixed(0)} %`,
    uitschieter,
  }
}

/**
 * "3.100" → "3.1k", "18.420" → "€18.420" (volledig getoond),
 * "1.250.000" → "1.25M". Compact voor delta-weergave.
 */
function formatShortEur(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.', ',')}k`
  return n.toFixed(0)
}

/**
 * Voor de donut: "78%" = value/doel * 100. Reactietijd inverteren —
 * lager is beter, dus 47s op doel 60s = "78% van doel ingehaald" geeft
 * 22% nog te gaan-feel. We tonen het als (doel/value)*100 zodat lager
 * dan doel = >100% (top in beeld) en hoger dan doel = <100% (rood).
 */
export function pctVanDoel(metric: KpiMetric): number {
  if (metric.doel <= 0) return 0
  if (metric.invertDelta) {
    // lager is beter — value=47, doel=60 → 60/47*100 = 127% (binnen target, vol)
    // value=80, doel=60 → 60/80*100 = 75% (boven target, deels)
    return (metric.doel / Math.max(1, metric.value)) * 100
  }
  return (metric.value / metric.doel) * 100
}

/**
 * Tekst "nog €6.580" / "nog 4" — verschil tot doel. Negatief = doel bereikt.
 */
export function nogTotDoel(metric: KpiMetric): {
  done: boolean
  display: string
} {
  if (metric.invertDelta) {
    // lager-is-beter: doel bereikt als value <= doel
    const onder = metric.doel - metric.value
    if (onder >= 0) {
      return { done: true, display: 'onder doel' }
    }
    return { done: false, display: `+${Math.abs(onder)} s boven` }
  }
  const nog = metric.doel - metric.value
  if (nog <= 0) {
    return { done: true, display: 'doel gehaald' }
  }
  if (metric.unit === 'eur') return { done: false, display: `nog € ${nog.toLocaleString('nl-NL')}` }
  if (metric.unit === 'pct') return { done: false, display: `nog ${nog} %` }
  return { done: false, display: `nog ${nog}` }
}
