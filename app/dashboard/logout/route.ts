import { redirect } from 'next/navigation'
import { getDashboardSupabase } from '@/lib/dashboard/supabase-server'

export async function GET() {
  const supabase = await getDashboardSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
