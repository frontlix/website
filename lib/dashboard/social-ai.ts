'use server'

import OpenAI from 'openai'
import { getCurrentUser, getCurrentUserProfile } from './auth'
import type { SocialPijler, SocialPlatform, SocialVisualType } from './social-types'

/**
 * De permanente caption-motor (draaiboek sectie 3.2 en 7.1).
 *
 * Gemodelleerd op `manual-offerte-ai.ts`: `'use server'`, auth-gate,
 * `new OpenAI({ apiKey })`, model `gpt-4o-mini`, `response_format` json_schema
 * strict-mode, `temperature: 0`. De systeem-prompt is de letterlijke
 * Nederlandstalige prompt uit draaiboek sectie 7.1, inclusief de harde
 * anti-streep-regel.
 *
 * Verplichte post-check (B7, draaiboek 3.2): na generatie draait een
 * TS-dash-regex over élke gegenereerde tekst en corrigeert liggende streepjes
 * (streep als leesteken naar komma, samentrekkings-koppelteken aaneen,
 * resterende strepen weg). Deze post-check is verplicht, ongeacht de
 * temperatuur (canoniek, draaiboek 3.0 / C3).
 *
 * YouTube-titel is verplicht zodra `youtube` een doelkanaal is (B6): als de AI
 * er geen genereert faalt de generatie met een duidelijke fout, vóór de post
 * `ter_goedkeuring` kan worden.
 *
 * Bron: uitvoeringsdraaiboek sectie 3.2 (in/uit), sectie 7.1 (prompt) en het
 * `manual-offerte-ai.ts`-patroon.
 */

// ── Input / output (draaiboek 3.2) ────────────────────────────────────────

export type GenerateCaptionsInput = {
  /** Een van de zes contentpijlers (sectie 9.2). */
  pijler: SocialPijler
  /** Wat Thierry bij het beeld meegaf (locatie, oppervlakte, product, ...). */
  contextTekst: string
  /** Welke kanalen een caption nodig hebben. */
  platforms: SocialPlatform[]
  /** Soort beeld dat onder de post hangt. */
  beeldType: SocialVisualType
  /** Alleen bij `social_proof`: het woordelijke review-citaat. */
  reviewCitaat?: string
  /** Optioneel seizoens-haakje (sectie 9.5). */
  seizoen?: string
}

/**
 * Per gevraagd kanaal een caption. YouTube krijgt daarnaast een aparte titel
 * en beschrijving (de `caption` van de YouTube-variant is gelijk aan
 * `youtube_description`).
 */
export type GeneratedCaptions = {
  facebook?: string
  instagram?: string
  tiktok?: string
  youtube_title?: string
  youtube_description?: string
  google_business?: string
}

export type GenerateCaptionsResult =
  | { ok: true; captions: GeneratedCaptions }
  | { ok: false; error: string }

// ── Anti-streep-post-check (B7, gedeelde pattern-definitie, draaiboek 3.0) ──

/**
 * Matcht koppelteken, en-streep, em-streep en min-teken. Letterlijk dezelfde
 * pattern-definitie als `preflight.py` (skill) en `INTEGRATIE.md`, alleen in
 * TS-vorm. Niet de code wordt gedeeld, wel de pattern (draaiboek 3.0, B7).
 */
const DASH_PATTERN = /[-‐-―−]/g

/**
 * Verplichte huisstijl-post-check. Corrigeert liggende streepjes ongeacht de
 * temperatuur: streep als leesteken naar komma, samentrekkings-koppelteken
 * aaneenschrijven, resterende strepen weg.
 */
function verwijderStrepen(tekst: string): string {
  return tekst
    .replace(/ - /g, ', ') // streep als leesteken naar komma
    .replace(/(\w)-(\w)/g, '$1$2') // samentrekkings-koppelteken aaneen
    .replace(DASH_PATTERN, '') // resterende strepen weg
}

/** Past `verwijderStrepen` op elke gevulde tekst-sleutel toe. */
function schoonAlleCaptions(captions: GeneratedCaptions): GeneratedCaptions {
  const schoon: GeneratedCaptions = {}
  for (const [key, waarde] of Object.entries(captions)) {
    if (typeof waarde === 'string' && waarde.length > 0) {
      schoon[key as keyof GeneratedCaptions] = verwijderStrepen(waarde)
    }
  }
  return schoon
}

