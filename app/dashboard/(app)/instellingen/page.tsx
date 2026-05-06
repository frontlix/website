import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export default async function InstellingenPage() {
  const supabase = await getDashboardSupabase()
  const { data: dataRaw } = await supabase
    .from('tenant_settings')
    .select('bedrijfsnaam, eigenaar_email, eigenaar_whatsapp, plaats')
    .limit(1)
    .maybeSingle()

  // Cast: Supabase type-inference zonder generated DB types geeft `never`.
  const data = dataRaw as
    | {
        bedrijfsnaam: string | null
        eigenaar_email: string | null
        eigenaar_whatsapp: string | null
        plaats: string | null
      }
    | null

  return (
    <div>
      <h1>Instellingen</h1>
      <p>
        Hieronder zie je de huidige instellingen van je dashboard. Aanpassen via het dashboard volgt in een latere release;
        voor nu kunnen wijzigingen door Frontlix worden doorgevoerd.
      </p>
      <dl>
        <dt>Bedrijfsnaam</dt><dd>{data?.bedrijfsnaam ?? '—'}</dd>
        <dt>Plaats</dt><dd>{data?.plaats ?? '—'}</dd>
        <dt>E-mail</dt><dd>{data?.eigenaar_email ?? '—'}</dd>
        <dt>WhatsApp</dt><dd>{data?.eigenaar_whatsapp ?? '—'}</dd>
      </dl>
    </div>
  )
}
