import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { slugify } from '@/lib/slugify'

const RESERVED_SLUGS = ['api', 'admin', 'login', 'nieuw', 'new']

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const key = process.env.PERSONALIZED_DEMO_API_KEY
  if (!key) return false
  return auth === `Bearer ${key}`
}

/**
 * POST — Maak een nieuwe gepersonaliseerde demo aan.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { naam, bedrijf, branche, briefing, slug: customSlug, expires_at } = body as {
      naam?: string
      bedrijf?: string
      branche?: string
      briefing?: string
      slug?: string
      expires_at?: string
    }

    if (!naam || !bedrijf || !branche || !briefing) {
      return NextResponse.json(
        { error: 'Verplichte velden: naam, bedrijf, branche, briefing.' },
        { status: 400 }
      )
    }

    if (briefing.length > 500) {
      return NextResponse.json(
        { error: 'Briefing mag maximaal 500 tekens zijn.' },
        { status: 400 }
      )
    }

    // Slug genereren of valideren
    const slug = customSlug ? slugify(customSlug) : slugify(`${naam}-${bedrijf}`)

    if (!slug || slug.length < 3) {
      return NextResponse.json(
        { error: 'Slug moet minimaal 3 tekens zijn.' },
        { status: 400 }
      )
    }

    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json(
        { error: `Slug "${slug}" is gereserveerd.` },
        { status: 400 }
      )
    }

    // Check of slug al bestaat
    const { data: existing } = await getSupabase()
      .from('personalized_demos')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `Slug "${slug}" is al in gebruik.` },
        { status: 409 }
      )
    }

    // Insert
    const { data, error } = await getSupabase()
      .from('personalized_demos')
      .insert({
        slug,
        naam,
        bedrijf,
        branche,
        briefing,
        ...(expires_at ? { expires_at } : {}),
      })
      .select('id, slug')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Opslaan mislukt.' }, { status: 500 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frontlix.com'

    return NextResponse.json({
      success: true,
      id: data.id,
      slug: data.slug,
      url: `${siteUrl}/demo/${data.slug}`,
    })
  } catch (err) {
    console.error('Personalized demo create error:', err)
    return NextResponse.json({ error: 'Er ging iets mis.' }, { status: 500 })
  }
}

/**
 * GET — Haal alle gepersonaliseerde demos op.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await getSupabase()
    .from('personalized_demos')
    .select('slug, naam, bedrijf, branche, is_active, view_count, demo_started_count, created_at, expires_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase select error:', error)
    return NextResponse.json({ error: 'Ophalen mislukt.' }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * PATCH — Werk een demo bij (bijv. deactiveren of briefing wijzigen).
 */
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { slug, ...updates } = body as {
      slug?: string
      is_active?: boolean
      briefing?: string
      expires_at?: string | null
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is verplicht.' },
        { status: 400 }
      )
    }

    // Alleen toegestane velden doorlaten
    const allowed: Record<string, unknown> = {}
    if (typeof updates.is_active === 'boolean') allowed.is_active = updates.is_active
    if (typeof updates.briefing === 'string') allowed.briefing = updates.briefing
    if (updates.expires_at !== undefined) allowed.expires_at = updates.expires_at

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json(
        { error: 'Geen geldige velden om te updaten.' },
        { status: 400 }
      )
    }

    const { error } = await getSupabase()
      .from('personalized_demos')
      .update(allowed)
      .eq('slug', slug)

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: 'Update mislukt.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Personalized demo update error:', err)
    return NextResponse.json({ error: 'Er ging iets mis.' }, { status: 500 })
  }
}
