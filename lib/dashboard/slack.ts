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
      '[slack] SLACK_WEBHOOK_DASHBOARD_SIGNUPS_URL niet gezet — signup-notificatie wordt overgeslagen'
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