// ── Systeem-prompt (LETTERLIJK uit draaiboek sectie 7.1) ───────────────────

const SYSTEM_PROMPT = `Je bent de social-media-tekstschrijver voor Schoon Straatje, een terras- en opritreiniging-
bedrijf in Zeeuws-Vlaanderen (Biervliet, werkgebied Terneuzen, Hulst, Sluis, Oostburg).
Schrijf per aangevraagd kanaal een native caption op basis van de context.

Merkstem: nuchter, vakkundig, lokaal. Schrijf zoals een trotse vakman die zijn werk laat
spreken. Geen overdrijving, geen cliches. Concrete details (locatie, oppervlakte, product)
maken de post geloofwaardig.

Harde regels:
1. Geen liggende streepjes in welke vorm dan ook: geen koppelteken, en-streep, em-streep of
   streep als leesteken. Schrijf een komma, dubbele punt of nieuwe zin. Samentrekkingen zonder
   koppelteken (voor en nazorg, niet voor- en nazorg) of herformuleer.
2. Geen "AI" of "automatisch gegenereerd" zichtbaar in de output.
3. Geen claims die Thierry niet kan waarmaken. Geen verzonnen cijfers of reviews.
4. Geen emoji op Google Business of YouTube. Op IG en FB maximaal 2 emoji.
5. Hashtags: Facebook 1 tot 2, Instagram max 3, TikTok 2 tot 3, YouTube en GMB geen.
6. Lengtelimieten: FB caption max 400 tekens voor de afbreek, IG eerste 125 zijn de hook,
   TikTok eerste 100 zichtbaar, YouTube-titel max 70, GMB max 1500 totaal.

Structuur per caption:
[HOOK, 1 zin, scroll-stopper met concreet detail of getal]
[BODY, 2 tot 3 korte zinnen: situatie, aanpak, resultaat]
[CTA, 1 zin: "Vraag een gratis offerte via WhatsApp"]

Lever JSON met een sleutel per gevraagd kanaal. Als YouTube gevraagd is, lever zowel
youtube_title als youtube_description.`

// ── JSON-schema (strict-mode, sleutel per kanaal) ─────────────────────────

/**
 * Strict-mode dwingt af dat álle keys aanwezig zijn; kanalen die niet gevraagd
 * zijn geven we via `["string","null"]` als null terug, en filteren we daarna
 * weg. Zo blijft het schema vast (vereist door strict) terwijl de output per
 * aanvraag varieert.
 */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'facebook',
    'instagram',
    'tiktok',
    'youtube_title',
    'youtube_description',
    'google_business',
  ],
  properties: {
    facebook: {
      type: ['string', 'null'],
      description:
        'Native Facebook-caption (alleen als facebook gevraagd is, anders null). Conversationeel, max 400 tekens voor de afbreek, 1 tot 2 hashtags.',
    },
    instagram: {
      type: ['string', 'null'],
      description:
        'Native Instagram-caption (alleen als instagram gevraagd is, anders null). Visueel-eerst, eerste 125 tekens zijn de hook, max 3 hashtags.',
    },
    tiktok: {
      type: ['string', 'null'],
      description:
        'Native TikTok-caption (alleen als tiktok gevraagd is, anders null). Kort, oddly-satisfying-hook, eerste 100 tekens zichtbaar, 2 tot 3 hashtags.',
    },
    youtube_title: {
      type: ['string', 'null'],
      description:
        'YouTube-titel (alleen als youtube gevraagd is, anders null). Zoekgericht, max 70 tekens, geen hashtags, geen emoji.',
    },
    youtube_description: {
      type: ['string', 'null'],
      description:
        'YouTube-beschrijving (alleen als youtube gevraagd is, anders null). Zoekgericht, geen hashtags, geen emoji.',
    },
    google_business: {
      type: ['string', 'null'],
      description:
        'Google Bedrijfsprofiel-post (alleen als google_business gevraagd is, anders null). Feitelijk plus plaatsnaam, geen hashtags, geen emoji, max 1500 tekens.',
    },
  },
} as const

/** De ruwe vorm zoals de LLM hem teruggeeft (alle keys aanwezig, null-baar). */
type RawCaptions = {
  facebook: string | null
  instagram: string | null
  tiktok: string | null
  youtube_title: string | null
  youtube_description: string | null
  google_business: string | null
}

// ── Publieke action ────────────────────────────────────────────────────────

