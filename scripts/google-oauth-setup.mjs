/**
 * Eenmalig: genereer een Google OAuth refresh token voor de afspraak-agent.
 *
 * STAPPEN:
 * 1. Ga naar https://console.cloud.google.com/apis/credentials
 * 2. Maak een nieuw OAuth 2.0 Client ID aan (type: "Desktop app")
 * 3. Voeg "http://localhost:8080/oauth2callback" toe als Authorized redirect URI
 * 4. Download de credentials JSON of kopieer Client ID + Secret
 * 5. Zet deze in .env.local:
 *      GOOGLE_CLIENT_ID=<jouw client id>
 *      GOOGLE_CLIENT_SECRET=<jouw client secret>
 * 6. Run dit script:  node scripts/google-oauth-setup.mjs
 * 7. Open de URL die het script print in je browser, log in en geef toestemming
 * 8. Kopieer de refresh token uit de terminal naar .env.local:
 *      GOOGLE_REFRESH_TOKEN=<token>
 * 9. Klaar — de afspraak-agent kan nu je agenda lezen + events plaatsen
 */

import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { google } from 'googleapis'

// Mini .env.local parser
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

const clientId = env.GOOGLE_CLIENT_ID
const clientSecret = env.GOOGLE_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error('❌ GOOGLE_CLIENT_ID en/of GOOGLE_CLIENT_SECRET ontbreken in .env.local')
  console.error('   Maak ze eerst aan in https://console.cloud.google.com/apis/credentials')
  process.exit(1)
}

const REDIRECT_URI = 'http://localhost:8080/oauth2callback'
const SCOPES = ['https://www.googleapis.com/auth/calendar']

const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

const url = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // forceer refresh token elke keer
  scope: SCOPES,
})

console.log('\n🔑 Open deze URL in je browser:\n')
console.log(`  ${url}\n`)
console.log('   (server luistert op http://localhost:8080 om de callback op te vangen)\n')

const server = createServer(async (req, res) => {
  const u = new URL(req.url || '/', 'http://localhost:8080')
  if (u.pathname !== '/oauth2callback') {
    res.statusCode = 404
    res.end('Not found')
    return
  }
  const code = u.searchParams.get('code')
  if (!code) {
    res.statusCode = 400
    res.end('Missing code')
    return
  }

  try {
    const { tokens } = await oauth.getToken(code)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(`
      <html><body style="font-family: sans-serif; padding: 40px;">
        <h2 style="color: #1A56FF;">✅ Refresh token ontvangen</h2>
        <p>Je kunt deze tab nu sluiten. Bekijk je terminal voor de token.</p>
      </body></html>
    `)

    console.log('\n✅ Tokens ontvangen!\n')
    console.log('Voeg deze regel toe aan .env.local:\n')
    console.log(`  GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`)
    if (!tokens.refresh_token) {
      console.warn('⚠️  Geen refresh token in response — herhaal de flow met prompt=consent')
    }
    console.log('Daarna ben je klaar. Je kunt dit script verwijderen of bewaren voor later.')

    server.close()
    process.exit(0)
  } catch (err) {
    console.error('❌ Token exchange failed:', err)
    res.statusCode = 500
    res.end('Token exchange failed')
  }
})

server.listen(8080, () => {
  console.log('   Server is luisterende op http://localhost:8080\n')
})
