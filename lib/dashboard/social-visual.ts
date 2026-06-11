'use server'

import OpenAI from 'openai'
import { getCurrentUser, getCurrentUserProfile } from './auth'

/**
 * De beeldmotor (draaiboek sectie 3.3).
 *
 * Twee functies:
 * - `generateCanvaVisual`: maakt een merk-visual via Canva op basis van een
 *   brand-template (`templateId`) plus autofill-velden (`fields`), en
 *   exporteert die naar een PNG. Voor voor/na-kaarten, tip-cards,
 *   seizoen-kaarten en review-quote-cards die in een Canva-frame moeten.
 * - `generateAIVisual`: roept de OpenAI image-API aan, UITSLUITEND voor
 *   grafische kaarten (tip, seizoen, citaat). Nooit voor voor/na-bewijs of een
 *   foto van een echte locatie.
 *
 * Harde regel (sectie 3.3 / 9.2): AI genereert NOOIT een voor/na-foto of een
 * foto van een echte locatie of materieel als bewijs. Echt bewijsmateriaal komt
 * altijd van Thierry. Die regel staat in de prompt én wordt vóór de aanroep
 * gecontroleerd.
 *
 * Beide functies geven een discriminated union terug
 * (`{ ok: true, pngUrl } | { ok: false, error }`) en gooien nooit. De
 * `pngUrl` gaat later via `uploadNaarPostiz` naar Postiz /upload.
 *
 * Canva loopt via de Canva MCP (`create-design-from-brand-template`,
 * `perform-editing-operations`/autofill, `export-design`). De MCP-tools zijn
 * niet vanuit de Next.js-runtime aan te roepen; deze module verwacht daarom een
 * server-side Canva-bridge via `CANVA_BRIDGE_URL` (een interne route die de MCP
 * orkestreert). Tot die bridge bestaat geeft de functie een nette
 * `{ ok:false }`-fout in plaats van te gokken (draaiboek 13.1 / C6: handmatige
 * Canva-invulling is de maand-1-fallback).
 *
 * Bron: uitvoeringsdraaiboek sectie 3.3 en sectie 9.2 (visuele sporen-regel).
 */

// ── Resultaat-type (discriminated union, draaiboek 3.3) ────────────────────

export type VisualResult =
  | { ok: true; pngUrl: string }
  | { ok: false; error: string }

// ── Input-types ────────────────────────────────────────────────────────────

export type CanvaVisualInput = {
  /** De Canva brand-template-id (uit de env, sectie 3.2-backlog 3.2). */
  templateId: string
  /**
   * Autofill-velden: een map van veldnaam naar tekst- of beeld-waarde. Voor de
   * voor/na-kaart zijn dit de twee echte foto-URL's (van Thierry, sectie 9.2),
   * voor een tip/seizoen/citaat-kaart de tekstvelden.
   */
  fields: Record<string, string>
}

/** De toegestane grafische-kaart-soorten voor AI-beeld (nooit bewijs). */
export type AIGraphicSoort = 'tip_kaart' | 'seizoen_kaart' | 'citaat_kaart'

export type AIVisualInput = {
  /** Welke grafische kaart, bepaalt mee de stijl en blokkeert bewijs-beeld. */
  soort: AIGraphicSoort
  /** De inhoudelijke prompt voor de grafische kaart (geen foto-instructie). */
  prompt: string
  /** Optionele stijl-aanduiding (kleur, sfeer); valt binnen de merkstijl. */
  style?: string
}

// ── Gedeelde stijl-/anti-bewijs-instructie (inline, draaiboek 3.3) ─────────

/**
 * De harde regel in elke AI-beeld-prompt. Analoog aan `style_guide.py` maar
 * inline in TypeScript (Python draait niet in de Next.js-runtime). Voorkomt dat
 * de image-API een nep voor/na of een nep-locatie-foto genereert.
 */
const ANTI_BEWIJS_REGEL =
  'Genereer NOOIT een voor/na-foto, een foto van een echte oprit, terras, gevel, ' +
  'locatie, gebouw, persoon of machine alsof het echt bewijs is. Maak uitsluitend ' +
  'een grafische kaart: een schone, vlakke merk-illustratie met tekst en eenvoudige ' +
  'iconen of vormen. Geen fotorealisme van werk dat zou zijn uitgevoerd. Echt ' +
  'bewijsmateriaal komt altijd van de vakman zelf.'

const MERK_STIJL =
  'Stijl: nuchter, vakkundig, lokaal Zeeuws-Vlaanderen. Strakke, leesbare ' +
  'grafische kaart in de huisstijl van Schoon Straatje. Geen liggende streepjes ' +
  'in eventuele tekst op de kaart (komma of nieuwe regel in plaats daarvan).'

/** Patroon om bewijs-achtige woorden in een AI-prompt te weren. */
const BEWIJS_WOORDEN =
  /\b(voor\s*\/?\s*na|voor en na|echte? foto|locatie|oprit|terras|gevel|pand|machine|hogedruk)\b/i

// ── Canva-visual ────────────────────────────────────────────────────────────