/**
 * Genereert per gevraagd kanaal een native caption (en voor YouTube een titel
 * plus beschrijving) via OpenAI.
 *
 * Auth-gated zoals `manual-offerte-ai.ts`: een NON-redirecting gate
 * (getCurrentUser + profiel-check) want deze action geeft JSON terug en mag de
 * client-flow niet met een redirect breken. Alleen ingelogde, approved
 * dashboard-users mogen de OpenAI-API aanroepen.
 */
export async function generateCaptions(
  input: GenerateCaptionsInput,
): Promise<GenerateCaptionsResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }
  const profile = await getCurrentUserProfile()
  if (!profile || profile.tenant_status !== 'approved') {
    return { ok: false, error: 'Geen toegang.' }
  }

  const platforms = input.platforms ?? []
  if (platforms.length === 0) {
    return { ok: false, error: 'Geen kanalen opgegeven om captions voor te maken.' }
  }

  const context = (input.contextTekst ?? '').trim()
  if (context.length === 0) {
    return { ok: false, error: 'Context ontbreekt, geef mee wat er op het beeld te zien is.' }
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'OpenAI niet geconfigureerd op deze server.' }
  }

  // De pijler-/seizoen-/citaat-context als gestructureerde gebruikersprompt.
  const wilYoutube = platforms.includes('youtube')
  const regels: string[] = [
    `Pijler: ${input.pijler}`,
    `Gevraagde kanalen: ${platforms.join(', ')}`,
    `Beeldtype: ${input.beeldType}`,
    `Context bij het beeld: ${context}`,
  ]
  if (input.seizoen) regels.push(`Seizoens-haakje: ${input.seizoen}`)
  if (input.reviewCitaat) {
    regels.push(
      `Woordelijk review-citaat (citaat blijft letterlijk, valt buiten de anti-streep-herschrijfregel): ${input.reviewCitaat}`,
    )
  }
  regels.push(
    `Lever ALLEEN de gevraagde kanalen als gevulde sleutels; zet alle niet-gevraagde kanalen op null.`,
  )
  if (wilYoutube) {
    regels.push('YouTube is gevraagd: lever verplicht zowel youtube_title als youtube_description.')
  }

  let raw: RawCaptions
  try {
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: regels.join('\n') },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'social_captions',
          strict: true,
          schema: SCHEMA,
        },
      },
      temperature: 0,
    })

    const inhoud = completion.choices[0]?.message?.content
    if (!inhoud) {
      return { ok: false, error: 'OpenAI gaf geen antwoord terug.' }
    }
    raw = JSON.parse(inhoud) as RawCaptions
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'onbekend'
    console.error('[generateCaptions] OpenAI failed:', err)
    return { ok: false, error: `Caption-generatie mislukt: ${msg}` }
  }

  // Alleen de gevraagde kanalen overnemen; de rest negeren.
  const wil = new Set<SocialPlatform>(platforms)
  const captions: GeneratedCaptions = {}
  if (wil.has('facebook') && raw.facebook) captions.facebook = raw.facebook
  if (wil.has('instagram') && raw.instagram) captions.instagram = raw.instagram
  if (wil.has('tiktok') && raw.tiktok) captions.tiktok = raw.tiktok
  if (wil.has('google_business') && raw.google_business) {
    captions.google_business = raw.google_business
  }
  if (wil.has('youtube')) {
    if (raw.youtube_title) captions.youtube_title = raw.youtube_title
    if (raw.youtube_description) captions.youtube_description = raw.youtube_description
  }

  // YouTube-titel verplicht zodra YouTube een doelkanaal is (B6).
  if (wilYoutube && !captions.youtube_title) {
    return {
      ok: false,
      error: 'YouTube is een doelkanaal maar de generatie leverde geen youtube_title.',
    }
  }

  // Controleer dat elk gevraagd kanaal ook echt een tekst kreeg.
  for (const platform of platforms) {
    const heeft =
      platform === 'youtube'
        ? Boolean(captions.youtube_description)
        : Boolean(captions[platform as Exclude<SocialPlatform, 'youtube'>])
    if (!heeft) {
      return { ok: false, error: `Geen caption gegenereerd voor kanaal ${platform}.` }
    }
  }

  // Verplichte anti-streep-post-check (B7), ongeacht de temperatuur.
  return { ok: true, captions: schoonAlleCaptions(captions) }
}
