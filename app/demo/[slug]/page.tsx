import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import PersonalizedDemoPage from '@/components/personalized-demo/PersonalizedDemoPage'

interface DemoData {
  id: string
  slug: string
  naam: string
  bedrijf: string
  branche: string
  briefing: string
  is_active: boolean
  expires_at: string | null
}

async function getDemo(slug: string): Promise<DemoData | null> {
  const { data, error } = await getSupabase()
    .from('personalized_demos')
    .select('id, slug, naam, bedrijf, branche, briefing, is_active, expires_at')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as DemoData
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const demo = await getDemo(slug)

  if (!demo) {
    return { title: 'Demo niet gevonden — Frontlix' }
  }

  return {
    title: `Demo voor ${demo.naam} — Frontlix`,
    description: `Persoonlijke demo voor ${demo.bedrijf}. Bekijk hoe automatische leadopvolging werkt voor jouw bedrijf.`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `Demo voor ${demo.naam} — Frontlix`,
      description: `Persoonlijke demo voor ${demo.bedrijf}`,
      type: 'website',
    },
  }
}

export default async function DemoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const demo = await getDemo(slug)

  if (!demo) notFound()
  if (!demo.is_active) notFound()
  if (demo.expires_at && new Date(demo.expires_at) < new Date()) notFound()

  // View count ophogen (fire-and-forget)
  getSupabase().rpc('increment_demo_views', { demo_id: demo.id }).then(() => {})

  return (
    <PersonalizedDemoPage
      id={demo.id}
      naam={demo.naam}
      bedrijf={demo.bedrijf}
      branche={demo.branche}
    />
  )
}
