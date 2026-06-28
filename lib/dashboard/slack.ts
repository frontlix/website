/**
 * Postet een tekstuele notificatie naar de dashboard-signup Slack-webhook.
 *
 * Faalt nooit met een exception: de signup-server-action mag niet worden
 * geblokkeerd door een Slack-outage. Bij een ontbrekende env-var of een
 * non-2xx response loggen we naar console.error en gaan we door.
 */
export async function postSignupNotification(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL
  if (!url) {
    console.error(
      '[slack] SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL niet gezet, signup-notificatie wordt overgeslagen'
    )
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      console.error('[slack] webhook gaf non-2xx:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[slack] post failed:', err)
  }
}

/**
 * "Rookmelder": postet een crash/fout-melding naar het Slack error-kanaal.
 * Gebruikt een eigen incoming-webhook (SLACK_WEBHOOK_ERRORS_URL) die je in Slack
 * aan het #error-st kanaal koppelt. Faalt nooit met een exception en blokkeert
 * nooit een request: bij ontbrekende env-var of non-2xx loggen we en gaan door.
 * Korte timeout zodat een trage Slack de afhandeling niet ophoudt.
 */
export async function postErrorNotification(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_ERRORS_URL
  if (!url) {
    console.error(
      '[slack] SLACK_WEBHOOK_ERRORS_URL niet gezet, fout-notificatie wordt overgeslagen'
    )
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      console.error('[slack] error-webhook gaf non-2xx:', res.status)
    }
  } catch (err) {
    console.error('[slack] error-notificatie mislukt:', err)
  }
}
