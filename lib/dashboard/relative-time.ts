/** Korte relatieve tijd — "nu" | "12m" | "3u" | "2d". Lege/ongeldige input → "—". */
export function shortTimeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const ms = now - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'nu'
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return 'nu'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}u`
  return `${Math.floor(hr / 24)}d`
}
