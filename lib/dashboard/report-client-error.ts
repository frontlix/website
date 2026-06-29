'use client'

/**
 * Best-effort melding van een client/render-fout naar de Slack-rookmelder
 * (/api/monitoring/report-error → #error-st). Faalt altijd stil en mag de
 * error-fallback-UI nooit blokkeren. `keepalive` zorgt dat de melding ook
 * vertrekt als de gebruiker direct wegnavigeert of de pagina ververst.
 */
export function reportClientError(
  where: string,
  error: { message?: string; digest?: string } | unknown,
): void {
  try {
    const e = (error ?? {}) as { message?: string; digest?: string }
    const body = JSON.stringify({
      where,
      message: e.message ?? String(error),
      digest: e.digest,
      url: typeof window !== 'undefined' ? window.location.href : '',
    })
    void fetch('/api/monitoring/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* een rookmelder mag zelf nooit crashen */
  }
}
