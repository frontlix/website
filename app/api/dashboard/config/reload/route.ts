import { type NextRequest } from 'next/server'
import { proxyToBotApiGlobal } from '@/lib/dashboard/bot-api-proxy'

/**
 * Trigger voor de bot om z'n in-memory clientConfig te verversen uit DB.
 * Wordt aangeroepen na elke "Opslaan" op een instellingen-pagina zodat de
 * bot direct met de nieuwe waarden werkt (i.p.v. te wachten op de 60s
 * achtergrondrefresh).
 */
export async function POST(req: NextRequest) {
  return proxyToBotApiGlobal(req, 'config/reload')
}
