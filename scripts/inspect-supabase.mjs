/**
 * Eenmalig diagnose script — leest de Supabase schema info voor de demo-flow.
 * Gebruikt de service-role key uit .env.local. Mag verwijderd worden na review.
 *
 * Run: node scripts/inspect-supabase.mjs
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// Mini .env.local parser zodat we geen extra dotenv dependency nodig hebben
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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const sb = createClient(url, key)

console.log('=== TABELLEN PROBE (bekende + verwachte namen) ===\n')
const probes = [
  'demo_leads',
  'demo_conversations',
  'demo_submissions',
  'personalized_demos',
  'demo_appointments',
  'demo_quotes',
  'demo_branche_leads',
  'branche_leads',
  'leads',
  'lead_conversations',
  'lead_messages',
  'conversations',
  'messages',
  'appointments',
  'quotes',
  'branches',
]
for (const t of probes) {
  const { error } = await sb.from(t).select('*').limit(0)
  console.log(`  ${error ? '❌' : '✅'} ${t}${error ? ` — ${error.message}` : ''}`)
}

console.log('\n=== KOLOMMEN VAN demo_leads (probe via select) ===\n')
// Haal 1 row met alle kolommen — laat ons zien welke columns bestaan
const { data: sample, error: sErr } = await sb.from('demo_leads').select('*').limit(1)
if (sErr) {
  console.error('demo_leads probe error:', sErr.message)
} else if (sample && sample.length > 0) {
  console.log('Kolommen:', Object.keys(sample[0]).join(', '))
  console.log('\nVoorbeeld row:')
  console.log(JSON.stringify(sample[0], null, 2))
} else {
  console.log('demo_leads bestaat maar is leeg — kolommen niet zichtbaar via probe.')
  // Probeer een dummy insert+rollback om de schema te ontdekken? Nee, te risky.
  // Probeer in plaats daarvan de bekende velden + nieuwe velden te selecteren
  const probeColumns = [
    'id',
    'telefoon',
    'naam',
    'email',
    'status',
    'type_pand',
    'm2',
    'steentype',
    'planten',
    'approval_token',
    'personalized_demo_id',
    'created_at',
    'flow_type',
    'branche',
    'answers',
    'flow_state',
    'pdf_url',
    'appointment_at',
    'google_event_id',
  ]
  for (const col of probeColumns) {
    const { error } = await sb.from('demo_leads').select(col).limit(0)
    console.log(`  ${error ? '❌' : '✅'} ${col}${error ? ` — ${error.message.split('\n')[0]}` : ''}`)
  }
}

console.log('\n=== KOLOMMEN VAN leads (bestaande mystery tabel) ===\n')
const { data: lSample, error: lErr } = await sb.from('leads').select('*').limit(3)
if (lErr) {
  console.error('leads probe error:', lErr.message)
} else if (lSample && lSample.length > 0) {
  console.log('Kolommen:', Object.keys(lSample[0]).join(', '))
  console.log('\nVoorbeeld rows (max 3):')
  console.log(JSON.stringify(lSample, null, 2))
} else {
  console.log('leads bestaat maar is leeg — probeer kolommen te ontdekken')
  const probeCols = [
    'id', 'created_at', 'naam', 'name', 'email', 'telefoon', 'phone',
    'branche', 'branch', 'sector', 'flow_type', 'flow_state', 'state', 'status',
    'answers', 'data', 'metadata',
    'pdf_url', 'quote_url',
    'appointment_at', 'scheduled_at', 'google_event_id',
    'photos', 'photo_urls',
  ]
  for (const c of probeCols) {
    const { error } = await sb.from('leads').select(c).limit(0)
    if (!error) console.log(`  ✅ ${c}`)
  }
}

console.log('\n=== KOLOMMEN VAN conversations (linked aan leads?) ===\n')
const { data: convSample, error: convErr } = await sb.from('conversations').select('*').limit(2)
if (convErr) console.error('conversations probe error:', convErr.message)
else if (convSample && convSample.length > 0) {
  console.log('Kolommen:', Object.keys(convSample[0]).join(', '))
  console.log('\nVoorbeeld:', JSON.stringify(convSample[0], null, 2))
} else {
  console.log('conversations bestaat maar is leeg')
}

console.log('\n=== KOLOMMEN VAN demo_conversations ===\n')
const { data: cSample, error: cErr } = await sb.from('demo_conversations').select('*').limit(1)
if (cErr) {
  console.error('demo_conversations probe error:', cErr.message)
} else if (cSample && cSample.length > 0) {
  console.log('Kolommen:', Object.keys(cSample[0]).join(', '))
} else {
  console.log('Tabel bestaat maar is leeg.')
}

console.log('\n=== STORAGE BUCKETS ===\n')
const { data: buckets, error: bErr } = await sb.storage.listBuckets()
if (bErr) {
  console.error('Buckets error:', bErr.message)
} else {
  console.log(buckets.map((b) => `  ${b.public ? '🌐' : '🔒'} ${b.name}`).join('\n') || '  (geen buckets)')
}

console.log('\nDone.')
