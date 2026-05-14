import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, MapPin, Phone, MessageCircle } from 'lucide-react'
import { requireApprovedUser } from '@/lib/dashboard/require-approved-user'
import { getLeadDetail } from '@/lib/dashboard/lead-queries'
import { Avatar } from '@/components/dashboard/ui/Avatar'
import { VeldwerkPhases } from '@/components/dashboard/veldwerk/VeldwerkPhases'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function VeldwerkLeadPage({
  params,
}: {
  params: Promise<{ lead_id: string }>
}) {
  await requireApprovedUser()
  const { lead_id } = await params
  const detail = await getLeadDetail(lead_id)
  if (!detail) notFound()

  const { lead } = detail
  const adres = [lead.straat, lead.huisnummer, `${lead.postcode} ${lead.plaats ?? ''}`.trim()]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <Link href="/veldwerk" className={styles.back}>
        <ChevronLeft size={16} /> Veldwerk
      </Link>

      <div className={styles.head}>
        <Avatar name={lead.naam} size="lg" />
        <div>
          <div className={styles.naam}>{lead.naam}</div>
          <div className={styles.adres}>{adres || 'Adres onbekend'}</div>
        </div>
      </div>

      <div className={styles.shortcuts}>
        <a
          href={`https://maps.apple.com/?q=${encodeURIComponent(adres)}`}
          target="_blank"
          rel="noopener"
          className={styles.shortcut}
        >
          <MapPin size={16} /> Navigeer
        </a>
        <a href={`tel:${lead.telefoon}`} className={styles.shortcut}>
          <Phone size={16} /> Bel
        </a>
        <a href={`https://wa.me/${lead.telefoon.replace(/\D/g, '')}`} target="_blank" rel="noopener" className={styles.shortcut}>
          <MessageCircle size={16} /> WhatsApp
        </a>
      </div>

      <VeldwerkPhases leadNaam={lead.naam} />
    </>
  )
}
