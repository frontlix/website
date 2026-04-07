/**
 * Diagnose: print de meest recente actieve branche-lead voor jouw nummer.
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

const { data: leads } = await sb
  .from('leads')
  .select('*')
  .eq('telefoon', PHONE)
  .order('created_at', { ascending: false })
  .limit(1)

if (!leads || leads.length === 0) {
  console.log('Geen leads gevonden voor', PHONE)
  process.exit(0)
}

const lead = leads[0]
console.log('=== LEAD ===')
console.log('id:', lead.id)
console.log('naam:', lead.naam)
console.log('email:', lead.email)
console.log('demo_type:', lead.demo_type)
console.log('status:', lead.status)
console.log('message_count:', lead.message_count)
console.log('approval_token:', lead.approval_token)
console.log('quote_pdf_url:', lead.quote_pdf_url)
console.log('updated_at:', lead.updated_at)
console.log()
console.log('=== COLLECTED_DATA ===')
console.log(JSON.stringify(lead.collected_data, null, 2))

// Toon ook de laatste 6 conversation berichten
const { data: convs } = await sb
  .from('conversations')
  .select('role, content, message_type, created_at')
  .eq('lead_id', lead.id)
  .order('created_at', { ascending: false })
  .limit(6)

console.log('\n=== LAATSTE 6 BERICHTEN (nieuwste eerst) ===')
for (const c of convs ?? []) {
  console.log(`[${c.created_at}] ${c.role}${c.message_type !== 'text' ? ` (${c.message_type})` : ''}:`)
  console.log(`  ${(c.content || '').slice(0, 200)}`)
}
