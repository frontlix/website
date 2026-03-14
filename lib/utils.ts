/**
 * Combines class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Formats a number with optional suffix.
 */
export function formatNumber(num: number, suffix?: string): string {
  return `${num.toLocaleString('nl-NL')}${suffix ?? ''}`
}

/**
 * Truncates a string to a given length, appending an ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}
