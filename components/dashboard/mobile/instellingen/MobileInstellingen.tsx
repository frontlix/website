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
import { buildInstGroups } from './instellingen-mock'
import type {
  TenantSettings,
  PricingRule,
  ServiceOffering,
  TeamMember,
} from '@/components/dashboard/instellingen/SettingSections'
import type { TagWithCount } from '@/lib/dashboard/tags-queries'
import type { PricingImpactBaseline } from '@/lib/dashboard/pricing-impact-queries'
import type { NotificationPreferenceRow } from '@/lib/dashboard/notifications/types'
import styles from './MobileInstellingen.module.css'

// Desktop gebruikt iets andere sectie-keys in de URL; map die naar onze keys
// zodat een deeplink als ?section=notificaties ook het juiste mobiele scherm opent.
const SECTION_ALIAS: Record<string, string> = { notificaties: 'notif' }

// Welke detail-keys via DETAIL gerenderd worden (alles behalve 'bedrijf', dat
// extra props nodig heeft en apart wordt afgehandeld).
const DETAIL_KEYS = new Set([
  'team',
  'prijzen',
  'diensten',
  'opening',
  'reminders',
  'notif',
  'tags',
])

type Props = {
  /** Volledige tenant_settings-rij (bron voor bedrijfsvelden, reminders, maanddoel). */
  tenant: TenantSettings | null
  /** Prijsregels uit pricing_rules. */
  pricing: PricingRule[]
  /** Wat-als-baseline (laatste leads) voor het omzet-effect in InstPrijzen. */
  baseline: PricingImpactBaseline | null
  /** Diensten uit service_offerings. */
  services: ServiceOffering[]
  /** Approved teamleden uit dashboard_user_profiles. */
  team: TeamMember[]
  /** Tags + lead-counts. */
  tags: TagWithCount[]
  /** Notificatie-voorkeuren uit notification_preferences. */
  notifPrefs: NotificationPreferenceRow[]
  /**
   * Rauwe `?section=`-param (server-side doorgegeven). Alleen als die expliciet
   * aanwezig is openen we het detail direct — anders zou elk bezoek op 'bedrijf'
   * defaulten. De server-side default-naar-'bedrijf' mag hier dus NIET in.
   */
  initialSection?: string
}

export function MobileInstellingen({
  tenant,
  pricing,
  baseline,
  services,
  team,
  tags,
  notifPrefs,
  initialSection,
}: Props) {
  // Deeplink: ?section= opent direct het bijbehorende detail (bv. de
  // "Stel je maanddoel in"-CTA op het Overzicht → ?section=bedrijf).
  // Alleen bij mount; daarna stuurt lokale state de view.
  const [view, setView] = useState<string | null>(() => {
    if (!initialSection) return null
    const key = SECTION_ALIAS[initialSection] ?? initialSection
    return key === 'bedrijf' || DETAIL_KEYS.has(key) ? key : null
  })

  // Hub-groepen met echte counts (team-leden, actieve diensten, tags).
  const groups = buildInstGroups({
    teamCount: team.length,
    dienstenActief: services.filter((s) => s.actief).length,
    tagCount: tags.length,
  })
  const section = view
    ? groups.flatMap((g) => g.items).find((s) => s.k === view)
    : null

  return (
    <div className={styles.root}>
      <InstellingenHub groups={groups} onOpen={setView} />
      <MobileDrilldownLayer
        open={view !== null}
        title={section?.l ?? ''}
        onClose={() => setView(null)}
      >
        {/* Elk detailscherm krijgt de echte data uit de route doorgegeven. */}
        {view === 'bedrijf' && (
          <InstBedrijf tenant={tenant} omzetDoel={tenant?.omzet_doel_maand ?? null} />
        )}
        {view === 'team' && <InstTeam members={team} />}
        {view === 'prijzen' && <InstPrijzen rules={pricing} baseline={baseline} />}
        {view === 'diensten' && <InstDiensten services={services} />}
        {view === 'opening' && (
          <InstOpening
            bedrijfsnaam={tenant?.bedrijfsnaam ?? null}
            chatbot={tenant?.chatbot_naam ?? null}
          />
        )}
        {view === 'reminders' && (
          <InstReminders
            days={{
              1: tenant?.reminder_dag_1 ?? 2,
              2: tenant?.reminder_dag_2 ?? 5,
              3: tenant?.reminder_dag_3 ?? 8,
            }}
          />
        )}
        {view === 'notif' && (
          <InstNotif
            prefs={notifPrefs}
            digestTijd={tenant?.daily_digest_tijd ?? '08:00'}
          />
        )}
        {view === 'tags' && <InstTags tags={tags} />}
      </MobileDrilldownLayer>
    </div>
  )
}
