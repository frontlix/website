/**
 * Eenmalig: ruim stale test-leads op voor een specifiek telefoonnummer.
 * Verwijdert ALLEEN leads met status != 'appointment_booked' (die laten we
 * staan als historische referentie). Verwijdert ook bijbehorende conversations.
 *
 * Run: node scripts/cleanup-test-lead.mjs
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

const PHONE = '31624965270'

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// 1) Vind alle stale leads voor dit nummer
const { data: stale, error: findErr } = await sb
  .from('leads')
  .select('id, status, demo_type, created_at')
  .eq('telefoon', PHONE)
  .neq('status', 'appointment_booked')

if (findErr) {
  console.error('Find error:', findErr)
  process.exit(1)
}

if (!stale || stale.length === 0) {
  console.log('✅ Geen stale leads gevonden — niks te doen.')
  process.exit(0)
}

console.log(`🗑️  ${stale.length} stale leads gevonden:`)
stale.forEach((l) => console.log(`   - ${l.id} (${l.status}, ${l.demo_type ?? 'no branche'}, ${l.created_at})`))

const ids = stale.map((l) => l.id)

// 2) Delete bijbehorende conversations eerst
const { error: convErr, count: convCount } = await sb
  .from('conversations')
  .delete({ count: 'exact' })
  .in('lead_id', ids)

if (convErr) {
  console.error('Conversations delete error:', convErr)
} else {
  console.log(`   ${convCount ?? 0} conversations verwijderd`)
}

// 3) Delete de leads zelf
const { error: leadErr, count: leadCount } = await sb
  .from('leads')
  .delete({ count: 'exact' })
  .in('id', ids)

if (leadErr) {
  console.error('Leads delete error:', leadErr)
  process.exit(1)
}

console.log(`✅ ${leadCount ?? 0} stale leads verwijderd`)
console.log('\nKlaar — je kunt nu een nieuwe test starten.')
