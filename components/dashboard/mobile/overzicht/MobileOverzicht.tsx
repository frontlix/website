'use client'

import { MobileOverzichtHeader } from './MobileOverzichtHeader'
import { AiBriefCard } from './AiBriefCard'
import { HeroKpiCard } from './HeroKpiCard'
import { MiniKpiGrid, MiniKpiIcons, type MiniKpiTile } from './MiniKpiGrid'
import { UrgentBlock, type UrgentItem } from './UrgentBlock'
import { VandaagBlock, type VandaagItem } from './VandaagBlock'
import { ActivityFeedBlock, type ActivityItem } from './ActivityFeedBlock'
import type { NotifItem } from '@/components/dashboard/NotificationPanel'
import styles from './MobileOverzicht.module.css'

/**
 * MobileOverzichtData — de volledige prop-shape voor de mobile Overzicht.
 *
 * Wordt server-side in `app/dashboard/(app)/page.tsx` gevuld en als één
 * blob naar de client gepassed. Zo blijven alle widgets `'use client'`
 * (interactief) zonder dat ze zelf data hoeven te fetchen.
 */
export type MobileOverzichtData = {
  greeting: string
  voornaam?: string
  leadsToday: number
  leadsTomorrow: number
  aiBrief: { title: string; summary: string; ctaLabel?: string }
  omzet: number
  omzetDoel: number | null
  omzetDelta?: { value: number; label: string }
  werkdagenLeft?: number
  miniKpis: {
    nieuweLeads: { value: number; delta?: { value: string; positive: boolean } }
    conversie: { value: number; delta?: { value: string; positive: boolean } }
    reactietijd: { value: number; delta?: { value: string; positive: boolean } }
    offertesOpen: { value: number; delta?: { value: string; positive: boolean } }
  }
  urgent: { items: UrgentItem[]; totalCount: number }
  vandaag: { items: VandaagItem[]; totalKm?: number; totalDuur?: string }
  activity: ActivityItem[]
  notifications?: NotifItem[]
  unreadCount?: number
}

type Props = {
  data: MobileOverzichtData
  /**
   * Optionele drilldown-handler (Phase 3). Als er geen handler wordt
   * meegegeven blijven de "Alles"-knoppen visueel werken maar openen
   * ze geen drilldown — perfect voor de v1 shell.
   */
  onOpenDrilldown?: (view: 'watnu' | 'vandaag' | 'feed') => void
}

/**
 * MobileOverzicht — composer die alle 7 widgets in volgorde rendert.
 *
 * Order matters:
 *   1. Header (greeting + leads-subline + acties)
 *   2. AiBriefCard (Surface samenvatting)
 *   3. HeroKpiCard (omzet + goal ring)
 *   4. MiniKpiGrid (4 mini KPI's in 2x2 grid)
 *   5. UrgentBlock (Wat nu — top 3)
 *   6. VandaagBlock (Vandaag — top 3 stops)
 *   7. ActivityFeedBlock (Recent — top 3 events)
 *
 * Drilldown-routing zit nog niet in deze versie — `onOpenDrilldown`
 * blijft optional, knoppen werken visueel maar openen geen sheet.
 */
export function MobileOverzicht({ data, onOpenDrilldown }: Props) {
  const handleOpen = (view: 'watnu' | 'vandaag' | 'feed') => onOpenDrilldown?.(view)

  // MiniKpiGrid eist een tuple van exact 4 tiles. Casten naar de
  // tuple-type i.p.v. een runtime-array zodat TypeScript de length-
  // invariant kan afdwingen.
  const tiles: [MiniKpiTile, MiniKpiTile, MiniKpiTile, MiniKpiTile] = [
    {
      icon: <MiniKpiIcons.Inbox size={18} />,
      iconTone: 'blue',
      label: 'Nieuwe leads',
      value: String(data.miniKpis.nieuweLeads.value),
      delta: data.miniKpis.nieuweLeads.delta,
    },
    {
      icon: <MiniKpiIcons.Percent size={18} />,
      iconTone: 'green',
      label: 'Conversie',
      value: String(data.miniKpis.conversie.value),
      unit: '%',
      delta: data.miniKpis.conversie.delta,
    },
    {
      icon: <MiniKpiIcons.Clock size={18} />,
      iconTone: 'amber',
      label: 'Reactietijd',
      value: String(data.miniKpis.reactietijd.value),
      unit: 's',
      delta: data.miniKpis.reactietijd.delta,
    },
    {
      icon: <MiniKpiIcons.FileText size={18} />,
      iconTone: 'violet',
      label: 'Offertes open',
      value: String(data.miniKpis.offertesOpen.value),
      delta: data.miniKpis.offertesOpen.delta,
    },
  ]

  return (
    <div className={styles.root}>
      <MobileOverzichtHeader
        greeting={data.greeting}
        voornaam={data.voornaam}
        leadsToday={data.leadsToday}
        leadsTomorrow={data.leadsTomorrow}
        notifications={data.notifications}
        unreadCount={data.unreadCount}
      />

      <AiBriefCard
        title={data.aiBrief.title}
        summary={data.aiBrief.summary}
        primaryCtaLabel={data.aiBrief.ctaLabel}
        onPrimaryCta={data.aiBrief.ctaLabel ? () => handleOpen('watnu') : undefined}
      />

      <HeroKpiCard
        omzet={data.omzet}
        doel={data.omzetDoel}
        delta={data.omzetDelta}
        werkdagenLeft={data.werkdagenLeft}
      />

      <MiniKpiGrid tiles={tiles} />

      <UrgentBlock
        items={data.urgent.items}
        totalCount={data.urgent.totalCount}
        onOpenAll={() => handleOpen('watnu')}
      />

      <VandaagBlock
        items={data.vandaag.items}
        totalKm={data.vandaag.totalKm}
        totalDuur={data.vandaag.totalDuur}
        onOpenAll={() => handleOpen('vandaag')}
      />

      <ActivityFeedBlock
        items={data.activity}
        onOpenAll={() => handleOpen('feed')}
      />
    </div>
  )
}
