/**
 * Patch de huidige test-lead handmatig met de gegevens uit het WhatsApp gesprek.
 * Gebruikt om de mail + PDF + scheduling flow te testen zonder het hele
 * intake-gesprek opnieuw te hoeven doen na een extractor bug.
 *
 * Run: node scripts/patch-test-lead.mjs
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

import { randomUUID } from 'node:crypto'

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Pak de meest recente actieve lead voor de test telefoon
const PHONE = '31624965270'
const { data: leads } = await sb
  .from('leads')
  .select('*')
  .eq('telefoon', PHONE)
  .order('created_at', { ascending: false })
  .limit(1)

if (!leads || leads.length === 0) {
  console.error('❌ Geen lead gevonden voor', PHONE)
  process.exit(1)
}

const lead = leads[0]

// Vul collected_data met wat de klant in de chat heeft verteld
const collected_data = {
  adres: 'Theresiastraat 290, 2593AX Den Haag',
  jaarverbruik: '4000',
  daktype: 'plat',
  dakmateriaal: 'dakbedekking',
  dakoppervlakte: '66',
  orientatie: 'zuid',
  schaduw: 'geen',
  aansluiting: '1-fase',
  _photo_step_done: true,
  photos: [],
  photo_analyses: [],
}

// Genereer een nieuwe approval token + zet status meteen op pending_approval
const newToken = randomUUID()

const { error } = await sb
  .from('leads')
  .update({
    collected_data,
    status: 'pending_approval',
    approval_token: newToken,
    updated_at: new Date().toISOString(),
  })
  .eq('id', lead.id)

if (error) {
  console.error('❌ Update failed:', error)
  process.exit(1)
}

const localUrl = `http://localhost:3000/api/demo-approve?token=${newToken}`

console.log(`✅ Lead ${lead.id} gepatcht`)
console.log(`   collected_data: ${Object.keys(collected_data).length} velden`)
console.log(`   status: pending_approval`)
console.log(`   nieuw approval token: ${newToken}`)
console.log()
console.log('🔗 OPEN DEZE URL IN JE BROWSER OM DE PDF FLOW TE STARTEN:')
console.log()
console.log(`   ${localUrl}`)
console.log()
console.log('Wat er dan gebeurt:')
console.log('  1. PDF wordt server-side gegenereerd uit de zonnepanelen branche-config')
console.log('  2. PDF wordt geüpload naar Supabase storage (photos/quotes/...)')
console.log('  3. WhatsApp document message met PDF wordt naar je telefoon gestuurd')
console.log('  4. Browser toont een Frontlix succes pagina')
