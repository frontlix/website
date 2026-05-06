import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/dashboard/auth'
import { PollApproval } from './poll-approval'
import styles from './page.module.css'

export default async function WachtkamerPage() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.tenant_status === 'approved') {
    redirect('/leads')
  }

  if (profile.tenant_status === 'rejected') {
    return (
      <div className={styles.card}>
        <h1 className={styles.title}>Aanvraag afgewezen</h1>
        <p>Je aanvraag is helaas niet goedgekeurd. Neem contact op met Frontlix als dit een vergissing is.</p>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Aanvraag in behandeling</h1>
      <p className={styles.subtitle}>
        Bedankt voor je aanvraag, <strong>{profile.bedrijfsnaam ?? 'Klant'}</strong>.
      </p>
      <p>
        We bekijken je aanvraag handmatig — meestal binnen 1 werkdag. Zodra je toegang krijgt verschijnt het dashboard automatisch op deze pagina.
      </p>
      <PollApproval />
      <p className={styles.footer}>
        Heb je vragen? Mail <a href="mailto:hallo@frontlix.com">hallo@frontlix.com</a>.
      </p>
    </div>
  )
}
