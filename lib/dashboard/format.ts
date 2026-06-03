import type { DashboardStatus, GesprekFase } from './database.types'

const EURO_FORMATTER = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatEuro(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  // Intl.NumberFormat returns a non-breaking space (U+00A0) between currency symbol and amount.
  // Replace with a regular space so output matches the canonical "€ 1.234,50" form.
  return EURO_FORMATTER.format(amount).replace(/ /g, ' ')
}

/**
 * Mensvriendelijke duur uit SECONDEN: "45s", "18m", "2u 6m", "1d 19u".
 * Eén bron voor reactietijd-weergave (mobiel overzicht-tegel + delta-pill);
 * voorheen toonde de overzicht-tegel de rauwe seconden ("153895 s").
 */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined) return '—'
  const s = Math.max(0, Math.round(totalSeconds))
  if (s < 60) return `${s}s`
  const totalMin = Math.round(s / 60)
  if (totalMin < 60) return `${totalMin}m`
  const totalHours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (totalHours < 24) return minutes === 0 ? `${totalHours}u` : `${totalHours}u ${minutes}m`
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return hours === 0 ? `${days}d` : `${days}d ${hours}u`
}

export function formatDateNL(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export function formatDateTimeNL(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`
}

/**
 * Relatieve tijd ("zojuist", "5 min geleden", "2 uur geleden", "3 dagen geleden").
 * Voor exacte tijden > 7 dagen valt terug op formatDateNL.
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'zojuist'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min geleden`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} uur geleden`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'dag' : 'dagen'} geleden`
  return formatDateNL(iso)
}

const DASHBOARD_STATUS_LABELS: Record<DashboardStatus, string> = {
  open: 'Open',
  opgevolgd: 'Opgevolgd',
  afgehandeld: 'Afgehandeld',
  no_show: 'No-show',
  geen_interesse: 'Geen interesse',
  archief: 'Archief',
}

export function dashboardStatusLabel(status: DashboardStatus | null): string {
  if (!status) return 'Geen status'
  return DASHBOARD_STATUS_LABELS[status] ?? status
}

const GESPREK_FASE_LABELS: Record<GesprekFase, string> = {
  info_verzamelen: 'Info verzamelen',
  offerte_besproken: 'Offerte besproken',
  onderhandelen: 'Onderhandelen',
  datum_kiezen: 'Datum kiezen',
  afspraak_bevestigd: 'Afspraak bevestigd',
}

export function gesprekFaseLabel(fase: GesprekFase): string {
  return GESPREK_FASE_LABELS[fase] ?? fase
}
