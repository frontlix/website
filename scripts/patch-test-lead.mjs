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

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const LEAD_ID = '057f797d-33e0-452a-893d-ea00519b24f7'

// Vul collected_data met wat de klant in de chat heeft verteld
const collected_data = {
  adres: 'Theresiastraat 290, 2593AX Den Haag',
  jaarverbruik: '4000',
  daktype: 'plat',
  dakmateriaal: 'dakbedekking', // PVC valt onder dakbedekking voor plat dak
  dakoppervlakte: '66',
  orientatie: 'zuid',
  schaduw: 'geen',
  aansluiting: '1-fase',
  _photo_step_done: true,
  photos: [],
  photo_analyses: [],
}

const { error } = await sb
  .from('leads')
  .update({
    collected_data,
    updated_at: new Date().toISOString(),
  })
  .eq('id', LEAD_ID)

if (error) {
  console.error('❌ Update failed:', error)
  process.exit(1)
}

console.log('✅ Lead gepatcht met collected_data:')
console.log(JSON.stringify(collected_data, null, 2))
console.log('\nStuur nu een willekeurig bericht naar de WhatsApp bot (bv. "klaar")')
console.log('De bot detecteert dan dat alle velden + foto-stap klaar zijn,')
console.log('triggert triggerBrancheApproval() en stuurt de mail naar c.c.trompje@gmail.com')
