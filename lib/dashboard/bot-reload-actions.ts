'use server'

/**
 * Triggert de SS-bot om zijn in-memory config opnieuw uit Supabase te laden,
 * direct na een dashboard-"Opslaan". Best-effort: faalt dit (bot down, netwerk),
 * dan pikt de 60s-achtergrondverversing van de bot de wijziging alsnog op.
 * Gooit daarom nooit; geeft { ok: false } bij elke fout.
 *
 * Env: BOT_RELOAD_URL = volledige URL naar POST /dashboard-api/config/reload,
 *      BOT_RELOAD_TOKEN = de bot DASHBOARD_API_TOKEN.
 */
export async function triggerBotConfigReload(): Promise<{ ok: boolean }> {
  const url = process.env.BOT_RELOAD_URL
  const token = process.env.BOT_RELOAD_TOKEN
  if (!url || !token) {
    console.warn('[triggerBotConfigReload] BOT_RELOAD_URL/TOKEN niet gezet, overslaan')
    return { ok: false }
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      console.warn('[triggerBotConfigReload] bot gaf status', res.status)
      return { ok: false }
    }
    return { ok: true }
  } catch (err) {
    console.warn('[triggerBotConfigReload] reload-call faalde:', err)
    return { ok: false }
  }
}
