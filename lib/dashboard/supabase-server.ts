import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Server-side Supabase client met session uit cookies.
 * Gebruik in Server Components, Server Actions en Route Handlers.
 *
 * Respecteert RLS — als je RLS wilt bypassen voor admin-werk, gebruik dan
 * getDashboardAdmin() uit supabase-admin.ts.
 *
 * Gewrapped in `cache()` zodat layout + page + lib-helpers binnen dezelfde
 * request maar één client construeren (in plaats van per lib-call opnieuw).
 *
 * Generic `<Database>`: laat .from('leads').select(...) zelf de Row-types
 * afleiden, zodat consumers geen `as any` meer nodig hebben.
 */
export const getDashboardSupabase = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL_DASHBOARD!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_DASHBOARD!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll wordt aangeroepen vanuit een Server Component —
            // negeren is veilig zolang je middleware de session refresht.
          }
        },
      },
    }
  )
})
