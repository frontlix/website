#!/usr/bin/env node
/**
 * Backfill-script: geocode alle leads die nog geen lat/lng hebben.
 *
 * Hoe te draaien:
 *   - Vereist env-vars (in .env.local of geëxporteerd):
 *       NEXT_PUBLIC_SUPABASE_URL_DASHBOARD = Schoonstraatje project URL
 *       SUPABASE_SERVICE_ROLE_KEY_DASHBOARD = service-role key voor dat project
 *       POSTCODE_TECH_API_KEY              = postcode.tech bearer token
 *   - Draai: `node --env-file=.env.local scripts/backfill-lead-coords.mjs`
 *
 * Gebruikt dezelfde `_DASHBOARD`-suffix env-vars als de runtime dashboard-
 * code (lib/dashboard/supabase-admin.ts), zodat we het juiste project
 * raken — de Frontlix-website draait op een áпder Supabase-project.
 *
 * Idempotent — slaat leads over waar `coords_geocoded_op` al gezet is.
 * Rate-limit-vriendelijk: 100ms tussen requests (~600/min, ruim onder de
 * postcode.tech limiet van 10k/maand).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_DASHBOARD
const POSTCODE_KEY = process.env.POSTCODE_TECH_API_KEY

const BATCH_SIZE = 500
const REQUEST_DELAY_MS = 100

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[backfill] NEXT_PUBLIC_SUPABASE_URL_DASHBOARD of SUPABASE_SERVICE_ROLE_KEY_DASHBOARD ontbreekt.\n' +
      'Run met: node --env-file=.env.local scripts/backfill-lead-coords.mjs',
  )
  process.exit(1)
}
if (!POSTCODE_KEY) {
  console.error('[backfill] POSTCODE_TECH_API_KEY ontbreekt in env.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function normalize(postcode) {
  return postcode.replace(/\s+/g, '').toUpperCase()
}

async function geocode(postcode, huisnummer) {
  // `/postcode/full` returns geo coordinates (lat/lon); de plain `/postcode`
  // endpoint geeft alleen straat+plaats zonder geo.
  const url = `https://postcode.tech/api/v1/postcode/full?postcode=${encodeURIComponent(
    normalize(postcode),
  )}&number=${encodeURIComponent(huisnummer)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${POSTCODE_KEY}` },
  })
  if (!res.ok) {
    return { ok: false, status: res.status }
  }
  const data = await res.json()
  const lat = data?.geo?.lat
  const lng = data?.geo?.lon
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { ok: false, status: 'no_coords' }
  }
  return { ok: true, lat, lng }
}

async function main() {
  console.log('[backfill] start')
  let totalProcessed = 0
  let totalOk = 0
  let totalSkip = 0
  let totalFail = 0

  while (true) {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('lead_id, postcode, huisnummer')
      .is('coords_geocoded_op', null)
      .not('postcode', 'is', null)
      .not('huisnummer', 'is', null)
      .limit(BATCH_SIZE)

    if (error) {
      console.error('[backfill] fetch error:', error)
      process.exit(1)
    }
    if (!leads || leads.length === 0) {
      console.log('[backfill] geen leads meer te verwerken')
      break
    }

    for (const lead of leads) {
      totalProcessed++
      const result = await geocode(lead.postcode, lead.huisnummer)
      if (!result.ok) {
        totalFail++
        console.warn(
          `  ✗ ${lead.lead_id} (${lead.postcode}/${lead.huisnummer}) → ${result.status}`,
        )
        // Set coords_geocoded_op alsnog om niet eindeloos te retryen.
        // Latere edits triggeren een nieuwe poging.
        await supabase
          .from('leads')
          .update({ coords_geocoded_op: new Date().toISOString() })
          .eq('lead_id', lead.lead_id)
        await sleep(REQUEST_DELAY_MS)
        continue
      }

      const { error: updErr } = await supabase
        .from('leads')
        .update({
          lat: result.lat,
          lng: result.lng,
          coords_geocoded_op: new Date().toISOString(),
        })
        .eq('lead_id', lead.lead_id)

      if (updErr) {
        totalFail++
        console.warn(`  ✗ ${lead.lead_id} update error:`, updErr.message)
      } else {
        totalOk++
        if (totalOk % 25 === 0) {
          console.log(`  ✓ ${totalOk} leads gegeocodeerd…`)
        }
      }
      await sleep(REQUEST_DELAY_MS)
    }

    if (leads.length < BATCH_SIZE) break
  }

  console.log('[backfill] klaar')
  console.log(
    `  verwerkt: ${totalProcessed} · ok: ${totalOk} · skip: ${totalSkip} · fail: ${totalFail}`,
  )
}

main().catch((e) => {
  console.error('[backfill] fatale fout:', e)
  process.exit(1)
})
