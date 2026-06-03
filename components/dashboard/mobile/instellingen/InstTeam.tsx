'use client'

// Toont de echte approved teamleden uit dashboard_user_profiles.
// Let op: die tabel bevat (nog) géén e-mail of persoonsnaam, alleen
// bedrijfsnaam + owner-vlag + user_id. We tonen wat er is en verzinnen
// niets bij. "Lid uitnodigen" heeft geen invite-flow → disabled met hint.

import { Plus } from 'lucide-react'
import { InstGroupCard, InstGhostBtn } from './InstAtoms'
import type { TeamMember } from '@/components/dashboard/instellingen/SettingSections'
import styles from './InstTeam.module.css'

// Owner = blauw, member = neutraal-paars (zelfde palet als de hub-tints).
const OWNER_TINT = '#1A56FF'
const MEMBER_TINT = '#7C3AED'

/** Initialen uit de bedrijfsnaam: eerste 2 woorden, eerste letter elk. */
function initials(naam: string): string {
  const parts = naam.trim().split(/\s+/).slice(0, 2)
  const out = parts.map((w) => w[0] ?? '').join('')
  return out.toUpperCase() || '?'
}

/** Team-detailscherm. Plain content, drilldown layer levert header. */
export function InstTeam({ members }: { members: TeamMember[] }) {
  return (
    <div className={styles.container}>
      <InstGroupCard>
        {members.map((m, i) => {
          const naam = m.bedrijfsnaam || 'Onbekend lid'
          const tint = m.is_owner ? OWNER_TINT : MEMBER_TINT
          return (
            <div
              key={m.user_id}
              className={styles.row}
              /* Tint als CSS custom property; bg/fg via color-mix in CSS */
              style={{ '--tint': tint } as React.CSSProperties}
              data-last={i === members.length - 1 || undefined}
            >
              {/* Avatar-cirkel: bg color-mix tint 13%, kleur tint */}
              <div className={styles.avatar} aria-hidden="true">
                {initials(naam)}
              </div>

              {/* Naam + (verkort) user-id, geen e-mail beschikbaar in deze tabel */}
              <div className={styles.info}>
                <div className={styles.naam}>{naam}</div>
                <div className={styles.email}>{m.user_id.slice(0, 8)}…</div>
              </div>

              {/* Rol-pill: tinted via --tint */}
              <span className={styles.rolePill}>{m.is_owner ? 'Owner' : 'Member'}</span>
            </div>
          )
        })}
        {members.length === 0 && (
          <div className={styles.row} data-last>
            <div className={styles.info}>
              <div className={styles.naam}>Geen teamleden</div>
              <div className={styles.email}>Nog geen approved leden gevonden.</div>
            </div>
          </div>
        )}
      </InstGroupCard>

      {/* Uitnodigen verloopt via Frontlix-support, geen self-service invite-flow. */}
      <div className={styles.btnWrap}>
        <InstGhostBtn disabled>
          <Plus size={15} aria-hidden="true" />
          Lid uitnodigen, via Frontlix-support
        </InstGhostBtn>
      </div>
    </div>
  )
}
