import { Suspense } from 'react'
import { getLeadsList, countAllLeads } from '@/lib/dashboard/lead-queries'
import { getAllTags } from '@/lib/dashboard/tag-queries'
import {
  parseLeadsFilters,
  hasActiveFilters,
} from '@/lib/dashboard/lead-filters'
import { LeadsTable } from '@/components/dashboard/leads/LeadsTable'
import { LeadsFilterBar } from '@/components/dashboard/leads/LeadsFilterBar'
import { ExportLeadsButton } from '@/components/dashboard/leads/ExportLeadsButton'
import styles from './page.module.css'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const filters = parseLeadsFilters(sp)
  const [leads, total, allTags] = await Promise.all([
    getLeadsList(filters),
    countAllLeads(),
    getAllTags(),
  ])
  const active = hasActiveFilters(filters)

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1>Leads</h1>
          <p>
            {active
              ? `${leads.length} gevonden van ${total} totaal.`
              : `${leads.length} ${
                  leads.length === 1 ? 'lead' : 'leads'
                } — niet gearchiveerd, nieuwste eerst.`}
          </p>
        </div>
        <Suspense fallback={null}>
          <ExportLeadsButton />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <LeadsFilterBar allTags={allTags} />
      </Suspense>
      <LeadsTable leads={leads} />
    </div>
  )
}
