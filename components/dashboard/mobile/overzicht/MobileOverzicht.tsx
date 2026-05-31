'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileOverzichtHeader } from './MobileOverzichtHeader'
import { AiBriefCard } from './AiBriefCard'
import { HeroKpiCard } from './HeroKpiCard'
import { MiniKpiGrid, MiniKpiIcons, type MiniKpiTile } from './MiniKpiGrid'
import { UrgentBlock, type UrgentItem } from './UrgentBlock'
import { VandaagBlock, type VandaagItem } from './VandaagBlock'
import { ActivityFeedBlock, type ActivityItem } from './ActivityFeedBlock'
import { WatNuView } from '../drilldowns/WatNuView'
import { VandaagView } from '../drilldowns/VandaagView'
import { ActiviteitView } from '../drilldowns/ActiviteitView'
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
}

type SubView = 'watnu' | 'vandaag' | 'feed'

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
 * Drilldown-state wordt intern beheerd: `sub` is `null` (base view) of
 * één van de 3 drilldown-keys. Bij open schuift de base-content weg
 * (translate + fade) en mount de juiste DrilldownLayer overheen.
 */
export function MobileOverzicht({ data }: Props) {
  const router = useRouter()
  const [sub, setSub] = useState<SubView | null>(null)
  const openDrilldown = (view: SubView) => setSub(view)
  const closeDrilldown = () => setSub(null)
  // Tik op een "Wat nu"-melding (preview-rij óf drilldown-kaart) → direct naar
  // het lead-dossier; geen tussenstap via "Alles" meer nodig.
  const openLead = (id: string) => router.push(`/leads/${id}`)

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
      <div className={styles.base} data-collapsed={sub !== null}>
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
          onPrimaryCta={data.aiBrief.ctaLabel ? () => openDrilldown('watnu') : undefined}
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
          onOpenAll={() => openDrilldown('watnu')}
          onOpenItem={openLead}
        />

        <VandaagBlock
          items={data.vandaag.items}
          totalKm={data.vandaag.totalKm}
          totalDuur={data.vandaag.totalDuur}
          onOpenAll={() => openDrilldown('vandaag')}
        />

        <ActivityFeedBlock
          items={data.activity}
          onOpenAll={() => openDrilldown('feed')}
        />
      </div>

      <WatNuView
        open={sub === 'watnu'}
        onClose={closeDrilldown}
        items={data.urgent.items}
        onOpenItem={openLead}
        onChat={(id) => router.push(`/inbox?lead=${id}`)}
        counts={{
          alle: data.urgent.totalCount,
          urgent: data.urgent.items.filter((i) => i.badge?.tone === 'red').length,
          wachtend: data.urgent.items.filter((i) => i.badge?.tone === 'amber').length,
          buitenRadius: 0, // todo: backend levert dit nog niet
        }}
      />

      <VandaagView
        open={sub === 'vandaag'}
        onClose={closeDrilldown}
        items={data.vandaag.items}
        totalKm={data.vandaag.totalKm ?? 0}
        totalDuur={data.vandaag.totalDuur ?? ''}
        dayLabel={formatDayLabel(data.vandaag.items)}
        route={buildRouteSummary(data.vandaag.items)}
        onOpenLead={openLead}
        onNavigate={(id) => openMapForStop(data.vandaag.items, id)}
        onOpenMap={() => openMapRoute(data.vandaag.items)}
        // onCall bewust niet gewired: VandaagItem heeft geen telefoonveld (geen nepdata).
      />

      <ActiviteitView
        open={sub === 'feed'}
        onClose={closeDrilldown}
        items={data.activity}
      />
    </div>
  )
}

// --- Pure helpers ---------------------------------------------------------

/**
 * formatDayLabel — bouwt het subtitle-label voor VandaagView.
 *
 * Voorbeelden:
 *   - met items met tijden:  "don 28 nov · 10:30 – 17:30"
 *   - met 1 item / 1 tijd:    "don 28 nov · 10:30"
 *   - lege items-list:         "don 28 nov"
 *
 * Datum wordt altijd op vandaag gezet (de UI is "vandaag"-scoped). De tijd-
 * range wordt afgeleid uit de items door de tijden te sorteren en eerste +
 * laatste te tonen.
 */
function formatDayLabel(items: VandaagItem[]): string {
  const today = new Date()
  const datum = new Intl.DateTimeFormat('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(today)

  if (items.length === 0) return datum

  const tijden = items
    .map((i) => i.tijd)
    .filter(Boolean)
    .sort()
  const eerste = tijden[0]
  const laatste = tijden[tijden.length - 1]

  if (eerste && laatste && eerste !== laatste) {
    return `${datum} · ${eerste} – ${laatste}`
  }
  return `${datum} · ${eerste ?? ''}`.trim().replace(/·\s*$/, '').trim()
}

/**
 * buildRouteSummary — destilleert een korte route-string ("A → B → C")
 * uit de items. Pakt het laatste deel na "·" uit `item.adres` (typisch
 * "Straat 1 · Plaatsnaam"), of het hele adres als er geen separator is.
 *
 * Dubbele opeenvolgende plaatsen worden afgevangen (dedup van runs, niet
 * volledig globaal — een route "Utrecht → Zeist → Utrecht" blijft intact).
 */
function buildRouteSummary(items: VandaagItem[]): string {
  const plaatsen = items
    .map((i) => {
      const parts = i.adres.split('·').map((s) => s.trim())
      return parts[parts.length - 1] ?? i.adres
    })
    .filter(Boolean)

  const uniek: string[] = []
  for (const p of plaatsen) {
    if (uniek[uniek.length - 1] !== p) uniek.push(p)
  }
  return uniek.join(' → ')
}

/** Opent Google Maps op het adres van één stop (echt VandaagItem.adres). */
function openMapForStop(items: VandaagItem[], id: string): void {
  const item = items.find((i) => i.id === id)
  if (!item) return
  const q = encodeURIComponent(item.adres.replace(/\s*·\s*/g, ', '))
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer')
}

/** Opent Google Maps met alle stops als route (laatste = bestemming, rest = waypoints). */
function openMapRoute(items: VandaagItem[]): void {
  if (items.length === 0) return
  const stops = items.map((i) => encodeURIComponent(i.adres.replace(/\s*·\s*/g, ', ')))
  const destination = stops[stops.length - 1]
  const waypoints = stops.slice(0, -1).join('|')
  const base = `https://www.google.com/maps/dir/?api=1&destination=${destination}`
  window.open(waypoints ? `${base}&waypoints=${waypoints}` : base, '_blank', 'noopener,noreferrer')
}
