/**
 * Stuur een event naar Google Analytics 4 (gtag).
 * No-op als gtag niet geladen is (dev, ad-blocker, of server-side).
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', name, params ?? {})
}
