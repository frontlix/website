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
  bedrijf: InstBedrijf, team: InstTeam, prijzen: InstPrijzen, diensten: InstDiensten,
  opening: InstOpening, reminders: InstReminders, notif: InstNotif, tags: InstTags,
}

export function MobileInstellingen() {
  const [view, setView] = useState<string | null>(null)
  const section = view ? INST_ALL.find((s) => s.k === view) : null
  const Detail = view ? DETAIL[view] : null

  return (
    <div className={styles.root}>
      <InstellingenHub onOpen={setView} />
      <MobileDrilldownLayer
        open={view !== null}
        title={section?.l ?? ''}
        onClose={() => setView(null)}
      >
        {Detail && <Detail />}
      </MobileDrilldownLayer>
    </div>
  )
}
