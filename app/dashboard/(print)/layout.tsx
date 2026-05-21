import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
// Dashboard design-system tokens — nodig voor de tokens (--bg, --fg, etc.)
// die de preview-pagina gebruikt.
import '@/styles/dashboard.css'

/**
 * Print-layout: geen sidebar/topbar. Bedoeld voor view-only pagina's die
 * vanuit het dashboard in een nieuw tab worden geopend (offerte-preview).
 * Auth wordt nog wel gechecked zodat alleen approved users de preview
 * kunnen zien — dezelfde guard als de (app)-layout gebruikt.
 */
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedUser()

  return <>{children}</>
}