/**
 * Maakt een merk-visual via een Canva brand-template plus autofill en
 * exporteert naar PNG. Orkestreert de Canva-stappen via de interne
 * `CANVA_BRIDGE_URL`-route (die de Canva MCP aanroept), omdat MCP-tools niet
 * direct uit de Next.js-runtime beschikbaar zijn.
 *
 * Geeft de geexporteerde PNG-URL terug; die gaat later via `uploadNaarPostiz`
 * naar Postiz. Bij ontbrekende config of een bridge-fout een nette
 * `{ ok:false }` (maand-1-fallback is handmatige Canva-invulling, C6).
 */
export async function generateCanvaVisual(
  input: CanvaVisualInput,
): Promise<VisualResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    return { ok: false, error: 'Geen toegang.' }
  }

  const templateId = (input.templateId ?? '').trim()
  if (!templateId) {
    return { ok: false, error: 'Canva-template-id ontbreekt (zet de template-id in de env, sectie 3.2).' }
  }
  if (!input.fields || Object.keys(input.fields).length === 0) {
    return { ok: false, error: 'Geen autofill-velden meegegeven voor de Canva-template.' }
  }

  const bridgeUrl = process.env.CANVA_BRIDGE_URL
  if (!bridgeUrl) {
    return {
      ok: false,
      error:
        'CANVA_BRIDGE_URL niet geconfigureerd. Maak de Canva-kaart maand 1 handmatig (draaiboek C6).',
    }
  }

  // Roept de interne bridge aan die in volgorde
  // create-design-from-brand-template -> autofill -> export-design uitvoert
  // via de Canva MCP, en de geexporteerde PNG-URL teruggeeft.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000)
  try {
    const res = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CANVA_BRIDGE_SECRET
          ? { Authorization: process.env.CANVA_BRIDGE_SECRET }
          : {}),
      },
      body: JSON.stringify({
        action: 'brand-template-autofill-export',
        templateId,
        fields: input.fields,
        exportFormat: 'png',
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    const tekst = await res.text()
    let data: unknown = null
    if (tekst) {
      try {
        data = JSON.parse(tekst)
      } catch {
        data = tekst
      }
    }

    if (!res.ok) {
      const detail =
        typeof data === 'object' && data !== null ? JSON.stringify(data) : String(data ?? '')
      return {
        ok: false,
        error: `Canva-bridge gaf ${res.status}: ${detail || res.statusText}`,
      }
    }

    const pngUrl = (data as Record<string, unknown> | null)?.pngUrl
    if (typeof pngUrl !== 'string' || pngUrl.length === 0) {
      return { ok: false, error: 'Canva-bridge gaf geen pngUrl terug.' }
    }
    return { ok: true, pngUrl }
  } catch (err) {
    const reden =
      err instanceof Error && err.name === 'AbortError'
        ? 'timeout'
        : err instanceof Error
          ? err.message
          : String(err)
    return { ok: false, error: `Canva-visual mislukt: ${reden}` }
  } finally {
    clearTimeout(timer)
  }
}

// ── AI-graphic ──────────────────────────────────────────────────────────────

/**
 * Genereert een grafische merk-kaart via de OpenAI image-API. UITSLUITEND voor
 * grafische kaarten (tip, seizoen, citaat), nooit voor voor/na-bewijs of een
 * echte-locatie-foto (harde regel, sectie 3.3 / 9.2). De anti-bewijs-regel
 * staat zowel in de prompt als in een voor-controle op de aangeleverde prompt.
 *
 * Geeft een PNG-URL terug die later via `uploadNaarPostiz` naar Postiz gaat.
 */
export async function generateAIVisual(input: AIVisualInput): Promise<VisualResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    return { ok: false, error: 'Geen toegang.' }
  }

  const prompt = (input.prompt ?? '').trim()
  if (prompt.length === 0) {
    return { ok: false, error: 'Prompt ontbreekt voor de AI-graphic.' }
  }

  // Harde regel: weiger alles wat naar bewijs-beeld neigt (sectie 3.3 / 9.2).
  if (BEWIJS_WOORDEN.test(prompt)) {
    return {
      ok: false,
      error:
        'AI mag geen voor/na of echte-locatie-beeld maken als bewijs. Gebruik een echte foto van Thierry, of vraag een grafische tip/seizoen/citaat-kaart.',
    }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'OpenAI niet geconfigureerd op deze server.' }
  }

  const volledigePrompt = [
    `Grafische kaart (${input.soort}) voor Schoon Straatje.`,
    prompt,
    input.style ? `Extra stijl: ${input.style}` : '',
    MERK_STIJL,
    ANTI_BEWIJS_REGEL,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = new OpenAI({ apiKey })
    const result = await client.images.generate({
      model: 'gpt-image-1',
      prompt: volledigePrompt,
      size: '1024x1024',
      n: 1,
    })

    const eerste = result.data?.[0]
    if (eerste?.url) {
      return { ok: true, pngUrl: eerste.url }
    }
    // gpt-image-1 kan base64 teruggeven; bewaar dat als data-URL zodat de
    // upload-stap er een buffer van kan maken.
    if (eerste?.b64_json) {
      return { ok: true, pngUrl: `data:image/png;base64,${eerste.b64_json}` }
    }
    return { ok: false, error: 'OpenAI image-API gaf geen beeld terug.' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'onbekend'
    console.error('[generateAIVisual] OpenAI image failed:', err)
    return { ok: false, error: `AI-graphic mislukt: ${msg}` }
  }
}
