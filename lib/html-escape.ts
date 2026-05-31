/**
 * Escapet HTML-gevoelige tekens in user-input vóór interpolatie in een
 * mail-HTML-body. Voorkomt HTML-injectie (bv. <script>, </td> breakout).
 * Minimaal &, <, >, " en ' worden geëscaped. & moet eerst, anders zou
 * een al-geëscapete entity dubbel worden geëscaped.
 */
export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
