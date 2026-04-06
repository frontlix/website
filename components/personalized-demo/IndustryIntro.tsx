'use client'

import { Building2, Wrench, TreePine, Store, Truck, Home, HelpCircle } from 'lucide-react'
import styles from './IndustryIntro.module.css'

interface IndustryInfo {
  icon: React.ElementType
  text: string
}

const INDUSTRY_MAP: Record<string, IndustryInfo> = {
  schoonmaak: {
    icon: Building2,
    text: 'In de schoonmaakbranche komen leads vaak binnen via formulieren, telefoon en social media. Snelle opvolging maakt het verschil tussen een nieuwe klant en een gemiste kans.',
  },
  horeca: {
    icon: Store,
    text: 'Restaurants en cafés krijgen regelmatig aanvragen voor reserveringen, catering en evenementen. Automatische opvolging zorgt dat geen enkel verzoek onbeantwoord blijft.',
  },
  bouw: {
    icon: Wrench,
    text: 'Aannemers en bouwbedrijven ontvangen dagelijks offerteaanvragen. Hoe sneller je reageert, hoe groter de kans op de opdracht.',
  },
  vastgoed: {
    icon: Home,
    text: 'In vastgoed draait alles om snelheid. Kopers en huurders verwachten direct antwoord. Automatische opvolging voorkomt dat warme leads afkoelen.',
  },
  hoveniers: {
    icon: TreePine,
    text: 'Als hovenier ontvang je aanvragen die seizoensgebonden en tijdgevoelig zijn. Directe opvolging via WhatsApp helpt om sneller afspraken te plannen.',
  },
  transport: {
    icon: Truck,
    text: 'Transportbedrijven krijgen continu aanvragen voor ritten en offertes. Snelle reactie via WhatsApp maakt je betrouwbaarder dan de concurrentie.',
  },
  bakkerij: {
    icon: Store,
    text: 'Bakkerijen met bestel- en cateringservices ontvangen veel aanvragen. Automatische opvolging zorgt dat je nooit een bestelling mist.',
  },
}

const DEFAULT_INDUSTRY: IndustryInfo = {
  icon: HelpCircle,
  text: 'Ongeacht je branche — snelle, persoonlijke opvolging via WhatsApp maakt het verschil. Bekijk hier hoe dat eruitziet voor jouw bedrijf.',
}

export default function IndustryIntro({ branche }: { branche: string }) {
  const info = INDUSTRY_MAP[branche.toLowerCase()] ?? DEFAULT_INDUSTRY
  const Icon = info.icon

  return (
    <div className={styles.intro}>
      <div className={styles.iconWrapper}>
        <Icon size={24} />
      </div>
      <p className={styles.text}>{info.text}</p>
    </div>
  )
}
