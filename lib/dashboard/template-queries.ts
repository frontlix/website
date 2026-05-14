import { getDashboardSupabase } from './supabase-server'

export type TemplateAanvraag = {
  id: string
  template_naam: string
  voorgestelde_tekst: string
  status: 'pending' | 'forwarded' | 'approved' | 'rejected' | 'applied'
  aangemaakt_op: string
  notitie: string | null
}

/**
 * Haalt de laatste template-aanvragen op. RLS regelt dat de owner alleen
 * z'n eigen rijen ziet. Sortering: nieuwste eerst.
 */
export async function getRecentTemplateAanvragen(limit = 10): Promise<TemplateAanvraag[]> {
  const supabase = await getDashboardSupabase()
  const { data, error } = await supabase
    .from('template_aanvragen')
    .select('id, template_naam, voorgestelde_tekst, status, aangemaakt_op, notitie')
    .order('aangemaakt_op', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as TemplateAanvraag[]
}
