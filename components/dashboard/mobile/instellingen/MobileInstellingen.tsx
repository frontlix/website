'use client'

import { useState } from 'react'
import { MobileDrilldownLayer } from '../drilldowns/MobileDrilldownLayer'
import { InstellingenHub } from './InstellingenHub'
import { InstBedrijf } from './InstBedrijf'
import { InstTeam } from './InstTeam'
import { InstPrijzen } from './InstPrijzen'
import { InstDiensten } from './InstDiensten'
import { InstOpening } from './InstOpening'
import { InstReminders } from './InstReminders'
import { InstNotif } from './InstNotif'
import { InstTags } from './InstTags'
import { INST_ALL } from './instellingen-mock'
import styles from './MobileInstellingen.module.css'

const DETAIL: Record<string, React.ComponentType> = {
  team: InstTeam, prijzen: InstPrijzen, diensten: InstDiensten,
  opening: InstOpening, reminders: InstReminders, notif: InstNotif, tags: InstTags,
}

// Desktop gebruikt iets andere sectie-keys in de URL; map die naar onze keys
// zodat een deeplink als ?section=notificaties ook het juiste mobiele scherm opent.
const SECTION_ALIAS: Record<string, string> = { notificaties: 'notif' }

type Props = {
  /** Huidig maand-omzetdoel (tenant_settings.omzet_doel_maand); null = geen doel. */
  omzetDoel?: number | null
  /**
   * Rauwe `?section=`-param (server-side doorgegeven). Alleen als die expliciet
   * aanwezig is openen we het detail direct — anders zou elk bezoek op 'bedrijf'
   * defaulten. De server-side default-naar-'bedrijf' mag hier dus NIET in.
   */
  initialSection?: string
}

export function MobileInstellingen({ omzetDoel = null, initialSection }: Props) {
  // Deeplink: ?section= opent direct het bijbehorende detail (bv. de
  // "Stel je maanddoel in"-CTA op het Overzicht → ?section=bedrijf).
  // Alleen bij mount; daarna stuurt lokale state de view.
  const [view, setView] = useState<string | null>(() => {
    if (!initialSection) return null
    const key = SECTION_ALIAS[initialSection] ?? initialSection
    return key === 'bedrijf' || DETAIL[key] ? key : null
  })

  const section = view ? INST_ALL.find((s) => s.k === view) : null

  return (
    <div className={styles.root}>
      <InstellingenHub onOpen={setView} />
      <MobileDrilldownLayer
        open={view !== null}
        title={section?.l ?? ''}
        onClose={() => setView(null)}
      >
        {/* Bedrijf draagt het echte maanddoel-veld; overige details zijn mock. */}
        {view === 'bedrijf' ? (
          <InstBedrijf omzetDoel={omzetDoel} />
        ) : view && DETAIL[view] ? (
          (() => {
            const Detail = DETAIL[view]
            return <Detail />
          })()
        ) : null}
      </MobileDrilldownLayer>
    </div>
  )
}
