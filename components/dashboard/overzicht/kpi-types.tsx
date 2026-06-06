import { Wallet, Inbox, TrendingUp, Clock, FileText } from 'lucide-react'
import type { ComponentType, ReactElement } from 'react'

/**
 * Vier KPI's op de overzicht-pagina. Eén is altijd "active" (hero, met
 * donut + grote getal); de overige drie tonen als compacte mini-cards.
 */
export type KpiKey = 'omzet' | 'leads' | 'conversie' | 'reactietijd'

export const KPI_KEYS: ReadonlyArray<KpiKey> = ['omzet', 'leads', 'conversie', 'reactietijd']

export type KpiUnit = 'eur' | 'count' | 'pct' | 's'

// KPI-doelen staan in een puur .ts-bestand (zonder JSX) zodat data-helpers
// + tests ze los kunnen importeren. Hier re-export voor bestaande imports.
export { KPI_DOELEN } from './kpi-doelen'

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
  iconKind: 'wallet' | 'inbox' | 'trending' | 'clock' | 'file'
}

/**
 * "Extra"-metric die altijd als mini-card naast de actieve hero
 * wordt getoond, maar geen eigen tab heeft (bv. "Offertes open", een
 * stand-snapshot ipv een periode-totaal).
 */
export type ExtraMetric = Omit<KpiMetric, 'key'> & { key: string }

const ICONS: Record<KpiMetric['iconKind'], ComponentType<{ size?: number; strokeWidth?: number }>> = {
  wallet: Wallet,
  inbox: Inbox,
  trending: TrendingUp,
  clock: Clock,
  file: FileText,
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
    // Voor reactietijd: <60s blijft seconden, daarboven auto-promote
    // naar minuten/uren/dagen. Anders krijg je '84.783 s' voor 23u33m,
    // wat onleesbaar is en oogt als het getal 84.783.
    return formatDurationParts(value)
  }
  // count
  return { number: value.toLocaleString('nl-NL') }
}

/**
 * Splits een aantal seconden in number+suffix voor KPI-weergave.
 * - <60s     -> '47' + ' s'
 * - <60m     -> '12' + ' m'
 * - <24u     -> '2u 15' + ' m'   (uur+min als beide niet 0)
 * - >=24u    -> '1d 5' + ' u'    (dag+uur)
 */
function formatDurationParts(seconds: number): { number: string; suffix: string } {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return { number: String(s), suffix: ' s' }
  if (s < 3600) return { number: String(Math.round(s / 60)), suffix: ' m' }
  if (s < 86400) {
    const h = Math.floor(s / 3600)
    const m = Math.round((s % 3600) / 60)
    return m > 0
      ? { number: `${h}u  ${m}`, suffix: ' m' }
      : { number: String(h), suffix: ' u' }
  }
  const d = Math.floor(s / 86400)
  const h = Math.round((s % 86400) / 3600)
  return h > 0
    ? { number: `${d}d  ${h}`, suffix: ' u' }
    : { number: String(d), suffix: ' d' }
}

/**
 * Compacte duration-string voor delta en 'nog tot doel': '47s',
 * '12m', '2u 15m', '1d 5u'. Geen leading sign.
 */
function formatDurationShort(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.round(s / 60)}m`
  if (s < 86400) {
    const h = Math.floor(s / 3600)
    const m = Math.round((s % 3600) / 60)
    return m > 0 ? `${h}u  ${m}m` : `${h}u`
  }
  const d = Math.floor(s / 86400)
  const h = Math.round((s % 86400) / 3600)
  return h > 0 ? `${d}d  ${h}u` : `${d}d`
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
      display: `${sign}${formatDurationShort(absDiff)}`,
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
 * Voor de donut: "78%" = value/doel * 100. Reactietijd inverteren,  * lager is beter, dus 47s op doel 60s = "78% van doel ingehaald" geeft
 * 22% nog te gaan-feel. We tonen het als (doel/value)*100 zodat lager
 * dan doel = >100% (top in beeld) en hoger dan doel = <100% (rood).
 */
export function pctVanDoel(metric: KpiMetric): number {
  if (metric.doel <= 0) return 0
  if (metric.invertDelta) {
    // lager is beter, value=47, doel=60 → 60/47*100 = 127% (binnen target, vol)
    // value=80, doel=60 → 60/80*100 = 75% (boven target, deels)
    return (metric.doel / Math.max(1, metric.value)) * 100
  }
  return (metric.value / metric.doel) * 100
}

/**
 * Tekst "nog €6.580" / "nog 4", verschil tot doel. Negatief = doel bereikt.
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
    return { done: false, display: `+${formatDurationShort(Math.abs(onder))} boven` }
  }
  const nog = metric.doel - metric.value
  if (nog <= 0) {
    return { done: true, display: 'doel gehaald' }
  }
  if (metric.unit === 'eur') return { done: false, display: `nog € ${nog.toLocaleString('nl-NL')}` }
  if (metric.unit === 'pct') return { done: false, display: `nog ${nog} %` }
  return { done: false, display: `nog ${nog}` }
}
